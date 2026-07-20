import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Guardrail test: prevent future code from manually attaching an
 * `Authorization: Bearer ...` header outside of the central apiFetch /
 * apiInvoke wrappers in src/lib/apiClient.ts.
 *
 * Stale Bearer tokens were the root cause of post-refresh-failure leaks,
 * so all authenticated requests must go through apiClient where the token
 * is read from the live session at call time.
 */

const SRC_DIR = join(process.cwd(), "src");

// Files explicitly allowed to set Authorization: Bearer headers.
const ALLOW_FILES = new Set<string>([
  join("src", "lib", "apiClient.ts"),
  // MCP server-side helper runs on Supabase Edge Runtime (Deno), not in the
  // browser. It forwards the OAuth-verified token from ToolContext to
  // Supabase so RLS runs as that user. apiClient is browser-only and cannot
  // be used from Edge Functions.
  join("src", "lib", "mcp", "tools", "_shared.ts"),
]);

// Patterns flagged as forbidden when they appear outside ALLOW_FILES.
// We match the literal header name + "Bearer" together so we don't trip
// on unrelated mentions of "Authorization" (e.g. "Work Authorization").
const FORBIDDEN_PATTERNS: RegExp[] = [
  // Object literal style:  Authorization: `Bearer ...`  /  "Authorization": "Bearer ..."
  /["']?[Aa]uthorization["']?\s*:\s*[`"']\s*Bearer\s/,
  // Headers API style:     headers.set("Authorization", `Bearer ...`)
  /\.set\(\s*["'][Aa]uthorization["']\s*,\s*[`"']\s*Bearer\s/,
  // Headers.append:        headers.append("Authorization", "Bearer ...")
  /\.append\(\s*["'][Aa]uthorization["']\s*,\s*[`"']\s*Bearer\s/,
];

const SCANNED_EXTS = [".ts", ".tsx"];
const SKIP_DIRS = new Set(["node_modules", "dist", "build", ".next", "coverage"]);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      walk(full, files);
    } else if (SCANNED_EXTS.some((ext) => full.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function isAllowed(absPath: string): boolean {
  const rel = relative(process.cwd(), absPath).split(sep).join("/");
  for (const allowed of ALLOW_FILES) {
    if (rel === allowed.split(sep).join("/")) return true;
  }
  // Tests for the api client itself are allowed to mention the literal.
  if (rel.endsWith("apiClient.test.tsx") || rel.endsWith("apiClient.test.ts")) return true;
  // This guard test itself contains the forbidden literals as patterns.
  if (rel.endsWith("noStaleBearer.guard.test.ts")) return true;
  return false;
}

describe("guard: no hardcoded Authorization: Bearer headers outside apiClient", () => {
  it("scans src/ for forbidden Bearer header literals", () => {
    const offenders: { file: string; line: number; text: string }[] = [];

    for (const file of walk(SRC_DIR)) {
      if (isAllowed(file)) continue;
      const content = readFileSync(file, "utf8");
      const lines = content.split(/\r?\n/);
      lines.forEach((line, i) => {
        // Skip comments to avoid false positives in documentation.
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

        for (const pat of FORBIDDEN_PATTERNS) {
          if (pat.test(line)) {
            offenders.push({
              file: relative(process.cwd(), file),
              line: i + 1,
              text: line.trim(),
            });
            break;
          }
        }
      });
    }

    if (offenders.length > 0) {
      const msg =
        `Found ${offenders.length} hardcoded "Authorization: Bearer" header(s) outside apiClient.\n` +
        `Use apiFetch / apiInvoke from "@/lib/apiClient" instead so the token is read from the live session at call time.\n\n` +
        offenders.map((o) => `  ${o.file}:${o.line}\n    ${o.text}`).join("\n");
      throw new Error(msg);
    }

    expect(offenders).toEqual([]);
  });
});
