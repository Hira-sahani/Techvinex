import { lazy, Suspense, Component, type ReactNode, type ErrorInfo, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import { LangProvider } from "@/contexts/LangContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import ProtectedRoute from "@/components/ProtectedRoute";
import AuthRedirectHandler from "@/components/AuthRedirectHandler";

import SidebarNav from "@/components/SidebarNav";
import EmployerProtectedRoute from "@/components/employer/EmployerProtectedRoute";
import AdminProtectedRoute from "@/components/admin/AdminProtectedRoute";

import OfflineBanner from "@/components/OfflineBanner";
import JetraLoader from "@/components/JetraLoader";

// Error boundary to handle dynamic import failures (common in preview)
class LazyErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    if (error.message.includes('dynamically imported module')) {
      // Retry by reloading
      window.location.reload();
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
          <p className="text-muted-foreground text-sm">Loading failed. Retrying...</p>
          <button onClick={() => window.location.reload()} className="text-primary text-sm underline">
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Lazy loaded pages
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Explore = lazy(() => import("./pages/Explore"));
const RoleDetail = lazy(() => import("./pages/RoleDetail"));
const Referrals = lazy(() => import("./pages/Referrals"));
const Earnings = lazy(() => import("./pages/Earnings"));
const Profile = lazy(() => import("./pages/Profile"));
const EditProfile = lazy(() => import("./pages/EditProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const ApplyRole = lazy(() => import("./pages/ApplyRole"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));

const Notifications = lazy(() => import("./pages/Notifications"));
const CandidateDashboard = lazy(() => import("./pages/CandidateDashboard"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const EmployerLogin = lazy(() => import("./pages/employer/EmployerLogin"));
const EmployerDashboard = lazy(() => import("./pages/employer/EmployerDashboard"));
const EmployerRequirements = lazy(() => import("./pages/employer/EmployerRequirements"));
const EmployerCandidates = lazy(() => import("./pages/employer/EmployerCandidates"));
const EmployerInterviews = lazy(() => import("./pages/employer/EmployerInterviews"));
const EmployerAnalytics = lazy(() => import("./pages/employer/EmployerAnalytics"));
const EmployerBilling = lazy(() => import("./pages/employer/EmployerBilling"));
const EmployerPipeline = lazy(() => import("./pages/employer/EmployerPipeline"));
const EmployerTalentPool = lazy(() => import("./pages/employer/EmployerTalentPool"));
const EmployerSettings = lazy(() => import("./pages/employer/EmployerSettings"));
const EmployerMessages = lazy(() => import("./pages/employer/EmployerMessages"));
const EmployerNotifications = lazy(() => import("./pages/employer/EmployerNotifications"));
const EmployerLayout = lazy(() => import("./components/employer/EmployerLayout"));

// Admin pages
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminRequirements = lazy(() => import("./pages/admin/AdminRequirements"));
const AdminCandidates = lazy(() => import("./pages/admin/AdminCandidates"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminAIMatching = lazy(() => import("./pages/admin/AdminAIMatching"));
const AdminExploreJobs = lazy(() => import("./pages/admin/AdminExploreJobs"));
const ExploreJobDetail = lazy(() => import("./pages/ExploreJobDetail"));

const queryClient = new QueryClient();

const TABS_VISIBLE_ROUTES = ["/", "/explore", "/dashboard", "/referrals", "/earnings", "/profile"];

const hideSplashScreen = () => {
  const splash = document.getElementById("splash-screen");
  if (!splash) return;

  splash.style.opacity = "0";
  splash.style.pointerEvents = "none";
  window.setTimeout(() => splash.remove(), 220);
};

const PageLoader = () => <JetraLoader />;

const AppLayout = () => {
  const location = useLocation();
  const showTabs = TABS_VISIBLE_ROUTES.includes(location.pathname);

  useEffect(() => {
    let frameId = 0;

    const waitForAppReady = () => {
      const hasActiveLoader = Boolean(document.querySelector(".loader-overlay"));

      if (hasActiveLoader) {
        frameId = window.requestAnimationFrame(waitForAppReady);
        return;
      }

      hideSplashScreen();
    };

    frameId = window.requestAnimationFrame(waitForAppReady);

    return () => window.cancelAnimationFrame(frameId);
  }, [location.pathname]);

  return (
    <>
      <AuthRedirectHandler />
      {showTabs && <SidebarNav />}
      <LazyErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/role/:id" element={<ProtectedRoute><RoleDetail /></ProtectedRoute>} />
          <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
          <Route path="/earnings" element={<ProtectedRoute><Earnings /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/apply/:id" element={<ProtectedRoute><ApplyRole /></ProtectedRoute>} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/jobs/:slug" element={<ExploreJobDetail />} />

          {/* Employer Portal */}
          <Route path="/employer/login" element={<EmployerLogin />} />
          <Route path="/employer" element={<EmployerProtectedRoute><EmployerLayout /></EmployerProtectedRoute>}>
            <Route path="dashboard" element={<EmployerDashboard />} />
            <Route path="requirements" element={<EmployerRequirements />} />
            <Route path="candidates" element={<EmployerCandidates />} />
            <Route path="interviews" element={<EmployerInterviews />} />
            <Route path="analytics" element={<EmployerAnalytics />} />
            <Route path="billing" element={<EmployerBilling />} />
            <Route path="pipeline" element={<EmployerPipeline />} />
            <Route path="talent-pool" element={<EmployerTalentPool />} />
            <Route path="settings" element={<EmployerSettings />} />
            <Route path="messages" element={<EmployerMessages />} />
            <Route path="notifications" element={<EmployerNotifications />} />
          </Route>


          {/* Admin Panel */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
            <Route path="overview" element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="requirements" element={<AdminRequirements />} />
            <Route path="candidates" element={<AdminCandidates />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="ai-matching" element={<AdminAIMatching />} />
            <Route path="explore-jobs" element={<AdminExploreJobs />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </LazyErrorBoundary>
      {showTabs && <BottomTabBar />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
    <AuthProvider>
    <UserProvider>
    <LangProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineBanner />
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </TooltipProvider>
    </LangProvider>
    </UserProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
