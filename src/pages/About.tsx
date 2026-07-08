import { Link } from "react-router-dom";
import { ArrowLeft, Linkedin, Sparkles, Target, Globe } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import founderPhoto from "@/assets/founder-abhishek-sahani.jpg";

const FOUNDER_NAME = "Abhishek Sahani";
const FOUNDER_TITLE = "Founder & CEO, Techvinex";
const FOUNDER_LINKEDIN = "https://www.linkedin.com/in/abhishek-sahani";
const SITE_URL = "https://www.techvinex.com";

const About = () => {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: FOUNDER_NAME,
    jobTitle: "Founder & CEO",
    image: `${SITE_URL}/founder-abhishek-sahani.jpg`,
    url: `${SITE_URL}/about`,
    sameAs: [FOUNDER_LINKEDIN],
    worksFor: {
      "@type": "Organization",
      name: "Techvinex",
      url: SITE_URL,
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Techvinex",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
    description:
      "Techvinex is an AI-powered hiring platform that helps companies discover, evaluate, and hire talent globally.",
    founder: {
      "@type": "Person",
      name: FOUNDER_NAME,
      jobTitle: "Founder & CEO",
      sameAs: [FOUNDER_LINKEDIN],
    },
  };

  useDocumentMeta({
    title: "About Techvinex — Founder & CEO Abhishek Sahani",
    description:
      "Meet Abhishek Sahani, Founder & CEO of Techvinex — the AI-powered hiring platform transforming how companies discover, evaluate, and hire talent globally.",
    url: "/about",
    type: "profile",
    image: `${SITE_URL}/founder-abhishek-sahani.jpg`,
    jsonLd: [personSchema, organizationSchema],
  });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navbar />

      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft size={16} /> Back to home
          </Link>

          {/* Page header */}
          <header className="mb-12 sm:mb-16 max-w-3xl">
            <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-primary mb-3">
              About Techvinex
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-4">
              Building the AI-powered future of hiring
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground">
              Techvinex connects skilled professionals with the world&apos;s leading companies
              through intelligent matching, transparent hiring, and a global remote-first
              network.
            </p>
          </header>

          {/* Founder & CEO section */}
          <section
            aria-labelledby="founder-ceo"
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Photo */}
              <div className="lg:col-span-2 relative bg-gradient-to-br from-primary/10 via-secondary to-background p-8 sm:p-10 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-primary/30 to-transparent blur-2xl opacity-70" />
                  <img
                    src={founderPhoto}
                    alt={`${FOUNDER_NAME}, Founder and CEO of Techvinex`}
                    width={1024}
                    height={1024}
                    loading="lazy"
                    className="relative w-56 h-56 sm:w-72 sm:h-72 object-cover rounded-2xl shadow-2xl ring-1 ring-border"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="lg:col-span-3 p-6 sm:p-10">
                <p className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-primary mb-3">
                  Founder &amp; CEO
                </p>
                <h2
                  id="founder-ceo"
                  className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight mb-2"
                >
                  {FOUNDER_NAME}
                </h2>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">
                  {FOUNDER_TITLE}
                </p>

                <div className="space-y-4 text-sm sm:text-base text-foreground/90 leading-relaxed">
                  <p>
                    <strong className="text-foreground">{FOUNDER_NAME}</strong> is the Founder
                    &amp; CEO of Techvinex, building an AI-powered hiring platform designed to
                    transform the way companies discover, evaluate, and hire talent globally.
                  </p>
                  <blockquote className="border-l-2 border-primary pl-4 italic text-muted-foreground">
                    &ldquo;Hiring should be a match of ambition and opportunity — not a
                    guessing game. We&apos;re building the intelligence layer that makes
                    great work findable, anywhere in the world.&rdquo;
                  </blockquote>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href={FOUNDER_LINKEDIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity"
                  >
                    <Linkedin size={16} /> Connect on LinkedIn
                  </a>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold border border-border text-foreground hover:bg-secondary transition-colors"
                  >
                    Explore the platform
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Vision pillars */}
          <section aria-labelledby="vision" className="mt-14 sm:mt-20">
            <h2 id="vision" className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Our vision
            </h2>
            <p className="text-muted-foreground mb-8 max-w-3xl">
              We believe world-class opportunity should be accessible to every skilled
              professional — regardless of geography, background, or network. Techvinex is
              designed around three principles:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[
                {
                  icon: Sparkles,
                  title: "Intelligent matching",
                  desc: "AI that understands skills, context, and ambition — not just keywords.",
                },
                {
                  icon: Target,
                  title: "Transparent hiring",
                  desc: "Clear pay, honest feedback, and structured evaluation at every stage.",
                },
                {
                  icon: Globe,
                  title: "Global by default",
                  desc: "Remote-first opportunities that connect talent with companies worldwide.",
                },
              ].map((p) => (
                <div key={p.title} className="rounded-xl border border-border bg-card p-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                    <p.icon size={18} className="text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{p.title}</h3>
                  <p className="text-sm text-muted-foreground">{p.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default About;
