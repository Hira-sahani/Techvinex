import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const BRAND = "#5B4CF0";

const Opportunities = () => {
  useDocumentMeta({ title: "Opportunities · Techvinex", description: "Browse remote AI roles." });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("explore_jobs")
        .select("id, slug, title, budget, location, job_type, created_at, tags, featured, short_description")
        .eq("status", "published")
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-10">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: BRAND }}>T</div>
            <span className="font-semibold text-slate-900">Techvinex</span>
          </Link>
          <Link to="/login" className="text-sm px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700">Sign in</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Opportunities</h1>
          <p className="text-slate-500">Remote roles. Hourly contracts. Work with leading AI labs.</p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-3">
            {jobs.map((job: any) => (
              <Link
                key={job.id}
                to={`/opportunities/${job.slug}`}
                className="block bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">{job.title}</h2>
                    {job.short_description && (
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{job.short_description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1"><Clock size={12} /> {job.job_type}</span>
                      <span className="inline-flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                      <span className="inline-flex items-center gap-1 font-medium" style={{ color: BRAND }}>
                        <Sparkles size={12} /> New opportunity
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-slate-900">{job.budget}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            {jobs.length === 0 && (
              <div className="text-center text-slate-400 py-12">No opportunities yet.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Opportunities;
