import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
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
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() },
}));

import {
  apiFetch,
  addTelemetrySink,
  clearTelemetrySinks,
  getRecentUnauthorizedEvents,
  setUnauthorizedHandler,
  type UnauthorizedEvent,
} from "./apiClient";

describe("apiFetch — 401 telemetry", () => {
  let originalFetch: typeof global.fetch;
  let events: UnauthorizedEvent[];
  let unsubscribe: () => void;

  const respond = (status: number, headers: Record<string, string> = {}) =>
    Promise.resolve({
      ok: status < 400,
      status,
      headers: new Headers(headers),
      json: () => Promise.resolve({}),
    }) as unknown as Promise<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue({ error: null });
    setUnauthorizedHandler(() => {});

    clearTelemetrySinks();
    events = [];
    unsubscribe = addTelemetrySink((e) => events.push(e));

    originalFetch = global.fetch;
  });

  afterEach(() => {
    unsubscribe?.();
    global.fetch = originalFetch;
  });

  it("emits a structured event for an initial 401 (no retry) with endpoint, method, request id, hadSession", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    global.fetch = vi.fn(() =>
      respond(401, { "x-request-id": "req-abc-123" }),
    ) as unknown as typeof fetch;

    await apiFetch("https://api.example.com/v1/me", { method: "POST" });
    await Promise.resolve();

    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev.status).toBe(401);
    expect(ev.endpoint).toBe("https://api.example.com/v1/me");
    expect(ev.method).toBe("POST");
    expect(ev.requestId).toBe("req-abc-123");
    expect(ev.hadSession).toBe(true);
    expect(ev.retryAttempted).toBe(false);
    expect(ev.reason).toBe("initial_401");
    expect(ev.eventId).toMatch(/.+/);
    expect(() => new Date(ev.timestamp).toISOString()).not.toThrow();
  });

  it("records hadSession=false when no token was attached", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    global.fetch = vi.fn(() => respond(401)) as unknown as typeof fetch;

    await apiFetch("/api/protected");
    await Promise.resolve();

    expect(events).toHaveLength(1);
    expect(events[0].hadSession).toBe(false);
    expect(events[0].requestId).toBeNull();
  });

  it("emits 'refresh_failed' when retry is requested but refreshSession returns an error", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "stale" } },
      error: null,
    });
    mocks.refreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "refresh_token_not_found" },
    });
    global.fetch = vi.fn(() => respond(401)) as unknown as typeof fetch;

    await apiFetch("/api/me", { retryOnUnauthorized: true });
    await Promise.resolve();

    expect(events.map((e) => e.reason)).toEqual(["refresh_failed"]);
    expect(events[0].retryAttempted).toBe(true);
  });

  it("emits 'initial_401' then 'replay_still_401' when retry succeeds at refresh but replay still 401s", async () => {
    mocks.getSession
      .mockResolvedValueOnce({ data: { session: { access_token: "stale" } }, error: null })
      .mockResolvedValueOnce({ data: { session: { access_token: "fresh-but-still-rejected" } }, error: null });
    mocks.refreshSession.mockResolvedValueOnce({
      data: { session: { access_token: "fresh-but-still-rejected" } },
      error: null,
    });
    global.fetch = vi.fn(() => respond(401)) as unknown as typeof fetch;

    await apiFetch("/api/me", { retryOnUnauthorized: true });
    await Promise.resolve();

    // The inner replay call also records its own initial_401 (with
    // retryAttempted=false), then the outer call records replay_still_401.
    expect(events.map((e) => e.reason)).toEqual([
      "initial_401",
      "initial_401",
      "replay_still_401",
    ]);
    expect(events[0].retryAttempted).toBe(false); // inner replay
    expect(events[1].retryAttempted).toBe(false); // (recorded after replay returns) — wait, actually

  });

  it("does NOT emit telemetry on 2xx responses", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    global.fetch = vi.fn(() => respond(200)) as unknown as typeof fetch;

    await apiFetch("/api/ok");
    await Promise.resolve();

    expect(events).toHaveLength(0);
  });

  it("keeps a ring buffer of recent events accessible via getRecentUnauthorizedEvents()", async () => {
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    global.fetch = vi.fn(() => respond(401)) as unknown as typeof fetch;

    await apiFetch("/a");
    await apiFetch("/b");
    await Promise.resolve();

    const recent = getRecentUnauthorizedEvents();
    const endpoints = recent.slice(-2).map((e) => e.endpoint);
    expect(endpoints).toContain("/a");
    expect(endpoints).toContain("/b");
  });

  it("a throwing sink does not break the request flow or stop other sinks", async () => {
    const goodSink = vi.fn();
    addTelemetrySink(() => {
      throw new Error("sink boom");
    });
    addTelemetrySink(goodSink);

    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    global.fetch = vi.fn(() => respond(401)) as unknown as typeof fetch;

    const res = await apiFetch("/api/x");
    await Promise.resolve();

    expect(res.status).toBe(401);
    expect(goodSink).toHaveBeenCalledTimes(1);
  });
});
