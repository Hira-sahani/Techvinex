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
  toast: { error: mocks.toastError, success: vi.fn(), message: vi.fn() },
}));

import { apiFetch, addTelemetrySink, type UnauthorizedEvent } from "./apiClient";
import {
  createUnauthorizedCapture,
  type UnauthorizedCapture,
} from "./apiClient.testHelpers";

function makeResponse(status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new Headers(),
  } as unknown as Response;
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string"
    ? input
    : (input as Request).url ?? String(input);
}

describe("apiClient — scalability: large mixed 500/401 concurrent burst", () => {
  let originalFetch: typeof global.fetch;
  let capture: UnauthorizedCapture;
  let sinkEvents: UnauthorizedEvent[];
  let unsubSink: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "fail" },
    });
    originalFetch = global.fetch;
    sinkEvents = [];
    unsubSink = addTelemetrySink((e) => sinkEvents.push(e));
    capture = createUnauthorizedCapture();
  });

  afterEach(() => {
    capture.dispose();
    unsubSink?.();
    global.fetch = originalFetch;
  });

  it("50 x 500 + 40 x 401(no-retry) + 30 x 401(retry+failed refresh) — counts hold, refresh deduped to 1", async () => {
    const FIVE = 50;
    const NO = 40;
    const YES = 30;

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      return Promise.resolve(makeResponse(url.includes("/srv/") ? 500 : 401));
    }) as unknown as typeof fetch;

    const calls: Promise<Response>[] = [
      ...Array.from({ length: FIVE }, (_, i) =>
        apiFetch(`/srv/${i}`, { retryOnUnauthorized: true }),
      ),
      ...Array.from({ length: NO }, (_, i) => apiFetch(`/no/${i}`)),
      ...Array.from({ length: YES }, (_, i) =>
        apiFetch(`/yes/${i}`, { retryOnUnauthorized: true }),
      ),
    ];

    // Interleave so every "family" is contending in the same in-flight window.
    for (let i = calls.length - 1; i > 0; i--) {
      const j = (i * 7919) % (i + 1); // deterministic pseudo-shuffle
      [calls[i], calls[j]] = [calls[j], calls[i]];
    }

    await Promise.all(calls);
    await capture.drain();

    // ---- Refresh dedupe: still exactly ONE call across 30 concurrent retriers ----
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    // Use the unbounded telemetry SINK (not the 50-event ring buffer) for
    // count assertions at scale.
    const srvEvents = sinkEvents.filter((e) => e.endpoint.startsWith("/srv/"));
    const noEvents = sinkEvents.filter((e) => e.endpoint.startsWith("/no/"));
    const yesEvents = sinkEvents.filter((e) => e.endpoint.startsWith("/yes/"));

    // ---- 500 family: zero leak anywhere ----
    capture.expectNoBusEmissionsFor("/srv/");
    expect(srvEvents).toHaveLength(0);

    // ---- 401 no-retry: NO telemetry events, all retryAttempted=false / initial_401 ----
    expect(noEvents).toHaveLength(NO);
    for (const ev of noEvents) {
      expect(ev.reason).toBe("initial_401");
      expect(ev.retryAttempted).toBe(false);
    }

    // ---- 401 with-retry: YES telemetry events, all retryAttempted=true / refresh_failed ----
    expect(yesEvents).toHaveLength(YES);
    for (const ev of yesEvents) {
      expect(ev.reason).toBe("refresh_failed");
      expect(ev.retryAttempted).toBe(true);
    }

    // ---- Aggregate buckets across the sink ----
    const trueCount = sinkEvents.filter((e) => e.retryAttempted).length;
    const falseCount = sinkEvents.filter((e) => !e.retryAttempted).length;
    expect(trueCount).toBe(YES);
    expect(falseCount).toBe(NO);
    expect(sinkEvents).toHaveLength(NO + YES);

    // ---- Bus only ever references 401 endpoints ----
    expect(capture.totalBus()).toBeGreaterThanOrEqual(1);
    for (const ev of capture.busEvents) {
      expect(
        ev.endpoint.startsWith("/no/") || ev.endpoint.startsWith("/yes/"),
        `unexpected bus endpoint ${ev.endpoint}`,
      ).toBe(true);
    }

    // ---- Handler dedupe is bounded even at 70 concurrent 401s ----
    // signOut + toast are gated by `handling401`; each in-flight window
    // produces at most one of each. Burst windows are tiny, so we
    // tolerate up to a handful but should NEVER scale with 401 count.
    expect(mocks.signOut.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mocks.signOut.mock.calls.length).toBeLessThanOrEqual(4);
    expect(mocks.toastError.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mocks.toastError.mock.calls.length).toBeLessThanOrEqual(4);
  });
});
