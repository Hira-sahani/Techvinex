import { vi } from "vitest";
import { act } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { mocks } from "./mocks";

/**
 * Build a fake Supabase Session for tests. Override any field as needed.
 */
export const buildFakeSession = (overrides: Partial<Session> & { user?: Partial<User> } = {}): Session => {
  const user = {
    id: "test-user-id",
    email: "test@example.com",
    ...(overrides.user ?? {}),
  } as unknown as User;
  return {
    access_token: "test-access-token",
    refresh_token: "test-refresh-token",
    user,
    ...overrides,
  } as unknown as Session;
};

/**
 * Tell the next call to getSession() to resolve with this session (or null).
 */
export const seedNextSession = (
  m: typeof mocks,
  session: Session | null,
  error: Error | null = null,
) => {
  m.getSession.mockResolvedValueOnce({ data: { session }, error });
};

/**
 * Capture the auth-state-change listener registered on the next mount,
 * so tests can fire SIGNED_IN / SIGNED_OUT / TOKEN_REFRESHED etc. directly.
 *
 * Returns a getter that yields the captured callback (or throws if it has
 * not been registered yet).
 */
export const captureNextAuthListener = (m: typeof mocks) => {
  let captured: ((event: string, session: Session | null) => void) | null = null;

  m.onAuthStateChange.mockImplementationOnce(((
    cb: (event: string, session: Session | null) => void,
  ) => {
    captured = cb;
    return { data: { subscription: { unsubscribe: m.unsubscribe } } };
  }) as unknown as () => {
    data: { subscription: { unsubscribe: typeof m.unsubscribe } };
  });

  return {
    get: () => {
      if (!captured) throw new Error("Auth listener has not been registered yet");
      return captured;
    },
    /** Fire an event on the captured listener inside React act(). */
    emit: (event: string, session: Session | null) => {
      if (!captured) throw new Error("Auth listener has not been registered yet");
      act(() => captured!(event, session));
    },
  };
};

// Re-export for convenience so consumers do not need a second import.
export { vi };
