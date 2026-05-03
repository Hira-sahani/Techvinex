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

import { apiFetch } from "./apiClient";
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

describe("apiClient — toast.error call accounting in mixed 500/401 burst", () => {
  let originalFetch: typeof global.fetch;
  let capture: UnauthorizedCapture;

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
    capture = createUnauthorizedCapture();
  });

  afterEach(() => {
    capture.dispose();
    global.fetch = originalFetch;
  });

  it("fires session-expired toast only for 401 endpoints, deduped, and never for 500s", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      return Promise.resolve(makeResponse(url.includes("/srv/") ? 500 : 401));
    }) as unknown as typeof fetch;

    await Promise.all([
      // 5x 500 (with retry flag) — must produce ZERO toast calls.
      ...Array.from({ length: 5 }, (_, i) =>
        apiFetch(`/srv/${i}`, { retryOnUnauthorized: true }),
      ),
      // 4x 401 no-retry — initial_401, share dedupe.
      ...Array.from({ length: 4 }, (_, i) => apiFetch(`/no/${i}`)),
      // 3x 401 with retry + failing refresh — refresh_failed, share dedupe.
      ...Array.from({ length: 3 }, (_, i) =>
        apiFetch(`/yes/${i}`, { retryOnUnauthorized: true }),
      ),
    ]);
    await capture.drain();

    // ---- Per-family toast accounting ----
    // The unauthorized handler calls toast.error with id "session-expired",
    // and the handler itself is deduped via `handling401`, so concurrent
    // 401 bursts coalesce into a small number of calls (1-2 depending on
    // whether the no-retry burst and the retry burst land in the same
    // in-flight window).
    const toastCalls = mocks.toastError.mock.calls;

    // Every toast call must be the session-expired toast — there's no other
    // toast.error invocation path inside apiClient.
    for (const call of toastCalls) {
      const [message, options] = call as [string, { id?: string } | undefined];
      expect(message).toMatch(/session has expired/i);
      expect(options?.id).toBe("session-expired");
    }

    // 500 family produces ZERO toast calls — they don't go through the
    // unauthorized handler at all.
    capture.expectNoBusEmissionsFor("/srv/");
    expect(capture.telemetryFor("/srv/")).toHaveLength(0);

    // 401 endpoints DO emit on the bus — at least once total.
    const busEndpoints = capture.busEvents.map((e) => e.endpoint);
    const has401Bus = busEndpoints.some(
      (e) => e.startsWith("/no/") || e.startsWith("/yes/"),
    );
    expect(has401Bus).toBe(true);

    // No bus event ever references a 500 endpoint.
    for (const ep of busEndpoints) {
      expect(ep.startsWith("/srv/")).toBe(false);
    }

    // Toast count: at least 1 (401 bursts triggered the handler) and
    // strictly bounded — 6 concurrent 401-emitting requests must dedupe to
    // at most 2 toast calls (one per distinct in-flight handler window).
    expect(toastCalls.length).toBeGreaterThanOrEqual(1);
    expect(toastCalls.length).toBeLessThanOrEqual(2);

    // signOut is bounded by the same handler dedupe window.
    expect(mocks.signOut.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mocks.signOut.mock.calls.length).toBeLessThanOrEqual(2);

    // toast count <= bus count: every toast corresponds to a bus emission.
    expect(toastCalls.length).toBeLessThanOrEqual(capture.totalBus());
  });
});
