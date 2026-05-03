import { useState, useEffect } from "react";
import { SkeletonList } from "@/components/skeletons/Skeleton";
import { useNavigate } from "react-router-dom";
import { Briefcase, Linkedin, CircleAlert, Building2, DollarSign, Clock, CheckCircle2, BookmarkCheck, FileText, Star } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TAB_KEYS = ["Contracts", "Offers", "Applications", "Assessments", "Saved"] as const;
type TabKey = typeof TAB_KEYS[number];

const PROFILE_FIELDS = [
  "full_name", "email", "phone", "linkedin", "resume_name",
  "dob", "country", "city", "authorized_to_work", "signature_name",
  "education", "work_experience",
] as const;

interface ProfileData {
  full_name: string; email: string; phone: string | null;
  linkedin: string | null; no_linkedin: boolean | null;
  resume_name: string | null; no_resume: boolean | null;
  dob: string | null; country: string | null; city: string | null;
  authorized_to_work: boolean | null; signature_name: string | null;
  education: any; work_experience: any; onboarding_completed: boolean | null;
}

const hasValue = (val: any): boolean => {
  if (val === null || val === undefined || val === "" || val === false) return false;
  if (Array.isArray(val)) {
    if (val.length === 0) return false;
    if (typeof val[0] === "object") return Object.values(val[0]).some((v) => v && String(v).trim() !== "");
    return true;
  }
  if (typeof val === "object") return Object.values(val).some((v) => v && String(v).trim() !== "");
  return true;
};

const calcProfileCompletion = (profile: ProfileData): number => {
  let filled = 0;
  for (const field of PROFILE_FIELDS) {
    if (field === "linkedin") { if (hasValue(profile.linkedin) || profile.no_linkedin) filled++; }
    else if (field === "resume_name") { if (hasValue(profile.resume_name) || profile.no_resume) filled++; }
    else { if (hasValue(profile[field])) filled++; }
  }
  return Math.round((filled / PROFILE_FIELDS.length) * 100);
};

const statusColor: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  expired: "bg-muted text-muted-foreground",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const getStatusClass = (status: string) => statusColor[status] || "bg-muted text-muted-foreground";

