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

describe("createUnauthorizedCapture — count helpers", () => {
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

  it("counts telemetry/bus events per endpoint and per retryAttempted value", async () => {
    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url =
        typeof input === "string" ? input : (input as Request).url ?? String(input);
      return Promise.resolve(makeResponse(url.includes("/srv/") ? 500 : 401));
    }) as unknown as typeof fetch;

    await Promise.all([
      apiFetch("/auth/a"),
      apiFetch("/auth/a"),
      apiFetch("/auth/b", { retryOnUnauthorized: true }),
      apiFetch("/srv/x"),
    ]);
    await capture.drain();

    const telCounts = capture.telemetryCountsByEndpoint();
    expect(telCounts["/auth/a"]).toBe(2);
    expect(telCounts["/auth/b"]).toBe(1);
    expect(telCounts["/srv/x"]).toBeUndefined();

    const busCounts = capture.busCountsByEndpoint();
    expect(busCounts["/srv/x"]).toBeUndefined();
    expect((busCounts["/auth/a"] ?? 0) + (busCounts["/auth/b"] ?? 0)).toBeGreaterThanOrEqual(1);

    const buckets = capture.telemetryCountsByRetryAttempted();
    expect(buckets.false).toBe(2); // /auth/a x2 (no retry)
    expect(buckets.true).toBe(1); // /auth/b retry+refresh_failed

    expect(capture.countRetryAttempted(false, "/auth/a")).toBe(2);
    expect(capture.countRetryAttempted(true, "/auth/b")).toBe(1);
    expect(capture.countRetryAttempted(true, "/srv/")).toBe(0);

    expect(capture.totalTelemetry()).toBe(3);
    expect(capture.totalBus()).toBeGreaterThanOrEqual(1);
  });
});
