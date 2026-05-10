import { useEffect, useState } from "react";
import { checkPasswordStrength, checkLeakedPassword } from "@/lib/passwordSecurity";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/contexts/UserContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import StepPersonalInfo from "@/components/onboarding/StepPersonalInfo";
import StepLinks from "@/components/onboarding/StepLinks";
import StepResume from "@/components/onboarding/StepResume";
import StepWorkAuth from "@/components/onboarding/StepWorkAuth";
import StepExperience from "@/components/onboarding/StepExperience";
import ProfileSuccessDialog from "@/components/onboarding/ProfileSuccessDialog";

const TOTAL_STEPS = 5;

const getTodayDate = () => new Date().toISOString().split("T")[0];

const createDefaultEducation = () => [
  { school: "", degree: "", startYear: "", endYear: "", major: "", gpa: "" },
];

const createDefaultWorkExperience = () => [
  { company: "", role: "", startYear: "", endYear: "", city: "", country: "", description: "" },
];

const createInitialForm = (email = "") => ({
  fullName: "",
  email,
  phone: "",
  password: "",
  confirmPassword: "",
  linkedin: "",
  portfolio: "",
  otherLinks: [""],
  noLinkedin: false,
  leetcode: "",
  github: "",
  codechef: "",
  codeforces: "",
  resumeName: "",
  noResume: false,
  dob: "",
  country: "India",
  state: "",
  city: "",
  postalCode: "",
  workFromDifferentCountry: false,
  authorizedToWork: false,
  agreeToRemain: false,
  signatureName: "",
  signatureText: "",
  signatureDate: getTodayDate(),
  education: createDefaultEducation(),
  workExperience: createDefaultWorkExperience(),
});

type OnboardingForm = ReturnType<typeof createInitialForm>;

const hasText = (value?: string | null) => Boolean(value?.trim());

const hasPersonalInfo = (form: OnboardingForm, passwordAlreadySet = false) => {
  if (!hasText(form.fullName) || !hasText(form.email)) return false;
  if (passwordAlreadySet) return true;
  if (!hasText(form.password) || !hasText(form.confirmPassword)) return false;
  if (form.password !== form.confirmPassword) return false;
  const strength = checkPasswordStrength(form.password);
  return strength.isStrong;
};

const hasLinks = (form: OnboardingForm) => hasText(form.linkedin) || form.noLinkedin;

const hasResume = (form: OnboardingForm) => hasText(form.resumeName) || form.noResume;

const hasWorkAuthorization = (form: OnboardingForm) =>
  hasText(form.dob) &&
  hasText(form.country) &&
  hasText(form.city) &&
  form.authorizedToWork &&
  form.agreeToRemain &&
  hasText(form.signatureName);

const getCurrentStepFromForm = (form: OnboardingForm, passwordAlreadySet = false) => {
  if (!hasPersonalInfo(form, passwordAlreadySet)) return 0;
  if (!hasLinks(form)) return 1;
  if (!hasResume(form)) return 2;
  if (!hasWorkAuthorization(form)) return 3;
  return 4;
};

