import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Sparkles, MapPin, Clock, Check, UserPlus } from "lucide-react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { z } from "zod";

const BRAND = "#5B4CF0";
const BRAND_SOFT = "#EEEBFE";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full legal name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  linkedinUrl: z.string().trim().max(300).optional().or(z.literal("")),
  noLinkedin: z.boolean(),
}).refine(
  (d) => d.noLinkedin || (d.linkedinUrl && /linkedin\.com\/in\//i.test(d.linkedinUrl)),
  { message: "Enter a valid LinkedIn URL or tick the box", path: ["linkedinUrl"] }
);

const SuccessModal = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/30 backdrop-blur-sm">
    <div className="w-full max-w-md">
      <div className="rounded-t-2xl px-6 py-3 text-center text-sm font-medium" style={{ background: BRAND_SOFT, color: BRAND }}>
        You need to be signed in to continue.
      </div>
      <div className="bg-white rounded-b-2xl shadow-xl px-8 py-10 text-center">
        <div className="mx-auto mb-5 h-14 w-14 rounded-full flex items-center justify-center" style={{ background: "#DCFCE7" }}>
          <Check className="text-green-600" size={28} strokeWidth={3} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Check your inbox</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          We've sent you an activation link. Please check your email and login with magic link.
        </p>
        <button
          onClick={onClose}
          className="w-full rounded-xl py-3 text-white font-medium transition hover:opacity-90"
          style={{ background: BRAND }}
        >
          Got it
        </button>
      </div>
      <p className="text-center text-xs text-slate-400 mt-4">
        By signing in, you agree to our <a className="underline">Worker Terms of Service</a>.
      </p>
    </div>
  </div>
);

