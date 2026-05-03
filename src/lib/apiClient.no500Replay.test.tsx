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

import { apiFetch, getRecentUnauthorizedEvents } from "./apiClient";

function makeResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new Headers(),
  } as unknown as Response;
}

describe("apiFetch — 500 responses never trigger a replay even with retryOnUnauthorized=true", () => {
  let originalFetch: typeof global.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;
  let baselineEventCount: number;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    mocks.refreshSession.mockResolvedValue({
      data: { session: { access_token: "tok-new", refresh_token: "rt" }, user: null },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });

    baselineEventCount = getRecentUnauthorizedEvents().length;

    fetchMock = vi.fn(() => Promise.resolve(makeResponse(500)));
    originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("retryAttempted counter stays at zero across a 500 burst with retryOnUnauthorized=true", async () => {
    const N = 8;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        apiFetch(`/api/srv-err/${i}`, { retryOnUnauthorized: true }),
      ),
    );
    for (let i = 0; i < 4; i++) await Promise.resolve();

    // Every response surfaced as 500 to the caller.
    for (const res of results) expect(res.status).toBe(500);

    // No replay: exactly one fetch per request, never doubled.
    expect(fetchMock).toHaveBeenCalledTimes(N);

    // Refresh is the precursor to a replay — must never be attempted on 500s.
    expect(mocks.refreshSession).not.toHaveBeenCalled();

    // Auth side-effects must not fire for server errors.
    expect(mocks.signOut).not.toHaveBeenCalled();

    // The "retryAttempted counter" — count of telemetry events with
    // retryAttempted=true that were produced by this burst — must be zero.
    const newEvents = getRecentUnauthorizedEvents().slice(baselineEventCount);
    const retryAttemptedCount = newEvents.filter((e) => e.retryAttempted).length;
    expect(retryAttemptedCount).toBe(0);

    // Defensive: 500s shouldn't even appear in the 401 telemetry buffer.
    for (const ev of newEvents) {
      expect(ev.endpoint).not.toContain("/api/srv-err/");
    }
  });
});
