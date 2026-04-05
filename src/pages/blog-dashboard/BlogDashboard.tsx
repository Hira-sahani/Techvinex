import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Edit2, Trash2, Play, Pause, LogOut, Menu, X as XIcon } from "lucide-react";
import { useBlogs, useCreateBlog, useUpdateBlog, useDeleteBlog, type Blog } from "@/hooks/useBlogs";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import JetraLoader from "@/components/JetraLoader";
import RichTextEditor from "@/components/blog-dashboard/RichTextEditor";
import BlogImageUpload from "@/components/blog-dashboard/BlogImageUpload";

const NAV_ITEMS = ["Atlas", "Research", "Enterprise", "Blog"];
const BLOG_CATEGORIES = [
  { value: "company", label: "Company" },
  { value: "research", label: "Research" },
  { value: "team", label: "Team" },
  { value: "stories", label: "Stories" },
];
const CATEGORY_TABS = ["All", "Company", "Research", "Team", "Stories"];

const statusColors: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-600",
  published: "bg-emerald-500/10 text-emerald-600",
};

const BlogDashboard = () => {
  const { data: blogs = [], isLoading } = useBlogs(true);
  const createBlog = useCreateBlog();
  const updateBlog = useUpdateBlog();
  const deleteBlog = useDeleteBlog();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [activeNav, setActiveNav] = useState("Blog");
  const [activeCat, setActiveCat] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Blog | null>(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const [form, setForm] = useState({
    title: "", slug: "", short_description: "", content: "",
    image_url: "", category: "company", author: "Atlas Team",
    read_time: "5 min read", status: "draft",
  });

  const resetForm = () => {
    setForm({ title: "", slug: "", short_description: "", content: "", image_url: "", category: "company", author: "Atlas Team", read_time: "5 min read", status: "draft" });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (blog: Blog) => {
    setForm({
      title: blog.title, slug: blog.slug, short_description: blog.short_description || "",
      content: blog.content || "", image_url: blog.image_url || "", category: blog.category || "company",
      author: blog.author || "Atlas Team", read_time: blog.read_time || "5 min read", status: blog.status || "draft",
    });
    setEditing(blog);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.slug) { toast.error("Title aur slug required hai"); return; }
    try {
      if (editing) {
        await updateBlog.mutateAsync({ id: editing.id, ...form });
        toast.success("Blog updated!");
      } else {
        await createBlog.mutateAsync(form);
        toast.success("Blog created!");
      }
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Error saving blog");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blog post?")) return;
    try {
      await deleteBlog.mutateAsync(id);
      toast.success("Blog deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleStatus = async (blog: Blog) => {
    const newStatus = blog.status === "published" ? "draft" : "published";
    await updateBlog.mutateAsync({ id: blog.id, status: newStatus });
    toast.success(`Blog ${newStatus}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const filtered = useMemo(() =>
    blogs.filter(b => {
      const matchCat = activeCat === "All" || b.category?.toLowerCase() === activeCat.toLowerCase();
      const matchSearch = b.title.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    }), [blogs, search, activeCat]);

  const stats = useMemo(() => ({
    total: blogs.length,
    published: blogs.filter(b => b.status === "published").length,
    draft: blogs.filter(b => b.status === "draft").length,
  }), [blogs]);

  if (isLoading) return <JetraLoader />;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">X</span>
            </div>
            <span className="text-sm font-semibold text-foreground hidden sm:block">Atlas Dashboard</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden sm:flex items-center gap-5">
            {NAV_ITEMS.map(item => (
              <button key={item} onClick={() => setActiveNav(item)}
                className={`text-sm font-medium transition-colors ${activeNav === item ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
            <button className="sm:hidden w-8 h-8 flex items-center justify-center" onClick={() => setMobileMenu(!mobileMenu)}>
              {mobileMenu ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenu && (
          <div className="sm:hidden border-t border-border px-4 py-3 flex gap-4">
            {NAV_ITEMS.map(item => (
              <button key={item} onClick={() => { setActiveNav(item); setMobileMenu(false); }}
                className={`text-sm font-medium ${activeNav === item ? "text-foreground" : "text-muted-foreground"}`}>
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Title + New */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-lg font-bold text-foreground">Blog Posts</h1>
            <p className="text-xs text-muted-foreground">Manage all Atlas blog content</p>
          </div>
          <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="w-3.5 h-3.5" /> New Post
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total", value: stats.total },
            { label: "Published", value: stats.published },
            { label: "Drafts", value: stats.draft },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold text-foreground mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Category Tabs */}
        <div className="flex gap-4 overflow-x-auto pb-3 mb-4 scrollbar-none">
          {CATEGORY_TABS.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className={`text-xs font-medium whitespace-nowrap pb-1 transition-colors ${
                activeCat === cat ? "text-foreground border-b-2 border-foreground" : "text-muted-foreground hover:text-foreground"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="h-8 pl-8 bg-muted/30 text-xs" placeholder="Search posts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-card border border-border rounded-xl p-4 mb-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{editing ? "Edit Post" : "New Post"}</h2>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={resetForm}>Cancel</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</Label>
                <Input className="h-8 mt-1 bg-muted/30 text-xs" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "") }))} />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Slug</Label>
                <Input className="h-8 mt-1 bg-muted/30 text-xs" value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="h-8 mt-1 bg-muted/30 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOG_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Author</Label>
                <Input className="h-8 mt-1 bg-muted/30 text-xs" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Read Time</Label>
                <Input className="h-8 mt-1 bg-muted/30 text-xs" value={form.read_time} onChange={e => setForm(f => ({ ...f, read_time: e.target.value }))} />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-8 mt-1 bg-muted/30 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <BlogImageUpload value={form.image_url} onChange={(url) => setForm(f => ({ ...f, image_url: url }))} />
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Short Description</Label>
              <Textarea className="mt-1 bg-muted/30 min-h-[60px] text-xs" value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Content</Label>
              <div className="mt-1">
                <RichTextEditor content={form.content} onChange={(html) => setForm(f => ({ ...f, content: html }))} />
              </div>
            </div>
            <Button size="sm" className="h-8 text-xs" onClick={handleSave} disabled={createBlog.isPending || updateBlog.isPending}>
              {editing ? "Update" : "Publish"} Post
            </Button>
          </div>
        )}

        {/* Blog List */}
        <div className="space-y-2">
          {filtered.map(blog => (
            <div key={blog.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-3 hover:border-primary/20 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-medium text-foreground truncate">{blog.title}</h3>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[blog.status || "draft"]}`}>
                    {blog.status}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {blog.category} · {blog.author} · {new Date(blog.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 ml-3">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(blog)}>
                  {blog.status === "published" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(blog)}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(blog.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground">No posts found</p>
              <Button variant="outline" size="sm" className="mt-3 text-xs h-8" onClick={() => { resetForm(); setShowForm(true); }}>
                Create your first post
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogDashboard;
