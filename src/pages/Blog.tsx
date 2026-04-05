import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBlogs } from "@/hooks/useBlogs";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = ["All", "Company", "Research", "Team", "Stories"];

const NAV_TABS = [
  { label: "APEX", href: "/#apex" },
  { label: "Research", href: "/#features" },
  { label: "Enterprise", href: "/#cta" },
  { label: "Blog", href: "/blog" },
];

const Blog = () => {
  const { data: blogs = [], isLoading } = useBlogs();
  const [activeTab, setActiveTab] = useState("All");
  const navigate = useNavigate();

  useDocumentMeta({
    title: "Blog",
    description:
      "Latest insights, research, and stories from the Jetra team on remote work, talent, and the future of employment.",
    url: `${window.location.origin}/blog`,
  });

  const publishedBlogs = useMemo(
    () => blogs.filter((b) => b.status === "published" || !b.status),
    [blogs]
  );

  const filtered = useMemo(() => {
    if (activeTab === "All") return publishedBlogs;
    return publishedBlogs.filter(
      (b) => b.category?.toLowerCase() === activeTab.toLowerCase()
    );
  }, [publishedBlogs, activeTab]);

  // Featured = first blog (newest)
  const featured = filtered[0];
  const rest = filtered.slice(1);

  // Group by category for "All" view
  const categoryGroups = useMemo(() => {
    if (activeTab !== "All") return [];
    const groups: Record<string, typeof publishedBlogs> = {};
    publishedBlogs.forEach((b) => {
      const cat = b.category || "Uncategorized";
      const key = cat.charAt(0).toUpperCase() + cat.slice(1);
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return Object.entries(groups);
  }, [publishedBlogs, activeTab]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">J</span>
            </div>
          </Link>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1">
            {NAV_TABS.map((tab) => (
              <Link
                key={tab.label}
                to={tab.href}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  tab.href === "/blog"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          {/* Login */}
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-24">
        {/* Title + Category Tabs inline */}
        <div className="flex items-baseline gap-6 mb-8 flex-wrap">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Blog</h1>
          <div className="flex items-center gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`text-sm transition-colors ${
                  activeTab === cat
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="w-full h-80 rounded-xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">No articles found</p>
          </div>
        ) : (
          <>
            {/* Featured Post */}
            {featured && (
              <Link
                to={`/blog/${featured.slug}`}
                className="block mb-12 group"
              >
                <div className="border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                  {featured.image_url && (
                    <div className="w-full h-56 sm:h-72 overflow-hidden bg-muted">
                      <img
                        src={featured.image_url}
                        alt={featured.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-5 sm:p-6">
                    <p className="text-xs text-muted-foreground mb-2">
                      {formatDate(featured.created_at)}
                    </p>
                    <h2 className="text-xl sm:text-2xl font-semibold text-foreground leading-snug mb-2">
                      {featured.title}
                    </h2>
                    {featured.short_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {featured.short_description}
                      </p>
                    )}
                    {featured.category && (
                      <span className="text-xs text-muted-foreground">
                        {featured.category}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )}

            {/* Category sections when "All" is active */}
            {activeTab === "All" && categoryGroups.length > 0 ? (
              <div className="space-y-12">
                {categoryGroups.map(([category, posts]) => (
                  <section key={category}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-foreground">
                        {category}
                      </h2>
                      <button
                        onClick={() => setActiveTab(category)}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        All {category} Posts →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {posts.slice(0, 3).map((blog) => (
                        <BlogCard key={blog.id} blog={blog} formatDate={formatDate} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              /* Filtered grid when a specific category is active */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((blog) => (
                  <BlogCard key={blog.id} blog={blog} formatDate={formatDate} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-xs font-medium text-foreground mb-3">For Experts</h4>
              <ul className="space-y-2">
                <li><Link to="/explore" className="text-xs text-muted-foreground hover:text-foreground">Find work</Link></li>
                <li><Link to="/blog" className="text-xs text-muted-foreground hover:text-foreground">Stories</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-foreground mb-3">Our Research</h4>
              <ul className="space-y-2">
                <li><Link to="/#apex" className="text-xs text-muted-foreground hover:text-foreground">APEX</Link></li>
                <li><Link to="/benchmark/login" className="text-xs text-muted-foreground hover:text-foreground">Benchmarks</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-foreground mb-3">Contact Us</h4>
              <ul className="space-y-2">
                <li><Link to="/#cta" className="text-xs text-muted-foreground hover:text-foreground">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-medium text-foreground mb-3">Jetra</h4>
              <ul className="space-y-2">
                <li><Link to="/blog" className="text-xs text-muted-foreground hover:text-foreground">Blog</Link></li>
                <li><Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground">Privacy</Link></li>
                <li><Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">© 2026 Jetra</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

/* Blog Card Component */
interface BlogCardProps {
  blog: {
    id: string;
    slug: string;
    title: string;
    short_description?: string | null;
    image_url?: string | null;
    category?: string | null;
    created_at: string;
  };
  formatDate: (d: string) => string;
}

const BlogCard = ({ blog, formatDate }: BlogCardProps) => (
  <Link
    to={`/blog/${blog.slug}`}
    className="group block border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
  >
    {blog.image_url ? (
      <div className="w-full h-40 overflow-hidden bg-muted">
        <img
          src={blog.image_url}
          alt={blog.title}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      </div>
    ) : null}
    <div className="p-4">
      <p className="text-xs text-muted-foreground mb-2">
        {formatDate(blog.created_at)}
      </p>
      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-1">
        {blog.title}
      </h3>
      {blog.short_description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {blog.short_description}
        </p>
      )}
      {blog.category && (
        <span className="text-[11px] text-muted-foreground">{blog.category}</span>
      )}
    </div>
  </Link>
);

export default Blog;
