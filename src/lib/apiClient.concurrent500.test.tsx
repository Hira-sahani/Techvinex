import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
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

const SESSION_EXPIRED_MSG = "Your session has expired. Please sign in again.";

describe("apiFetch — concurrent 500 responses do not trigger session-expired flow", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof global.fetch;
  let busEvents: SessionExpiredEvent[];
  let unsubscribe: () => void;
  let baselineEventCount: number;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });

    busEvents = [];
    unsubscribe = onSessionExpired((e) => busEvents.push(e));
    baselineEventCount = getRecentUnauthorizedEvents().length;

    fetchMock = vi.fn(
      () =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "Internal Server Error" }),
          text: () => Promise.resolve("Internal Server Error"),
          headers: new Headers(),
        }) as unknown as Promise<Response>,
    );
    originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    unsubscribe();
    global.fetch = originalFetch;
  });

  it("regression: does NOT call toast.error or supabase.auth.signOut for concurrent 500 responses", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => apiFetch(`/api/something/${i}`)),
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(results).toHaveLength(10);

    expect(mocks.toastError).not.toHaveBeenCalledWith(
      SESSION_EXPIRED_MSG,
      expect.anything(),
    );
    expect(mocks.signOut).not.toHaveBeenCalled();

    // Bus must not fire for 500s.
    expect(busEvents).toHaveLength(0);

    // Any recorded unauthorized telemetry (defensive: should be none) must
    // never report retryAttempted=true for a non-401 response.
    const newEvents = getRecentUnauthorizedEvents().slice(baselineEventCount);
    for (const ev of newEvents) {
      expect(ev.retryAttempted).toBe(false);
    }
  });

  it("regression: 500 responses do NOT emit session-expired bus events", async () => {
    await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        apiFetch(`/api/x/${i}`, { retryOnUnauthorized: true }),
      ),
    );
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // The session-expired UI hook MUST NOT fire for 500s, regardless of
    // whether the caller opted into retryOnUnauthorized.
    expect(busEvents).toHaveLength(0);
  });

  it("regression: 500 responses do NOT record any UnauthorizedEvent in telemetry", async () => {
    await Promise.allSettled(
      Array.from({ length: 5 }, (_, i) =>
        apiFetch(`/api/y/${i}`, { retryOnUnauthorized: true }),
      ),
    );
    await Promise.resolve();
    await Promise.resolve();

    // Telemetry ring buffer is dedicated to 401s — non-401s must not appear.
    const newEvents = getRecentUnauthorizedEvents().slice(baselineEventCount);
    expect(newEvents).toHaveLength(0);

    // Even with retryOnUnauthorized=true, a 500 must NOT trigger a replay —
    // exactly one fetch per request.
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("regression: retryOnUnauthorized=true does NOT replay a 500 response", async () => {
    const res = await apiFetch("/api/single", { retryOnUnauthorized: true });

    expect(res.status).toBe(500);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(busEvents).toHaveLength(0);
    expect(getRecentUnauthorizedEvents().slice(baselineEventCount)).toHaveLength(0);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("regression: a mix of 500 responses across multiple bursts never triggers signOut or bus", async () => {
    await Promise.allSettled([apiFetch("/a"), apiFetch("/b"), apiFetch("/c")]);
    await Promise.resolve();
    await Promise.allSettled([apiFetch("/d"), apiFetch("/e")]);
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalledWith(
      SESSION_EXPIRED_MSG,
      expect.anything(),
    );
    expect(busEvents).toHaveLength(0);

    const newEvents = getRecentUnauthorizedEvents().slice(baselineEventCount);
    for (const ev of newEvents) {
      expect(ev.retryAttempted).toBe(false);
    }
  });
});
