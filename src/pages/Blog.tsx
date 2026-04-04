import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, MoreVertical, FlaskConical, Building2, BookOpen, X } from "lucide-react";
import { useBlogs } from "@/hooks/useBlogs";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const DRAWER_ITEMS = [
  { label: "Atlas", icon: FlaskConical, href: "/blog" },
  { label: "Research", icon: BookOpen, href: "/blog?tab=Research" },
  { label: "Enterprise", icon: Building2, href: "/blog?tab=Company" },
  { label: "Blog", icon: BookOpen, href: "/blog" },
];

const CATEGORIES = ["All", "Company", "Research", "Team", "Stories"];

const Blog = () => {
  const { data: blogs = [], isLoading } = useBlogs();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const filtered = useMemo(() => {
    return blogs.filter((b) => {
      const matchCat = activeTab === "All" || b.category?.toLowerCase() === activeTab.toLowerCase();
      const matchSearch =
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        (b.short_description || "").toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [blogs, search, activeTab]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-sm">X</span>
          </div>
          <h1 className="text-lg font-semibold text-foreground flex-1">Blog</h1>
          
          <Sheet>
            <SheetTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <MoreVertical className="w-5 h-5 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex items-center gap-3 px-5 pt-6 pb-4 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">X</span>
                </div>
                <span className="text-base font-semibold text-foreground">Atlas</span>
              </div>
              <nav className="flex flex-col py-2">
                {DRAWER_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 pb-24">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-muted/40 border-border text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === cat
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <Skeleton className="w-full h-44" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">No articles found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((blog) => (
              <Link
                key={blog.id}
                to={`/blog/${blog.slug}`}
                className="group block rounded-2xl border border-border bg-card overflow-hidden transition-all hover:shadow-lg hover:shadow-primary/5 hover:scale-[1.01] active:scale-[0.99]"
              >
                {blog.image_url && (
                  <div className="w-full h-44 overflow-hidden">
                    <img
                      src={blog.image_url}
                      alt={blog.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <div className="p-4">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-primary">
                    {blog.category}
                  </span>
                  <h2 className="text-sm font-semibold text-foreground mt-1 line-clamp-2 leading-snug">
                    {blog.title}
                  </h2>
                  {blog.short_description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {blog.short_description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                    <span>{blog.author}</span>
                    <span>·</span>
                    <span>{blog.read_time}</span>
                    <span>·</span>
                    <span>{new Date(blog.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Blog;
