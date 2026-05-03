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
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return (input as Request).url ?? String(input);
}

describe("apiClient — endpoint grouping across URL shapes", () => {
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

  it("buckets per-prefix correctly across query params, trailing slashes, URL objects, and Request inputs", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      // /srv/* always 500. Everything else 401.
      return Promise.resolve(makeResponse(url.includes("/srv/") ? 500 : 401));
    }) as unknown as typeof fetch;

    // ---- /api/users/* — 401, no retry. 5 distinct URL shapes, all same prefix. ----
    const userInputs: Array<RequestInfo | URL> = [
      "/api/users/1",
      "/api/users/2/",
      "/api/users/3?expand=profile",
      "/api/users/4?expand=profile&fields=id,name",
      new URL("https://example.com/api/users/5?x=1"),
    ];

    // ---- /api/orders/* — 401, with retry + failing refresh. Mixed shapes. ----
    const orderInputs: Array<RequestInfo | URL> = [
      "/api/orders/100",
      "/api/orders/101/",
      "/api/orders/102?status=paid",
      new Request("https://example.com/api/orders/103?status=paid&page=2"),
    ];

    // ---- /srv/* — 500, with retry flag. Mixed shapes. ----
    const srvInputs: Array<RequestInfo | URL> = [
      "/srv/health",
      "/srv/health/",
      "/srv/metrics?window=5m",
      new URL("https://example.com/srv/status"),
    ];

    await Promise.all([
      ...userInputs.map((u) => apiFetch(u)),
      ...orderInputs.map((u) => apiFetch(u, { retryOnUnauthorized: true })),
      ...srvInputs.map((u) => apiFetch(u, { retryOnUnauthorized: true })),
    ]);
    await capture.drain();

    // Refresh must still dedupe to one call across 4 concurrent retriers.
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    // ---- Prefix bucketing via the capture helper ----
    // Telemetry for /api/users/ — exactly 5, all initial_401, retryAttempted=false.
    const userTel = capture.telemetryFor("/api/users/");
    expect(userTel).toHaveLength(5);
    expect(capture.countRetryAttempted(false, "/api/users/")).toBe(5);
    expect(capture.countRetryAttempted(true, "/api/users/")).toBe(0);
    for (const ev of userTel) {
      expect(ev.reason).toBe("initial_401");
      expect(ev.retryAttempted).toBe(false);
    }

    // Telemetry for /api/orders/ — exactly 4, all refresh_failed, retryAttempted=true.
    const orderTel = capture.telemetryFor("/api/orders/");
    expect(orderTel).toHaveLength(4);
    expect(capture.countRetryAttempted(true, "/api/orders/")).toBe(4);
    expect(capture.countRetryAttempted(false, "/api/orders/")).toBe(0);
    for (const ev of orderTel) {
      expect(ev.reason).toBe("refresh_failed");
      expect(ev.retryAttempted).toBe(true);
    }

    // /srv/* — zero telemetry, zero bus, regardless of URL shape.
    expect(capture.telemetryFor("/srv/")).toHaveLength(0);
    capture.expectNoBusEmissionsFor("/srv/");
    expect(capture.countRetryAttempted(true, "/srv/")).toBe(0);
    expect(capture.countRetryAttempted(false, "/srv/")).toBe(0);

    // ---- Per-endpoint count map: each distinct URL recorded under its own key ----
    const counts = capture.telemetryCountsByEndpoint();
    // Every recorded telemetry endpoint string should fall under one of the
    // two 401 prefixes — never under /srv/.
    for (const endpoint of Object.keys(counts)) {
      expect(
        endpoint.includes("/api/users/") || endpoint.includes("/api/orders/"),
        `unexpected telemetry endpoint key: ${endpoint}`,
      ).toBe(true);
      expect(counts[endpoint]).toBe(1); // each URL shape unique
    }

    // Sum of /api/users/* counts.
    const userKeys = Object.keys(counts).filter((k) => k.includes("/api/users/"));
    expect(userKeys.reduce((s, k) => s + counts[k], 0)).toBe(5);
    const orderKeys = Object.keys(counts).filter((k) => k.includes("/api/orders/"));
    expect(orderKeys.reduce((s, k) => s + counts[k], 0)).toBe(4);

    // ---- Bus bucketing mirrors telemetry prefixes ----
    for (const ev of capture.busEvents) {
      expect(
        ev.endpoint.includes("/api/users/") || ev.endpoint.includes("/api/orders/"),
        `bus event leaked from non-401 endpoint: ${ev.endpoint}`,
      ).toBe(true);
    }
    expect(capture.busFor("/srv/")).toHaveLength(0);

    // ---- Query string + trailing slash distinctions are preserved verbatim ----
    expect(counts["/api/users/1"]).toBe(1);
    expect(counts["/api/users/2/"]).toBe(1);
    expect(counts["/api/users/3?expand=profile"]).toBe(1);
    expect(counts["/api/users/4?expand=profile&fields=id,name"]).toBe(1);
    // URL objects/Request inputs serialize to absolute URLs — assert via sink.
    const sinkEndpoints = sinkEvents.map((e) => e.endpoint);
    expect(sinkEndpoints).toContain("https://example.com/api/users/5?x=1");
    expect(sinkEndpoints).toContain(
      "https://example.com/api/orders/103?status=paid&page=2",
    );
  });
});
