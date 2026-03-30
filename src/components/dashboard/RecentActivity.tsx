import { Activity, Briefcase, Gift, FileCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentActivityProps {
  applications: any[];
  offers: any[];
  contracts: any[];
}

const RecentActivity = ({ applications, offers, contracts }: RecentActivityProps) => {
  // Merge and sort by date
  const activities = [
    ...applications.map(a => ({
      id: a.id,
      type: "application" as const,
      title: `Applied to ${a.role_title}`,
      status: a.status,
      date: a.applied_at,
      icon: Briefcase,
    })),
    ...offers.map(o => ({
      id: o.id,
      type: "offer" as const,
      title: `Offer for ${o.role_title}`,
      status: o.status,
      date: o.created_at,
      icon: Gift,
    })),
    ...contracts.map(c => ({
      id: c.id,
      type: "contract" as const,
      title: `Contract: ${c.role_title}`,
      status: c.status,
      date: c.created_at,
      icon: FileCheck,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="border border-border rounded-xl bg-card">
      <div className="flex items-center gap-2 p-4 pb-2">
        <Activity size={14} className="text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">Recent Activity</h3>
      </div>

      {activities.length === 0 ? (
        <p className="text-xs text-muted-foreground px-4 pb-4">No recent activity</p>
      ) : (
        <div className="divide-y divide-border">
          {activities.map(activity => (
            <div key={activity.id} className="px-4 py-2.5 flex items-start gap-2.5">
              <activity.icon size={13} className="text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground line-clamp-1">{activity.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.date), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentActivity;
