import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

async function callFn<T = unknown>(path: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (json.error as string) ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

export function use2FA() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const clearError = useCallback(() => setError(null), []);

  const sendOTP = useCallback(async (userId: string, email: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await callFn<{ success: boolean; sessionId: string; expiresIn: number }>(
        "admin-2fa-send-otp",
        { userId, email },
      );
      setSessionId(data.sessionId);
      setOtpSent(true);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
      setOtpSent(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyOTP = useCallback(
    async (sid: string, otp: string, userId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const data = await callFn<{ success: boolean; verified: boolean }>(
          "admin-2fa-verify-otp",
          { sessionId: sid, otp, userId },
        );
        return Boolean(data.verified);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to verify OTP");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { loading, error, sessionId, otpSent, sendOTP, verifyOTP, clearError };
}
