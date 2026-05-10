import { useState, useEffect, useMemo } from "react";
import SidebarNav from "@/components/SidebarNav";
import TopStatusBar from "@/components/TopStatusBar";

import { UserPlus, Copy, Gift, Share2, Mail, MessageCircle, Link2, CheckCircle2, ArrowRight, Users, DollarSign, Send } from "lucide-react";
import { Shimmer } from "@/components/skeletons/Skeleton";
import { ReferralsPageSkeleton } from "@/components/skeletons/PageSkeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const STEPS = [
  { icon: Share2, title: "Share your link", desc: "Send your unique referral link to friends or colleagues" },
  { icon: UserPlus, title: "They sign up", desc: "Your referral creates an account and completes their profile" },
  { icon: CheckCircle2, title: "They get hired", desc: "Once they land a role through the platform, you earn" },
  { icon: DollarSign, title: "You get $50", desc: "Reward is credited to your earnings after confirmation" },
];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  signed_up: "bg-blue-500/10 text-blue-600",
  hired: "bg-green-500/10 text-green-600",
  paid: "bg-primary/10 text-primary",
};

const Referrals = () => {
  const { t } = useLang();
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const referralCode = useMemo(() => {
    if (user?.id) return "TECHVINEXX-" + user.id.substring(0, 6).toUpperCase();
    return "TECHVINEXX-XXXXXX";
  }, [user]);

  const referralLink = `${window.location.origin}/?ref=${referralCode}`;

  const fetchReferrals = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });
    setReferrals(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReferrals();
  }, [user]);

  const stats = useMemo(() => {
    const invited = referrals.length;
    const hired = referrals.filter((r) => r.status === "hired" || r.status === "paid").length;
    const earned = referrals.filter((r) => r.status === "paid").reduce((s, r) => s + Number(r.reward_amount), 0);
    return { invited, hired, earned };
  }, [referrals]);

  const handleInvite = async () => {
    if (!user || !inviteEmail.includes("@")) return;
    // Check if already invited
    const exists = referrals.find((r) => r.referred_email === inviteEmail.trim().toLowerCase());
    if (exists) {
      toast.error("You've already invited this person!");
      return;
    }
    setSending(true);
    const { error } = await supabase.from("referrals").insert({
      referrer_id: user.id,
      referred_email: inviteEmail.trim().toLowerCase(),
      referral_code: referralCode,
      status: "pending",
    });
    if (error) {
      toast.error("Failed to send invite");
    } else {
      toast.success(`Invite recorded for ${inviteEmail}`);
      setInviteEmail("");
      fetchReferrals();
    }
    setSending(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent("Join me on Techvinexx — earn while you work!");
    const body = encodeURIComponent(`Hey! I've been using Techvinexx and thought you'd be a great fit. Use my referral link to sign up:\n\n${referralLink}\n\nOr use code: ${referralCode}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(`Hey! Join me on Techvinexx and explore remote opportunities. Sign up with my referral link: ${referralLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Techvinexx",
          text: `Sign up on Techvinexx with my referral code ${referralCode} and explore opportunities!`,
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  if (loading) return <ReferralsPageSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />
      <div className="md:ml-16 pb-20">
        <TopStatusBar currentStep={2} />
        <div className="px-4 sm:px-6 pt-4 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">{t("referrals.title")}</h1>
          <p className="text-sm text-muted-foreground">
            Invite friends, earn <span className="font-bold text-primary">$50</span> for every successful hire.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border p-3 text-center bg-card">
            <Users size={16} className="text-primary mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Invited</p>
            <p className="text-lg font-bold text-foreground">{stats.invited}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center bg-card">
            <CheckCircle2 size={16} className="text-green-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Hired</p>
            <p className="text-lg font-bold text-foreground">{stats.hired}</p>
          </div>
          <div className="rounded-lg border border-border p-3 text-center bg-card">
            <DollarSign size={16} className="text-amber-500 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">Earned</p>
            <p className="text-lg font-bold text-foreground">${stats.earned}</p>
          </div>
        </div>

        {/* Invite by email */}
        <div className="rounded-xl border border-border p-5 bg-card space-y-3">
          <p className="text-sm font-semibold text-foreground">Invite by Email</p>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="friend@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 h-9 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
            <Button size="sm" onClick={handleInvite} disabled={sending || !inviteEmail.includes("@")} className="gap-1.5">
              {sending ? <Shimmer className="h-3.5 w-3.5 rounded-sm" /> : <Send size={14} />}
              Invite
            </Button>
          </div>
        </div>

        {/* Referral Code Card */}
        <div className="rounded-xl border border-border p-5 bg-card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Gift size={20} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Your Referral Code</p>
              <p className="text-xs text-muted-foreground">Share this code or link with your network</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-secondary rounded-lg p-3">
            <code className="flex-1 text-sm font-mono font-bold text-foreground tracking-wider">{referralCode}</code>
            <Button size="sm" variant="ghost" onClick={copyCode} className="gap-1 shrink-0">
              <Copy size={14} />
              <span className="text-xs">Copy</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-3">
            <Link2 size={14} className="text-muted-foreground shrink-0" />
            <p className="flex-1 text-xs text-muted-foreground truncate">{referralLink}</p>
            <Button size="sm" variant="ghost" onClick={copyLink} className="gap-1 shrink-0">
              <Copy size={14} />
              <span className="text-xs">Copy</span>
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={shareViaWhatsApp}>
              <MessageCircle size={14} /> WhatsApp
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={shareViaEmail}>
              <Mail size={14} /> Email
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={shareNative}>
              <Share2 size={14} /> Share
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-border p-5 bg-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">How it works</h3>
          <div className="space-y-4">
            {STEPS.map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <s.icon size={14} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight size={12} className="text-muted-foreground mt-2 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Referral history */}
        <div className="rounded-xl border border-border p-5 bg-card">
          <h3 className="font-semibold text-foreground text-sm mb-4">Your Referrals</h3>
          {referrals.length === 0 ? (
            <div className="text-center py-6">
              <UserPlus size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground font-medium">No referrals yet</p>
              <p className="text-xs text-muted-foreground mb-3">Share your code to start earning rewards</p>
              <Button size="sm" className="gap-1.5 text-xs" onClick={copyLink}>
                <Copy size={14} /> Copy referral link
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {referrals.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.referred_email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()} • ${Number(r.reward_amount)} reward
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${STATUS_STYLES[r.status] || ""}`}>
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      </div>
    </div>
  );
};

export default Referrals;
