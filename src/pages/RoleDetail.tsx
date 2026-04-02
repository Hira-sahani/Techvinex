import { useParams, useNavigate, Link } from "react-router-dom";
import { MapPin, Briefcase, Users, CheckCircle2, ChevronLeft, ChevronRight, LinkIcon, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useRoles } from "@/hooks/useRoles";
import JobDetailSkeleton from "@/components/skeletons/JobDetailSkeleton";
import JetraLoaderInline from "@/components/JetraLoaderInline";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomTabBar from "@/components/BottomTabBar";
import { useAuth } from "@/contexts/AuthContext";
import { useRef } from "react";
import { useApplicationSteps } from "@/hooks/useApplicationSteps";

const applicationSteps = [
  { key: "resume", label: "Resume" },
  { key: "interview", label: "Domain Expert Interview", badge: "CORE" },
  { key: "availability", label: "Availability" },
  { key: "workAuth", label: "Work Authorization" },
];

const RoleDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: rolesData = [], isLoading: rolesLoading } = useRoles();
  const role = rolesData.find((r) => r.id === id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { completedKeys, loading } = useApplicationSteps();

  const completedCount = completedKeys.length;
  const progressPercent = Math.round((completedCount / applicationSteps.length) * 100);

  const referralLink = user
    ? `${window.location.origin}/ref/${user.id.slice(0, 8)}`
    : `${window.location.origin}/explore`;

  const similarRoles = rolesData.filter((r) => r.id !== id).slice(0, 6);

  if (rolesLoading) return <JetraLoader />;

  if (!role) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-foreground mb-2">Opportunity not found</p>
          <p className="text-muted-foreground mb-6">This opportunity may no longer be available.</p>
          <button onClick={() => navigate("/")} className="px-6 py-2 rounded-xl gradient-cta text-primary-foreground font-medium">Browse opportunities</button>
        </div>
      </div>
    );
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const scrollSimilar = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-3xl mx-auto">

          <div className="flex items-start justify-between flex-wrap gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{role.title}</h1>
            <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
              <Sparkles size={10} /> AI Matched
            </span>
          </div>

          <p className="text-lg font-bold text-foreground mb-1">{role.pay}</p>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1"><Briefcase size={12} /> Hourly contract</span>
            <span className="flex items-center gap-1"><MapPin size={12} /> {role.location}</span>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="flex -space-x-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-6 h-6 rounded-full bg-secondary border-2 border-background flex items-center justify-center">
                  <Users size={10} className="text-muted-foreground" />
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{role.hiredCount} hired this month</span>
          </div>

          {/* Matched info banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Sparkles size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground mb-1">You've been matched to this opportunity</p>
              <p className="text-xs text-muted-foreground">Our AI matched you based on your skills and profile. Complete the steps below to strengthen your candidacy. No need to apply — employers will be notified automatically.</p>
            </div>
          </div>

          {/* Application Progress */}
          <div className="border border-border rounded-xl p-5 bg-card mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-2">Profile Completion</h2>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>{completedCount} of {applicationSteps.length} steps completed</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 mb-4" />

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <JetraLoaderInline size="sm" />
              </div>
            ) : (
              <div className="space-y-3">
                {applicationSteps.map((step) => {
                  const done = completedKeys.includes(step.key);
                  return (
                    <div key={step.key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-foreground">{step.label}</span>
                        {step.badge && (
                          <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-medium">{step.badge}</span>
                        )}
                      </div>
                      {done ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-primary">Completed</span>
                          <CheckCircle2 size={18} className="text-primary" />
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <div className="w-4 h-4 rounded-full border-2 border-border" />
                          <span className="text-[10px] text-muted-foreground">Not done</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-[10px] text-muted-foreground mt-4 leading-relaxed">
              ⓘ All steps are reused across opportunities, so you never have to upload your resume or take the same interview twice
            </p>

            {role.referralBonus && (
              <button
                onClick={() => document.getElementById("referral-section")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full text-center text-xs text-primary mt-3 hover:underline"
              >
                👥 Earn up to {role.referralBonus} by referring
              </button>
            )}
          </div>

          <div className="border-t border-border my-6" />

          <div className="mb-6">
            <p className="text-sm text-muted-foreground leading-relaxed">{role.description}</p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              We consider all qualified applicants without regard to legally protected characteristics and provide reasonable accommodations upon request.
            </p>
          </div>

          <div className="mb-8">
            <h2 className="text-base font-bold text-foreground mb-3">Contract and Payment Terms</h2>
            <ul className="space-y-2.5 text-sm text-muted-foreground list-disc pl-5">
              <li>You will be engaged as an independent contractor.</li>
              <li>This is a fully remote role that can be completed on your own schedule.</li>
              <li>Projects can be extended, shortened, or concluded early depending on needs and performance.</li>
              <li>Your work will not involve access to confidential or proprietary information from any employer, client, or institution.</li>
              <li>Payments are weekly on Stripe or Wise based on services rendered.</li>
              <li>Please note: We are unable to support H1-B or STEM OPT candidates at this time.</li>
            </ul>
          </div>

          <div className="mb-8">
            <h2 className="text-base font-bold text-foreground mb-3">About Jetrax</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Jetrax partners with leading AI labs and enterprises to train frontier models using human expertise. You will work on projects that focus on training and enhancing AI systems. You will be paid competitively, collaborate with leading researchers, and help shape the next generation of AI systems in your area of expertise.
            </p>
          </div>

          {role.referralBonus && (
            <div id="referral-section" className="mb-8">
              <h2 className="text-base font-bold text-foreground mb-2">Earn up to {role.referralBonus} by referring</h2>
              <p className="text-sm text-muted-foreground mb-1">
                Share the referral link below, and <span className="font-semibold text-foreground">earn up to {role.referralBonus} for each successful referral</span> through this unique link. There's no limit on how many people you can refer. Restrictions may apply.{" "}
                <Link to="/referrals" className="text-primary underline">Learn more</Link>
              </p>
              <div className="flex items-center gap-2 mt-3 border border-border rounded-lg px-3 py-2.5 bg-card">
                <LinkIcon size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate flex-1">{referralLink}</span>
                <button onClick={handleCopyLink} className="text-xs font-medium text-foreground border border-border rounded-md px-3 py-1 hover:bg-secondary transition-colors">Copy</button>
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-foreground">Similar Opportunities</h2>
              <div className="flex items-center gap-1">
                <button onClick={() => scrollSimilar("left")} className="p-1.5 rounded-full border border-border hover:bg-secondary transition-colors"><ChevronLeft size={14} /></button>
                <button onClick={() => scrollSimilar("right")} className="p-1.5 rounded-full border border-border hover:bg-secondary transition-colors"><ChevronRight size={14} /></button>
              </div>
            </div>
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {similarRoles.map((r) => (
                <div key={r.id} onClick={() => navigate(`/role/${r.id}`)} className="min-w-[200px] max-w-[220px] border border-border rounded-xl p-4 bg-card cursor-pointer hover:shadow-md transition-shadow flex-shrink-0">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2 mb-1">{r.title}</h3>
                  <p className="text-xs text-muted-foreground mb-2">{r.pay}</p>
                  <div className="flex items-center gap-1 text-[10px] text-primary">
                    <Sparkles size={8} /> Matched
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link to="/" className="text-sm text-primary hover:underline">View all matched opportunities →</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RoleDetail;
