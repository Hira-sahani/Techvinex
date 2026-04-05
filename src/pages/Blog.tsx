import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBlogs } from "@/hooks/useBlogs";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

const CATEGORIES = ["All", "Company", "Research", "Team", "Stories"];

const NAV_TABS = ["APEX", "Research", "Enterprise", "Blog"] as const;
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
      {activeNav === "APEX" && <ApexContent />}
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
const ApexContent = () => (
  <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-24">
    <div className="text-center mb-12">
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">APEX Benchmarks</h1>
      <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
        The APEX family of benchmarks assesses whether frontier AI models can perform economically valuable tasks across professional services, medicine, software engineering, and consumer activities.
      </p>
      <Link to="/#cta" className="inline-block mt-6 px-5 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
        Get in touch
      </Link>
    </div>

    <div className="space-y-12">
      {/* APEX-Agents */}
      <BenchmarkSection
        title="APEX-Agents"
        description="The AI Productivity Index for Agents (APEX-Agents) measures whether frontier AI agents can execute long-horizon, cross-application tasks across three jobs in professional services."
        tags={["Blog", "Paper", "Data", "Code", "Sample task"]}
        results={[
          { model: "GPT 5.4 (xHigh)", score: 36.0, margin: 3.8, color: "bg-amber-400" },
          { model: "GPT 5.2 (xHigh)", score: 34.4, margin: 3.8, color: "bg-yellow-400" },
          { model: "Gemini 3.1 Pro (High)", score: 33.5, margin: 3.6, color: "bg-blue-500" },
        ]}
      />

      {/* APEX-SWE */}
      <BenchmarkSection
        title="APEX-SWE"
        description="The AI Productivity Index for Software Engineers (APEX-SWE) measures whether frontier AI agents can execute high-value engineering work, split across Observability and Integration tasks."
        tags={["Blog", "Paper", "Data", "Code", "Sample task"]}
        results={[
          { model: "GPT 5.3 Codex (High)", score: 41.5, margin: 6.3, color: "bg-amber-400" },
          { model: "Opus 4.6 (High)", score: 40.5, margin: 6.3, color: "bg-orange-500" },
          { model: "Opus 4.5 (High)", score: 38.7, margin: 6.3, color: "bg-orange-500" },
        ]}
      />

      {/* APEX */}
      <BenchmarkSection
        title="APEX"
        description="The AI Productivity Index (APEX) assesses whether frontier models are capable of performing economically valuable tasks across four jobs: investment banking, management consulting, big law, and primary care physician."
        tags={["Blog", "Paper", "Data", "Code", "Sample task"]}
        results={[
          { model: "GPT 5.4 (High)", score: 67.2, margin: 2.4, color: "bg-amber-400" },
          { model: "Opus 4.6 (Max)", score: 65.7, margin: 2.6, color: "bg-orange-500" },
          { model: "Gemini 3.1 Pro (High)", score: 63.1, margin: 2.5, color: "bg-blue-500" },
        ]}
      />
    </div>
  </main>
);

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
