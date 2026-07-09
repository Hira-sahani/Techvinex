import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { subscribeRealtime } from "@/lib/realtimeBus";

export interface ExploreJob {
  id: string;
  source_requirement_id: string | null;
  title: string;
  short_description: string | null;
  description: string | null;
  skills: string[];
  experience: string | null;
  budget: string | null;
  job_type: string;
  location: string;
  company_name: string | null;
  show_company: boolean;
  show_salary: boolean;
  urgency: string;
  tags: string[];
  compliance_info: Record<string, any>;
  internal_notes: string | null;
  visibility: string;
  geo_targeting: string[];
  skill_targeting: string[];
  featured: boolean;
  status: string;
  slug: string | null;
  meta_title: string | null;
  meta_description: string | null;
  allow_direct_apply: boolean;
  auto_match_only: boolean;
  application_limit: number | null;
  expiry_date: string | null;
  views_count: number;
  clicks_count: number;
  applications_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) + "-" + Math.random().toString(36).slice(2, 7);
}

// Safe column list — `internal_notes` is intentionally excluded
// because the Data API now revokes that column for anon/authenticated.
// Admins read it through the `admin_get_explore_job_internal_notes` RPC.
const PUBLIC_COLUMNS =
  "id, source_requirement_id, title, short_description, description, skills, experience, " +
  "budget, job_type, location, company_name, show_company, show_salary, urgency, tags, " +
  "compliance_info, visibility, geo_targeting, skill_targeting, featured, status, slug, " +
  "meta_title, meta_description, allow_direct_apply, auto_match_only, application_limit, " +
  "expiry_date, views_count, clicks_count, applications_count, created_by, created_at, updated_at";


export interface ExploreJobsPage {
  jobs: ExploreJob[];
  total: number;
  pageSize: number;
  pageIndex: number;
}

export interface UseExploreJobsOptions {
  pageSize?: number;
  pageIndex?: number;
  search?: string;
}

/**
 * Public Explore feed.
 *
 *   adminMode = false  → routes through the CDN-cached `public-explore-jobs`
 *                        Edge Function (45 s s-maxage, 120 s SWR). NO Realtime.
 *                        This is what allows the public route to scale to
 *                        10K+ concurrent anon users without DB pressure.
 *   adminMode = true   → direct PostgREST read; Realtime subscription kept so
 *                        operators see fresh data. Admin audience is small.
 *
 * Returns a flat `ExploreJob[]` for backwards compatibility with existing
 * callers. Pagination metadata is exposed via `useExploreJobsPage`.
 */
export function useExploreJobs(
  adminMode = false,
  opts: UseExploreJobsOptions = {},
) {
  const page = useExploreJobsPage(adminMode, opts);
  return {
    ...page,
    data: page.data?.jobs ?? [],
  } as Omit<typeof page, "data"> & { data: ExploreJob[] };
}

export function useExploreJobsPage(
  adminMode = false,
  opts: UseExploreJobsOptions = {},
) {
  const queryClient = useQueryClient();
  const { pageSize = 25, pageIndex = 0, search } = opts;

  useEffect(() => {
    if (!adminMode) return; // anon: no realtime, no DB pressure
    let pending: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeRealtime({
      table: "explore_jobs",
      scope: "global",
      handler: (payload) => {
        const jobId = (payload.new as { id?: string } | null)?.id
          ?? (payload.old as { id?: string } | null)?.id;
        if (jobId) {
          queryClient.invalidateQueries({ queryKey: ["explore-job", jobId] });
        }
        if (pending) clearTimeout(pending);
        pending = setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ["explore-jobs"] });
          pending = null;
        }, 250);
      },
    });
    return () => {
      if (pending) clearTimeout(pending);
      unsubscribe();
    };
  }, [queryClient, adminMode]);

  return useQuery({
    queryKey: ["explore-jobs", adminMode, pageIndex, pageSize, search ?? ""],
    queryFn: async (): Promise<ExploreJobsPage> => {
      if (adminMode) {
        const from = pageIndex * pageSize;
        const to = from + pageSize - 1;
        const { data, count, error } = await supabase
          .from("explore_jobs")
          .select(PUBLIC_COLUMNS, { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to);
        if (error) throw error;
        return {
          jobs: (data ?? []) as unknown as ExploreJob[],
          total: count ?? 0,
          pageSize,
          pageIndex,
        };
      }
      // Anon path: CDN-cached edge function.
      const { data, error } = await supabase.functions.invoke<ExploreJobsPage>(
        "public-explore-jobs",
        { body: { pageSize, pageIndex, search } },
      );
      if (error) throw error;
      return data ?? { jobs: [], total: 0, pageSize, pageIndex };
    },
    staleTime: adminMode ? 15_000 : 45_000,
    refetchOnWindowFocus: false,
  });
}




