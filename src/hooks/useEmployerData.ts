import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Types for employer tables
export interface EmployerJob {
  id: string;
  employer_id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  budget: string;
  skills: string[];
  description: string;
  status: string;
  candidate_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmployerCandidate {
  id: string;
  job_id: string;
  employer_id: string;
  candidate_name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: number;
  ai_score: number;
  resume_url: string;
  video_url: string;
  status: string;
  notes: string;
  applied_at: string;
  updated_at: string;
}

export interface EmployerInterview {
  id: string;
  candidate_id: string;
  job_id: string;
  employer_id: string;
  candidate_name: string;
  job_title: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  feedback: string;
  created_at: string;
}

export interface EmployerBillingRecord {
  id: string;
  employer_id: string;
  candidate_name: string;
  job_title: string;
  hire_date: string;
  fee: number;
  status: string;
  created_at: string;
}

// Helper to bypass type checking for new tables
const db = supabase as any;

export function useEmployerJobs() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery<EmployerJob[]>({
    queryKey: ["employer-jobs", user?.id],
    queryFn: async () => {
      const { data, error } = await db.from("employer_jobs").select("*").eq("employer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const createJob = useMutation({
    mutationFn: async (job: Partial<EmployerJob>) => {
      const { error } = await db.from("employer_jobs").insert({ ...job, employer_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employer-jobs"] }),
  });

  const updateJob = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployerJob> & { id: string }) => {
      const { error } = await db.from("employer_jobs").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employer-jobs"] }),
  });

  const deleteJob = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("employer_jobs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employer-jobs"] }),
  });

  return { ...query, createJob, updateJob, deleteJob };
}

export function useEmployerCandidates() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery<EmployerCandidate[]>({
    queryKey: ["employer-candidates", user?.id],
    queryFn: async () => {
      const { data, error } = await db.from("employer_candidates").select("*").eq("employer_id", user!.id).order("applied_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const updateCandidate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployerCandidate> & { id: string }) => {
      const { error } = await db.from("employer_candidates").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employer-candidates"] }),
  });

  return { ...query, updateCandidate, refetch: query.refetch };
}

export function useEmployerInterviews() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery<EmployerInterview[]>({
    queryKey: ["employer-interviews", user?.id],
    queryFn: async () => {
      const { data, error } = await db.from("employer_interviews").select("*").eq("employer_id", user!.id).order("scheduled_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const createInterview = useMutation({
    mutationFn: async (interview: Partial<EmployerInterview>) => {
      const { error } = await db.from("employer_interviews").insert({ ...interview, employer_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employer-interviews"] }),
  });

  const updateInterview = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployerInterview> & { id: string }) => {
      const { error } = await db.from("employer_interviews").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employer-interviews"] }),
  });

  return { ...query, createInterview, updateInterview };
}

export function useEmployerBilling() {
  const { user } = useAuth();

  return useQuery<EmployerBillingRecord[]>({
    queryKey: ["employer-billing", user?.id],
    queryFn: async () => {
      const { data, error } = await db.from("employer_billing").select("*").eq("employer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}
