import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Briefcase, Clock, Star, Share2, Bookmark, BookmarkCheck, ArrowLeft, ExternalLink } from "lucide-react";
import { useExploreJobBySlug, useBookmarkJob, useUserBookmarks, useTrackJobEvent, useApplyToJob } from "@/hooks/useExploreJobs";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import JetraLoader from "@/components/JetraLoader";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect } from "react";

const ExploreJobDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: job, isLoading } = useExploreJobBySlug(slug);
  const { data: bookmarks = [] } = useUserBookmarks(user?.id);
  const bookmarkMutation = useBookmarkJob();
  const trackEvent = useTrackJobEvent();
  const applyMutation = useApplyToJob();

  const isBookmarked = job ? bookmarks.includes(job.id) : false;

  useEffect(() => {
    if (job) {
      trackEvent.mutate({ jobId: job.id, eventType: "view", userId: user?.id });
    }
  }, [job?.id]);

  if (isLoading) return <JetraLoader />;
  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-bold text-foreground mb-2">Job not found</p>
          <Button variant="outline" onClick={() => navigate("/")}>Browse jobs</Button>
        </div>
      </div>
    );
  }

  const handleBookmark = () => {
    if (!user) { toast.error("Please sign in"); return; }
    bookmarkMutation.mutate({ jobId: job.id, userId: user.id });
  };

  const handleApply = async () => {
    if (!user) { navigate("/login"); return; }
    try {
      await applyMutation.mutateAsync({ jobId: job.id, userId: user.id });
      trackEvent.mutate({ jobId: job.id, eventType: "apply", userId: user.id });
      toast.success("Application submitted!");
    } catch {
      toast.error("Already applied or error occurred");
    }
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const text = `Check out this role: ${job.title}`;
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      copy: url,
    };
    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      toast.success("Link copied!");
    } else {
      window.open(urls[platform], "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>

          {/* Header */}
          <div className="border border-border rounded-xl p-6 bg-card mb-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1">
                {job.featured && (
                  <Badge className="mb-2 bg-yellow-500/10 text-yellow-600 border-yellow-500/20 gap-1">
                    <Star size={10} className="fill-yellow-500" /> Featured
                  </Badge>
                )}
                <h1 className="text-2xl font-bold text-foreground mb-2">{job.title}</h1>
                {job.short_description && <p className="text-muted-foreground">{job.short_description}</p>}
              </div>
              <button onClick={handleBookmark} className="p-2 rounded-lg hover:bg-muted transition-colors">
                {isBookmarked ? <BookmarkCheck size={22} className="text-primary fill-primary" /> : <Bookmark size={22} className="text-muted-foreground" />}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
              {job.show_salary && job.budget && (
                <span className="font-semibold text-foreground text-lg">{job.budget}</span>
              )}
              <span className="flex items-center gap-1"><Briefcase size={14} /> {job.job_type}</span>
              <span className="flex items-center gap-1"><MapPin size={14} /> {job.location}</span>
              {job.show_company && job.company_name && (
                <span className="flex items-center gap-1 text-foreground font-medium">{job.company_name}</span>
              )}
              {job.urgency === "urgent" && (
                <Badge variant="destructive" className="text-[11px]"><Clock size={10} className="mr-1" /> Urgent</Badge>
              )}
            </div>

            {/* Skills */}
            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {job.skills.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}

            {/* Tags */}
            {job.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {job.tags.map(t => (
                  <Badge key={t} variant="outline" className="text-[11px]">{t}</Badge>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-border mt-4">
              {job.allow_direct_apply && !job.auto_match_only && (
                <Button onClick={handleApply} className="flex-1 sm:flex-none">Apply Now</Button>
              )}
              {job.auto_match_only && (
                <p className="text-xs text-muted-foreground italic">This role uses AI matching only — no direct applications.</p>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <button onClick={() => handleShare("whatsapp")} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Share on WhatsApp">
                  <Share2 size={16} className="text-green-600" />
                </button>
                <button onClick={() => handleShare("linkedin")} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Share on LinkedIn">
                  <ExternalLink size={16} className="text-blue-600" />
                </button>
                <button onClick={() => handleShare("copy")} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Copy link">
                  <Share2 size={16} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          {job.description && (
            <div className="border border-border rounded-xl p-6 bg-card mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">About this Role</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{job.description}</div>
            </div>
          )}

          {/* Experience */}
          {job.experience && (
            <div className="border border-border rounded-xl p-6 bg-card mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-2">Experience Required</h2>
              <p className="text-sm text-muted-foreground">{job.experience}</p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ExploreJobDetail;
