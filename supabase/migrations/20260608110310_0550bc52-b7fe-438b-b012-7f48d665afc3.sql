
-- 1) Restrict blog-images listing to admins (public URLs still work because bucket is public)
DROP POLICY IF EXISTS "blog_images_public_read" ON storage.objects;
CREATE POLICY "blog_images_admin_list"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'blog-images' AND public.has_role(auth.uid(), 'admin'));

-- 2) Tighten applicants INSERT: require basic fields, prevent abuse
DROP POLICY IF EXISTS "Anyone can create an applicant" ON public.applicants;
CREATE POLICY "Anyone can submit an application"
ON public.applicants FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND full_name IS NOT NULL
  AND length(email) BETWEEN 3 AND 255
  AND length(full_name) BETWEEN 1 AND 200
  AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
);
