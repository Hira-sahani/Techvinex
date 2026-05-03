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

// `toast(...)` is also callable directly — model it as a callable mock with
// the methods attached as properties so any positive-feedback path is caught.
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

describe("apiClient — no positive toasts during concurrent 401s (retryOnUnauthorized=false)", () => {
  let originalFetch: typeof global.fetch;
  let capture: UnauthorizedCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    // Even if refresh existed, retryOnUnauthorized=false must keep it inert.
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

  it("never fires toast.success/info/message/warning/loading or callable toast() across 30 concurrent 401s", async () => {
    const N = 30;
    global.fetch = vi.fn(() => Promise.resolve(makeResponse(401))) as unknown as typeof fetch;

    await Promise.all(
      Array.from({ length: N }, (_, i) =>
        apiFetch(`/burst/${i}`, { retryOnUnauthorized: false }),
      ),
    );
    await capture.drain();

    // Refresh is gated off entirely.
    expect(mocks.refreshSession).not.toHaveBeenCalled();

    // ---- Positive / informational toasts: must all be ZERO ----
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastInfo).not.toHaveBeenCalled();
    expect(mocks.toastMessage).not.toHaveBeenCalled();
    expect(mocks.toastWarning).not.toHaveBeenCalled();
    expect(mocks.toastLoading).not.toHaveBeenCalled();

    // The callable `toast(...)` itself (neutral surface) must not fire either.
    expect(mocks.toastDefault).not.toHaveBeenCalled();

    // ---- Error toast: deduped to 1, must be the session-expired notice ----
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    const [msg, opts] = mocks.toastError.mock.calls[0] as [
      string,
      { id?: string } | undefined,
    ];
    expect(msg).toMatch(/session has expired/i);
    expect(opts?.id).toBe("session-expired");
    // Must NOT use language implying a refresh attempt occurred.
    expect(msg).not.toMatch(/refresh/i);
    expect(msg).not.toMatch(/retry/i);

    // SignOut also deduped.
    expect(mocks.signOut).toHaveBeenCalledTimes(1);

    // Telemetry sanity: every event retryAttempted=false.
    capture.expectAllRetryAttemptedFalse();
    capture.expectRetryAttemptedCounterZero();
  });
});
