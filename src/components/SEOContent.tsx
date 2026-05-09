import { Link } from "react-router-dom";
import { Briefcase, Users, Sparkles, TrendingUp, Search, Building2 } from "lucide-react";

const SEOContent = () => {
  return (
    <section className="px-4 sm:px-6 py-12 sm:py-16 max-w-6xl mx-auto">
      {/* H1 + intro */}
      <header className="text-center mb-12">
        <h1 className="text-3xl sm:text-5xl font-extrabold text-foreground tracking-tight mb-5">
          Techvinex – AI Powered Job & Hiring Platform
        </h1>
        <div className="space-y-4 text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto text-left sm:text-center">
          <p>
            Techvinex is a modern AI powered job and hiring platform that connects skilled
            professionals with the world&apos;s leading companies. From software engineering and
            data science to design, product, and AI research, we help candidates discover roles
            that match their experience, ambitions, and lifestyle.
          </p>
          <p>
            Our intelligent matching engine reviews your profile, resume, and preferences to
            recommend the most relevant jobs in real time. Employers get a curated pipeline of
            vetted candidates, while job seekers gain a faster path to interviews, offers, and
            long term career growth.
          </p>
          <p>
            With a built in referral program, transparent pay insights, and remote first
            opportunities across the globe, Techvinex is built to support every stage of your
            hiring journey — whether you are looking for your next role or scaling your team.
          </p>
        </div>

        <nav aria-label="Primary actions" className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold gradient-cta text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Search size={16} /> Explore Jobs
          </Link>
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold border border-border text-foreground hover:bg-secondary transition-colors"
          >
            Read the Blog
          </Link>
          <Link
            to="/employer/login"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold border border-border text-foreground hover:bg-secondary transition-colors"
          >
            <Building2 size={16} /> For Employers
          </Link>
        </nav>
      </header>

      {/* Featured Opportunities */}
      <section aria-labelledby="featured-opportunities" className="mb-14">
        <h2 id="featured-opportunities" className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Featured Opportunities
        </h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          Discover handpicked openings from top startups and enterprises hiring across AI,
          engineering, design, marketing, operations and more. New roles are added daily.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "AI / Machine Learning Engineer", desc: "Build and ship production ML systems for high growth teams." },
            { title: "Full Stack Developer", desc: "Work on modern React, Node and cloud native stacks remotely." },
            { title: "Product Designer", desc: "Design delightful user experiences for global products." },
            { title: "Data Scientist", desc: "Turn data into insights and drive measurable business impact." },
            { title: "DevOps & Cloud Engineer", desc: "Operate scalable infrastructure on AWS, GCP and Azure." },
            { title: "Growth & Marketing", desc: "Lead acquisition, lifecycle and content for fast moving brands." },
          ].map((job) => (
            <article key={job.title} className="rounded-xl border border-border bg-card p-5 hover:shadow-card-hover transition-all">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Briefcase size={18} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{job.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{job.desc}</p>
              <Link to="/explore" className="text-sm font-medium text-primary hover:underline">
                View matching roles →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Why Choose Techvinex */}
      <section aria-labelledby="why-techvinex" className="mb-14">
        <h2 id="why-techvinex" className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
          Why Choose Techvinex
        </h2>
        <p className="text-muted-foreground mb-6 max-w-3xl">
          Techvinex combines smart automation with a human first hiring experience so both
          candidates and companies can move faster with confidence.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { icon: Sparkles, title: "AI Matching", desc: "Personalized role recommendations based on your skills and goals." },
            { icon: TrendingUp, title: "Career Growth", desc: "Access mentorship, learning resources and long term opportunities." },
            { icon: Users, title: "Trusted Network", desc: "Vetted employers and verified candidates across global markets." },
            { icon: Briefcase, title: "Remote First", desc: "Flexible, remote and hybrid roles with transparent compensation." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <f.icon size={18} className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* For Job Seekers + For Employers */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article aria-labelledby="for-job-seekers" className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 id="for-job-seekers" className="text-2xl font-bold text-foreground mb-3">
            For Job Seekers
          </h2>
          <p className="text-muted-foreground mb-4">
            Build a powerful profile, upload your resume and let Techvinex match you with the
            best fit roles from leading companies. Track applications, interviews and offers
            in one place, and earn rewards by referring talented friends through our referral
            program.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 mb-5 list-disc pl-5">
            <li>Personalized AI job recommendations</li>
            <li>Transparent pay and remote friendly roles</li>
            <li>Application, interview and offer tracking</li>
            <li>Referral rewards for inviting your network</li>
          </ul>
          <Link to="/explore" className="text-sm font-semibold text-primary hover:underline">
            Browse open roles →
          </Link>
        </article>

        <article aria-labelledby="for-employers" className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 id="for-employers" className="text-2xl font-bold text-foreground mb-3">
            For Employers
          </h2>
          <p className="text-muted-foreground mb-4">
            Hire faster with an AI powered candidate pipeline, smart screening and integrated
            interview tools. Post requirements, review pre-vetted profiles and collaborate with
            your team to make better hiring decisions in less time.
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 mb-5 list-disc pl-5">
            <li>AI screening and candidate ranking</li>
            <li>Structured interviews and assessments</li>
            <li>Talent pool, pipeline and analytics</li>
            <li>Built in messaging and offer management</li>
          </ul>
          <Link to="/employer/login" className="text-sm font-semibold text-primary hover:underline">
            Start hiring on Techvinex →
          </Link>
        </article>
      </section>
    </section>
  );
};

export default SEOContent;
