import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const ADMIN_HOSTNAME = "admin.techvinex.com";

export const isAdminHost = () =>
  typeof window !== "undefined" && window.location.hostname === ADMIN_HOSTNAME;

/**
 * When the app is served from admin.techvinex.com, force all traffic into the
 * existing /admin/* route tree. Deep links like /admin/users continue to work;
 * any non-admin path is rewritten to /admin/login so the existing
 * AdminProtectedRoute + verify-admin edge function still gate access.
 *
 * This runs client-side only — SPA fallback on Lovable hosting serves
 * index.html for every path, so BrowserRouter picks up the URL and this
 * component performs the rewrite before any page component renders.
 */
const HostnameRouter = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdminHost()) return;
    const path = location.pathname;
    // Allow admin routes + auth callback (OAuth/password reset land here).
    if (path.startsWith("/admin") || path.startsWith("/auth/")) return;
    navigate("/admin/login", { replace: true });
  }, [location.pathname, navigate]);

  return null;
};

export default HostnameRouter;
