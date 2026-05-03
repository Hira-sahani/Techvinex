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

describe("apiFetch — retryOnUnauthorized hard cap (no infinite retry)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-stale" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });

    // Refresh "succeeds" but the new token still 401s (server rejects it).
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

  it("refreshes exactly ONCE and replays exactly ONCE when replay also returns 401", async () => {
    const res = await apiFetch("/api/protected", { retryOnUnauthorized: true });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // Refresh attempted exactly once (no second-pass refresh).
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    // fetch was called twice: original attempt + ONE replay. No third call.
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The replay carried the FRESH bearer (no stale token).
    const replayHeaders = new Headers(
      (fetchMock.mock.calls[1][1] as RequestInit).headers ?? {},
    );
    expect(replayHeaders.get("Authorization")).toBe("Bearer tok-fresh");

    // Replay still 401 → unauthorized handler ran (signOut + toast) ONCE.
    expect(res.status).toBe(401);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
  });

  it("does NOT refresh again on subsequent calls within the same in-flight 401 burst", async () => {
    await Promise.all([
      apiFetch("/a", { retryOnUnauthorized: true }),
      apiFetch("/b", { retryOnUnauthorized: true }),
      apiFetch("/c", { retryOnUnauthorized: true }),
    ]);
    await Promise.resolve();
    await Promise.resolve();

    // One shared refresh across the burst, and signOut only once.
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
});
