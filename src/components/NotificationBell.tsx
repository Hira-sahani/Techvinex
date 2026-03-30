import { Bell, CheckCheck, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  const handleNotificationClick = (n: typeof notifications[0]) => {
    if (!n.is_read) {
      void markAsRead(n.id);
    }
    setOpen(false);
    if (n.action_url) {
      navigate(n.action_url);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-1.5">
          <Bell size={20} className="text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive text-destructive-foreground rounded-full text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-[11px] text-primary font-medium hover:underline flex items-center gap-1"
            >
              <CheckCheck size={12} /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[320px] overflow-y-auto divide-y divide-border">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            notifications.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className="w-full flex items-start gap-2.5 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
              >
                <div className="shrink-0 w-2 mt-1.5 flex justify-center">
                  {!n.is_read && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-snug ${
                      !n.is_read
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="border-t border-border">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/notifications");
              }}
              className="w-full flex items-center justify-center gap-1 px-4 py-2.5 text-xs text-primary font-medium hover:bg-secondary/50 transition-colors"
            >
              View all notifications <ChevronRight size={12} />
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
