import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  short_description: string | null;
  image_url: string | null;
  category: string | null;
  author: string | null;
  read_time: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export const useBlogs = (includeAll = false) => {
  return useQuery({
    queryKey: ["blogs", includeAll],
    queryFn: async () => {
      let query = supabase.from("blogs" as any).select("*").order("created_at", { ascending: false });
      if (!includeAll) {
        query = query.eq("status", "published");
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Blog[];
    },
  });
};

export const useBlog = (slug: string) => {
  return useQuery({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await (supabase.from("blogs" as any) as any)
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data as unknown as Blog;
    },
    enabled: !!slug,
  });
};

export const useCreateBlog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blog: Partial<Blog>) => {
      const { data, error } = await (supabase.from("blogs" as any) as any).insert(blog).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blogs"] }),
  });
};

export const useUpdateBlog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Blog> & { id: string }) => {
      const { data, error } = await (supabase.from("blogs" as any) as any).update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blogs"] }),
  });
};

export const useDeleteBlog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("blogs" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["blogs"] }),
  });
};
