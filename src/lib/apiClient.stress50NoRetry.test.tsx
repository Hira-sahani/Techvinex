import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastMessage: vi.fn(),
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
    success: mocks.toastSuccess,
    message: mocks.toastMessage,
  },
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

describe("apiClient — stress: 50 concurrent 401s with retryOnUnauthorized=false", () => {
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

  it("50 concurrent 401s: retryAttempted=false everywhere, signOut deduped to 1, no refresh", async () => {
    const N = 50;
    global.fetch = vi.fn(() => Promise.resolve(makeResponse(401))) as unknown as typeof fetch;

    const responses = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        apiFetch(`/burst/${i}`, { retryOnUnauthorized: false }),
      ),
    );
    await capture.drain();

    // All 50 underlying responses bubble up as 401s.
    expect(responses).toHaveLength(N);
    for (const r of responses) expect(r.status).toBe(401);

    // Refresh must NEVER fire under retryOnUnauthorized=false.
    expect(mocks.refreshSession).not.toHaveBeenCalled();

    // Handler dedupe: signOut + toast collapse to exactly 1 each across the
    // synchronous burst (single in-flight `handling401` window).
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).toHaveBeenCalledTimes(1);

    // No success/info toast may EVER fire from the unauthorized path —
    // there should be no positive feedback for a refresh that never
    // happened (and didn't happen because retryOnUnauthorized=false).
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastMessage).not.toHaveBeenCalled();
    // The single error toast must be the session-expired notice — not a
    // refresh-attempt error or any other transient surface.
    for (const call of mocks.toastError.mock.calls) {
      const [m, o] = call as [string, { id?: string } | undefined];
      expect(m).toMatch(/session has expired/i);
      expect(o?.id).toBe("session-expired");
      expect(m).not.toMatch(/refresh/i);
      expect(m).not.toMatch(/retry/i);
    }
    // The dedupe toast carries the stable id so additional surfaces would
    // overwrite (not stack) — verify the call shape.
    const [msg, opts] = mocks.toastError.mock.calls[0] as [string, { id?: string }];
    expect(msg).toMatch(/session has expired/i);
    expect(opts?.id).toBe("session-expired");

    // ---- Telemetry: every one of the 50 calls recorded as initial_401 / retryAttempted=false ----
    const burstEvents = sinkEvents.filter((e) => e.endpoint.startsWith("/burst/"));
    expect(burstEvents).toHaveLength(N);
    for (const ev of burstEvents) {
      expect(ev.status).toBe(401);
      expect(ev.reason).toBe("initial_401");
      expect(ev.retryAttempted).toBe(false);
      expect(ev.hadSession).toBe(true);
    }

    // Distinct endpoints: no telemetry collision between concurrent calls.
    const distinct = new Set(burstEvents.map((e) => e.endpoint));
    expect(distinct.size).toBe(N);

    // Bus emitted exactly once (handler ran once → emitSessionExpired ran once).
    expect(capture.totalBus()).toBe(1);
    expect(capture.busEvents[0].endpoint.startsWith("/burst/")).toBe(true);
  });
});
