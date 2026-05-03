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
  toast: {
    error: mocks.toastError,
    success: vi.fn(),
    message: vi.fn(),
  },
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

describe("apiClient.testHelpers — createUnauthorizedCapture", () => {
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

  it("captures zero bus emissions and zero retryAttempted=true across concurrent 500 bursts", async () => {
    global.fetch = vi.fn(() => Promise.resolve(makeResponse(500))) as unknown as typeof fetch;

    // Two concurrent bursts of 500s, both with retryOnUnauthorized=true.
    await Promise.all([
      ...Array.from({ length: 6 }, (_, i) =>
        apiFetch(`/burst-a/${i}`, { retryOnUnauthorized: true }),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        apiFetch(`/burst-b/${i}`, { retryOnUnauthorized: true }),
      ),
    ]);
    await capture.drain();

    capture.expectNoBusEmissions();
    capture.expectNoBusEmissionsFor("/burst-a/");
    capture.expectNoBusEmissionsFor("/burst-b/");
    capture.expectRetryAttemptedCounterZero();
    capture.expectAllRetryAttemptedFalse();
    expect(mocks.refreshSession).not.toHaveBeenCalled();
  });

  it("captures bus emissions for 401 bursts but never marks them on 500 endpoints", async () => {
    mocks.refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "fail" },
    });

    global.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : (input as Request).url ?? String(input);
      return Promise.resolve(makeResponse(url.includes("/srv/") ? 500 : 401));
    }) as unknown as typeof fetch;

    await Promise.all([
      ...Array.from({ length: 4 }, (_, i) => apiFetch(`/srv/${i}`)),
      ...Array.from({ length: 4 }, (_, i) => apiFetch(`/auth/${i}`)),
    ]);
    await capture.drain();

    // 500 endpoints: never on the bus, never recorded with retryAttempted.
    capture.expectNoBusEmissionsFor("/srv/");
    capture.expectRetryAttemptedFalseFor("/srv/");

    // 401 endpoints: at least one bus emission.
    expect(capture.busFor("/auth/").length).toBeGreaterThanOrEqual(1);

    // 401 endpoints WITHOUT retryOnUnauthorized must all be retryAttempted=false.
    capture.expectRetryAttemptedFalseFor("/auth/");
  });
});
