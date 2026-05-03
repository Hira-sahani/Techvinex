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

describe("apiInvoke (supabase.functions.invoke wrapper)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
  });

  const headersOfInvoke = (callIndex: number): Record<string, string> => {
    const opts = mocks.invoke.mock.calls[callIndex][1] as { headers?: Record<string, string> };
    return opts?.headers ?? {};
  };

  it("attaches a Bearer Authorization header when a session exists", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-live" } },
      error: null,
    });

    await apiInvoke("my-fn", { body: { x: 1 } });

    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke.mock.calls[0][0]).toBe("my-fn");
    expect(headersOfInvoke(0).Authorization).toBe("Bearer tok-live");
  });

  it("regression: after refresh failure (session is null), wrapper does NOT attach the stale Bearer token", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-stale" } },
      error: null,
    });
    await apiInvoke("my-fn");
    expect(headersOfInvoke(0).Authorization).toBe("Bearer tok-stale");

    mocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    await apiInvoke("my-fn");

    const headers = headersOfInvoke(1);
    expect(headers.Authorization).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    const serialized = JSON.stringify(headers);
    expect(serialized).not.toContain("tok-stale");
  });

  it("regression: strips caller-supplied Authorization header when there is no session", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    await apiInvoke("my-fn", {
      headers: {
        Authorization: "Bearer caller-supplied-stale-token",
        "X-Custom": "keep-me",
      },
    });

    const headers = headersOfInvoke(0);
    expect(headers.Authorization).toBeUndefined();
    expect(headers.authorization).toBeUndefined();
    expect(headers["x-custom"] ?? headers["X-Custom"]).toBe("keep-me");
  });

  it("regression: caller-supplied Authorization is overridden by current session token (no stale leak via headers)", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-fresh" } },
      error: null,
    });

    await apiInvoke("my-fn", {
      headers: { Authorization: "Bearer tok-stale-from-caller" },
    });

    const headers = headersOfInvoke(0);
    expect(headers.Authorization).toBe("Bearer tok-fresh");
    expect(JSON.stringify(headers)).not.toContain("tok-stale-from-caller");
  });

  it("regression: each invocation re-reads the session (no in-wrapper caching)", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-old" } },
      error: null,
    });
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-new" } },
      error: null,
    });

    await apiInvoke("my-fn");
    await apiInvoke("my-fn");

    expect(mocks.getSession).toHaveBeenCalledTimes(2);
    expect(headersOfInvoke(0).Authorization).toBe("Bearer tok-old");
    expect(headersOfInvoke(1).Authorization).toBe("Bearer tok-new");
  });

  it("forwards body and other options to supabase.functions.invoke", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok" } },
      error: null,
    });

    await apiInvoke("my-fn", { body: { hello: "world" }, method: "POST" });

    const opts = mocks.invoke.mock.calls[0][1] as Record<string, unknown>;
    expect(opts.body).toEqual({ hello: "world" });
    expect(opts.method).toBe("POST");
  });
});

import { setUnauthorizedHandler } from "./apiClient";

describe("apiFetch global 401 handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("regression: a 401 response triggers the global unauthorized handler (sign-out / refresh-failure flow)", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok-soon-to-be-rejected" } },
      error: null,
    });

    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }) as unknown as Promise<Response>,
    );
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const res = await apiFetch("/api/protected");
      expect(res.status).toBe(401);

      // Allow the void-promise handler to settle.
      await Promise.resolve();
      await Promise.resolve();

      expect(handler).toHaveBeenCalledTimes(1);
      const [resArg, inputArg] = handler.mock.calls[0];
      expect((resArg as Response).status).toBe(401);
      expect(inputArg).toBe("/api/protected");
    } finally {
      global.fetch = originalFetch;
      // Reset to a no-op so other suites aren't affected.
      setUnauthorizedHandler(() => {});
    }
  });

  it("regression: bursts of parallel 401s only invoke the handler once", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      }) as unknown as Promise<Response>,
    );
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      await Promise.all([
        apiFetch("/a"),
        apiFetch("/b"),
        apiFetch("/c"),
      ]);
      await Promise.resolve();
      await Promise.resolve();

      expect(handler).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
      setUnauthorizedHandler(() => {});
    }
  });

  it("does NOT invoke the unauthorized handler on 2xx responses", async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "tok" } },
      error: null,
    });

    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      }) as unknown as Promise<Response>,
    );
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      await apiFetch("/api/me");
      await Promise.resolve();
      expect(handler).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
      setUnauthorizedHandler(() => {});
    }
  });
});

describe("apiFetch — Authorization header presence (valid-session contract)", () => {
  let fetchMock2: ReturnType<typeof vi.fn>;
  let originalFetch2: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock2 = vi.fn(
      () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        }) as unknown as Promise<Response>,
    );
    originalFetch2 = global.fetch;
    global.fetch = fetchMock2 as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch2;
  });

  const headers = (i: number) =>
    new Headers((fetchMock2.mock.calls[i][1] as RequestInit).headers ?? {});

  it("sends Authorization when a non-empty access_token is present", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "valid-token-abc" } },
      error: null,
    });
    await apiFetch("/x");
    expect(headers(0).get("Authorization")).toBe("Bearer valid-token-abc");
  });

  it("does NOT send Authorization when session is null", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await apiFetch("/x");
    expect(headers(0).get("Authorization")).toBeNull();
  });

  it("does NOT send Authorization when session.access_token is undefined", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: undefined } as unknown as { access_token: string } },
      error: null,
    });
    await apiFetch("/x");
    expect(headers(0).get("Authorization")).toBeNull();
  });

  it("does NOT send Authorization when session.access_token is an empty string", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "" } },
      error: null,
    });
    await apiFetch("/x");
    expect(headers(0).get("Authorization")).toBeNull();
  });

  it("does NOT send Authorization when getSession returns an error with no session", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "boom" },
    });
    await apiFetch("/x");
    expect(headers(0).get("Authorization")).toBeNull();
  });

  it("strips a caller-supplied Authorization when no current session exists", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await apiFetch("/x", { headers: { Authorization: "Bearer leftover" } });
    expect(headers(0).get("Authorization")).toBeNull();
  });

  it("overrides a caller-supplied Authorization with the current session token", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: { access_token: "fresh" } },
      error: null,
    });
    await apiFetch("/x", { headers: { Authorization: "Bearer caller-supplied" } });
    expect(headers(0).get("Authorization")).toBe("Bearer fresh");
  });
});
