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

import { apiFetch } from "./apiClient";

describe("apiFetch — concurrent 500 responses do not trigger session-expired flow", () => {
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
          status: 500,
          json: () => Promise.resolve({ error: "Internal Server Error" }),
          text: () => Promise.resolve("Internal Server Error"),
        }) as unknown as Promise<Response>,
    );
    originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("regression: does NOT call toast.error or supabase.auth.signOut for concurrent 500 responses", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => apiFetch(`/api/something/${i}`)),
    );

    // Flush microtasks in case any handlers were void-fired.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // All 10 requests reached fetch.
    expect(fetchMock).toHaveBeenCalledTimes(10);

    // Either resolved with the 500 Response or rejected — but in NO case should
    // the 401-only session-expired side effects have fired.
    expect(results).toHaveLength(10);

    expect(mocks.toastError).not.toHaveBeenCalledWith(
      "Your session has expired. Please sign in again.",
      expect.anything(),
    );
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it("regression: a mix of 500 responses across multiple bursts never triggers signOut", async () => {
    await Promise.allSettled([apiFetch("/a"), apiFetch("/b"), apiFetch("/c")]);
    await Promise.resolve();
    await Promise.resolve();

    await Promise.allSettled([apiFetch("/d"), apiFetch("/e")]);
    await Promise.resolve();
    await Promise.resolve();

    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.toastError).not.toHaveBeenCalledWith(
      "Your session has expired. Please sign in again.",
      expect.anything(),
    );
  });
});
