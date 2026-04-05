import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { BarChart3, Brain, FlaskConical, ListChecks, Trophy, Users, Settings, LogOut, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const navItems = [
  { label: "Dashboard", icon: BarChart3, path: "/benchmark/dashboard" },
  { label: "Tasks", icon: ListChecks, path: "/benchmark/tasks" },
  { label: "Run Test", icon: FlaskConical, path: "/benchmark/run" },
  { label: "Results", icon: Brain, path: "/benchmark/results" },
  { label: "Leaderboard", icon: Trophy, path: "/benchmark/leaderboard" },
  { label: "Reviews", icon: Users, path: "/benchmark/reviews" },
  { label: "Settings", icon: Settings, path: "/benchmark/settings" },
];

const BenchmarkLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <button onClick={() => navigate("/admin/requirements")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ChevronLeft className="w-3 h-3" /> Back to Admin
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground">Atlas Benchmark</h1>
              <p className="text-[9px] text-muted-foreground">AI Evaluation Platform</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default BenchmarkLayout;
