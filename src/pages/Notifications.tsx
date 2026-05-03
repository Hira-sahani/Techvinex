import { Link, useNavigate } from "react-router-dom";
import { X, ChevronRight } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { SkeletonList } from "@/components/skeletons/Skeleton";

const Notifications = () => {
  const navigate = useNavigate();
  const { notifications, loading, markAsRead } = useNotifications();

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
        <button onClick={() => navigate(-1)} className="p-1" type="button">
          <X size={22} className="text-muted-foreground" />
        </button>
      </div>

      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-4"><SkeletonList rows={6} /></div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const targetUrl = n.action_url ?? "/explore";

            return (
              <Link
                key={n.id}
                to={targetUrl}
                onClick={() => {
                  if (!n.is_read) {
                    void markAsRead(n.id);
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="shrink-0 w-3 flex justify-center">
                  {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground mb-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                  <p className={`text-sm leading-snug ${!n.is_read ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                    {n.title}
                  </p>
                  {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                </div>

                <ChevronRight size={16} className="text-muted-foreground/50 shrink-0" />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Notifications;
