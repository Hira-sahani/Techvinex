import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StepUpReauthProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called only after the password is verified server-side. */
  onVerified: () => void | Promise<void>;
  title?: string;
  description?: string;
}

/**
 * Lightweight step-up reauth — re-verifies the user's password with
 * Supabase before allowing destructive admin actions (secret delete,
 * webhook delete, etc.). No new tables / no token introspection — we
 * just call signInWithPassword as a proof-of-knowledge check, and the
 * existing session continues to be used.
 */
const StepUpReauth = ({
  open, onOpenChange, onVerified,
  title = "Confirm your identity",
  description = "Enter your password to continue this sensitive action.",
}: StepUpReauthProps) => {
  const [password, setPassword] = useState("");
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const verify = async () => {
    if (!password) return;
    setVerifying(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setVerifying(false); toast.error("No active session"); return; }

    const { error } = await supabase.auth.signInWithPassword({
      email: user.email, password,
    });
    setVerifying(false);
    if (error) { toast.error("Password incorrect"); return; }

    onOpenChange(false);
    await onVerified();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4" /> {title}
          </DialogTitle>
          <DialogDescription className="text-[11px]">{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-[11px]">Password</Label>
          <Input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            className="h-8 text-xs"
            autoComplete="current-password"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="h-7 text-[11px]">
            Cancel
          </Button>
          <Button size="sm" onClick={verify} disabled={verifying || !password} className="h-7 text-[11px]">
            {verifying ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
            Verify
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StepUpReauth;
