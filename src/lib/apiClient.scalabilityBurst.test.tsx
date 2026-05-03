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

    // ---- 500 family: zero leak anywhere ----
    capture.expectNoBusEmissionsFor("/srv/");
    expect(capture.telemetryFor("/srv/")).toHaveLength(0);
    expect(capture.countRetryAttempted(true, "/srv/")).toBe(0);
    expect(capture.countRetryAttempted(false, "/srv/")).toBe(0);

    // ---- 401 no-retry: NO telemetry events, all retryAttempted=false / initial_401 ----
    expect(capture.telemetryFor("/no/")).toHaveLength(NO);
    expect(capture.countRetryAttempted(false, "/no/")).toBe(NO);
    expect(capture.countRetryAttempted(true, "/no/")).toBe(0);
    for (const ev of capture.telemetryFor("/no/")) {
      expect(ev.reason).toBe("initial_401");
      expect(ev.retryAttempted).toBe(false);
    }

    // ---- 401 with-retry: YES telemetry events, all retryAttempted=true / refresh_failed ----
    expect(capture.telemetryFor("/yes/")).toHaveLength(YES);
    expect(capture.countRetryAttempted(true, "/yes/")).toBe(YES);
    expect(capture.countRetryAttempted(false, "/yes/")).toBe(0);
    for (const ev of capture.telemetryFor("/yes/")) {
      expect(ev.reason).toBe("refresh_failed");
      expect(ev.retryAttempted).toBe(true);
    }

    // ---- Aggregate buckets ----
    const buckets = capture.telemetryCountsByRetryAttempted();
    expect(buckets.false).toBe(NO);
    expect(buckets.true).toBe(YES);
    expect(capture.totalTelemetry()).toBe(NO + YES);

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
