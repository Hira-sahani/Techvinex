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

import {
  apiFetch,
  onSessionExpired,
  getRecentUnauthorizedEvents,
  type SessionExpiredEvent,
} from "./apiClient";

function makeResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new Headers(),
  } as unknown as Response;
}

describe("apiFetch — concurrent mixed 500 + 401 responses", () => {
  let originalFetch: typeof global.fetch;
  let busEvents: SessionExpiredEvent[];
  let unsubscribe: () => void;
  let baselineEventCount: number;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-old" } },
      error: null,
    });
    mocks.refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "refresh failed" },
    });
    mocks.signOut.mockResolvedValue({ error: null });

    busEvents = [];
    unsubscribe = onSessionExpired((e) => busEvents.push(e));
    baselineEventCount = getRecentUnauthorizedEvents().length;

    originalFetch = global.fetch;
  });

  afterEach(() => {
    unsubscribe();
    global.fetch = originalFetch;
  });

  it("regression: 500s never emit session-expired bus, and 401 telemetry has correct retryAttempted", async () => {
    // Route by URL: /five/* -> 500, /four-no-retry/* -> 401, /four-retry/* -> 401.
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
      if (url.includes("/five/")) return Promise.resolve(makeResponse(500));
      return Promise.resolve(makeResponse(401));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const calls: Promise<Response>[] = [];
    // 4 x 500
    for (let i = 0; i < 4; i++) calls.push(apiFetch(`/five/${i}`));
    // 3 x 401 without retry → each records initial_401 with retryAttempted=false
    for (let i = 0; i < 3; i++) calls.push(apiFetch(`/four-no-retry/${i}`));
    // 3 x 401 with retry → refresh fails (mocked), each records refresh_failed
    // with retryAttempted=true
    for (let i = 0; i < 3; i++)
      calls.push(apiFetch(`/four-retry/${i}`, { retryOnUnauthorized: true }));

    const results = await Promise.allSettled(calls);
    // Drain microtasks for the void-handled unauthorized handler.
    for (let i = 0; i < 5; i++) await Promise.resolve();

    // All requests resolved.
    expect(results).toHaveLength(10);

    // 500s: never emit a session-expired bus event AND never produce telemetry.
    // 401s DO emit the bus event (de-duplicated to a single handler invocation
    // by handling401), so we expect exactly one bus event for the whole burst.
    expect(busEvents.length).toBeGreaterThanOrEqual(1);
    for (const ev of busEvents) {
      expect(ev.endpoint).not.toContain("/five/");
    }

    // Refresh attempted exactly once across the whole burst (coalesced).
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
    // signOut/toast also de-duplicated to a single invocation.
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).toHaveBeenCalledTimes(1);

    // Telemetry assertions.
    const newEvents = getRecentUnauthorizedEvents().slice(baselineEventCount);

    // No 500 should have been recorded in the 401 ring buffer.
    for (const ev of newEvents) {
      expect(ev.status).toBe(401);
      expect(ev.endpoint).not.toContain("/five/");
    }

    const noRetryEvents = newEvents.filter((e) =>
      e.endpoint.includes("/four-no-retry/"),
    );
    const retryEvents = newEvents.filter((e) =>
      e.endpoint.includes("/four-retry/"),
    );

    // 3 calls without retryOnUnauthorized: exactly 3 events, all retryAttempted=false.
    expect(noRetryEvents).toHaveLength(3);
    for (const ev of noRetryEvents) {
      expect(ev.retryAttempted).toBe(false);
      expect(ev.reason).toBe("initial_401");
    }

    // 3 calls with retryOnUnauthorized + refresh failure: exactly 3 events,
    // all retryAttempted=true with reason=refresh_failed.
    expect(retryEvents).toHaveLength(3);
    for (const ev of retryEvents) {
      expect(ev.retryAttempted).toBe(true);
      expect(ev.reason).toBe("refresh_failed");
    }
  });
});
