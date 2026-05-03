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

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("apiClient — bus event payload validation for initial_401", () => {
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

  it("each captured bus event matches a telemetry record with initial_401 + retryAttempted=false", async () => {
    global.fetch = vi.fn(() => Promise.resolve(makeResponse(401))) as unknown as typeof fetch;

    const endpoints = ["/a/1", "/a/2", "/a/3", "/b/1"];
    await Promise.all(endpoints.map((u) => apiFetch(u))); // no retry
    await capture.drain();

    // Bus payload shape — timestamp + endpoint, well-formed.
    expect(capture.busEvents.length).toBeGreaterThanOrEqual(1);
    for (const ev of capture.busEvents) {
      expect(typeof ev.endpoint).toBe("string");
      expect(ev.endpoint.length).toBeGreaterThan(0);
      expect(ev.timestamp).toMatch(ISO_RE);
      // Bus only carries endpoint + timestamp — not status/reason. Verify it.
      expect(Object.keys(ev).sort()).toEqual(["endpoint", "timestamp"]);
    }

    // Every bus endpoint must correspond to a telemetry sink event with
    // status=401, reason=initial_401, retryAttempted=false.
    for (const busEv of capture.busEvents) {
      const matching = sinkEvents.filter((s) => s.endpoint === busEv.endpoint);
      expect(matching.length, `no telemetry for bus endpoint ${busEv.endpoint}`)
        .toBeGreaterThanOrEqual(1);
      for (const tel of matching) {
        expect(tel.status).toBe(401);
        expect(tel.reason).toBe("initial_401");
        expect(tel.retryAttempted).toBe(false);
        expect(tel.method).toBe("GET");
        expect(tel.hadSession).toBe(true);
        expect(tel.timestamp).toMatch(ISO_RE);
        expect(typeof tel.eventId).toBe("string");
        expect(tel.eventId.length).toBeGreaterThan(0);
      }
    }

    // Conversely, every telemetry event we recorded should have status 401 +
    // initial_401 + retryAttempted=false (this is the no-retry path).
    expect(sinkEvents).toHaveLength(endpoints.length);
    for (const tel of sinkEvents) {
      expect(tel.status).toBe(401);
      expect(tel.reason).toBe("initial_401");
      expect(tel.retryAttempted).toBe(false);
      expect(endpoints).toContain(tel.endpoint);
    }
  });
});
