-- Secrets table for admin-managed encrypted secrets
CREATE TABLE public.secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,           -- ciphertext: iv.tag.cipher (base64url)
  hint text,                     -- last 4 chars of plaintext for fast masking
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT secrets_key_format CHECK (key ~ '^[A-Z][A-Z0-9_]{2,127}$')
);

CREATE INDEX idx_secrets_key ON public.secrets(key);

ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;

-- Admin-only access (uses existing has_role security-definer function)
CREATE POLICY "Admins can view secrets"
  ON public.secrets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert secrets"
  ON public.secrets FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update secrets"
  ON public.secrets FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete secrets"
  ON public.secrets FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-update updated_at
CREATE TRIGGER trg_secrets_updated_at
  BEFORE UPDATE ON public.secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();