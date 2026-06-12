-- Make intent auditable: explicit anon SELECT on blog-images bucket
CREATE POLICY "Public read blog-images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'blog-images');