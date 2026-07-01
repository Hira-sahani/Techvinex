import BrandLogo from "@/components/BrandLogo";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText, UserCheck, BarChart3,
  ScrollText, Bell, DollarSign, Settings, LogOut, Brain, Globe, Moon, Sun, PenLine, FlaskConical, KeyRound, Webhook, ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const navItems = [
  { label: "Overview", path: "/admin/overview", icon: LayoutDashboard },
  { label: "Requirements", path: "/admin/requirements", icon: FileText },
  { label: "Explore Jobs", path: "/admin/explore-jobs", icon: Globe },
  { label: "Candidates", path: "/admin/candidates", icon: UserCheck },
  { label: "AI Matching", path: "/admin/ai-matching", icon: Brain },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Audit Logs", path: "/admin/audit-logs", icon: ScrollText },
  { label: "Notifications", path: "/admin/notifications", icon: Bell },
  { label: "Payments", path: "/admin/payments", icon: DollarSign },
  { label: "Blog", path: "/admin/blogs", icon: PenLine },
  { label: "Benchmark", path: "/benchmark/dashboard", icon: FlaskConical },
  { label: "Secrets", path: "/admin/secrets", icon: KeyRound },
  { label: "Webhooks", path: "/admin/webhooks", icon: Webhook },
  { label: "Settings", path: "/admin/settings", icon: Settings },
];

const AdminSidebar = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <aside className="w-56 min-h-screen border-r border-border bg-card flex flex-col shrink-0">
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BrandLogo size={24} className="h-6 w-6" />
          <div>
            <p className="text-xs font-semibold text-foreground leading-none">Techvinex</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">Admin Console</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-border space-y-1">
        <p className="px-2.5 text-[10px] text-muted-foreground truncate">{user?.email}</p>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground w-full transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
