// Admin-only audited payout account viewer.
// Every successful read writes an `audit_logs` row (admin user id, target user id,
// action="view_payout_account", IP, timestamp). Sensitive bank fields (iban,
// account_number, sort_code, tax_signature) are returned masked unless the caller
// passes { reveal: true } in the body, in which case the audit row records reveal=true.
import { guard, guardJson, z } from "../_shared/guard.ts";

const bodySchema = z.object({
  target_user_id: z.string().uuid(),
  reveal: z.boolean().optional().default(false),
  reason: z.string().min(3).max(500).optional(),
});

const maskTail = (v: string | null, keep = 4): string | null => {
  if (!v) return v;
  if (v.length <= keep) return "•".repeat(v.length);
  return "•".repeat(Math.max(4, v.length - keep)) + v.slice(-keep);
};

Deno.serve((req) =>
  guard(
    req,
    {
      allowedMethods: ["POST"],
      requireAuth: true,
      requireRoles: ["admin"],
      schema: bodySchema,
      rateLimit: { key: "admin-view-payout", limit: 30, windowMs: 60_000, bucketBy: "user+ip" },
    },
    async (ctx) => {
      const { target_user_id, reveal, reason } = ctx.body as z.infer<typeof bodySchema>;

      const { data, error } = await ctx.db
        .from("payout_accounts")
        .select(
          "id,user_id,country,payment_provider,email,business_country,business_type,business_structure,legal_business_name,trading_name,product_description,currency,bank_country,account_holder_name,iban,sort_code,account_number,tax_full_name,tax_country,tax_signature,tax_agreed,phone_verified,verified_phone,id_uploaded,selfie_uploaded,setup_completed,created_at,updated_at",
        )
        .eq("user_id", target_user_id)
        .maybeSingle();

      if (error) {
        return guardJson({ error: "lookup_failed", detail: error.message }, 500);
      }
      if (!data) {
        await ctx.audit("view_payout_account", {
          target_user_id,
          ip: ctx.ip,
          reveal,
          reason: reason ?? null,
          result: "not_found",
        }, target_user_id);
        return guardJson({ error: "not_found" }, 404);
      }

      // Always log the access BEFORE returning data.
      await ctx.audit(
        "view_payout_account",
        {
          target_user_id,
          ip: ctx.ip,
          reveal,
          reason: reason ?? null,
          result: "ok",
        },
        target_user_id,
      );

      const sanitized = reveal
        ? data
        : {
            ...data,
            iban: maskTail(data.iban),
            account_number: maskTail(data.account_number),
            sort_code: maskTail(data.sort_code, 2),
            tax_signature: data.tax_signature ? "•••••• (hidden)" : null,
          };

      return guardJson({ payout: sanitized, revealed: reveal });
    },
  ),
);
