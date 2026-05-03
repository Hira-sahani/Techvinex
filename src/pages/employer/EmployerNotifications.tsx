import { useNotifications } from "@/hooks/useNotifications";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { EmployerListSkeleton } from "@/components/skeletons/EmployerSkeletons";

const EmployerNotifications = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllRead } = useNotifications();

  if (loading) {
    return <EmployerListSkeleton />;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 shadow-card text-center">
          <Bell size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No notifications yet. You'll see updates about candidates, interviews, and AI scoring here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id}
              onClick={() => !n.is_read && markAsRead(n.id)}
              className={`bg-card rounded-xl border border-border p-4 shadow-card transition-all cursor-pointer hover:shadow-card-hover ${
                !n.is_read ? "border-l-4 border-l-primary" : "opacity-75"
              }`}>
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!n.is_read ? "bg-primary" : "bg-transparent"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                </div>
                {!n.is_read && <Check size={14} className="text-muted-foreground flex-shrink-0 mt-1" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployerNotifications;