const OpportunityDetail = () => {
  const { slug } = useParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [noLinkedin, setNoLinkedin] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ["opportunity", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("explore_jobs").select("*").eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useDocumentMeta({
    title: job ? `${job.title} · Techvinex` : "Opportunity · Techvinex",
    description: job
      ? `Apply for ${job.title}${job.company_name ? ` at ${job.company_name}` : ""}${job.location ? ` (${job.location})` : ""} on Techvinex — AI matched hiring for top professionals.`
      : "Explore vetted job opportunities on Techvinex, the AI powered hiring platform.",
    type: job ? "article" : "website",
    jsonLd: job
      ? {
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: (job.description || "").slice(0, 5000),
          datePosted: job.created_at || new Date().toISOString(),
          employmentType: job.job_type || "FULL_TIME",
          hiringOrganization: {
            "@type": "Organization",
            name: job.company_name || "Techvinex",
            sameAs: "https://techvinex.com/",
          },
          jobLocation: {
            "@type": "Place",
            address: { "@type": "PostalAddress", addressLocality: job.location || "Remote" },
          },
          ...(job.location && /remote/i.test(job.location)
            ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "Worldwide" } }
            : {}),
          ...(job.budget
            ? {
                baseSalary: {
                  "@type": "MonetaryAmount",
                  currency: "USD",
                  value: { "@type": "QuantitativeValue", value: String(job.budget).replace(/[^0-9.]/g, "") || undefined, unitText: "HOUR" },
                },
              }
            : {}),
          url: typeof window !== "undefined" ? window.location.href : undefined,
          directApply: true,
        }
      : undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ fullName, email, linkedinUrl, noLinkedin });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as string] = i.message; });
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await supabase.from("applicants").insert({
        full_name: fullName,
        email,
        linkedin_url: noLinkedin ? null : linkedinUrl,
        no_linkedin: noLinkedin,
        job_id: job?.id ?? null,
      });
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName },
        },
      });
      if (otpErr) throw otpErr;
      setShowSuccess(true);
    } catch (err: any) {
      setErrors({ email: err.message || "Something went wrong. Try again." });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-white flex items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!job) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <p className="text-slate-600">Opportunity not found.</p>
        <Link to="/opportunities" className="text-sm" style={{ color: BRAND }}>← View all opportunities</Link>
      </div>
    );
  }

  // Render description with sections handled as markdown-ish
  const desc: string = job.description || "";

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-20">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/opportunities" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: BRAND }}>T</div>
          </Link>
          <Link to="/login" className="text-sm px-4 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-700">Sign in</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6 lg:py-8">
        <div className="grid lg:grid-cols-[1fr_400px] gap-8">
          {/* LEFT: Job description */}
          <div className="min-w-0">
            <Link to="/opportunities" className="inline-flex items-center gap-1 text-sm mb-3" style={{ color: BRAND }}>
              <ArrowLeft size={14} /> View all opportunities
            </Link>

            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{job.title}</h1>
              {job.budget && (
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-slate-900">{job.budget.split(" ")[0]}</div>
                  <div className="text-xs text-slate-400">per hour</div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 mb-6">
              <span className="inline-flex items-center gap-1"><Clock size={12} /> {job.job_type}</span>
              <span className="inline-flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
              <span className="inline-flex items-center gap-1 font-medium" style={{ color: BRAND }}>
                <Sparkles size={12} /> New opportunity
              </span>
            </div>

            {/* Application progress */}
            <div className="border border-slate-200 rounded-2xl p-5 mb-8">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">Application</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Not started</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                <span>0 of 3 steps completed</span><span>0%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-4">
                <div className="h-full" style={{ width: "0%", background: BRAND }} />
              </div>
              <div className="space-y-3">
                {["Resume", "Domain Expert Interview", "Work Authorization"].map((step) => (
                  <div key={step} className="flex items-center justify-between py-1">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{step}</div>
                      <div className="text-xs text-slate-400">Not done</div>
                    </div>
                    <div className="h-4 w-4 rounded-full border-2 border-slate-200" />
                  </div>
                ))}
              </div>
            </div>

            <article className="prose prose-slate max-w-none text-sm leading-relaxed">
              <div className="whitespace-pre-wrap text-slate-700">{desc}</div>
            </article>

            {job.company_name && (
              <section className="mt-10">
                <h3 className="font-bold text-slate-900 mb-2">About {job.company_name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {job.company_name} partners with leading AI labs and enterprises to train frontier models using human
                  expertise. You will work on projects that focus on training and enhancing AI systems.
                </p>
              </section>
            )}

            <section className="mt-10 border-t border-slate-100 pt-8">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <UserPlus size={16} style={{ color: BRAND }} /> Earn up to $280 by referring
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Share the referral link below and earn up to $280 for each successful referral.
              </p>
              <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Activate my referral link
              </button>
            </section>

            <p className="text-xs text-slate-400 mt-10">Posted {new Date(job.created_at).toLocaleDateString()}</p>
          </div>

          {/* RIGHT: Sticky application card */}
          <aside className="order-first lg:order-none lg:sticky lg:top-24 lg:self-start">
            <form
              onSubmit={handleSubmit}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                    Full legal name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1"
                    style={{ boxShadow: errors.fullName ? "0 0 0 1px #ef4444" : undefined }}
                  />
                  {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none"
                    style={{ boxShadow: errors.email ? "0 0 0 1px #ef4444" : undefined }}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                    LinkedIn URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://www.linkedin.com/in/…"
                    disabled={noLinkedin}
                    className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    style={{ boxShadow: errors.linkedinUrl ? "0 0 0 1px #ef4444" : undefined }}
                  />
                  {errors.linkedinUrl && <p className="text-xs text-red-500 mt-1">{errors.linkedinUrl}</p>}
                  <label className="flex items-center gap-2 mt-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={noLinkedin}
                      onChange={(e) => setNoLinkedin(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    I don't have a LinkedIn
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl py-3 text-white font-medium text-sm transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: BRAND }}
                >
                  {submitting ? "Sending magic link…" : "Start Application"}
                </button>
              </div>
            </form>

            <div className="mt-3 rounded-2xl border border-slate-200 p-3 text-center text-sm font-medium" style={{ color: BRAND }}>
              <UserPlus size={14} className="inline mr-1" /> Earn up to $280 by referring
            </div>
          </aside>
        </div>
      </main>

      {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
    </div>
  );
};

export default OpportunityDetail;
