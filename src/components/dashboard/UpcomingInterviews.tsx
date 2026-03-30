import { useState, useEffect } from "react";
import { Calendar, Clock, Video, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";

const UpcomingInterviews = () => {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    // For candidates, we check applications with interview_scheduled status
    // In a full system, there'd be a dedicated interviews table linked to candidates
    const fetchInterviews = async () => {
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "interview_scheduled")
        .order("applied_at", { ascending: true });
      setInterviews(data || []);
    };
    fetchInterviews();
  }, [user]);

  return (
    <div className="border border-border rounded-xl bg-card">
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Upcoming Interviews</h2>
        </div>
      </div>

      {interviews.length === 0 ? (
        <div className="px-4 pb-4 pt-1">
          <p className="text-xs text-muted-foreground">No upcoming interviews scheduled</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {interviews.map(interview => (
            <div key={interview.id} className="px-4 py-3 flex items-center justify-between hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Video size={16} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{interview.role_title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> Pending schedule
                    </span>
                  </div>
                </div>
              </div>
              <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                Scheduled
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpcomingInterviews;
