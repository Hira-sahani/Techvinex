import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProfileDropdown = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const userInitial = user?.email?.charAt(0)?.toUpperCase() || "U";
  const userEmail = user?.email || "";

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/login");
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0"
      >
        {userInitial}
      </button>

      {open && (
        <div 
          className="absolute right-0 top-12 w-56 bg-card border border-border rounded-xl shadow-lg z-[100] py-2 animate-in fade-in slide-in-from-top-2"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-border">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium text-foreground truncate">{userEmail}</p>
          </div>
          <button
            onMouseDown={(e) => { e.stopPropagation(); setOpen(false); navigate("/settings"); }}
            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
          >
            Settings
          </button>
          <button
            onMouseDown={(e) => { e.stopPropagation(); setOpen(false); navigate("/settings?tab=support"); }}
            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
          >
            Support
          </button>
          <button
            onMouseDown={(e) => { e.stopPropagation(); setOpen(false); handleLogout(); }}
            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors border-t border-border"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileDropdown;
