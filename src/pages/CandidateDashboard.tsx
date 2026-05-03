import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import SidebarNav from "@/components/SidebarNav";

import TopStatusBar from "@/components/TopStatusBar";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationBell from "@/components/NotificationBell";
import { CandidateDashboardSkeleton } from "@/components/skeletons/DashboardSkeletons";
import { Progress } from "@/components/ui/progress";
import { DashboardEmptyState, DashboardErrorState } from "@/components/dashboard/DashboardStates";
import { useMinimumLoading } from "@/hooks/useMinimumLoading";
import { ArrowRight, Zap, Target } from "lucide-react";
import ApplicationPipeline from "@/components/dashboard/ApplicationPipeline";
import DashboardStats from "@/components/dashboard/DashboardStats";
import UpcomingInterviews from "@/components/dashboard/UpcomingInterviews";

const PROFILE_FIELDS = [
  "full_name", "email", "phone", "linkedin", "resume_name",
  "dob", "country", "city", "authorized_to_work", "signature_name",
  "education", "work_experience",
] as const;

const hasValue = (val: any): boolean => {
  if (val === null || val === undefined || val === "" || val === false) return false;
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "object") return Object.values(val).some((v) => v && String(v).trim() !== "");
  return true;
};

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileStrength, setProfileStrength] = useState(0);
  const [profileData, setProfileData] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [savedRoles, setSavedRoles] = useState<any[]>([]);
  const showLoading = useMinimumLoading(loading, 650);

  const fetchAll = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [profileRes, appsRes, notifsRes, offersRes, contractsRes, savedRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("applications").select("*").eq("user_id", user.id).order("applied_at", { ascending: false }),
        supabase.from("notifications").select("*").eq("user_id", user.id).eq("is_read", false).order("created_at", { ascending: false }).limit(5),
        supabase.from("offers").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("contracts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("saved_roles").select("*").eq("user_id", user.id),
      ]);

      const firstError = [profileRes, appsRes, notifsRes, offersRes, contractsRes, savedRes].find((res) => res.error)?.error;
      if (firstError) throw firstError;

      if (profileRes.data) {
        setProfileData(profileRes.data);
        let filled = 0;
        for (const field of PROFILE_FIELDS) {
          if (field === "linkedin") {
            if (hasValue(profileRes.data.linkedin) || profileRes.data.no_linkedin) filled++;
          } else if (field === "resume_name") {
            if (hasValue(profileRes.data.resume_name) || profileRes.data.no_resume) filled++;
          } else if (hasValue(profileRes.data[field])) {
            filled++;
          }
        }
        setProfileStrength(Math.round((filled / PROFILE_FIELDS.length) * 100));
      } else {
        setProfileData(null);
        setProfileStrength(0);
      }

      setApplications(appsRes.data || []);
      setNotifications(notifsRes.data || []);
      setOffers(offersRes.data || []);
      setContracts(contractsRes.data || []);
      setSavedRoles(savedRes.data || []);
    } catch (err: any) {
      setError(err?.message || "We couldn't load your dashboard right now.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchAll();

    const channel = supabase
      .channel("candidate-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "applications", filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setApplications((prev) => [payload.new as any, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setApplications((prev) => prev.map((a) => a.id === (payload.new as any).id ? payload.new as any : a));
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications((prev) => [payload.new as any, ...prev].slice(0, 5));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "offers", filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === "INSERT") {
          setOffers((prev) => [payload.new as any, ...prev]);
        } else if (payload.eventType === "UPDATE") {
          setOffers((prev) => prev.map((o) => o.id === (payload.new as any).id ? payload.new as any : o));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll, user]);

  if (showLoading) return <CandidateDashboardSkeleton />;

  const activeApps = applications.filter((a) => !["rejected", "hired", "withdrawn"].includes(a.status));
  const pendingOffers = offers.filter((o) => o.status === "pending");
  const activeContracts = contracts.filter((c) => c.status === "active");
  const hasDashboardData = Boolean(
    profileData || applications.length || notifications.length || offers.length || contracts.length || savedRoles.length,
  );

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="ml-16 pb-20">
        <TopStatusBar currentStep={2} />
        <div className="px-4 sm:px-6 pt-4">
          <div className="max-w-5xl mx-auto animate-in fade-in-0 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Welcome back{profileData?.full_name && !profileData.full_name.toLowerCase().includes("demo") ? `, ${profileData.full_name.split(" ")[0]}` : ""}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">Here's your career overview</p>
              </div>
              <div className="flex items-center gap-3">
                <NotificationBell />
                <ProfileDropdown />
              </div>
            </div>

            {error ? (
              <DashboardErrorState description={error} onRetry={fetchAll} />
            ) : !hasDashboardData ? (
              <DashboardEmptyState
                title="Your dashboard is ready"
                description="Complete your profile and start applying to roles to see applications, offers, and activity here."
                actionLabel="Complete profile"
                onAction={() => navigate("/onboarding")}
                secondaryActionLabel="Explore roles"
                onSecondaryAction={() => navigate("/explore")}
              />
            ) : (
              <>
                <DashboardStats
                  activeApps={activeApps.length}
                  pendingOffers={pendingOffers.length}
                  activeContracts={activeContracts.length}
                  profileStrength={profileStrength}
                  savedRoles={savedRoles.length}
                />

                {profileStrength < 100 && (
                  <div className="border border-border rounded-xl p-4 bg-card mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target size={16} className="text-primary" />
                        <span className="text-sm font-medium text-foreground">Profile Strength</span>
                      </div>
                      <button
                        onClick={() => navigate("/onboarding")}
                        className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                      >
                        Complete now <ArrowRight size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={profileStrength} className="h-2 flex-1" />
                      <span className="text-xs font-semibold text-muted-foreground">{profileStrength}%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">
                      Complete your profile to unlock instant work offers and better job matches
                    </p>
                  </div>
                )}

                {pendingOffers.length > 0 && (
                  <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={16} className="text-primary" />
                      <span className="text-sm font-semibold text-foreground">
                        You have {pendingOffers.length} pending offer{pendingOffers.length > 1 ? "s" : ""}!
                      </span>
                    </div>
                    {pendingOffers.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between py-2 border-t border-border/50 first:border-0">
                        <div>
                          <p className="text-sm font-medium text-foreground">{offer.role_title}</p>
                          <p className="text-xs text-muted-foreground">{offer.company} • {offer.offer_amount}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90">
                            Accept
                          </button>
                          <button className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary">
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-6">
                  <ApplicationPipeline applications={applications} />
                  <UpcomingInterviews />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
