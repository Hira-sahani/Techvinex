import { useNavigate } from "react-router-dom";

const ApexSection = () => {
  const navigate = useNavigate();

  return (
    <section id="apex" className="py-10 sm:py-16 px-3 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div
            onClick={() => navigate("/explore")}
            className="rounded-2xl gradient-cta p-8 sm:p-12 text-primary-foreground flex flex-col justify-between min-h-[280px] cursor-pointer hover:opacity-95 transition-opacity active:scale-[0.99]"
          >
            <div>
              <p className="text-sm font-medium opacity-80 mb-2">ATLAS</p>
              <h3 className="text-2xl sm:text-3xl font-bold mb-3">The AI Productivity Index</h3>
              <p className="text-sm opacity-80">Release · 5 min read</p>
            </div>
            <div className="mt-6">
              <span className="inline-block text-sm font-medium underline underline-offset-4 opacity-90 hover:opacity-100 transition-opacity">
                Learn more →
              </span>
            </div>
          </div>

          <div id="stories" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Jay", role: "International Business Consultant" },
              { name: "Mick", role: "Computer Information Systems Expert" },
              { name: "Michael", role: "Corporate Attorney" },
              { name: "Sarah", role: "AI Research Scientist" },
            ].map((person) => (
              <div
                key={person.name}
                onClick={() => navigate("/explore")}
                className="rounded-xl border border-border bg-card p-5 hover:shadow-card-hover transition-all duration-200 cursor-pointer active:scale-[0.98] flex flex-col justify-between min-h-[130px]"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Meet {person.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{person.role}</p>
                </div>
                <p className="text-xs font-medium text-primary mt-3">{person.name} →</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApexSection;
