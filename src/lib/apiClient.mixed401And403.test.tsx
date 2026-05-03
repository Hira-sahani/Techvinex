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

describe("apiClient — concurrent 401/403 burst with retryOnUnauthorized=false", () => {
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
      data: { session: { access_token: "fresh" }, user: null },
      error: null,
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

  it("only 401s are recorded as initial_401/retryAttempted=false; 403s never enter telemetry or bus", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      return Promise.resolve(makeResponse(url.includes("/forbidden/") ? 403 : 401));
    }) as unknown as typeof fetch;

    const responses = await Promise.all([
      ...Array.from({ length: 5 }, (_, i) =>
        apiFetch(`/auth/${i}`, { retryOnUnauthorized: false }),
      ),
      ...Array.from({ length: 5 }, (_, i) =>
        apiFetch(`/forbidden/${i}`, { retryOnUnauthorized: false }),
      ),
    ]);
    await capture.drain();

    // Underlying responses bubble up unchanged (apiFetch doesn't throw on 4xx).
    const statuses = responses.map((r) => r.status).sort();
    expect(statuses).toEqual([401, 401, 401, 401, 401, 403, 403, 403, 403, 403]);

    // Refresh must NEVER fire — retryOnUnauthorized=false everywhere.
    expect(mocks.refreshSession).not.toHaveBeenCalled();

    // ---- 403 family: no bus, no telemetry, no retryAttempted of any kind ----
    capture.expectNoBusEmissionsFor("/forbidden/");
    expect(capture.telemetryFor("/forbidden/")).toHaveLength(0);
    expect(sinkEvents.filter((e) => e.endpoint.startsWith("/forbidden/"))).toHaveLength(0);
    expect(capture.countRetryAttempted(true, "/forbidden/")).toBe(0);
    expect(capture.countRetryAttempted(false, "/forbidden/")).toBe(0);

    // ---- 401 family: 5 telemetry, all initial_401 / retryAttempted=false ----
    expect(capture.telemetryFor("/auth/")).toHaveLength(5);
    capture.expectRetryAttemptedFalseFor("/auth/");
    expect(capture.countRetryAttempted(true, "/auth/")).toBe(0);
    expect(capture.countRetryAttempted(false, "/auth/")).toBe(5);
    for (const ev of capture.telemetryFor("/auth/")) {
      expect(ev.status).toBe(401);
      expect(ev.reason).toBe("initial_401");
      expect(ev.retryAttempted).toBe(false);
    }

    // ---- Aggregate retryAttempted counter is zero across the whole burst ----
    capture.expectRetryAttemptedCounterZero();
    expect(capture.telemetryCountsByRetryAttempted().true).toBe(0);
    expect(capture.telemetryCountsByRetryAttempted().false).toBe(5);

    // Bus only ever references /auth/ endpoints.
    for (const ev of capture.busEvents) {
      expect(ev.endpoint.startsWith("/auth/")).toBe(true);
    }
  });
});
