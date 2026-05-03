import { useNavigate } from "react-router-dom";
import { SkeletonCard } from "@/components/skeletons/Skeleton";
import { ChevronLeft, ChevronRight, Star, MapPin, Briefcase } from "lucide-react";
import { useExploreJobs } from "@/hooks/useExploreJobs";
import { useRoles } from "@/hooks/useRoles";
import { useLang } from "@/contexts/LangContext";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";

const RolesSection = () => {
  const { t } = useLang();
  const navigate = useNavigate();
  const { data: exploreJobs = [], isLoading: ejLoading } = useExploreJobs(false);
  const { data: legacyRoles = [], isLoading: rolesLoading } = useRoles();

  const isLoading = ejLoading && rolesLoading;

  // Merge: explore_jobs first (featured priority), then legacy roles
  const displayJobs = useMemo(() => {
    const fromExplore = exploreJobs.map(j => ({
      id: j.id,
      title: j.title,
      pay: j.show_salary ? (j.budget || "") : "",
      location: j.location,
      jobType: j.job_type,
      featured: j.featured,
      slug: j.slug,
      skills: j.skills,
      source: "explore" as const,
    }));
    const fromLegacy = legacyRoles.map(r => ({
      id: r.id,
      title: r.title,
      pay: r.pay,
      location: r.location,
      jobType: r.type,
      featured: false,
      slug: null as string | null,
      skills: [] as string[],
      source: "legacy" as const,
    }));
    return [
      ...fromExplore.filter(j => j.featured),
      ...fromExplore.filter(j => !j.featured),
      ...fromLegacy,
    ].slice(0, 8);
  }, [exploreJobs, legacyRoles]);

  const handleClick = (job: typeof displayJobs[0]) => {
    if (job.source === "explore" && job.slug) {
      navigate(`/jobs/${job.slug}`);
    } else {
      navigate(`/role/${job.id}`);
    }
  };

  return (
    <section id="roles" className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">{t("roles.latest")}</h2>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayJobs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">{t("explore.noResults") || "No open positions right now. Check back soon!"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayJobs.map((job) => (
              <div
                key={job.id}
                onClick={() => handleClick(job)}
                className={`group border rounded-xl p-5 bg-card hover:shadow-card-hover transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                  job.featured ? "border-primary/40 ring-1 ring-primary/10" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <h3 className="font-semibold text-foreground text-sm line-clamp-2">{job.title}</h3>
                  {job.featured && <Star size={12} className="text-yellow-500 fill-yellow-500 flex-shrink-0 mt-0.5" />}
                </div>
                <p className="text-xs text-muted-foreground mb-1">{job.pay || "Competitive"}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-3">
                  <span className="flex items-center gap-0.5"><MapPin size={9} /> {job.location || "Remote"}</span>
                  <span className="flex items-center gap-0.5 capitalize"><Briefcase size={9} /> {job.jobType || "Contract"}</span>
                </div>
                {job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {job.skills.slice(0, 3).map(s => (
                      <span key={s} className="px-1.5 py-0.5 rounded bg-secondary text-[9px] text-muted-foreground">{s}</span>
                    ))}
                  </div>
                )}
                <span className="text-xs font-medium text-primary group-hover:underline">View Details</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default RolesSection;
