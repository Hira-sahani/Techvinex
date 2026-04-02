import { useLocation, useNavigate } from "react-router-dom";
import { Target, LayoutDashboard, UserPlus, Wallet, User } from "lucide-react";
import JetraLoaderInline from "@/components/JetraLoaderInline";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { label: "Opportunities", icon: Target, path: "/" },
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Referrals", icon: UserPlus, path: "/referrals" },
  { label: "Earnings", icon: Wallet, path: "/earnings" },
  { label: "Profile", icon: User, path: "/profile" },
];

const SidebarNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="flex fixed left-0 top-0 bottom-0 w-16 flex-col items-center pt-4 pb-6 bg-background border-r border-border z-50">
      <button
        onClick={() => navigate("/")}
        aria-label="Go to opportunities"
        className="w-8 h-8 rounded-lg border border-border bg-card flex items-center justify-center mb-8 shadow-card"
      >
        <JetraLoaderInline size="sm" />
      </button>

      <div className="flex flex-col items-center gap-1 flex-1">
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path === "/" && location.pathname === "/explore");
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center w-12 h-12 rounded-lg transition-colors gap-0.5",
                isActive ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={cn("text-[9px]", isActive && "font-semibold")}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default SidebarNav;
