import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRoles } from "@/hooks/useRoles";
import JetraLoader from "@/components/JetraLoader";
import { useState, useEffect } from "react";
import JetraLoaderInline from "@/components/JetraLoaderInline";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";

import ApplyStepResume from "@/components/apply/ApplyStepResume";
import ApplyStepWorkAuth from "@/components/apply/ApplyStepWorkAuth";
import ApplyStepInterview from "@/components/apply/ApplyStepInterview";
import { useApplicationSteps } from "@/hooks/useApplicationSteps";

const tabs = [
  { key: "resume", label: "Upload Resume" },
  { key: "workAuth", label: "Work Authorization" },
  { key: "interview", label: "Domain Expert Interview", badge: "CORE" },
];

const ApplyRole = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rolesData = [], isLoading: rolesLoading } = useRoles();
  const role = rolesData.find((r) => r.id === id);
  const [activeTab, setActiveTab] = useState("resume");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [interviewDone, setInterviewDone] = useState(false);
  const [interviewPhase, setInterviewPhase] = useState<string>("info");

  const { completedKeys, loading, profileData, refetch } = useApplicationSteps();

  const [resumeForm, setResumeForm] = useState({
    resumeName: "",
    fullName: "",
    email: "",
    phone: "",
    countryCode: "IN",
    linkedin: "",
    noLinkedin: false,
    summary: "",
    education: [] as any[],
    workExperience: [] as any[],
    projects: [] as any[],
    publications: [] as string[],
    certifications: [] as string[],
    awards: [] as string[],
    leetcode: "",
    github: "",
    codechef: "",
    codeforces: "",
    portfolio: "",
    otherLinks: [""],
    skills: [] as string[],
  });

  const [workAuthForm, setWorkAuthForm] = useState({
    authorizedToWork: false,
    workFromDifferentCountry: false,
    signatureName: "",
    signatureDate: "",
  });

  // Pre-fill from profile data
  useEffect(() => {
    if (profileData) {
      setResumeForm((prev) => ({
        ...prev,
        resumeName: profileData.resume_name || "",
        fullName: profileData.full_name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        linkedin: profileData.linkedin || "",
        noLinkedin: profileData.no_linkedin || false,
        leetcode: profileData.leetcode || "",
        github: profileData.github || "",
        codechef: profileData.codechef || "",
        codeforces: profileData.codeforces || "",
        portfolio: profileData.portfolio || "",
        otherLinks: profileData.other_links?.length ? profileData.other_links : [""],
        education: Array.isArray(profileData.education) ? profileData.education : [],
        workExperience: Array.isArray(profileData.work_experience) ? profileData.work_experience : [],
      }));
      setWorkAuthForm((prev) => ({
        ...prev,
        authorizedToWork: profileData.authorized_to_work || false,
        workFromDifferentCountry: profileData.work_from_different_country || false,
        signatureName: profileData.signature_name || "",
        signatureDate: profileData.signature_date || "",
      }));
    }
  }, [profileData]);

  const updateResume = (key: string, value: any) =>
    setResumeForm((prev) => ({ ...prev, [key]: value }));

  const updateWorkAuth = (key: string, value: any) =>
    setWorkAuthForm((prev) => ({ ...prev, [key]: value }));

  if (!role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground mb-2">Role not found</p>
          <Button onClick={() => navigate("/explore")} className="rounded-full">Browse roles</Button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Navbar />
        <div className="pt-24 px-4 max-w-lg mx-auto flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Application Submitted!</h1>
          <p className="text-sm text-muted-foreground mb-2">
            You've applied for <span className="font-semibold text-foreground">{role.title}</span>
          </p>
          <p className="text-sm text-muted-foreground mb-6">Our team will review your application and get back to you within 48 hours.</p>
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={() => navigate("/explore")} className="flex-1 rounded-full">Explore more</Button>
            <Button onClick={() => navigate("/")} className="flex-1 rounded-full">Go Home</Button>
          </div>
        </div>
        <BottomTabBar />
      </div>
    );
  }

  const saveResumeStep = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      resume_name: resumeForm.resumeName,
      full_name: resumeForm.fullName,
      email: resumeForm.email,
      phone: resumeForm.phone,
      linkedin: resumeForm.linkedin,
      no_linkedin: resumeForm.noLinkedin,
      leetcode: resumeForm.leetcode,
      github: resumeForm.github,
      codechef: resumeForm.codechef,
      codeforces: resumeForm.codeforces,
      portfolio: resumeForm.portfolio,
      other_links: resumeForm.otherLinks.filter((l) => l.trim()),
      education: resumeForm.education as any,
      work_experience: resumeForm.workExperience as any,
    }).eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return false;
    }
    return true;
  };

  const saveWorkAuthStep = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      authorized_to_work: workAuthForm.authorizedToWork,
      work_from_different_country: workAuthForm.workFromDifferentCountry,
      signature_name: workAuthForm.signatureName,
      signature_date: workAuthForm.signatureDate || null,
    }).eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Failed to save: " + error.message);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (activeTab === "interview" && !interviewDone) {
      toast.error("Please complete the interview before continuing.");
      return;
    }

    const currentIdx = tabs.findIndex((t) => t.key === activeTab);

    // Save current step to DB
    if (activeTab === "resume") {
      const ok = await saveResumeStep();
      if (!ok) return;
    } else if (activeTab === "workAuth") {
      const ok = await saveWorkAuthStep();
      if (!ok) return;
    }

    await refetch();

    if (currentIdx < tabs.length - 1) {
      setActiveTab(tabs[currentIdx + 1].key);
      toast.success(`${tabs[currentIdx].label} saved!`);
    } else {
      // Save application to database
      if (user && role) {
        const { error: appError } = await supabase.from("applications").insert({
          user_id: user.id,
          role_id: role.id,
          role_title: role.title,
          company: "Jetrax",
          status: "submitted",
        });
        if (appError) {
          toast.error("Failed to submit application: " + appError.message);
          return;
        }
      }
      setSubmitted(true);
      toast.success("Application submitted successfully!");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />
      <div className="pt-20 px-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-primary/15 hover:text-primary active:bg-primary/25 active:text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <span className="text-xs text-muted-foreground">
            {completedKeys.length} of {tabs.length} steps finished
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border mb-6 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const isDone = completedKeys.includes(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                  isActive ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {isDone ? <CheckCircle2 size={14} className="text-primary" /> : <div className="w-3.5 h-3.5 rounded-full border border-border" />}
                {tab.label}
                {tab.badge && <span className="text-[9px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-medium">{tab.badge}</span>}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <JetraLoaderInline />
          </div>
        ) : (
          <>
            {activeTab === "resume" && <ApplyStepResume form={resumeForm} update={updateResume} />}
            {activeTab === "workAuth" && <ApplyStepWorkAuth form={workAuthForm} update={updateWorkAuth} />}
            {activeTab === "interview" && <ApplyStepInterview onInterviewComplete={() => setInterviewDone(true)} onPhaseChange={(p) => setInterviewPhase(p)} />}
          </>
        )}

        <div className="h-20" />
      </div>

      {/* Only show bottom bar when NOT on interview tab, OR when interview is completed */}
      {(activeTab !== "interview" || interviewDone) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border px-4 py-3 md:bottom-0">
          <div className="max-w-lg mx-auto">
            <Button
              onClick={handleNext}
              disabled={saving}
              className="w-full rounded-lg py-5 text-sm font-medium"
            >
              {saving ? "Saving..." : activeTab === "interview" ? "Submit Interview" : "Next"}
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ApplyRole;
