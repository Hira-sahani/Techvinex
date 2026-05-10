import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const CookiePolicy = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-3xl mx-auto px-4 py-8 pb-24 md:pb-8">
      <Link to="/home" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={16} /> Back
      </Link>
      <h1 className="text-2xl font-bold text-foreground mb-2">Cookie Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: March 18, 2026</p>

      <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">1. What Are Cookies</h2>
          <p>Cookies are small text files stored on your device when you visit our website. They help us remember your preferences, keep you logged in, and understand how you use our platform.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">2. Types of Cookies We Use</h2>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Essential Cookies:</strong> Required for authentication, security, and basic platform functionality.</li>
            <li><strong>Functional Cookies:</strong> Remember your preferences like language and display settings.</li>
            <li><strong>Analytics Cookies:</strong> Help us understand how users interact with the platform to improve our services.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">3. Managing Cookies</h2>
          <p>You can control and delete cookies through your browser settings. Disabling certain cookies may affect the functionality of our platform. Most browsers allow you to refuse or accept cookies selectively.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">4. Third-Party Cookies</h2>
          <p>Some cookies may be set by third-party services we use, such as analytics providers. These cookies are governed by the respective third party's privacy policy.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-2">5. Contact Us</h2>
          <p>If you have questions about our use of cookies, contact us at <span className="text-primary font-medium">privacy@techvinexx.com</span>.</p>
        </section>
      </div>
    </div>
  </div>
);

export default CookiePolicy;
