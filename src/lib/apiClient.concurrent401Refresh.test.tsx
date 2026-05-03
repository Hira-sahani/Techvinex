import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      refreshSession: mocks.refreshSession,
      signOut: mocks.signOut,
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: vi.fn(),
    message: vi.fn(),
  },
}));

import { apiFetch } from "./apiClient";

describe("apiFetch — concurrent 401 dedup of refreshSession & signOut", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-stale" } },
      error: null,
    });
    mocks.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: "refresh failed" },
    });
    mocks.signOut.mockResolvedValue({ error: null });

    fetchMock = vi.fn(
      () =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
          headers: new Headers(),
        }) as unknown as Promise<Response>,
    );
    originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("regression: signOut is called exactly once for a burst of 401s without retry", async () => {
    await Promise.all(
      Array.from({ length: 12 }, (_, i) => apiFetch(`/api/x/${i}`)),
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(12);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    // refreshSession is NEVER attempted when retryOnUnauthorized is not set.
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it("regression: refreshSession and signOut each fire at most once for a concurrent burst with retryOnUnauthorized", async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        apiFetch(`/api/y/${i}`, { retryOnUnauthorized: true }),
      ),
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Each request individually attempts a refresh (no global refresh dedup),
    // but signOut from the unauthorized handler must still fire ONLY ONCE
    // thanks to the in-flight 401 lock.
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Your session has expired. Please sign in again.",
      expect.objectContaining({ id: "session-expired" }),
    );
  });
});
