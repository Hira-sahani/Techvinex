import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, X } from "lucide-react";
import { useBlogs } from "@/hooks/useBlogs";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";

const CATEGORIES = ["All", "Company", "Research", "Team", "Stories"];

const DRAWER_ITEMS = [
  { label: "Atlas", href: "/blog" },
  { label: "Research", href: "/blog" },
  { label: "Enterprise", href: "/blog" },
  { label: "Blog", href: "/blog" },
];

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
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <span className="text-white font-bold text-base">X</span>
          </div>

          {/* Hamburger Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="w-9 h-9 flex items-center justify-center">
                <Menu className="w-6 h-6 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-full sm:max-w-full p-0 border-none [&>button]:hidden">
              <div className="flex items-center justify-between px-5 py-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white font-bold text-base">X</span>
                </div>
                <SheetClose asChild>
                  <button className="w-9 h-9 flex items-center justify-center">
                    <X className="w-6 h-6 text-foreground" />
                  </button>
                </SheetClose>
              </div>
              <nav className="flex flex-col px-5 pt-8 gap-5">
                {DRAWER_ITEMS.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="text-base font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-10 pb-24">
        {/* Big Title */}
        <h1 className="text-4xl font-bold text-foreground mb-6">Blog</h1>

        {/* Category Tabs - plain text style */}
        <div className="flex gap-5 overflow-x-auto pb-6 mb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`text-sm font-medium whitespace-nowrap transition-colors pb-1 ${
                activeTab === cat
                  ? "text-foreground border-b-2 border-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-muted/40 border-border text-sm rounded-lg"
          />
        </div>

        {/* Cards */}
        {isLoading ? (
          <div className="space-y-8">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="w-full h-52 rounded-2xl" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-sm">No articles found</p>
          </div>
        ) : (
          <div className="space-y-10">
            {filtered.map((blog) => (
              <Link
                key={blog.id}
                to={`/blog/${blog.slug}`}
                className="group block"
              >
                {blog.image_url && (
                  <div className="w-full h-56 rounded-2xl overflow-hidden">
                    <img
                      src={blog.image_url}
                      alt={blog.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                )}
                <h2 className="text-xl font-semibold text-foreground mt-4 leading-snug line-clamp-2">
                  {blog.title}
                </h2>
                {blog.short_description && (
                  <p className="text-sm text-muted-foreground mt-1.5 line-clamp-2">
                    {blog.short_description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <span>{blog.author}</span>
                  <span>·</span>
                  <span>{blog.read_time}</span>
                  <span>·</span>
                  <span>{new Date(blog.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
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
