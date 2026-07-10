import { useState, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, Eye, Play, Pause } from "lucide-react";
import { useBlogs, useCreateBlog, useUpdateBlog, useDeleteBlog, type Blog } from "@/hooks/useBlogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AdminBlogsSkeleton } from "@/components/skeletons/DashboardSkeletons";
import { useRef } from "react";
import BlogImageUpload, { type BlogImageUploadHandle } from "@/components/blog-dashboard/BlogImageUpload";

const statusColors: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-600",
  published: "bg-emerald-500/10 text-emerald-600",
};

const AdminBlogs = () => {
  const { data: blogs = [], isLoading } = useBlogs(true);
  const createBlog = useCreateBlog();
  const updateBlog = useUpdateBlog();
  const deleteBlog = useDeleteBlog();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Blog | null>(null);

  // Form state
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
    if (!form.title || !form.slug) { toast.error("Title and slug are required"); return; }
    try {
      if (editing) {
        await updateBlog.mutateAsync({ id: editing.id, ...form });
        toast.success("Blog updated");
      } else {
        await createBlog.mutateAsync(form);
        toast.success("Blog created");
      }
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Error saving blog");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this blog?")) return;
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

  const filtered = useMemo(() =>
    blogs.filter(b =>
      (statusFilter === "all" || b.status === statusFilter) &&
      b.title.toLowerCase().includes(search.toLowerCase())
    ), [blogs, search, statusFilter]);

  const stats = useMemo(() => ({
    total: blogs.length,
    published: blogs.filter(b => b.status === "published").length,
    draft: blogs.filter(b => b.status === "draft").length,
  }), [blogs]);

  if (isLoading) return <AdminBlogsSkeleton />;

  if (showForm) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{editing ? "Edit Blog" : "New Blog"}</h2>
          <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
        </div>
        <div className="grid gap-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Title</Label>
              <Input className="h-8 mt-1 bg-muted/30" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-$/, "") }))} />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Slug</Label>
              <Input className="h-8 mt-1 bg-muted/30" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-8 mt-1 bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="research">Research</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="stories">Stories</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Author</Label>
              <Input className="h-8 mt-1 bg-muted/30" value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Read Time</Label>
              <Input className="h-8 mt-1 bg-muted/30" value={form.read_time} onChange={e => setForm(f => ({ ...f, read_time: e.target.value }))} />
            </div>
          </div>
          <BlogImageUpload
            value={form.image_url}
            originalValue={editing?.image_url || ""}
            onChange={(url) => setForm(f => ({ ...f, image_url: url }))}
            ref={imageUploadRef}
          />

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Short Description</Label>
            <Textarea className="mt-1 bg-muted/30 min-h-[60px]" value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Content (HTML)</Label>
            <Textarea className="mt-1 bg-muted/30 min-h-[200px] font-mono text-xs" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="h-8 mt-1 bg-muted/30 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleSave} disabled={createBlog.isPending || updateBlog.isPending}>
            {editing ? "Update" : "Create"} Blog
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Blog Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Create and manage Atlas blog articles</p>
        </div>
        <Button size="sm" className="gap-1.5 h-8 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> New Blog
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Published", value: stats.published },
          { label: "Drafts", value: stats.draft },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className="text-lg font-semibold text-foreground mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input className="h-8 pl-8 bg-muted/30 text-xs" placeholder="Search blogs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-28 bg-muted/30 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(blog => (
          <div key={blog.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3 hover:border-primary/20 transition-colors">
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
          <div className="text-center py-10">
            <p className="text-xs text-muted-foreground">No blogs found</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => { resetForm(); setShowForm(true); }}>
                <Plus className="w-3 h-3" />
                {blogs.length === 0 ? "Create first blog" : "New blog"}
              </Button>
              {(search || statusFilter !== "all") && (
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBlogs;
