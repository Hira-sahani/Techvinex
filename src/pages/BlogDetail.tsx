import { useParams, Link } from "react-router-dom";
import { useMemo } from "react";
import DOMPurify from "dompurify";
import { ArrowLeft, Share2, Clock, User, Calendar } from "lucide-react";
import { useBlog } from "@/hooks/useBlogs";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// CV-1 patch: sanitize TipTap-authored HTML before rendering to block stored XSS.
// CV-2 (JSON-LD): escape `<` to neutralise any `</script>` substring in dynamic fields.
const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "base"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "formaction", "srcdoc", "xlink:href"],
  ALLOW_DATA_ATTR: false,
};
const escapeJsonForScript = (s: string) => s.replace(/</g, "\\u003c").replace(/-->/g, "--\\u003e");


const BlogDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: blog, isLoading } = useBlog(slug || "");

  useDocumentMeta({
    title: blog?.title,
    description: blog?.short_description || undefined,
    image: blog?.image_url || undefined,
    url: blog ? `${window.location.origin}/blog/${blog.slug}` : undefined,
    type: "article",
    author: blog?.author || undefined,
    jsonLd: blog
      ? {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: blog.title,
          description: blog.short_description || undefined,
          image: blog.image_url || undefined,
          datePublished: (blog as any).published_at || (blog as any).created_at || undefined,
          dateModified: (blog as any).updated_at || (blog as any).created_at || undefined,
          author: blog.author ? { "@type": "Person", name: blog.author } : { "@type": "Organization", name: "Techvinex" },
          publisher: {
            "@type": "Organization",
            name: "Techvinex",
            logo: { "@type": "ImageObject", url: "https://www.techvinex.com/techvinex-logo.png" },
          },
          mainEntityOfPage: typeof window !== "undefined" ? `${window.location.origin}/blog/${blog.slug}` : undefined,
        }
      : undefined,
  });

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: blog?.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied!");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-56 w-full rounded-2xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground text-sm">Article not found</p>
          <Link to="/blog" className="text-primary text-sm underline">Back to Blog</Link>
        </div>
      </div>
    );
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.short_description || "",
    image: blog.image_url || undefined,
    author: { "@type": "Person", name: blog.author || "Techvinex Team" },
    datePublished: blog.created_at,
    dateModified: blog.updated_at,
    publisher: { "@type": "Organization", name: "Techvinex" },
    url: `${window.location.origin}/blog/${blog.slug}`,
  };

  const safeHtml = useMemo(
    () => DOMPurify.sanitize(blog.content || "", SANITIZE_CONFIG),
    [blog.content]
  );

  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonForScript(JSON.stringify(jsonLd)) }}
      />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/blog" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs">Back</span>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
          {blog.category}
        </span>
        <h1 className="text-xl font-bold text-foreground mt-2 leading-tight">{blog.title}</h1>

        <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{blog.author}</span>
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(blog.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{blog.read_time}</span>
        </div>

        {blog.image_url && (
          <div className="mt-6 rounded-2xl overflow-hidden">
            <img src={blog.image_url} alt={blog.title} className="w-full h-auto object-cover" />
          </div>
        )}

        <div
          className="mt-6 max-w-none text-foreground/90 leading-relaxed text-sm
            [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-foreground
            [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-7 [&_h2]:mb-3 [&_h2]:text-foreground
            [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-foreground
            [&_p]:mb-4 [&_p]:leading-relaxed
            [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1
            [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1
            [&_li]:leading-relaxed
            [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
            [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80
            [&_strong]:font-semibold [&_strong]:text-foreground
            [&_em]:italic
            [&_u]:underline [&_u]:underline-offset-2
            [&_s]:line-through
            [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
            [&_pre]:bg-muted [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0
            [&_hr]:my-6 [&_hr]:border-border
            [&_img]:rounded-xl [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto
            [&_table]:w-full [&_table]:border-collapse [&_table]:my-4
            [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold
            [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-xs"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />

      </article>
    </div>
  );
};

export default BlogDetail;
