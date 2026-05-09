
-- Idempotency keys
CREATE TABLE public.idempotency_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT,
  response_status INTEGER,
  response_body JSONB,
  status TEXT NOT NULL DEFAULT 'in_progress',
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE (scope, key)
);
CREATE INDEX idx_idem_expires ON public.idempotency_keys(expires_at);
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view idempotency keys"
ON public.idempotency_keys FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Webhook endpoints
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  secret_key_name TEXT NOT NULL, -- references key in public.secrets
  signature_header TEXT NOT NULL DEFAULT 'x-signature',
  algorithm TEXT NOT NULL DEFAULT 'sha256',
  tolerance_seconds INTEGER NOT NULL DEFAULT 300,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage webhook endpoints"
ON public.webhook_endpoints FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_webhook_endpoints_updated
BEFORE UPDATE ON public.webhook_endpoints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Webhook deliveries (observability)
CREATE TABLE public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_name TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  status_code INTEGER,
  reason TEXT,
  headers JSONB,
  body_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_deliveries_created ON public.webhook_deliveries(created_at DESC);
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view webhook deliveries"
ON public.webhook_deliveries FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