const normalizeOtherLinks = (links?: string[] | null) => {
  const filteredLinks = (links ?? []).filter((link) => link.trim() !== "");
  return filteredLinks.length > 0 ? filteredLinks : [""];
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { updateProfile } = useUser();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [passwordAlreadySet, setPasswordAlreadySet] = useState(false);

  const [form, setForm] = useState<OnboardingForm>(() => createInitialForm(user?.email || ""));

  useEffect(() => {
    if (!user?.email) return;

    setForm((prev) => (hasText(prev.email) ? prev : { ...prev, email: user.email ?? "" }));
  }, [user?.email]);

  useEffect(() => {
    const loadExistingProfile = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, email, phone, linkedin, portfolio, other_links, no_linkedin, leetcode, github, codechef, codeforces, resume_name, no_resume, dob, country, state, city, postal_code, work_from_different_country, authorized_to_work, agree_to_remain, signature_name, signature_text, signature_date, education, work_experience")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !data) return;

      const nextForm: OnboardingForm = {
        ...createInitialForm(user.email || ""),
        fullName: data.full_name ?? "",
        email: data.email ?? user.email ?? "",
        phone: data.phone ?? "",
        linkedin: data.linkedin ?? "",
        portfolio: data.portfolio ?? "",
        otherLinks: normalizeOtherLinks(data.other_links),
        noLinkedin: data.no_linkedin ?? false,
        leetcode: data.leetcode ?? "",
        github: data.github ?? "",
        codechef: data.codechef ?? "",
        codeforces: data.codeforces ?? "",
        resumeName: data.resume_name ?? "",
        noResume: data.no_resume ?? false,
        dob: data.dob ?? "",
        country: data.country || "India",
        state: data.state ?? "",
        city: data.city ?? "",
        postalCode: data.postal_code ?? "",
        workFromDifferentCountry: data.work_from_different_country ?? false,
        authorizedToWork: data.authorized_to_work ?? false,
        agreeToRemain: data.agree_to_remain ?? false,
        signatureName: data.signature_name ?? "",
        signatureText: data.signature_text ?? "",
        signatureDate: data.signature_date ?? getTodayDate(),
        education:
          Array.isArray(data.education) && data.education.length > 0
            ? (data.education as OnboardingForm["education"])
            : createDefaultEducation(),
        workExperience:
          Array.isArray(data.work_experience) && data.work_experience.length > 0
            ? (data.work_experience as OnboardingForm["workExperience"])
            : createDefaultWorkExperience(),
      };

      // If user already has name filled, they already set password before
      const alreadySet = hasText(data.full_name);
      setPasswordAlreadySet(alreadySet);

      setForm(nextForm);
      setStep(getCurrentStepFromForm(nextForm, alreadySet));
    };

    loadExistingProfile();
  }, [user]);

  const update = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const canNext = () => {
    if (step === 0) return hasPersonalInfo(form, passwordAlreadySet);
    if (step === 1) return hasLinks(form);
    if (step === 2) return hasResume(form);
    if (step === 3) return hasWorkAuthorization(form);
    return true;
  };

  const saveToDatabase = async (isComplete = false) => {
    if (!user) {
      toast.error("Please login first");
      navigate("/login");
      return false;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        user_id: user.id,
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        linkedin: form.linkedin,
        portfolio: form.portfolio,
        other_links: form.otherLinks.filter((link) => link.trim() !== ""),
        no_linkedin: form.noLinkedin,
        leetcode: form.leetcode,
        github: form.github,
        codechef: form.codechef,
        codeforces: form.codeforces,
        resume_name: form.resumeName,
        no_resume: form.noResume,
        dob: form.dob || null,
        country: form.country,
        state: form.state,
        city: form.city,
        postal_code: form.postalCode,
        work_from_different_country: form.workFromDifferentCountry,
        authorized_to_work: form.authorizedToWork,
        agree_to_remain: form.agreeToRemain,
        signature_name: form.signatureName,
        signature_text: form.signatureText,
        signature_date: form.signatureDate || null,
        education: form.education,
        work_experience: form.workExperience,
        onboarding_completed: isComplete,
      }, { onConflict: "user_id" });

    setSaving(false);

    if (error) {
      console.error("Save error:", error);
      toast.error("Failed to save profile. Please try again.");
      return false;
    }

    return true;
  };

  const [passwordError, setPasswordError] = useState("");

  const handleNext = async () => {
    // On step 0, set the user's password (only if not already set)
    if (step === 0 && !passwordAlreadySet && hasText(form.password)) {
      setSaving(true);
      setPasswordError("");
      // Check leaked password
      const leaked = await checkLeakedPassword(form.password);
      if (leaked.leaked) {
        setSaving(false);
        setPasswordError(`This password appeared in ${leaked.count.toLocaleString()} data breaches. Choose another.`);
        return;
      }
      // Set password via Supabase
      const { error: pwError } = await supabase.auth.updateUser({ password: form.password });
      if (pwError) {
        setSaving(false);
        toast.error("Failed to set password: " + pwError.message);
        return;
      }
      setPasswordAlreadySet(true);
      setSaving(false);
    }

    // Save progress to backend on every Next click
    const isLastStep = step === TOTAL_STEPS - 1;
    const saved = await saveToDatabase(isLastStep);
    if (!saved) return;

    if (!isLastStep) {
      setStep(step + 1);
      return;
    }

    updateProfile({ name: form.fullName, email: form.email, phone: form.phone });
    setCompleted(true);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      return;
    }

    navigate("/explore");
  };

  const handleClose = () => {
    navigate("/explore");
  };

  if (completed) return <ProfileSuccessDialog />;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex gap-1 px-4 pt-4">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border"}`} />
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-primary/15 hover:text-primary active:bg-primary/25 active:text-primary transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <button type="button" onClick={handleClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <X size={20} />
        </button>
      </div>

      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-xl">X</span>
        </div>
      </div>

      <div className="px-4 pb-32 max-w-lg mx-auto overflow-y-auto">
        {step === 0 && <StepPersonalInfo form={form} update={update} passwordError={passwordError} passwordAlreadySet={passwordAlreadySet} />}
        {step === 1 && <StepLinks form={form} update={update} />}
        {step === 2 && <StepResume form={form} update={update} />}
        {step === 3 && <StepWorkAuth form={form} update={update} />}
        {step === 4 && <StepExperience form={form} update={update} />}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-4 z-40">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handleNext}
            disabled={!canNext() || saving}
            className="w-full rounded-lg h-11"
          >
            {saving ? "Saving..." : step === TOTAL_STEPS - 1 ? "Complete Profile" : "Next"}
          </Button>
          {step === 3 && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              By completing this section, you confirm you've reviewed and agree with Techvinex X's <span className="text-primary font-medium">Terms and Conditions</span>.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;