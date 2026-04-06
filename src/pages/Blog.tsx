import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBlogs } from "@/hooks/useBlogs";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["All", "Company", "Research", "Team", "Stories"];

const NAV_TABS = ["ATLAS", "Research", "Enterprise", "Blog"] as const;
type NavTab = (typeof NAV_TABS)[number];

const Blog = () => {
  const { data: blogs = [], isLoading } = useBlogs();
  const [activeNav, setActiveNav] = useState<NavTab>("Blog");
  const [activeCategory, setActiveCategory] = useState("All");

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
    if (activeCategory === "All") return publishedBlogs;
    return publishedBlogs.filter(
      (b) => b.category?.toLowerCase() === activeCategory.toLowerCase()
    );
  }, [publishedBlogs, activeCategory]);

  const featured = filtered[0];
  const rest = filtered.slice(1);

  const categoryGroups = useMemo(() => {
    if (activeCategory !== "All") return [];
    const groups: Record<string, typeof publishedBlogs> = {};
    publishedBlogs.forEach((b) => {
      const cat = b.category || "Uncategorized";
      const key = cat.charAt(0).toUpperCase() + cat.slice(1);
      if (!groups[key]) groups[key] = [];
      groups[key].push(b);
    });
    return Object.entries(groups);
  }, [publishedBlogs, activeCategory]);

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
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">J</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveNav(tab);
                  if (tab === "Blog") setActiveCategory("All");
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
                  activeNav === tab
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Log in
          </Link>
        </div>
      </header>

      {/* Content based on active nav tab */}
      {activeNav === "ATLAS" && <ApexContent />}
      {activeNav === "Research" && <ResearchContent />}
      {activeNav === "Enterprise" && <EnterpriseContent />}
      {activeNav === "Blog" && (
        <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-24">
          <div className="flex items-baseline gap-6 mb-8 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">Blog</h1>
            <div className="flex items-center gap-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-sm transition-colors ${
                    activeCategory === cat
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
              {featured && (
                <Link to={`/blog/${featured.slug}`} className="block mb-12 group">
                  <div className="border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
                    {featured.image_url && (
                      <div className="w-full h-56 sm:h-72 overflow-hidden bg-muted">
                        <img src={featured.image_url} alt={featured.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
                      </div>
                    )}
                    <div className="p-5 sm:p-6">
                      <p className="text-xs text-muted-foreground mb-2">{formatDate(featured.created_at)}</p>
                      <h2 className="text-xl sm:text-2xl font-semibold text-foreground leading-snug mb-2">{featured.title}</h2>
                      {featured.short_description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{featured.short_description}</p>}
                      {featured.category && <span className="text-xs text-muted-foreground">{featured.category}</span>}
                    </div>
                  </div>
                </Link>
              )}

              {activeCategory === "All" && categoryGroups.length > 0 ? (
                <div className="space-y-12">
                  {categoryGroups.map(([category, posts]) => (
                    <section key={category}>
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-foreground">{category}</h2>
                        <button onClick={() => setActiveCategory(category)} className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rest.map((blog) => (
                    <BlogCard key={blog.id} blog={blog} formatDate={formatDate} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>
      )}

      <Footer />
    </div>
  );
};

/* ── APEX Tab Content ── */
const ApexContent = () => {
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<
    Record<string, { model: string; score: number; maxScore: number; count: number; avgLatency: number }[]>
  >({});
  const [totalTasks, setTotalTasks] = useState(0);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [tasksRes, resultsRes] = await Promise.all([
        supabase.from("benchmark_tasks").select("id, category, title", { count: "exact" }).eq("is_active", true),
        supabase.from("benchmark_results").select("model, score, max_score, latency_ms, pass_at_1, benchmark_tasks(category, title)"),
      ]);

      setTotalTasks(tasksRes.count || 0);
      const results = resultsRes.data || [];
      setTotalResults(results.length);

      // Group by category, then aggregate by model
      const grouped: Record<string, Record<string, { totalScore: number; totalMax: number; count: number; totalLatency: number }>> = {};
      results.forEach((r: any) => {
        const cat = r.benchmark_tasks?.category || "General";
        const model = r.model || "Unknown";
        if (!grouped[cat]) grouped[cat] = {};
        if (!grouped[cat][model]) grouped[cat][model] = { totalScore: 0, totalMax: 0, count: 0, totalLatency: 0 };
        grouped[cat][model].totalScore += Number(r.score || 0);
        grouped[cat][model].totalMax += Number(r.max_score || 100);
        grouped[cat][model].count += 1;
        grouped[cat][model].totalLatency += Number(r.latency_ms || 0);
      });

      const processed: typeof categoryData = {};
      Object.entries(grouped).forEach(([cat, models]) => {
        processed[cat] = Object.entries(models)
          .map(([model, data]) => ({
            model,
            score: data.totalMax > 0 ? (data.totalScore / data.totalMax) * 100 : 0,
            maxScore: data.totalMax,
            count: data.count,
            avgLatency: Math.round(data.totalLatency / data.count),
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      });
      setCategoryData(processed);
      setLoading(false);
    };
    fetchData();
  }, []);

  const modelColors = ["bg-amber-400", "bg-blue-500", "bg-orange-500", "bg-emerald-500", "bg-purple-500"];
  const categories = Object.keys(categoryData);

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24">
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">APEX Benchmarks</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Real-time AI model evaluation results from the Atlas Benchmark platform — measuring performance across categories with standardized scoring.
        </p>
        <div className="flex items-center justify-center gap-4 mt-6 text-sm">
          <span className="text-muted-foreground"><strong className="text-foreground">{totalTasks}</strong> Tasks</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground"><strong className="text-foreground">{totalResults}</strong> Results</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground"><strong className="text-foreground">{categories.length}</strong> Categories</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-t border-border pt-8 space-y-3">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground text-sm">No benchmark results yet. Run your first benchmark test!</p>
          <Link to="/benchmark" className="inline-block mt-4 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
            Go to Benchmark
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {categories.map((cat) => (
            <section key={cat} className="border-t border-border pt-8">
              <h2 className="text-xl font-bold text-foreground mb-1 capitalize">{cat}</h2>
              <p className="text-xs text-muted-foreground mb-5">
                {categoryData[cat].reduce((s, m) => s + m.count, 0)} test runs across {categoryData[cat].length} models
              </p>
              <div className="space-y-3">
                {categoryData[cat].map((r, idx) => (
                  <div key={r.model}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{r.model}</span>
                      <span className="text-xs text-muted-foreground">
                        {r.score.toFixed(1)}% · {r.avgLatency}ms · {r.count} runs
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className={`${modelColors[idx % modelColors.length]} h-2.5 rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(r.score, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
};

/* ── Research Tab Content ── */
const ResearchContent = () => (
  <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24">
    <div className="text-center mb-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Frontier data for frontier AI</h1>
      <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
        We develop benchmarks, evaluation environments, and large-scale human datasets to fuel AI breakthroughs at the frontier, all through our marketplace of top-tier experts.
      </p>
      <Link to="/#cta" className="inline-block mt-6 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
        View benchmarks
      </Link>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-16">
      {[
        { value: "1M+", label: "Annotations" },
        { value: "10K+", label: "Experts" },
        { value: "100+", label: "Domains" },
        { value: "4", label: "Benchmarks" },
      ].map((s) => (
        <div key={s.label} className="text-center">
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</p>
          <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
        </div>
      ))}
    </div>

    {/* Sections */}
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold text-foreground mb-3">Data, evals, and post-training at the frontier</h2>
        <p className="text-sm text-muted-foreground mb-6">Jetra is used by the top AI labs to produce specialized data at scale.</p>
      </div>
      {[
        { title: "Frontier data", desc: "When model capabilities reach their limits, progress depends on data quality. Our talent platform mobilizes deep subject-matter experts across professional and consumer domains to produce specialized data at scale." },
        { title: "Model improvements", desc: "Continuous fine-tuning and evaluation pipelines to push model performance on real-world professional tasks." },
        { title: "RL environments", desc: "Custom reinforcement learning environments designed for complex decision-making in professional service domains." },
      ].map((item) => (
        <div key={item.title} className="border-l-2 border-primary/20 pl-4 py-2">
          <h3 className="text-base font-medium text-foreground mb-1">{item.title}</h3>
          <p className="text-sm text-muted-foreground">{item.desc}</p>
        </div>
      ))}
    </div>
  </main>
);

/* ── Enterprise Tab Content ── */
const EnterpriseContent = () => (
  <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24">
    <div className="text-center mb-12">
      <p className="text-xs text-muted-foreground mb-2">Jetra · Enterprise</p>
      <h1 className="text-2xl text-muted-foreground/50 font-light mb-1">Missing layer:</h1>
      <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Your definition of "good"</h2>
      <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6">
        Generic models are powerful but don't know how your teams work. Like an employee, enterprise AI needs to be onboarded on your tools, workflows, and standards — with built-in feedback infrastructure that compounds learning over time.
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link to="/#cta" className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          Get in touch
        </Link>
        <button className="px-5 py-2.5 border border-border text-sm font-medium rounded-lg text-foreground hover:bg-muted transition-colors">
          How it works
        </button>
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-16">
      {[
        { value: "$10B", label: "Valuation" },
        { value: "$1B+", label: "Revenue Run Rate" },
        { value: "100k+", label: "Contractors Hired" },
        { value: "400+", label: "Full-time Employees" },
      ].map((s) => (
        <div key={s.label} className="text-center">
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{s.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
        </div>
      ))}
    </div>

    {/* Platform section */}
    <div className="text-center mb-8">
      <span className="text-xs border border-border rounded-full px-3 py-1 text-muted-foreground">Platform</span>
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mt-4 mb-2">Build AI agents designed for your company</h2>
      <p className="text-sm text-muted-foreground max-w-lg mx-auto">
        Weeks, not years. Our platform converts your internal data, workflows, and domain expertise into agents that operate like your team.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[
        { title: "Absorb organizational context", desc: "Map workflows, ingest company knowledge, and conduct AI-moderated interviews to build your organizational context graph.", timeline: "WEEK 1-2" },
        { title: "Specify agent behavior", desc: "Turn your context graph into programmatically defined agent behavior specs and quality guardrails.", timeline: "WEEK 2-3" },
        { title: "Deploy & monitor", desc: "Launch agents into production with real-time monitoring, feedback loops, and continuous improvement.", timeline: "WEEK 3-4" },
        { title: "Compound learning", desc: "Agents learn from every interaction, building institutional knowledge that compounds over time.", timeline: "ONGOING" },
      ].map((item) => (
        <div key={item.title} className="border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-primary mb-1">{item.title}</h3>
          <p className="text-xs text-muted-foreground mb-3">{item.desc}</p>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.timeline}</span>
        </div>
      ))}
    </div>
  </main>
);

/* ── Benchmark Section Component ── */
const BenchmarkSection = ({
  title,
  description,
  tags,
  results,
}: {
  title: string;
  description: string;
  tags: string[];
  results: { model: string; score: number; margin: number; color: string }[];
}) => (
  <section className="border-t border-border pt-8">
    <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
    <p className="text-sm text-muted-foreground mb-4 max-w-2xl">{description}</p>
    <div className="flex flex-wrap gap-2 mb-5">
      {tags.map((tag) => (
        <span key={tag} className="text-xs border border-border rounded-full px-3 py-1 text-foreground">{tag}</span>
      ))}
    </div>
    <div className="space-y-3">
      {results.map((r) => (
        <div key={r.model}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">{r.model}</span>
            <span className="text-xs text-muted-foreground">{r.score.toFixed(1)}% ± {r.margin.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className={`${r.color} h-2.5 rounded-full`} style={{ width: `${r.score}%` }} />
          </div>
        </div>
      ))}
      {/* Scale */}
      <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
          <span key={v}>{v}%</span>
        ))}
      </div>
    </div>
  </section>
);

/* ── Blog Card Component ── */
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
  <Link to={`/blog/${blog.slug}`} className="group block border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors">
    {blog.image_url ? (
      <div className="w-full h-40 overflow-hidden bg-muted">
        <img src={blog.image_url} alt={blog.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
      </div>
    ) : null}
    <div className="p-4">
      <p className="text-xs text-muted-foreground mb-2">{formatDate(blog.created_at)}</p>
      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-1">{blog.title}</h3>
      {blog.short_description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{blog.short_description}</p>}
      {blog.category && <span className="text-[11px] text-muted-foreground">{blog.category}</span>}
    </div>
  </Link>
);

export default Blog;
