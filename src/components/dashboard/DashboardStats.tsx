import { Briefcase, Gift, FileCheck, Target, Bookmark } from "lucide-react";

interface DashboardStatsProps {
  activeApps: number;
  pendingOffers: number;
  activeContracts: number;
  profileStrength: number;
  savedRoles: number;
}

const DashboardStats = ({ activeApps, pendingOffers, activeContracts, profileStrength, savedRoles }: DashboardStatsProps) => {
  const stats = [
    { label: "Active Applications", value: activeApps, icon: Briefcase, color: "text-blue-500" },
    { label: "Pending Offers", value: pendingOffers, icon: Gift, color: "text-primary" },
    { label: "Active Projects", value: activeContracts, icon: FileCheck, color: "text-green-500" },
    { label: "Saved Jobs", value: savedRoles, icon: Bookmark, color: "text-amber-500" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map(stat => (
        <div key={stat.label} className="border border-border rounded-xl p-4 bg-card">
          <div className="flex items-center justify-between mb-2">
            <stat.icon size={18} className={stat.color} />
          </div>
          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

export default DashboardStats;
