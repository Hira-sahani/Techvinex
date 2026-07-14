
DROP POLICY IF EXISTS "Analytics insertable by authenticated" ON public.job_analytics;
CREATE POLICY "Analytics insertable by authenticated" ON public.job_analytics
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages
  FOR INSERT
  WITH CHECK (
    status = 'new'
    AND length(name) BETWEEN 1 AND 200
    AND length(email) BETWEEN 3 AND 320
    AND length(message) BETWEEN 1 AND 5000
  );
