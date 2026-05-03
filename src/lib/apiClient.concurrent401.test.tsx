import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
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

// Import AFTER mocks are registered.
import { apiFetch } from "./apiClient";

describe("apiFetch — concurrent 401 de-duplication (default handler)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });

    fetchMock = vi.fn(
      () =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        }) as unknown as Promise<Response>,
    );
    originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("regression: toast.error and supabase.auth.signOut fire exactly ONCE for concurrent 401 responses", async () => {
    // Fire many overlapping requests that will all 401.
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => apiFetch(`/api/protected/${i}`)),
    );

    // Allow microtasks for the void-fired handler to settle.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // All 10 requests went through to fetch...
    expect(fetchMock).toHaveBeenCalledTimes(10);

    // ...but the user-facing side effects fired exactly once.
    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).toHaveBeenCalledWith(
      "Your session has expired. Please sign in again.",
      expect.objectContaining({ id: "session-expired" }),
    );
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("regression: a NEW burst after the previous one settled fires the side effects again exactly once", async () => {
    await Promise.all([apiFetch("/a"), apiFetch("/b"), apiFetch("/c")]);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.toastError).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);

    // Second independent burst — the in-flight lock should have released.
    await Promise.all([apiFetch("/d"), apiFetch("/e")]);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.toastError).toHaveBeenCalledTimes(2);
    expect(mocks.signOut).toHaveBeenCalledTimes(2);
  });
});

describe("apiFetch — login redirect on 401", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof global.fetch;
  let assignSpy: ReturnType<typeof vi.fn>;
  let originalLocation: Location;

  const setupLocation = (pathname: string, search = "") => {
    assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        pathname,
        search,
        href: `http://localhost${pathname}${search}`,
        assign: assignSpy,
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });

    fetchMock = vi.fn(
      () =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        }) as unknown as Promise<Response>,
    );
    originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    originalLocation = window.location;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it("redirects to /login with a redirect param after a 401 on a candidate page", async () => {
    setupLocation("/dashboard", "?tab=jobs");
    await apiFetch("/api/protected");
    await Promise.resolve();
    await Promise.resolve();

    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(assignSpy).toHaveBeenCalledWith(
      `/login?redirect=${encodeURIComponent("/dashboard?tab=jobs")}`,
    );
  });

  it("redirects to /admin/login when in the admin area", async () => {
    setupLocation("/admin/users");
    await apiFetch("/api/protected");
    await Promise.resolve();
    await Promise.resolve();

    expect(assignSpy).toHaveBeenCalledWith(
      `/admin/login?redirect=${encodeURIComponent("/admin/users")}`,
    );
  });

  it("redirects to /employer/login when in the employer area", async () => {
    setupLocation("/employer/candidates");
    await apiFetch("/api/protected");
    await Promise.resolve();
    await Promise.resolve();

    expect(assignSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^\/employer\/login\?redirect=/),
    );
  });

  it("does NOT redirect if the user is already on a login page (avoids loops)", async () => {
    setupLocation("/admin/login");
    await apiFetch("/api/protected");
    await Promise.resolve();
    await Promise.resolve();

    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("only redirects once for a burst of concurrent 401s", async () => {
    setupLocation("/dashboard");
    await Promise.all([apiFetch("/a"), apiFetch("/b"), apiFetch("/c"), apiFetch("/d")]);
    await Promise.resolve();
    await Promise.resolve();

    expect(assignSpy).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
});
