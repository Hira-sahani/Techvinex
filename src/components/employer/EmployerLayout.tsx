import { Outlet, useNavigate, useLocation } from "react-router-dom";
import EmployerSidebar from "./EmployerSidebar";
import { LayoutDashboard, Briefcase, Users, Calendar, BarChart3, CreditCard, Menu, X, Building2 } from "lucide-react";
import { useState } from "react";

const mobileNavItems = [
  { label: "Home", icon: LayoutDashboard, path: "/employer/dashboard" },
  { label: "Jobs", icon: Briefcase, path: "/employer/jobs" },
  { label: "Candidates", icon: Users, path: "/employer/candidates" },
  { label: "Interviews", icon: Calendar, path: "/employer/interviews" },
  { label: "Analytics", icon: BarChart3, path: "/employer/analytics" },
  { label: "Billing", icon: CreditCard, path: "/employer/billing" },
];

const EmployerLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <EmployerSidebar />
      {/* Mobile header */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-cta flex items-center justify-center">
              <Building2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">Jetra X</span>
          </div>
          <button onClick={() => setMobileMenu(!mobileMenu)} className="p-2 text-foreground">
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
        {mobileMenu && (
          <div className="lg:hidden bg-card border-b border-border px-4 py-2 space-y-1">
            {mobileNavItems.map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileMenu(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  location.pathname === item.path ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployerLayout;
