import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, Users, X, ChevronDown, Share2, Sparkles, Target, Bookmark, BookmarkCheck, Star, MapPin, Briefcase, Clock } from "lucide-react";
import { useExploreJobs, useUserBookmarks, useBookmarkJob } from "@/hooks/useExploreJobs";
import type { ExploreJob } from "@/hooks/useExploreJobs";

import SidebarNav from "@/components/SidebarNav";
import TopStatusBar from "@/components/TopStatusBar";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import NotificationBell from "@/components/NotificationBell";
import PageDotLoader from "@/components/PageDotLoader";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Fallback to old roles hook if no explore_jobs exist
import { useRoles } from "@/hooks/useRoles";
import type { Role } from "@/hooks/useRoles";

const ITEMS_PER_PAGE = 12;

const payRanges = ["All", "$25-50/hr", "$50-100/hr", "$100+/hr", "Monthly"];
const sortOptions = ["Best match", "Pay: High to Low", "Pay: Low to High", "Most popular"];

const avatarColors = [
  "bg-red-400", "bg-blue-500", "bg-green-500", "bg-yellow-400",
  "bg-purple-500", "bg-pink-400", "bg-orange-400", "bg-teal-500",
];

// Unified job type for display
interface DisplayJob {
  id: string;
  title: string;
  pay: string;
  description: string;
  location: string;
  jobType: string;
  skills: string[];
  tags: string[];
  featured: boolean;
  slug: string | null;
  category: string;
  hiredCount: number;
  referralBonus?: string;
  contingent?: boolean;
  showCompany: boolean;
  companyName: string | null;
  urgency: string;
  allowDirectApply: boolean;
  autoMatchOnly: boolean;
  source: "explore" | "legacy";
}

function exploreToDisplay(j: ExploreJob): DisplayJob {
  return {
    id: j.id,
    title: j.title,
    pay: j.show_salary ? (j.budget || "") : "",
    description: j.short_description || j.description || "",
    location: j.location,
    jobType: j.job_type,
    skills: j.skills,
    tags: j.tags,
    featured: j.featured,
    slug: j.slug,
    category: j.tags[0] || "General",
    hiredCount: j.applications_count,
    showCompany: j.show_company,
    companyName: j.company_name,
    urgency: j.urgency,
    allowDirectApply: j.allow_direct_apply,
    autoMatchOnly: j.auto_match_only,
    source: "explore",
  };
}

function roleToDisplay(r: Role): DisplayJob {
  return {
    id: r.id,
    title: r.title,
    pay: r.pay,
    description: r.description,
    location: r.location,
    jobType: r.type,
    skills: [],
    tags: [r.category],
    featured: false,
    slug: null,
    category: r.category,
    hiredCount: r.hiredCount,
    referralBonus: r.referralBonus,
    contingent: r.contingent,
    showCompany: false,
    companyName: null,
    urgency: "normal",
    allowDirectApply: true,
    autoMatchOnly: false,
    source: "legacy",
  };
}

