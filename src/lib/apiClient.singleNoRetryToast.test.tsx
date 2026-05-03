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

describe("apiClient — single 401 with retryOnUnauthorized=false", () => {
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
      data: { session: { access_token: "fresh" }, user: null },
      error: null,
    });
    originalFetch = global.fetch;
    capture = createUnauthorizedCapture();
  });

  afterEach(() => {
    capture.dispose();
    global.fetch = originalFetch;
  });

  it("fires exactly one session-expired error toast and no other toast surface", async () => {
    global.fetch = vi.fn(() => Promise.resolve(makeResponse(401))) as unknown as typeof fetch;

    const res = await apiFetch("/single", { retryOnUnauthorized: false });
    await capture.drain();

    expect(res.status).toBe(401);

    // No refresh attempt, single deduped sign-out.
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.signOut).toHaveBeenCalledTimes(1);

    // Exactly one error toast — the session-expired notice with stable id.
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    const [msg, opts] = mocks.toastError.mock.calls[0] as [
      string,
      { id?: string } | undefined,
    ];
    expect(msg).toMatch(/session has expired/i);
    expect(opts?.id).toBe("session-expired");
    expect(msg).not.toMatch(/refresh|retry/i);

    // Every other toast surface — zero calls.
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastInfo).not.toHaveBeenCalled();
    expect(mocks.toastMessage).not.toHaveBeenCalled();
    expect(mocks.toastWarning).not.toHaveBeenCalled();
    expect(mocks.toastLoading).not.toHaveBeenCalled();
    expect(mocks.toastDefault).not.toHaveBeenCalled();

    // Telemetry: single initial_401 / retryAttempted=false / bus emits once.
    expect(capture.totalTelemetry()).toBe(1);
    const [ev] = capture.newTelemetryEvents();
    expect(ev.endpoint).toBe("/single");
    expect(ev.status).toBe(401);
    expect(ev.reason).toBe("initial_401");
    expect(ev.retryAttempted).toBe(false);
    expect(capture.totalBus()).toBe(1);
    expect(capture.busEvents[0].endpoint).toBe("/single");
  });
});
