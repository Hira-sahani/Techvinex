// Lightweight in-memory + localStorage OAuth/Auth diagnostics logger.
// Used by /auth-test page and the SessionStatusIndicator.

export type AuthDiagEntry = {
  ts: string;
  level: "info" | "warn" | "error";
  scope: string;
  message: string;
  data?: Record<string, unknown>;
};

const STORAGE_KEY = "techvinex.authDiag.v1";
const MAX_ENTRIES = 100;
const listeners = new Set<(entries: AuthDiagEntry[]) => void>();

const safeLoad = (): AuthDiagEntry[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(-MAX_ENTRIES) : [];
  } catch {
    return [];
  }
};

const safeSave = (entries: AuthDiagEntry[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* ignore quota errors */
  }
};

let buffer: AuthDiagEntry[] = typeof window !== "undefined" ? safeLoad() : [];

const notify = () => {
  for (const cb of listeners) cb(buffer);
};

export const logAuthDiag = (
  level: AuthDiagEntry["level"],
  scope: string,
  message: string,
  data?: Record<string, unknown>,
) => {
  const entry: AuthDiagEntry = {
    ts: new Date().toISOString(),
    level,
    scope,
    message,
    data,
  };
  buffer = [...buffer, entry].slice(-MAX_ENTRIES);
  safeSave(buffer);
  // Also surface in browser console for live debugging.
  const prefix = `[auth:${scope}]`;
  if (level === "error") console.error(prefix, message, data ?? "");
  else if (level === "warn") console.warn(prefix, message, data ?? "");
  else console.info(prefix, message, data ?? "");
  notify();
};

export const getAuthDiag = (): AuthDiagEntry[] => buffer.slice();

export const clearAuthDiag = () => {
  buffer = [];
  safeSave(buffer);
  notify();
};

export const subscribeAuthDiag = (cb: (entries: AuthDiagEntry[]) => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
