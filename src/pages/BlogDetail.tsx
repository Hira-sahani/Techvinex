import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Share2, Clock, User, Calendar } from "lucide-react";
import { useBlog } from "@/hooks/useBlogs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BlogDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: blog, isLoading } = useBlog(slug || "");

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

  return (
    <div className="min-h-screen bg-background">
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
          className="mt-6 prose prose-sm prose-neutral dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-sm"
          dangerouslySetInnerHTML={{ __html: blog.content || "" }}
        />
      </article>
    </div>
  );
};

export default BlogDetail;
