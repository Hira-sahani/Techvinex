import { useLocation, useNavigate } from "react-router-dom";
import { Target, LayoutDashboard, UserPlus, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/contexts/LangContext";

const tabs = [
  { labelKey: "tab.opportunities", fallback: "Opportunities", icon: Target, path: "/" },
  { labelKey: "tab.dashboard", fallback: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { labelKey: "tab.referrals", fallback: "Referrals", icon: UserPlus, path: "/referrals" },
  { labelKey: "tab.earnings", fallback: "Earnings", icon: Wallet, path: "/earnings" },
  { labelKey: "tab.profile", fallback: "Profile", icon: User, path: "/profile" },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLang();

  return (
    <nav className="fixed bottom-0 left-16 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const label = t(tab.labelKey) !== tab.labelKey ? t(tab.labelKey) : tab.fallback;
          return (
            <button
              key={tab.labelKey}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={cn("text-[10px]", isActive && "font-semibold")}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default BottomTabBar;
