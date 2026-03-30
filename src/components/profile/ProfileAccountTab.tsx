import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Trash2, Settings } from "lucide-react";

const ProfileAccountTab = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <div className="space-y-6 max-w-xl">
      <h3 className="text-base font-semibold text-foreground mb-4">Account</h3>

      <div className="space-y-2">
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground hover:bg-secondary transition-colors"
        >
          <Settings size={16} className="text-muted-foreground" />
          Settings
        </button>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border bg-card text-sm text-foreground hover:bg-secondary transition-colors"
        >
          <LogOut size={16} className="text-muted-foreground" />
          Log Out
        </button>

        <button
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-destructive/30 bg-card text-sm text-destructive hover:bg-destructive/5 transition-colors"
        >
          <Trash2 size={16} />
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default ProfileAccountTab;
