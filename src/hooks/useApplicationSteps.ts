import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ApplicationSteps {
  resume: boolean;
  workAuth: boolean;
  interview: boolean;
  availability: boolean;
}

export const useApplicationSteps = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<ApplicationSteps>({
    resume: false,
    workAuth: false,
    interview: false,
    availability: false,
  });
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  const fetchSteps = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("resume_name, authorized_to_work, interview_completed, availability_set, full_name, email, phone, linkedin, no_linkedin, github, leetcode, codechef, codeforces, portfolio, other_links, education, work_experience, work_from_different_country, signature_name, signature_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setProfileData(data);
      setSteps({
        resume: !!data.resume_name && data.resume_name.length > 0,
        workAuth: !!data.authorized_to_work,
        interview: !!(data as any).interview_completed,
        availability: !!(data as any).availability_set,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSteps();
  }, [user]);

  const completedKeys = Object.entries(steps)
    .filter(([_, v]) => v)
    .map(([k]) => k);

  return { steps, completedKeys, loading, profileData, refetch: fetchSteps };
};
