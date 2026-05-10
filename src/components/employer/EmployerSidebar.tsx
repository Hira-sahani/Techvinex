import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, BarChart3, CreditCard, LogOut, Building2, Kanban, Star, Settings, MessageSquare, Bell, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/employer/dashboard" },
  { label: "Requirements", icon: Target, path: "/employer/requirements" },
  { label: "Pipeline", icon: Kanban, path: "/employer/pipeline" },
  { label: "Matched Candidates", icon: Users, path: "/employer/candidates" },
  { label: "Talent Pool", icon: Star, path: "/employer/talent-pool" },
  { label: "Messages", icon: MessageSquare, path: "/employer/messages" },
  { label: "Interviews", icon: Calendar, path: "/employer/interviews" },
  { label: "Notifications", icon: Bell, path: "/employer/notifications", badge: true },
  { label: "Analytics", icon: BarChart3, path: "/employer/analytics" },
  { label: "Billing", icon: CreditCard, path: "/employer/billing" },
  { label: "Settings", icon: Settings, path: "/employer/settings" },
];

const EmployerSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/employer/login");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-card border-r border-border">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-xl gradient-cta flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground truncate">Techvinex X</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email || "Employer"}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              <item.icon className="w-4.5 h-4.5" size={18} />
              {item.label}
              {(item as any).badge && unreadCount > 0 && (
                <span className="ml-auto text-[10px] font-bold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-border">
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all">
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
};

export default EmployerSidebar;
