
CREATE TABLE public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text,
  short_description text,
  image_url text,
  category text DEFAULT 'company',
  author text DEFAULT 'Atlas Team',
  read_time text DEFAULT '5 min read',
  status text DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blogs viewable by everyone" ON public.blogs
  FOR SELECT TO public USING (status = 'published');

CREATE POLICY "Admins can manage blogs" ON public.blogs
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_blogs_updated_at
  BEFORE UPDATE ON public.blogs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
