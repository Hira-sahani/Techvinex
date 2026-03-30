import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Role {
  id: string;
  title: string;
  pay: string;
  hiredCount: number;
  category: string;
  description: string;
  requirements: string[];
  type: string;
  location: string;
  referralBonus?: string;
  contingent?: boolean;
}

async function fetchRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from("roles").select("*");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    pay: r.pay,
    hiredCount: r.hired_count,
    category: r.category,
    description: r.description,
    requirements: r.requirements ?? [],
    type: r.type,
    location: r.location,
    referralBonus: r.referral_bonus ?? undefined,
    contingent: r.contingent ?? false,
  }));
}

export function useRoles() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("roles-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "roles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["roles"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    staleTime: 30 * 1000,
  });
}
