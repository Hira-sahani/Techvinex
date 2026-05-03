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

describe("apiClient — concurrent 401s with retryOnUnauthorized=false never record retryAttempted=true", () => {
  let originalFetch: typeof global.fetch;
  let capture: UnauthorizedCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    mocks.signOut.mockResolvedValue({ error: null });
    // If refresh were called, it would succeed — but it must NEVER be called.
    mocks.refreshSession.mockResolvedValue({
      data: { session: { access_token: "new" }, user: null },
      error: null,
    });
    originalFetch = global.fetch;
    capture = createUnauthorizedCapture();
  });

  afterEach(() => {
    capture.dispose();
    global.fetch = originalFetch;
  });

  it("records only initial_401 telemetry (retryAttempted=false) and never refreshes", async () => {
    global.fetch = vi.fn(() => Promise.resolve(makeResponse(401))) as unknown as typeof fetch;

    // 12 concurrent 401s, all with retryOnUnauthorized=false (explicit + default).
    await Promise.all([
      ...Array.from({ length: 6 }, (_, i) =>
        apiFetch(`/no-retry/explicit/${i}`, { retryOnUnauthorized: false }),
      ),
      ...Array.from({ length: 6 }, (_, i) => apiFetch(`/no-retry/default/${i}`)),
    ]);
    await capture.drain();

    // No refresh attempt of any kind.
    expect(mocks.refreshSession).not.toHaveBeenCalled();

    // 12 telemetry events captured, every one retryAttempted=false / initial_401.
    expect(capture.totalTelemetry()).toBe(12);
    capture.expectAllRetryAttemptedFalse();
    capture.expectRetryAttemptedCounterZero();
    expect(capture.countRetryAttempted(true)).toBe(0);
    expect(capture.countRetryAttempted(false)).toBe(12);

    for (const ev of capture.newTelemetryEvents()) {
      expect(ev.retryAttempted).toBe(false);
      expect(ev.reason).toBe("initial_401");
    }

    // Bus emitted at least once but signOut deduped.
    expect(capture.totalBus()).toBeGreaterThanOrEqual(1);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
});
