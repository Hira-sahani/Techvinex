import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import ProfileDropdown from "@/components/ProfileDropdown";
import NotificationBell from "@/components/NotificationBell";
import BrandLogo from "@/components/BrandLogo";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLang();
  const { isLoggedIn, user } = useAuth();
  const location = useLocation();

  const showBackButton = location.pathname.startsWith("/role/") || location.pathname.startsWith("/apply/");

  const navLinks = [
    { label: t("nav.apex"), href: "/#apex" },
    { label: t("nav.research"), href: "/#features" },
    { label: t("nav.enterprise"), href: "/#cta" },
    { label: t("nav.blog"), href: "/#stories" },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileOpen(false);
    if (href.startsWith("/#")) {
      const sectionId = href.replace("/#", "");
      if (window.location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo size={32} className="h-8 w-8" />
        </Link>

        {showBackButton && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-4 py-1.5 rounded-lg gradient-cta text-primary-foreground text-sm font-semibold hover:opacity-90 active:opacity-80 transition-opacity ml-2 shadow-sm"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        )}

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <NotificationBell />
              <ProfileDropdown />
            </>
          ) : (
            <>
              <div className="hidden md:block">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="rounded-full px-6">
                    {t("nav.login")}
                  </Button>
                </Link>
              </div>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 text-foreground"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </>
          )}
        </div>
      </div>

      {mobileOpen && !isLoggedIn && (
        <div className="md:hidden border-t border-border bg-background px-4 pb-4 animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="block py-3 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
          <Link to="/login" onClick={() => setMobileOpen(false)}>
            <Button variant="outline" size="sm" className="mt-2 w-full rounded-full">
              {t("nav.login")}
            </Button>
          </Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
