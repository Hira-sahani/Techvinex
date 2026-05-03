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

const SESSION_EXPIRED_MSG = "Your session has expired. Please sign in again.";

const makeResponse = (status: number) =>
  ({
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    headers: new Headers(),
  }) as unknown as Response;

describe("apiFetch — non-auth 4xx responses do not trigger session-expired flow", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  for (const status of [400, 403, 404, 409, 422, 429]) {
    it(`regression: ${status} responses do NOT call toast.error or signOut`, async () => {
      fetchMock = vi.fn(() => Promise.resolve(makeResponse(status)));
      global.fetch = fetchMock as unknown as typeof fetch;

      const res = await apiFetch(`/api/resource`);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(res.status).toBe(status);
      expect(mocks.toastError).not.toHaveBeenCalledWith(
        SESSION_EXPIRED_MSG,
        expect.anything(),
      );
      expect(mocks.signOut).not.toHaveBeenCalled();
    });
  }

  it("regression: a concurrent burst of mixed non-auth 4xx never triggers session-expired side effects", async () => {
    const statuses = [400, 403, 404, 409, 422, 429, 403, 404];
    fetchMock = vi.fn((_input: RequestInfo | URL) => {
      const idx = fetchMock.mock.calls.length - 1;
      return Promise.resolve(makeResponse(statuses[idx % statuses.length]));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await Promise.all(statuses.map((_, i) => apiFetch(`/api/r/${i}`)));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledTimes(statuses.length);
    expect(mocks.toastError).not.toHaveBeenCalledWith(
      SESSION_EXPIRED_MSG,
      expect.anything(),
    );
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
