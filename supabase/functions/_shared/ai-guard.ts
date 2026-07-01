// ============================================================================
// withAiGuard() — the single, mandatory security wrapper for every AI-enabled
// Edge Function on the Techvinex platform.
//
// Any handler wrapped with withAiGuard automatically inherits:
//   1.  Zero-trust request guard (auth, CORS, method, size, schema, rate-limit)
//   2.  Signed, deep-frozen execution plan (allowed tools, egress, output types)
//   3.  Prompt-injection + jailbreak detection on every string in the body
//   4.  System-prompt isolation (system content is not derivable from user text)
//   5.  External content sandboxing (wrapExternalContent + sanitizeExternalContent)
//   6.  Output validation (secret redaction, size limits, type authorization)
//   7.  Sentry instrumentation
//   8.  Tamper-evident audit logging via ai_security_audit
//   9.  Uniform error envelope — never leaks stack traces, prompts, or secrets
//
// New AI features MUST use withAiGuard. Handlers that reach the model without
// going through this wrapper are considered a security regression.
// ============================================================================

import { guard, guardJson, GuardConfig, GuardCtx, z } from "./guard.ts";
import { ZodSchema } from "https://esm.sh/zod@3.23.8";
import { withSentry, captureEdgeException } from "./sentry.ts";
import {
  createExecutionPlan,
  PlanEnforcer,
  ExecutionPlanKind,
  detectPromptInjection,
  sanitizeExternalContent,
  wrapExternalContent,
  redactDeep,
  redactSecrets,
  validateToolOutput,
  auditSecurity,
  PlanViolationError,
} from "./ai-security.ts";

export interface AiGuardOptions<TBody> extends Omit<GuardConfig<TBody>, "schema"> {
  /** Which frozen plan template to use. */
  planKind: ExecutionPlanKind;
  /** Zod schema for the request body. */
  schema: ZodSchema<TBody>;
  /** Fields inside the request body whose values are UNTRUSTED user/external content. */
  untrustedFields?: string[];
  /** If false, do not block on jailbreak detection — audit only. Defaults to true. */
  blockOnInjection?: boolean;
}

export interface AiGuardCtx<TBody> extends GuardCtx<TBody> {
  /** The frozen execution plan for this request. */
  plan: PlanEnforcer;
  /** Sanitize a piece of external/untrusted text (already applied to declared fields). */
  sanitize: (text: string) => string;
  /** Wrap external content in <untrusted_content> fences. */
  wrap: (text: string, label?: string) => string;
  /** Redact secrets from any JSON-like value before it leaves the function. */
  redact: <T>(value: T) => T;
  /** Validate + redact a model/tool output before returning it. */
  validateOutput: <T>(value: T, type?: "text" | "audio" | "json") => T;
}

/** Recursively collect every string leaf in an object — used for jailbreak scanning. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) collectStrings(v, out);
  else if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectStrings(v, out);
  }
  return out;
}

/** Walk an object and sanitize the string leaves at the listed dotted paths. */
function sanitizeFields<T>(body: T, fields: string[]): T {
  if (!fields.length || body == null || typeof body !== "object") return body;
  const clone = JSON.parse(JSON.stringify(body));
  for (const path of fields) {
    const parts = path.split(".");
    let node: any = clone;
    for (let i = 0; i < parts.length - 1; i++) node = node?.[parts[i]];
    const key = parts[parts.length - 1];
    if (!node) continue;
    const val = node[key];
    if (typeof val === "string") {
      node[key] = sanitizeExternalContent(val).safe;
    } else if (Array.isArray(val)) {
      node[key] = val.map((v) =>
        typeof v === "string"
          ? sanitizeExternalContent(v).safe
          : (v && typeof v === "object" && typeof v.content === "string"
              ? { ...v, content: sanitizeExternalContent(v.content).safe }
              : v),
      );
    }
  }
  return clone as T;
}

/**
 * Wrap an AI edge-function handler with the full platform AI security stack.
 * Use `Deno.serve(withAiGuard("name", { ... }, async (ctx) => { ... }))`.
 */
export function withAiGuard<TBody>(
  name: string,
  options: AiGuardOptions<TBody>,
  handler: (ctx: AiGuardCtx<TBody>) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  const blockOnInjection = options.blockOnInjection !== false;

  return withSentry(name, (req: Request) =>
    guard<TBody>(req, options as GuardConfig<TBody>, async (ctx) => {
      // 1. Freeze execution plan.
      const signed = await createExecutionPlan(options.planKind, ctx.userId ?? null);
      const plan = new PlanEnforcer(signed);

      // 2. Scan every string leaf in the body for prompt injection / jailbreak.
      try {
        const strings = collectStrings(ctx.body);
        let worstScore = 0;
        const worstFindings: string[] = [];
        for (const s of strings) {
          const det = detectPromptInjection(s);
          if (det.score > worstScore) worstScore = det.score;
          for (const f of det.findings) if (!worstFindings.includes(f)) worstFindings.push(f);
        }
        if (worstScore >= 0.5 && blockOnInjection) {
          await auditSecurity({
            userId: ctx.userId, kind: name, event: "injection_blocked",
            severity: worstScore >= 0.75 ? "critical" : "high",
            planHash: signed.hash,
            details: { findings: worstFindings.slice(0, 12), score: worstScore },
          });
          return guardJson({ error: "input_blocked", reason: "prompt_injection" }, 400);
        }
        if (worstFindings.length) {
          await auditSecurity({
            userId: ctx.userId, kind: name, event: "injection_detected",
            severity: "low", planHash: signed.hash,
            details: { findings: worstFindings.slice(0, 12), score: worstScore },
          });
        }

        // 3. Auto-sanitize declared untrusted fields.
        const cleanedBody = sanitizeFields(ctx.body as unknown, options.untrustedFields ?? []);

        // 4. Hand a rich, plan-aware context to the underlying handler.
        const aiCtx: AiGuardCtx<TBody> = {
          ...ctx,
          body: cleanedBody as TBody,
          plan,
          sanitize: (t) => sanitizeExternalContent(t).safe,
          wrap: (t, label) => wrapExternalContent(t, label),
          redact: (v) => redactDeep(v),
          validateOutput: (v, type = "text") => validateToolOutput(plan, v, type) as any,
        };

        const res = await handler(aiCtx);

        // 5. Post-flight: audit success (info level).
        await auditSecurity({
          userId: ctx.userId, kind: name, event: "ok",
          severity: "info", planHash: signed.hash,
          details: { status: res.status },
        });

        return res;
      } catch (err) {
        if (err instanceof PlanViolationError) {
          await auditSecurity({
            userId: ctx.userId, kind: name, event: `plan_violation:${err.code}`,
            severity: "high", planHash: signed.hash,
            details: err.details,
          });
          return guardJson({ error: "plan_violation", code: err.code }, 400);
        }
        captureEdgeException(err, { function: name, plan: signed.hash });
        await auditSecurity({
          userId: ctx.userId, kind: name, event: "handler_error",
          severity: "medium", planHash: signed.hash,
          details: { message: redactSecrets(String((err as Error).message ?? err)).slice(0, 300) },
        });
        return guardJson({ error: "internal_error" }, 500);
      }
    }),
  );
}

export { z };
