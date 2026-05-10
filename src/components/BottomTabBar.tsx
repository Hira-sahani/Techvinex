import { useLocation, useNavigate } from "react-router-dom";
import { Compass, Home, UserPlus, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { label: "Explore", icon: Compass, path: "/explore", match: ["/", "/explore"] },
  { label: "Home", icon: Home, path: "/dashboard", match: ["/dashboard"] },
  { label: "Referrals", icon: UserPlus, path: "/referrals", match: ["/referrals"] },
  { label: "Earning", icon: Wallet, path: "/earnings", match: ["/earnings"] },
  { label: "Profile", icon: User, path: "/profile", match: ["/profile"] },
];

const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const isActive = tab.match.includes(location.pathname);
          return (
            <button
              key={tab.label}
              onClick={() => navigate(tab.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={cn("text-[10px]", isActive && "font-semibold")}>
                {tab.label}
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
