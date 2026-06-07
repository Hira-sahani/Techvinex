import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const Privacy = () => {
  useDocumentMeta({
    title: "Privacy Policy",
    description: "Learn how Techvinex collects, uses, and protects your personal information across our AI-powered job and hiring platform.",
    url: "/privacy",
  });
  return (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <Link to="/home" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-2xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: March 18, 2026</p>

      <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
          <p>We collect information you provide directly, such as your name, email address, resume, work experience, and profile details when you create an account or apply for roles. We also collect usage data automatically, including device information, IP address, and browsing activity on our platform.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
          <p>We use your information to match you with relevant job opportunities, process applications, improve our services, communicate updates, and ensure platform security. Your data helps us personalize your experience and connect you with the right employers.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Information Sharing</h2>
          <p>We share your profile and application data with employers when you apply for roles. We do not sell your personal information. We may share data with service providers who help us operate the platform, and when required by law.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information, including encryption, secure servers, and regular security audits. However, no method of transmission over the Internet is 100% secure.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Your Rights</h2>
          <p>You have the right to access, update, or delete your personal information at any time through your account settings. You can also request a copy of your data or opt out of marketing communications by contacting us.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">6. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at <span className="text-primary font-medium">privacy@techvinexx.com</span>.</p>
        </section>
      </div>
    </div>
  </div>
);

export default Privacy;
