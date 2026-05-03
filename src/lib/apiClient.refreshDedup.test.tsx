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

describe("apiFetch — concurrent refreshSession de-duplication", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    // Initial session is "stale" — every call attaches it, server 401s.
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-stale" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("regression: a burst of concurrent 401s shares ONE refreshSession() call", async () => {
    // Refresh resolves on a microtask boundary so all callers definitely
    // queue up against the same in-flight promise.
    let resolveRefresh!: () => void;
    const refreshGate = new Promise<void>((r) => {
      resolveRefresh = r;
    });
    mocks.refreshSession.mockImplementation(async () => {
      await refreshGate;
      // After refresh, getSession must return the fresh token so the
      // inner apiFetch replay attaches it.
      mocks.getSession.mockResolvedValue({
        data: { session: { access_token: "tok-fresh" } },
        error: null,
      });
      return {
        data: { session: { access_token: "tok-fresh" } },
        error: null,
      };
    });

    // First attempt for any URL → 401. Replay (no retry) → 200.
    fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const auth = new Headers(init?.headers ?? {}).get("Authorization");
      const status = auth === "Bearer tok-fresh" ? 200 : 401;
      return Promise.resolve({
        ok: status === 200,
        status,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      }) as unknown as Promise<Response>;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const inflight = Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        apiFetch(`/api/p/${i}`, { retryOnUnauthorized: true }),
      ),
    );

    // Let all 8 reach the refresh await before unblocking.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    resolveRefresh();
    const results = await inflight;

    // The critical invariant: ONE refresh call, not 8.
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    // signOut never fires because the refresh + replay succeeded.
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalledWith(
      "Your session has expired. Please sign in again.",
      expect.anything(),
    );

    // All requests ultimately resolved with the replayed 200.
    for (const res of results) expect(res.status).toBe(200);
  });

  it("a NEW burst after the previous one settled triggers a fresh refresh", async () => {
    mocks.refreshSession.mockImplementation(async () => {
      mocks.getSession.mockResolvedValue({
        data: { session: { access_token: "tok-fresh" } },
        error: null,
      });
      return {
        data: { session: { access_token: "tok-fresh" } },
        error: null,
      };
    });

    fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      const auth = new Headers(init?.headers ?? {}).get("Authorization");
      const status = auth === "Bearer tok-fresh" ? 200 : 401;
      return Promise.resolve({
        ok: status === 200,
        status,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      }) as unknown as Promise<Response>;
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await Promise.all([
      apiFetch("/a", { retryOnUnauthorized: true }),
      apiFetch("/b", { retryOnUnauthorized: true }),
    ]);
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    // Reset getSession back to the stale token so the next burst also 401s
    // and enters the refresh path again.
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-stale" } },
      error: null,
    });

    await Promise.all([
      apiFetch("/c", { retryOnUnauthorized: true }),
      apiFetch("/d", { retryOnUnauthorized: true }),
    ]);

    // Second burst → second refresh attempt (the in-flight slot was released).
    expect(mocks.refreshSession).toHaveBeenCalledTimes(2);
  });
});
