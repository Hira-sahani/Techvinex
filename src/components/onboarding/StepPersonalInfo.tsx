import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { checkPasswordStrength } from "@/lib/passwordSecurity";

interface Props {
  form: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  };
  update: (key: string, value: string) => void;
  passwordError?: string;
  passwordAlreadySet?: boolean;
}

const StepPersonalInfo = ({ form, update, passwordError, passwordAlreadySet }: Props) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [passwordTouched, setPasswordTouched] = useState(false);

  const strength = form.password ? checkPasswordStrength(form.password) : null;
  const passwordsMatch = form.password && form.confirmPassword && form.password === form.confirmPassword;
  const passwordsMismatch = form.confirmPassword && form.password !== form.confirmPassword;

  return (
    <div className="text-center">
      <h1 className="text-xl font-bold text-foreground mb-1">Welcome to Jetra X!</h1>
      <p className="text-sm text-muted-foreground mb-8">
        Let's start your profile. Fill out a few quick details to get discovered by top employers and unlock better opportunities
      </p>

      <div className="space-y-4 text-left">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name *</label>
          <Input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Your full name" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Email *</label>
          <Input
            type="email"
            value={form.email}
            readOnly
            className="bg-muted/50 cursor-not-allowed"
          />
        </div>
        {!passwordAlreadySet && (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Set Password *</label>
                {passwordError && <span className="text-xs text-destructive">{passwordError}</span>}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  placeholder="Min 8 chars, uppercase, lowercase, digit, symbol"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordTouched && strength && !strength.isStrong && form.password && (
                <p className="text-xs text-destructive mt-1">{strength.errors[0]}</p>
              )}
              {passwordTouched && strength?.isStrong && (
                <p className="text-xs text-primary mt-1">Strong password ✓</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Re-enter Password *</label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  placeholder="Re-enter your password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-xs text-destructive mt-1">Passwords do not match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-primary mt-1">Passwords match ✓</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StepPersonalInfo;
