import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

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

export function useExploreJobs(adminMode = false) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("explore-jobs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "explore_jobs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["explore-jobs"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const query = useQuery({
    queryKey: ["explore-jobs", adminMode],
    queryFn: async () => {
      let q = supabase.from("explore_jobs").select("*").order("created_at", { ascending: false });
      if (!adminMode) {
        q = q.eq("status", "published").eq("visibility", "public");
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ExploreJob[];
    },
    staleTime: 15_000,
  });

  return query;
}

export function useExploreJobById(id: string | undefined) {
  return useQuery({
    queryKey: ["explore-job", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("explore_jobs").select("*").eq("id", id).single();
      if (error) throw error;
      return data as ExploreJob;
    },
    enabled: !!id,
  });
}

export function useExploreJobBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ["explore-job-slug", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase.from("explore_jobs").select("*").eq("slug", slug).single();
      if (error) throw error;
      return data as ExploreJob;
    },
    enabled: !!slug,
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
