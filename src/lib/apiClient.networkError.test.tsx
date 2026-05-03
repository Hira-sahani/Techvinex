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
  const toast = Object.assign(mocks.toastDefault, {
    error: mocks.toastError,
    success: mocks.toastSuccess,
    message: mocks.toastMessage,
    info: mocks.toastInfo,
    warning: mocks.toastWarning,
    loading: mocks.toastLoading,
  });
  return { toast };
});

import { apiFetch } from "./apiClient";
import {
  createUnauthorizedCapture,
  type UnauthorizedCapture,
} from "./apiClient.testHelpers";

class TimeoutError extends Error {
  name = "AbortError";
}

describe("apiFetch — network errors (fetch/timeout) stay silent", () => {
  let originalFetch: typeof global.fetch;
  let capture: UnauthorizedCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "tok" } },
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

  const expectNoSideEffects = async () => {
    await capture.drain();
    expect(mocks.refreshSession).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.toastInfo).not.toHaveBeenCalled();
    expect(mocks.toastWarning).not.toHaveBeenCalled();
    expect(mocks.toastLoading).not.toHaveBeenCalled();
    expect(mocks.toastMessage).not.toHaveBeenCalled();
    expect(mocks.toastDefault).not.toHaveBeenCalled();
    capture.expectNoBusEmissions();
    expect(capture.totalTelemetry()).toBe(0);
  };

  it("propagates a TypeError from fetch without firing toasts/telemetry/signOut", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    ) as unknown as typeof fetch;

    await expect(apiFetch("/api/network-down")).rejects.toThrow(
      /Failed to fetch/,
    );
    await expectNoSideEffects();
  });

  it("propagates an AbortError (timeout) without firing toasts/telemetry/signOut", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new TimeoutError("The operation was aborted")),
    ) as unknown as typeof fetch;

    await expect(apiFetch("/api/timeout")).rejects.toThrow(/aborted/);
    await expectNoSideEffects();
  });

  it("does NOT trigger refresh flow when retryOnUnauthorized=true and fetch throws", async () => {
    global.fetch = vi.fn(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    ) as unknown as typeof fetch;

    await expect(
      apiFetch("/api/with-retry", { retryOnUnauthorized: true }),
    ).rejects.toThrow(/Failed to fetch/);
    await expectNoSideEffects();
  });

  it("concurrent burst of network errors stays silent and dedup state remains clean", async () => {
    const err = new TypeError("Failed to fetch");
    global.fetch = vi.fn(() => Promise.reject(err)) as unknown as typeof fetch;

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) =>
        apiFetch(`/api/burst/${i}`, { retryOnUnauthorized: true }),
      ),
    );

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    await expectNoSideEffects();

    // After the burst, a subsequent successful call must work normally —
    // proving no dedup/refresh state was left half-set.
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
        headers: new Headers(),
      } as unknown as Response),
    ) as unknown as typeof fetch;

    const ok = await apiFetch("/api/recover");
    expect(ok.status).toBe(200);
    await expectNoSideEffects();
  });

  it("a network error followed by a successful retry call leaves no residual state", async () => {
    let attempt = 0;
    global.fetch = vi.fn(() => {
      attempt += 1;
      if (attempt === 1) return Promise.reject(new TypeError("Failed to fetch"));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(""),
        headers: new Headers(),
      } as unknown as Response);
    }) as unknown as typeof fetch;

    await expect(apiFetch("/api/flaky")).rejects.toThrow(/Failed to fetch/);
    const second = await apiFetch("/api/flaky");
    expect(second.status).toBe(200);
    await expectNoSideEffects();
  });
});