const DashboardSection = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("Contracts");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [hasLinkedin, setHasLinkedin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [contracts, setContracts] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [savedRoles, setSavedRoles] = useState<any[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  // Fetch profile data for Important Tasks
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, phone, linkedin, no_linkedin, resume_name, no_resume, dob, country, city, authorized_to_work, signature_name, education, work_experience, onboarding_completed")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setProfileCompletion(calcProfileCompletion(data as ProfileData));
        setHasLinkedin(!!(data.linkedin && data.linkedin.trim() !== "") || !!data.no_linkedin);
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  // Fetch all tab data
  useEffect(() => {
    if (!user) return;
    const fetchAllData = async () => {
      setTabLoading(true);
      const [contractsRes, offersRes, appsRes, assessRes, savedRes] = await Promise.all([
        supabase.from("contracts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("offers").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("applications").select("*").eq("user_id", user.id).order("applied_at", { ascending: false }),
        supabase.from("assessments").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("saved_roles").select("*").eq("user_id", user.id).order("saved_at", { ascending: false }),
      ]);
      setContracts(contractsRes.data || []);
      setOffers(offersRes.data || []);
      setApplications(appsRes.data || []);
      setAssessments(assessRes.data || []);
      setSavedRoles(savedRes.data || []);
      setTabLoading(false);
    };
    fetchAllData();
  }, [user]);

  const tabCounts: Record<TabKey, number> = {
    Contracts: contracts.length,
    Offers: offers.length,
    Applications: applications.length,
    Assessments: assessments.length,
    Saved: savedRoles.length,
  };

  const isProfileComplete = profileCompletion >= 100;
  const visibleTasks = [
    { type: "profile", visible: !isProfileComplete },
    { type: "linkedin", visible: !hasLinkedin },
  ].filter((t) => t.visible);
  const taskCount = visibleTasks.length;

  const getTabData = (): any[] => {
    switch (activeTab) {
      case "Contracts": return contracts;
      case "Offers": return offers;
      case "Applications": return applications;
      case "Assessments": return assessments;
      case "Saved": return savedRoles;
      default: return [];
    }
  };

  const renderItem = (item: any) => {
    switch (activeTab) {
      case "Contracts":
        return (
          <div key={item.id} className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{item.role_title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 size={12} />{item.company}</p>
              </div>
              <Badge className={`text-[10px] ${getStatusClass(item.status)}`}>{item.status}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><DollarSign size={12} />${item.hourly_rate}/hr</span>
              {item.start_date && <span className="flex items-center gap-1"><Clock size={12} />Started {new Date(item.start_date).toLocaleDateString()}</span>}
            </div>
          </div>
        );

      case "Offers":
        return (
          <div key={item.id} className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{item.role_title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 size={12} />{item.company}</p>
              </div>
              <Badge className={`text-[10px] ${getStatusClass(item.status)}`}>{item.status}</Badge>
            </div>
            {item.offered_rate > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign size={12} />${item.offered_rate}/hr</p>
            )}
            {item.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.message}</p>}
          </div>
        );

      case "Applications":
        return (
          <div key={item.id} className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{item.role_title}</h4>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 size={12} />{item.company}</p>
              </div>
              <Badge className={`text-[10px] ${getStatusClass(item.status)}`}>{item.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <FileText size={12} />Applied {new Date(item.applied_at).toLocaleDateString()}
            </p>
          </div>
        );

      case "Assessments":
        return (
          <div key={item.id} className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-foreground">{item.role_title}</h4>
                <p className="text-xs text-muted-foreground capitalize">{item.assessment_type}</p>
              </div>
              <Badge className={`text-[10px] ${getStatusClass(item.status)}`}>{item.status}</Badge>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {item.score !== null && <span className="flex items-center gap-1"><Star size={12} />Score: {item.score}</span>}
              {item.scheduled_at && <span className="flex items-center gap-1"><Clock size={12} />{new Date(item.scheduled_at).toLocaleDateString()}</span>}
            </div>
          </div>
        );

      case "Saved":
        return (
          <div key={item.id} className="border border-border rounded-xl p-4 bg-card flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground">{item.role_title}</h4>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Building2 size={12} />{item.company}</p>
            </div>
            <BookmarkCheck size={16} className="text-primary shrink-0" />
          </div>
        );

      default:
        return null;
    }
  };

  const tabData = getTabData();

  return (
    <section className="px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Important Tasks */}
        {taskCount > 0 && (
          <>
            <p className="text-xs text-muted-foreground mb-3">Important Tasks ({taskCount})</p>
            <div className={`grid gap-3 mb-6 ${taskCount > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {!isProfileComplete && (
                <div className="border border-border rounded-xl p-4 bg-card flex flex-col justify-between">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-foreground mb-0.5">Complete Your Profile</h3>
                    <p className="text-[11px] text-muted-foreground leading-snug flex items-center gap-1">
                      Become eligible for Instant Work Offers <CircleAlert size={12} className="text-muted-foreground" />
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={profileCompletion} className="h-2 flex-1" />
                    <span className="text-[11px] text-muted-foreground font-medium">{profileCompletion}%</span>
                    <button onClick={() => navigate("/onboarding")}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                      Complete now
                    </button>
                  </div>
                </div>
              )}
              {!hasLinkedin && (
                <div className="border border-border rounded-xl p-4 bg-card flex flex-col justify-between">
                  <div className="mb-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-semibold text-foreground mb-0.5">Link LinkedIn</h3>
                      <Linkedin size={14} className="text-muted-foreground mt-0.5" />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Connect your LinkedIn account to your Jetra X account
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => navigate("/onboarding")}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                      Link now
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="border-b border-border mb-6">
          <div className="flex gap-0 overflow-x-auto">
            {TAB_KEYS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors relative ${
                  activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab}
                {tabCounts[tab] > 0 && (
                  <span className="ml-1 w-4 h-4 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {tabCounts[tab]}
                  </span>
                )}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {tabLoading ? (
          <SkeletonList rows={4} />
        ) : tabData.length > 0 ? (
          <div className="space-y-3">
            {tabData.map((item) => renderItem(item))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Briefcase size={40} className="text-muted-foreground/40 mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">
              You don't have any {activeTab.toLowerCase()} yet
            </p>
            <p className="text-xs text-muted-foreground">
              You will be notified when companies reach out to you
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DashboardSection;
