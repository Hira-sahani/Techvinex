import type { Mock } from "vitest";
import { act } from "react";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Shape of the hoisted mocks object that test files create with vi.hoisted().
 * Helpers accept any object matching this shape so they work across test files
 * without coupling to a specific mock module.
 */
export interface AuthMocks {
  unsubscribe: Mock;
  onAuthStateChange: Mock;
  getSession: Mock;
  signOut: Mock;
}

/** Build a fake Supabase Session for tests. Override any field as needed. */
export const buildFakeSession = (
  overrides: Partial<Session> & { user?: Partial<User> } = {},
): Session => {
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

/** Tell the next call to getSession() to resolve with this session (or null). */
export const seedNextSession = (
  mocks: AuthMocks,
  session: Session | null,
  error: Error | null = null,
) => {
  mocks.getSession.mockResolvedValueOnce({ data: { session }, error });
};

/**
 * Capture the auth-state-change listener registered on the NEXT mount and
 * return helpers to inspect / fire events on it.
 */
export const captureNextAuthListener = (mocks: AuthMocks) => {
  let captured: ((event: string, session: Session | null) => void) | null = null;

  mocks.onAuthStateChange.mockImplementationOnce(((
    cb: (event: string, session: Session | null) => void,
  ) => {
    captured = cb;
    return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
  }) as unknown as () => {
    data: { subscription: { unsubscribe: typeof mocks.unsubscribe } };
  });

  return {
    get: () => {
      if (!captured) throw new Error("Auth listener has not been registered yet");
      return captured;
    },
    /** Fire an event on the captured listener wrapped in React act(). */
    emit: (event: string, session: Session | null) => {
      if (!captured) throw new Error("Auth listener has not been registered yet");
      act(() => captured!(event, session));
    },
  };
};