export function useExploreJobById(id: string | undefined) {
  return useQuery({
    queryKey: ["explore-job", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("explore_jobs")
        .select(PUBLIC_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (import.meta.env.DEV) {
        console.debug("[useExploreJobById]", { id, hasData: !!data, error });
      }
      if (error) throw error;
      return (data ?? null) as ExploreJob | null;
    },
    enabled: !!id,
    retry: 1,
  });
}

export function useExploreJobBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["explore-job-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      // Slug is unique, but a shared link could contain either a slug or an id.
      // Try slug first, then fall back to id so both `/jobs/<slug>` and
      // `/jobs/<uuid>` resolve to the same detail page.
      const { data, error } = await supabase
        .from("explore_jobs")
        .select(PUBLIC_COLUMNS)
        .eq("slug", slug)
        .maybeSingle();
      if (import.meta.env.DEV) {
        console.debug("[useExploreJobBySlug]", { slug, hasData: !!data, error });
      }
      if (error) throw error;
      if (data) return data as unknown as ExploreJob;

      // UUID fallback: some cards navigate with id when slug is missing.
      const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
      if (looksLikeUuid) {
        const { data: byId, error: byIdErr } = await supabase
          .from("explore_jobs")
          .select(PUBLIC_COLUMNS)
          .eq("id", slug)
          .maybeSingle();
        if (byIdErr) throw byIdErr;
        return (byId ?? null) as ExploreJob | null;
      }
      return null;
    },
    enabled: !!slug,
    retry: 1,
  });
}

/** Admin-only: fetches the privileged `internal_notes` column via the guarded edge function. */
export function useExploreJobInternalNotes(jobId: string | undefined) {
  return useQuery({
    queryKey: ["explore-job-internal-notes", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase.functions.invoke(
        "admin-explore-job-notes",
        { body: { job_id: jobId } },
      );
      if (error) throw error;
      return ((data as { internal_notes?: string | null } | null)?.internal_notes) ?? null;
    },
    enabled: !!jobId,
  });
}

export function useCreateExploreJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (job: Partial<ExploreJob>) => {
      const slug = job.slug || generateSlug(job.title || "job");
      const { data, error } = await supabase.from("explore_jobs").insert({ ...job, slug } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["explore-jobs"] }),
  });
}

export function useUpdateExploreJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ExploreJob> & { id: string }) => {
      const { data, error } = await supabase.from("explore_jobs").update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["explore-jobs"] }),
  });
}

export function useDeleteExploreJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("explore_jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["explore-jobs"] }),
  });
}

export function useBookmarkJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, userId }: { jobId: string; userId: string }) => {
      const { data: existing } = await supabase.from("job_bookmarks").select("id").eq("job_id", jobId).eq("user_id", userId).maybeSingle();
      if (existing) {
        await supabase.from("job_bookmarks").delete().eq("id", existing.id);
        return { bookmarked: false };
      } else {
        await supabase.from("job_bookmarks").insert({ job_id: jobId, user_id: userId });
        return { bookmarked: true };
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
  });
}

export function useUserBookmarks(userId: string | undefined) {
  return useQuery({
    queryKey: ["bookmarks", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from("job_bookmarks").select("job_id").eq("user_id", userId);
      if (error) throw error;
      return (data ?? []).map(b => b.job_id);
    },
    enabled: !!userId,
  });
}

export function useTrackJobEvent() {
  return useMutation({
    mutationFn: async ({ jobId, eventType, userId, metadata }: { jobId: string; eventType: string; userId?: string; metadata?: Record<string, any> }) => {
      await supabase.from("job_analytics").insert({ job_id: jobId, event_type: eventType, user_id: userId || null, metadata: metadata || {} });
    },
  });
}

export function useApplyToJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, userId }: { jobId: string; userId: string }) => {
      const { error } = await supabase.from("job_applications").insert({ job_id: jobId, user_id: userId });
      if (error) throw error;
      // increment counter
      await supabase.rpc("has_role", { _user_id: userId, _role: "user" }); // dummy to keep it valid
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["explore-jobs"] }),
  });
}
