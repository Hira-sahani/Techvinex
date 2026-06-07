import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const Terms = () => {
  useDocumentMeta({
    title: "Terms of Service",
    description: "Read the Techvinex Terms of Service covering account use, candidate and employer responsibilities, and platform policies.",
    url: "/terms",
  });
  return (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <Link to="/home" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-2xl font-bold text-foreground mb-2">Terms of Service</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: March 18, 2026</p>

      <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using our platform, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Use of Services</h2>
          <p>You must be at least 18 years old to use our platform. You agree to provide accurate information, maintain the security of your account, and use our services only for lawful purposes. You are responsible for all activity under your account.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. User Content</h2>
          <p>You retain ownership of content you submit, including resumes and profile information. By submitting content, you grant us a license to use, display, and share it with potential employers as part of the job matching process.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Referral Program</h2>
          <p>Our referral program rewards users for successful referrals. Referral bonuses are subject to the terms specified at the time of referral. We reserve the right to modify or discontinue the referral program at any time.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Limitation of Liability</h2>
          <p>We are not responsible for employment outcomes, employer decisions, or the accuracy of job listings. Our platform serves as a marketplace connecting talent with opportunities, and we do not guarantee employment.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Termination</h2>
          <p>We may suspend or terminate your account if you violate these terms. You may also delete your account at any time through your account settings.</p>
        </section>
      </div>
    </div>
  </div>
);

export default Terms;
