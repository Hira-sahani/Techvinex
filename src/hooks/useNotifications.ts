import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeRealtime } from "@/lib/realtimeBus";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: Notification) => !n.is_read).length);
    }

    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const notification = notifications.find((n) => n.id === id);
    if (!notification || notification.is_read) return;

    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  useEffect(() => {
    void fetchNotifications();

    if (!user) return;

    return subscribeRealtime({
      table: "notifications",
      scope: "user",
      filter: `user_id=eq.${user.id}`,
      handler: () => void fetchNotifications(),
    });
  }, [user]);

  return { notifications, unreadCount, loading, markAsRead, markAllRead };
};
