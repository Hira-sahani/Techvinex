
-- 1. Remove dangerous open policies on blog-images bucket (any authed user could upload/update/delete)
DROP POLICY IF EXISTS "Authenticated users can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete blog images" ON storage.objects;
DROP POLICY IF EXISTS "Blog images are publicly accessible" ON storage.objects;

-- Re-assert admin-only write + public read (idempotent)
DROP POLICY IF EXISTS blog_images_public_read ON storage.objects;
DROP POLICY IF EXISTS blog_images_admin_insert ON storage.objects;
DROP POLICY IF EXISTS blog_images_admin_update ON storage.objects;
DROP POLICY IF EXISTS blog_images_admin_delete ON storage.objects;

CREATE POLICY blog_images_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'blog-images');

CREATE POLICY blog_images_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY blog_images_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY blog_images_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

-- 2. Restrict blog-images bucket: image-only, 5 MB cap (blocks executable uploads)
UPDATE storage.buckets
SET file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/svg+xml']
WHERE id = 'blog-images';

-- 3. Lock SECURITY DEFINER functions: only callable by service role
REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(text, integer) TO service_role;

-- has_role must remain callable by authenticated (RLS policies invoke it as the caller's role)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- update_updated_at_column is a trigger function — no direct callers needed
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