const Explore = () => {
  const navigate = useNavigate();
  const { t } = useLang();
  const { user } = useAuth();
  const { data: exploreJobs = [], isLoading: exploreLoading } = useExploreJobs(false);
  const { data: legacyRoles = [], isLoading: rolesLoading } = useRoles();
  const { data: bookmarks = [] } = useUserBookmarks(user?.id);
  const bookmarkMutation = useBookmarkJob();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPay, setSelectedPay] = useState("All");
  const [selectedJobType, setSelectedJobType] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("Best match");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Merge explore_jobs (priority) + legacy roles
  const allJobs: DisplayJob[] = useMemo(() => {
    const fromExplore = exploreJobs.map(exploreToDisplay);
    const fromLegacy = legacyRoles.map(roleToDisplay);
    // Featured first, then explore jobs, then legacy
    return [
      ...fromExplore.filter(j => j.featured),
      ...fromExplore.filter(j => !j.featured),
      ...fromLegacy,
    ];
  }, [exploreJobs, legacyRoles]);

  const isLoading = exploreLoading && rolesLoading;

  const categories = useMemo(() => [...new Set(allJobs.flatMap(j => j.tags.length > 0 ? j.tags : [j.category]))], [allJobs]);
  const skillsList = useMemo(() => [...new Set(allJobs.flatMap(j => j.skills))], [allJobs]);
  const jobTypes = useMemo(() => [...new Set(allJobs.map(j => j.jobType).filter(Boolean))], [allJobs]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const matchesPay = (job: DisplayJob) => {
    if (selectedPay === "All") return true;
    const pay = job.pay.toLowerCase();
    if (selectedPay === "Monthly") return pay.includes("month");
    if (selectedPay === "$25-50/hr") return pay.includes("hour") && parseFloat(pay.replace(/[^0-9.]/g, "")) <= 50;
    if (selectedPay === "$50-100/hr") return pay.includes("hour") && parseFloat(pay.replace(/[^0-9.]/g, "")) > 50 && parseFloat(pay.replace(/[^0-9.]/g, "")) <= 100;
    if (selectedPay === "$100+/hr") return pay.includes("hour") && parseFloat(pay.replace(/[^0-9.]/g, "")) > 100;
    return true;
  };

  if (isLoading) return <PageDotLoader />;


  const filteredJobs = allJobs
    .filter((job) =>
      (job.title.toLowerCase().includes(search.toLowerCase()) ||
       job.description.toLowerCase().includes(search.toLowerCase()) ||
       job.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))) &&
      (!selectedCategory || job.tags.includes(selectedCategory) || job.category === selectedCategory) &&
      (!selectedJobType || job.jobType === selectedJobType) &&
      (!selectedSkill || job.skills.includes(selectedSkill)) &&
      matchesPay(job)
    )
    .sort((a, b) => {
      // Featured always first
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      if (sortBy === "Pay: High to Low") return parseFloat(b.pay.replace(/[^0-9.]/g, "") || "0") - parseFloat(a.pay.replace(/[^0-9.]/g, "") || "0");
      if (sortBy === "Pay: Low to High") return parseFloat(a.pay.replace(/[^0-9.]/g, "") || "0") - parseFloat(b.pay.replace(/[^0-9.]/g, "") || "0");
      if (sortBy === "Most popular") return b.hiredCount - a.hiredCount;
      return 0;
    });

  const activeFilterCount = (selectedCategory ? 1 : 0) + (selectedPay !== "All" ? 1 : 0) + (selectedJobType ? 1 : 0) + (selectedSkill ? 1 : 0);
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const paginatedJobs = filteredJobs.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleJobClick = (job: DisplayJob) => {
    if (job.source === "explore" && job.slug) {
      navigate(`/jobs/${job.slug}`);
    } else {
      navigate(`/role/${job.id}`);
    }
  };

  const handleBookmark = (e: React.MouseEvent, job: DisplayJob) => {
    e.stopPropagation();
    if (!user) { toast.error("Please sign in"); return; }
    if (job.source === "explore") {
      bookmarkMutation.mutate({ jobId: job.id, userId: user.id });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 4) {
        pages.push(1, 2, 3, 4, "...", totalPages - 1, totalPages);
      } else if (page >= totalPages - 3) {
        pages.push(1, 2, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", page - 1, page, page + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />

      <div className="ml-16 pb-20">
        <TopStatusBar currentStep={2} />

        <div className="px-4 sm:px-6 pt-4">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Sparkles size={20} className="text-primary" />
                  Explore Opportunities
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {allJobs.length} curated roles • AI-matched to your profile
                </p>
              </div>
              <div className="flex items-center gap-3 md:hidden">
                <NotificationBell />
                <ProfileDropdown />
              </div>
            </div>

            {/* Search bar */}
            <div className="relative mb-4 flex items-center gap-0">
              <div ref={filterRef} className="relative">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-10 w-10 flex items-center justify-center border border-border border-r-0 rounded-l-lg bg-background hover:bg-secondary transition-colors relative"
                >
                  <SlidersHorizontal size={15} className="text-muted-foreground" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {showFilters && (
                  <div className="absolute left-0 top-12 w-72 bg-card border border-border rounded-xl shadow-lg z-50 p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Filters</span>
                      <button onClick={() => { setSelectedCategory(null); setSelectedPay("All"); setSelectedJobType(null); setSelectedSkill(null); }} className="text-xs text-primary hover:underline">
                        Clear all
                      </button>
                    </div>

                    {/* Category / Tags */}
                    {categories.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Category</p>
                        <div className="flex flex-wrap gap-1.5">
                          {categories.slice(0, 12).map((cat) => (
                            <button
                              key={cat}
                              onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setPage(1); }}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                selectedCategory === cat
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-foreground hover:bg-accent"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {skillsList.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {skillsList.slice(0, 10).map((skill) => (
                            <button
                              key={skill}
                              onClick={() => { setSelectedSkill(selectedSkill === skill ? null : skill); setPage(1); }}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                selectedSkill === skill
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-foreground hover:bg-accent"
                              }`}
                            >
                              {skill}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Job Type */}
                    {jobTypes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Job Type</p>
                        <div className="flex flex-wrap gap-1.5">
                          {jobTypes.map((jt) => (
                            <button
                              key={jt}
                              onClick={() => { setSelectedJobType(selectedJobType === jt ? null : jt); setPage(1); }}
                              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                                selectedJobType === jt
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary text-foreground hover:bg-accent"
                              }`}
                            >
                              {jt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Pay Range */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Pay Range</p>
                      <div className="flex flex-wrap gap-1.5">
                        {payRanges.map((range) => (
                          <button
                            key={range}
                            onClick={() => { setSelectedPay(range); setPage(1); }}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                              selectedPay === range
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-foreground hover:bg-accent"
                            }`}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setShowFilters(false)}
                      className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      Apply Filters
                    </button>
                  </div>
                )}
              </div>

              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Search by title, skill, or keyword..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full h-10 pl-9 pr-3 text-sm border border-border rounded-r-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedCategory && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {selectedCategory}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => { setSelectedCategory(null); setPage(1); }} />
                  </span>
                )}
                {selectedSkill && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {selectedSkill}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => { setSelectedSkill(null); setPage(1); }} />
                  </span>
                )}
                {selectedJobType && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                    {selectedJobType}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => { setSelectedJobType(null); setPage(1); }} />
                  </span>
                )}
                {selectedPay !== "All" && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {selectedPay}
                    <X size={12} className="cursor-pointer hover:text-destructive" onClick={() => { setSelectedPay("All"); setPage(1); }} />
                  </span>
                )}
              </div>
            )}

            {/* Sort & Refer */}
            <div className="flex items-center gap-2 mb-5">
              <div ref={sortRef} className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-xs text-foreground bg-background hover:bg-secondary transition-colors"
                >
                  <span>✨</span>
                  <span className="font-medium">{sortBy}</span>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </button>
                {showSortMenu && (
                  <div className="absolute left-0 top-10 w-44 bg-card border border-border rounded-xl shadow-lg z-50 py-1">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSortBy(opt); setShowSortMenu(false); setPage(1); }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-secondary transition-colors ${
                          sortBy === opt ? "text-primary font-semibold" : "text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate("/referrals")}
                className="flex items-center gap-1.5 h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Users size={13} /> Refer & earn
              </button>
            </div>

            {/* Featured Jobs Banner */}
            {filteredJobs.some(j => j.featured) && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-5 flex items-center gap-3">
                <Star size={16} className="text-primary flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  ⭐ Featured roles are highlighted at the top — curated for high priority hiring.
                </p>
              </div>
            )}

            {/* Job Grid */}
            {paginatedJobs.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {paginatedJobs.map((job) => {
                  const isBookmarked = bookmarks.includes(job.id);
                  return (
                    <div
                      key={job.id}
                      onClick={() => handleJobClick(job)}
                      className={`border rounded-xl p-4 bg-card hover:shadow-sm transition-all cursor-pointer active:scale-[0.98] flex flex-col justify-between ${
                        job.featured ? "border-primary/40 ring-1 ring-primary/10" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="mb-auto">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground text-[15px] leading-snug line-clamp-2">
                              {job.title}
                            </h3>
                            {job.featured && (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[10px] gap-0.5 flex-shrink-0">
                                <Star size={8} className="fill-yellow-500" /> Featured
                              </Badge>
                            )}
                            {job.urgency === "urgent" && (
                              <Badge variant="destructive" className="text-[10px] gap-0.5 flex-shrink-0">
                                <Clock size={8} /> Urgent
                              </Badge>
                            )}
                          </div>
                          {job.source === "explore" && (
                            <button onClick={(e) => handleBookmark(e, job)} className="p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0">
                              {isBookmarked ? <BookmarkCheck size={16} className="text-primary" /> : <Bookmark size={16} className="text-muted-foreground" />}
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                          {job.pay && <span className="font-medium text-foreground">{job.pay}</span>}
                          <span className="flex items-center gap-1"><Briefcase size={11} /> {job.jobType || "Contract"}</span>
                          <span className="flex items-center gap-1"><MapPin size={11} /> {job.location || "Remote"}</span>
                          {job.showCompany && job.companyName && (
                            <span className="font-medium">{job.companyName}</span>
                          )}
                        </div>

                        {/* Skills chips */}
                        {job.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {job.skills.slice(0, 4).map(s => (
                              <span key={s} className="px-2 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground font-medium">{s}</span>
                            ))}
                            {job.skills.length > 4 && (
                              <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] text-muted-foreground">+{job.skills.length - 4}</span>
                            )}
                          </div>
                        )}

                        {job.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {job.hiredCount > 0 ? (
                            <>
                              <div className="flex -space-x-1.5 shrink-0">
                                {[0, 1, 2].map((i) => (
                                  <div
                                    key={i}
                                    className={`w-5 h-5 rounded-full border-[1.5px] border-card ${avatarColors[(job.id.charCodeAt(0) + i) % avatarColors.length]} flex items-center justify-center`}
                                  >
                                    <span className="text-[8px] font-bold text-primary-foreground">
                                      {String.fromCharCode(65 + ((job.id.charCodeAt(1) + i) % 26))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate">
                                {job.hiredCount} applied
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">New listing</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {job.referralBonus && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 shrink-0">
                              <Share2 size={10} />
                              <span className="font-medium">{job.referralBonus}</span>
                            </span>
                          )}
                          {job.allowDirectApply && !job.autoMatchOnly ? (
                            <span className="text-xs font-medium text-primary">Apply →</span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">AI Match</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <Target size={40} className="mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-foreground font-medium mb-1">No opportunities found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or check back later for new listings.</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-8 mb-6">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-2.5 py-1.5 flex items-center gap-0.5"
                >
                  <span>‹</span> Previous
                </button>
                {getPageNumbers().map((p, i) =>
                  p === "..." ? (
                    <span key={i} className="text-xs text-muted-foreground px-1.5">···</span>
                  ) : (
                    <button
                      key={i}
                      onClick={() => setPage(p as number)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        page === p
                          ? "bg-foreground text-background font-semibold"
                          : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 px-2.5 py-1.5 flex items-center gap-0.5"
                >
                  Next <span>›</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      
    </div>
  );
};

export default Explore;
