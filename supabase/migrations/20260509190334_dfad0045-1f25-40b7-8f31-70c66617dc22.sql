-- Storage policies for blog-images: public read, admin-only write.
-- Drop any pre-existing policies with the same names to keep the migration idempotent.
DROP POLICY IF EXISTS "blog_images_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_insert"  ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_update"  ON storage.objects;
DROP POLICY IF EXISTS "blog_images_admin_delete"  ON storage.objects;

CREATE POLICY "blog_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "blog_images_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_images_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "blog_images_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));
