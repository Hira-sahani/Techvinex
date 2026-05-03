import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => {
  const getSession = vi.fn();
  const invoke = vi.fn();
  return { getSession, invoke };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

import { apiFetch, apiInvoke } from "./apiClient";

describe("apiFetch (real API wrapper)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        }) as unknown as Promise<Response>,
    );
    originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const headersOf = (callIndex: number): Headers => {
    const init = fetchMock.mock.calls[callIndex][1] as RequestInit | undefined;
    return new Headers(init?.headers ?? {});
  };

  it("attaches a Bearer Authorization header when a session exists", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-live" } },
      error: null,
    });

    await apiFetch("/api/me");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(headersOf(0).get("Authorization")).toBe("Bearer tok-live");
  });

  it("regression: after refresh failure (getSession returns null), wrapper does NOT attach the stale Bearer token", async () => {
    // First call: live session — baseline shows wrapper does attach token.
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-stale" } },
      error: null,
    });
    await apiFetch("/api/me");
    expect(headersOf(0).get("Authorization")).toBe("Bearer tok-stale");

    // Refresh failure — Supabase clears its session, so getSession
    // resolves with null. The wrapper MUST NOT send the old token.
    mocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    await apiFetch("/api/me");

    const postFailure = headersOf(1);
    expect(postFailure.get("Authorization")).toBeNull();
    // Hard guarantee: the stale token does not appear anywhere in headers.
    let serialized = "";
    postFailure.forEach((value, key) => {
      serialized += `${key}:${value};`;
    });
    expect(serialized).not.toContain("tok-stale");
  });

  it("regression: even if a caller passes a stale Authorization header, the wrapper strips it when there is no session", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await apiFetch("/api/me", {
      headers: { Authorization: "Bearer caller-supplied-stale-token" },
    });

    const headers = headersOf(0);
    expect(headers.get("Authorization")).toBeNull();
  });

  it("regression: between two calls, a fresh getSession result is used (no in-wrapper caching)", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-old" } },
      error: null,
    });
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-new" } },
      error: null,
    });

    await apiFetch("/api/me");
    await apiFetch("/api/me");

    expect(headersOf(0).get("Authorization")).toBe("Bearer tok-old");
    expect(headersOf(1).get("Authorization")).toBe("Bearer tok-new");
  });
});
