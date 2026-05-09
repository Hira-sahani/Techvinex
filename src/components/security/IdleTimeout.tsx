import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Idle-timeout watchdog — signs the user out after `idleMs` of no
 * keyboard / pointer / scroll activity. Mounted once at the app root
 * (only when the user is signed in).
 *
 * Default: 30 minutes. Configure via VITE_IDLE_TIMEOUT_MS env if needed.
 */
const DEFAULT_IDLE_MS = 30 * 60 * 1000;

export const IdleTimeout = () => {
  const { isLoggedIn, logout } = useAuth();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    const ms = Number(import.meta.env.VITE_IDLE_TIMEOUT_MS) || DEFAULT_IDLE_MS;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        toast.info("Signed out due to inactivity.", { id: "idle-logout" });
        await logout();
      }, ms);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart", "visibilitychange"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [isLoggedIn, logout]);

  return null;
};

export default IdleTimeout;
