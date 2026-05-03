import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastMessage: vi.fn(),
  toastInfo: vi.fn(),
  toastWarning: vi.fn(),
  toastLoading: vi.fn(),
  toastDefault: vi.fn(),
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

vi.mock("sonner", () => {
  const callable = mocks.toastDefault as unknown as {
    (...args: unknown[]): unknown;
    error: typeof mocks.toastError;
    success: typeof mocks.toastSuccess;
    message: typeof mocks.toastMessage;
    info: typeof mocks.toastInfo;
    warning: typeof mocks.toastWarning;
    loading: typeof mocks.toastLoading;
  };
  callable.error = mocks.toastError;
  callable.success = mocks.toastSuccess;
  callable.message = mocks.toastMessage;
  callable.info = mocks.toastInfo;
  callable.warning = mocks.toastWarning;
  callable.loading = mocks.toastLoading;
  return { toast: callable };
});

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

function expectNoNonErrorToasts() {
  expect(mocks.toastSuccess).not.toHaveBeenCalled();
  expect(mocks.toastInfo).not.toHaveBeenCalled();
  expect(mocks.toastMessage).not.toHaveBeenCalled();
  expect(mocks.toastWarning).not.toHaveBeenCalled();
  expect(mocks.toastLoading).not.toHaveBeenCalled();
  expect(mocks.toastDefault).not.toHaveBeenCalled();
}

describe("apiClient — retryOnUnauthorized=true toast surface", () => {
  let originalFetch: typeof global.fetch;
  let capture: UnauthorizedCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-old" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    originalFetch = global.fetch;
    capture = createUnauthorizedCapture();
  });

  afterEach(() => {
    capture.dispose();
    global.fetch = originalFetch;
  });

  it("successful refresh + replay: no toasts of ANY kind fire", async () => {
    mocks.refreshSession.mockResolvedValue({
      data: { session: { access_token: "fresh" }, user: null },
      error: null,
    });

    const calls = new Map<string, number>();
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = urlOf(input);
      const n = (calls.get(url) ?? 0) + 1;
      calls.set(url, n);
      // First attempt 401, replay 200.
      return Promise.resolve(makeResponse(n === 1 ? 401 : 200));
    }) as unknown as typeof fetch;

    const responses = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        apiFetch(`/r/${i}`, { retryOnUnauthorized: true }),
      ),
    );
    await capture.drain();

    // Replay succeeded — every final response is 200.
    for (const r of responses) expect(r.status).toBe(200);

    // Refresh deduped to exactly 1.
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    // No sign-out, no toasts at all (not even error) — the refresh recovered.
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
    expectNoNonErrorToasts();

    // No bus emission either — the session is healthy.
    expect(capture.totalBus()).toBe(0);

    // Telemetry: 4x initial_401 with retryAttempted=true (recorded BEFORE the
    // successful replay), but no replay_still_401 / refresh_failed.
    expect(capture.totalTelemetry()).toBe(4);
    for (const ev of capture.newTelemetryEvents()) {
      expect(ev.reason).toBe("initial_401");
      expect(ev.retryAttempted).toBe(true);
    }
  });

  it("failed refresh: ONLY the deduped session-expired error toast fires", async () => {
    mocks.refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "fail" },
    });

    global.fetch = vi.fn(() => Promise.resolve(makeResponse(401))) as unknown as typeof fetch;

    await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        apiFetch(`/f/${i}`, { retryOnUnauthorized: true }),
      ),
    );
    await capture.drain();

    // Refresh attempted exactly once (deduped).
    expect(mocks.refreshSession).toHaveBeenCalledTimes(1);

    // Only error toast — no success/info/warning/loading/neutral.
    expectNoNonErrorToasts();
    expect(mocks.toastError).toHaveBeenCalledTimes(1);

    const [msg, opts] = mocks.toastError.mock.calls[0] as [
      string,
      { id?: string } | undefined,
    ];
    expect(msg).toMatch(/session has expired/i);
    expect(opts?.id).toBe("session-expired");
    // The error message must NOT mention refresh/retry — it's a generic
    // session-expired notice, not a refresh-attempt diagnostic.
    expect(msg).not.toMatch(/refresh|retry/i);

    // SignOut also deduped to 1.
    expect(mocks.signOut).toHaveBeenCalledTimes(1);

    // Telemetry: 5x refresh_failed / retryAttempted=true.
    expect(capture.totalTelemetry()).toBe(5);
    for (const ev of capture.newTelemetryEvents()) {
      expect(ev.reason).toBe("refresh_failed");
      expect(ev.retryAttempted).toBe(true);
    }

    // Bus: at least one emission, all on /f/* endpoints.
    expect(capture.totalBus()).toBeGreaterThanOrEqual(1);
    for (const ev of capture.busEvents) {
      expect(ev.endpoint.startsWith("/f/")).toBe(true);
    }
  });
});
