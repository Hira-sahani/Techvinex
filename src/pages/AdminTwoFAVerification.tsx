import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { Mail, CheckCircle2, AlertCircle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { use2FA } from "@/hooks/use2FA";

type LocationState = {
  userId?: string;
  email?: string;
  next?: string;
};

const OTP_TTL_SECONDS = 10 * 60;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.max(0, seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function AdminTwoFAVerification() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as LocationState;
  const { userId, email, next } = state;

  const { loading, error, sessionId, otpSent, sendOTP, verifyOTP, clearError } =
    use2FA();

  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(OTP_TTL_SECONDS);
  const [localError, setLocalError] = useState<string | null>(null);

  // Missing state → back to login
  const invalid = !userId || !email;

  // Countdown timer
  useEffect(() => {
    if (!otpSent) return;
    setSecondsLeft(OTP_TTL_SECONDS);
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [otpSent, sessionId]);

  const expired = otpSent && secondsLeft === 0;

  const displayError = useMemo(
    () => error ?? localError,
    [error, localError],
  );

  if (invalid) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleSend = async () => {
    setLocalError(null);
    clearError();
    setOtp("");
    await sendOTP(userId!, email!);
  };

  const handleVerify = async () => {
    setLocalError(null);
    clearError();

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setLocalError("Please enter the 6-digit verification code.");
      return;
    }
    if (!sessionId) {
      setLocalError("No active verification session. Please request a new code.");
      return;
    }

    const ok = await verifyOTP(sessionId, otp, userId!);
    if (ok) {
      sessionStorage.setItem("admin_2fa_verified", "true");
      navigate(next || "/admin", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Super Admin Verification
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Two-factor authentication required
          </p>
        </div>

        {!otpSent ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Email Verification
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  We'll send a 6-digit verification code to:
                </p>
                <p className="text-sm font-medium text-slate-900 mt-1 break-all">
                  {email}
                </p>
              </div>
            </div>

            {displayError && (
              <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{displayError}</p>
              </div>
            )}

            <Button
              onClick={handleSend}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-5 p-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-green-900 text-sm">
                  Code Sent
                </p>
                <p className="text-xs text-green-700 mt-0.5">
                  Check {email} for your 6-digit verification code.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-5 text-slate-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-mono tabular-nums">
                {formatTime(secondsLeft)}
              </span>
            </div>

            {expired ? (
              <>
                <div className="flex items-start gap-2 p-3 mb-4 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-800">
                    Code Expired — please request a new verification code.
                  </p>
                </div>
                <Button
                  onClick={handleSend}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Sending..." : "Request New Code"}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtp(v);
                      if (localError) setLocalError(null);
                      if (error) clearError();
                    }}
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    disabled={loading}
                  />
                  {displayError && (
                    <div className="flex items-start gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700">{displayError}</p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleVerify}
                  disabled={loading || otp.length !== 6}
                  className="w-full"
                >
                  {loading ? "Verifying..." : "Verify Code"}
                </Button>

                <button
                  type="button"
                  onClick={handleSend}
                  disabled={loading}
                  className="w-full mt-3 text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  Didn't receive it? Resend code
                </button>
              </>
            )}
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          For your security, this session requires a fresh verification code.
        </p>
      </div>
    </div>
  );
}
