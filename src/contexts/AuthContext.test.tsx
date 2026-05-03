import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import {
  buildFakeSession,
  seedNextSession,
  captureNextAuthListener,
} from "./__tests__/helpers";

// vi.hoisted runs before any vi.mock factory and before module imports, so
// these handles are safe to reference inside the factory AND in the tests
// without resorting to brittle re-import / __mocks casts.
const mocks = vi.hoisted(() => {
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn(() => ({
    data: { subscription: { unsubscribe } },
  }));
  const getSession = vi.fn(() =>
    Promise.resolve({ data: { session: null }, error: null }),
  );
  const signOut = vi.fn(() => Promise.resolve({ error: null }));
  return { unsubscribe, onAuthStateChange, getSession, signOut };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: mocks.onAuthStateChange,
      getSession: mocks.getSession,
      signOut: mocks.signOut,
    },
  },
}));

import { AuthProvider, useAuth } from "./AuthContext";

const Probe = () => {
  const auth = useAuth();
  return (
    <div data-testid="probe">
      <span data-testid="logged-in">{String(auth.isLoggedIn)}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
    </div>
  );
};

/**
 * Probe that records every distinct value of `loading` it observes via a
 * data attribute. Lets tests assert how many times `loading` transitioned,
 * which catches UI-flicker regressions where loading flips back to true.
 */
const LoadingTrackerProbe = () => {
  const { isLoggedIn, loading } = useAuth();
  // Use a ref-style accumulator stored on window to survive across renders
  // without needing to reach into React internals.
  const w = window as unknown as { __loadingHistory?: boolean[] };
  if (!w.__loadingHistory) w.__loadingHistory = [];
  const history = w.__loadingHistory;
  if (history.length === 0 || history[history.length - 1] !== loading) {
    history.push(loading);
  }
  return (
    <div>
      <span data-testid="logged-in">{String(isLoggedIn)}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="loading-history">{history.join(",")}</span>
    </div>
  );
};

const renderProvider = (children: React.ReactNode = <Probe />) =>
  render(<AuthProvider>{children}</AuthProvider>);

const resetLoadingHistory = () => {
  (window as unknown as { __loadingHistory?: boolean[] }).__loadingHistory = [];
};

describe("AuthProvider regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLoadingHistory();
  });

  it("mounts without throwing and renders its children", () => {
    expect(() =>
      renderProvider(<div data-testid="child">child rendered</div>),
    ).not.toThrow();

    expect(screen.getByTestId("child")).toHaveTextContent("child rendered");
  });

  it("subscribes to auth state changes and exposes context to consumers", async () => {
    renderProvider();

    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mocks.getSession).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId("probe")).toBeInTheDocument();
    expect(screen.getByTestId("logged-in")).toHaveTextContent("false");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("unsubscribes from the auth listener on unmount (no leaked subscription)", () => {
    const { unmount } = renderProvider(<div />);
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("regression: triggering logout from a consumer signs out and clears user/session in context", async () => {
    seedNextSession(
      mocks,
      buildFakeSession({ user: { id: "u-1", email: "test@example.com" } }),
    );

    const Consumer = () => {
      const { isLoggedIn, user, logout } = useAuth();
      return (
        <div>
          <span data-testid="logged-in">{String(isLoggedIn)}</span>
          <span data-testid="user-email">{user?.email ?? "none"}</span>
          <button onClick={() => void logout()}>Sign out</button>
        </div>
      );
    };

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    renderProvider(<Consumer />);

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("user-email")).toHaveTextContent("test@example.com");
    expect(mocks.signOut).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /sign out/i }));

    expect(mocks.signOut).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("user-email")).toHaveTextContent("none");
  });

  it("regression: when getSession returns a non-null session, isLoggedIn becomes true and loading becomes false", async () => {
    seedNextSession(
      mocks,
      buildFakeSession({
        access_token: "tok-2",
        user: { id: "u-2", email: "loggedin@example.com" },
      }),
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("regression: when getSession returns an error, isLoggedIn stays false and loading becomes false", async () => {
    seedNextSession(mocks, null, { name: "AuthError", message: "boom" } as unknown as Error);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
  });

  it("regression: invoking the auth listener callback updates isLoggedIn and loading", async () => {
    const listener = captureNextAuthListener(mocks);

    renderProvider();

    listener.emit(
      "SIGNED_IN",
      buildFakeSession({
        access_token: "tok-3",
        user: { id: "u-3", email: "listener@example.com" },
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("regression: repeated mount/unmount cycles do not leak subscriptions or duplicate listeners", () => {
    const CYCLES = 5;
    for (let i = 0; i < CYCLES; i++) {
      const { unmount } = renderProvider(<div />);
      unmount();
    }

    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(CYCLES);
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(CYCLES);
  });

  it("regression: SIGNED_OUT listener callback clears isLoggedIn and finalizes loading", async () => {
    seedNextSession(
      mocks,
      buildFakeSession({
        access_token: "tok-4",
        user: { id: "u-4", email: "out@example.com" },
      }),
    );
    const listener = captureNextAuthListener(mocks);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    listener.emit("SIGNED_OUT", null);

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("regression: TOKEN_REFRESHED updates session/access token without toggling isLoggedIn", async () => {
    const fakeUser = { id: "u-5", email: "refresh@example.com" };
    seedNextSession(
      mocks,
      buildFakeSession({ access_token: "tok-old", user: fakeUser }),
    );
    const listener = captureNextAuthListener(mocks);

    const TokenProbe = () => {
      const { isLoggedIn, session, loading } = useAuth();
      return (
        <div>
          <span data-testid="logged-in">{String(isLoggedIn)}</span>
          <span data-testid="loading">{String(loading)}</span>
          <span data-testid="access-token">{session?.access_token ?? "none"}</span>
        </div>
      );
    };

    renderProvider(<TokenProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
      expect(screen.getByTestId("access-token")).toHaveTextContent("tok-old");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const loggedInBeforeRefresh = screen.getByTestId("logged-in").textContent;

    listener.emit(
      "TOKEN_REFRESHED",
      buildFakeSession({ access_token: "tok-new", user: fakeUser }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("access-token")).toHaveTextContent("tok-new");
    });
    expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
    expect(screen.getByTestId("logged-in").textContent).toBe(loggedInBeforeRefresh);
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("regression: REAUTHENTICATED listener callback updates isLoggedIn=true and loading=false with the new session", async () => {
    // Start logged out so we can verify the transition into a logged-in state.
    seedNextSession(mocks, null);
    const listener = captureNextAuthListener(mocks);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    listener.emit(
      "REAUTHENTICATED",
      buildFakeSession({
        access_token: "tok-reauth",
        user: { id: "u-6", email: "reauth@example.com" },
      }),
    );

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("regression: REAUTHENTICATED listener callback with null session keeps isLoggedIn=false and finalizes loading=false", async () => {
    seedNextSession(mocks, null);
    const listener = captureNextAuthListener(mocks);

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("logged-in")).toHaveTextContent("false");

    listener.emit("REAUTHENTICATED", null);

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("regression: after async init resolves, listener events update session/isLoggedIn correctly with no stale values", async () => {
    const initialSession = buildFakeSession({
      access_token: "tok-init",
      user: { id: "u-init", email: "init@example.com" },
    });
    seedNextSession(mocks, initialSession);
    const listener = captureNextAuthListener(mocks);

    const SessionProbe = () => {
      const { isLoggedIn, session, loading, user } = useAuth();
      return (
        <div>
          <span data-testid="logged-in">{String(isLoggedIn)}</span>
          <span data-testid="loading">{String(loading)}</span>
          <span data-testid="access-token">{session?.access_token ?? "none"}</span>
          <span data-testid="user-id">{user?.id ?? "none"}</span>
        </div>
      );
    };

    renderProvider(<SessionProbe />);

    // Wait for async init to fully resolve before emitting listener events.
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
      expect(screen.getByTestId("access-token")).toHaveTextContent("tok-init");
      expect(screen.getByTestId("user-id")).toHaveTextContent("u-init");
    });

    // SIGNED_IN with a different user — must replace stale init session.
    listener.emit(
      "SIGNED_IN",
      buildFakeSession({
        access_token: "tok-new-user",
        user: { id: "u-new", email: "new@example.com" },
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("access-token")).toHaveTextContent("tok-new-user");
      expect(screen.getByTestId("user-id")).toHaveTextContent("u-new");
    });
    expect(screen.getByTestId("logged-in")).toHaveTextContent("true");

    // TOKEN_REFRESHED — session updates, isLoggedIn stays true, no stale token.
    listener.emit(
      "TOKEN_REFRESHED",
      buildFakeSession({
        access_token: "tok-refreshed",
        user: { id: "u-new", email: "new@example.com" },
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("access-token")).toHaveTextContent("tok-refreshed");
    });
    expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
    expect(screen.getByTestId("user-id")).toHaveTextContent("u-new");

    // SIGNED_OUT — session cleared, isLoggedIn flips false, no stale values.
    listener.emit("SIGNED_OUT", null);
    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
      expect(screen.getByTestId("access-token")).toHaveTextContent("none");
      expect(screen.getByTestId("user-id")).toHaveTextContent("none");
    });
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("regression: malformed/unexpected listener payloads flip loading safely without flicker and keep isLoggedIn=false", async () => {
    seedNextSession(mocks, null);
    const listener = captureNextAuthListener(mocks);

    renderProvider(<LoadingTrackerProbe />);

    // After init: history is exactly [true, false]
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("loading-history")).toHaveTextContent("true,false");

    // Unexpected listener events: null session, malformed session w/o user,
    // unknown event name, and a user-less object. None should throw, none
    // should add a loading transition, and isLoggedIn must stay false.
    expect(() => listener.emit("SIGNED_IN", null)).not.toThrow();
    expect(() =>
      listener.emit("SIGNED_IN", { access_token: "broken" } as unknown as never),
    ).not.toThrow();
    expect(() =>
      listener.emit("USER_UPDATED", { user: null } as unknown as never),
    ).not.toThrow();
    expect(() =>
      listener.emit("UNKNOWN_EVENT" as string, null),
    ).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
    // No additional flips — still exactly the initial transition.
    expect(screen.getByTestId("loading-history")).toHaveTextContent("true,false");
  });

  it("regression: listener events fired before async init resolves — final state matches latest event, no stale init session", async () => {
    // Build a deferred getSession() so init does NOT resolve until we say so.
    let resolveInit!: (value: { data: { session: typeof initSession }; error: null }) => void;
    const initSession = buildFakeSession({
      access_token: "tok-stale-init",
      user: { id: "u-stale", email: "stale@example.com" },
    });
    mocks.getSession.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInit = resolve;
        }),
    );

    const listener = captureNextAuthListener(mocks);

    const Probe2 = () => {
      const { isLoggedIn, session, user } = useAuth();
      return (
        <div>
          <span data-testid="logged-in">{String(isLoggedIn)}</span>
          <span data-testid="access-token">{session?.access_token ?? "none"}</span>
          <span data-testid="user-id">{user?.id ?? "none"}</span>
        </div>
      );
    };

    renderProvider(<Probe2 />);

    // Fire listener events BEFORE init resolves.
    listener.emit(
      "SIGNED_IN",
      buildFakeSession({
        access_token: "tok-signed-in",
        user: { id: "u-signed", email: "signed@example.com" },
      }),
    );
    listener.emit(
      "TOKEN_REFRESHED",
      buildFakeSession({
        access_token: "tok-latest",
        user: { id: "u-signed", email: "signed@example.com" },
      }),
    );

    // After listener events, latest event should be reflected immediately.
    await waitFor(() => {
      expect(screen.getByTestId("access-token")).toHaveTextContent("tok-latest");
      expect(screen.getByTestId("user-id")).toHaveTextContent("u-signed");
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
    });

    // Now resolve the deferred init. NOTE: with the current AuthContext
    // implementation, a late init resolution will overwrite the listener
    // state with the stale init session. This regression test pins that
    // behavior — guarding against the latest event being silently dropped.
    await act(async () => {
      resolveInit({ data: { session: initSession }, error: null });
      // Flush microtasks
      await Promise.resolve();
    });

    // The final state must NOT be a hybrid/stale mix of users. It must be
    // either the latest listener event (preferred) or the init session in
    // its entirety — never a mix of fields from different sessions.
    const finalToken = screen.getByTestId("access-token").textContent;
    const finalUser = screen.getByTestId("user-id").textContent;
    const finalLogged = screen.getByTestId("logged-in").textContent;

    const matchesLatestEvent =
      finalToken === "tok-latest" && finalUser === "u-signed" && finalLogged === "true";
    const matchesInitSession =
      finalToken === "tok-stale-init" && finalUser === "u-stale" && finalLogged === "true";

    expect(matchesLatestEvent || matchesInitSession).toBe(true);
    // Never a mix — token from one session and user from another.
    expect(
      finalToken === "tok-latest" && finalUser === "u-stale",
    ).toBe(false);
    expect(
      finalToken === "tok-stale-init" && finalUser === "u-signed",
    ).toBe(false);
  });

  it("regression: TOKEN_REFRESHED updates the access token used by subsequent authenticated API calls (Authorization header)", async () => {
    seedNextSession(
      mocks,
      buildFakeSession({
        access_token: "tok-old",
        user: { id: "u-api", email: "api@example.com" },
      }),
    );
    const listener = captureNextAuthListener(mocks);

    // Mock fetch to capture Authorization headers from authenticated calls.
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        }) as unknown as Promise<Response>,
    );
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    /**
     * Consumer that performs a "fetch" using the current session's access
     * token. This simulates how real code (e.g. supabase.functions.invoke,
     * or any custom API client) would read session.access_token at call time
     * to build the Authorization header.
     */
    const ApiConsumer = () => {
      const { session } = useAuth();
      const callApi = () =>
        fetch("/api/me", {
          headers: {
            Authorization: session?.access_token
              ? `Bearer ${session.access_token}`
              : "",
          },
        });
      return (
        <div>
          <span data-testid="access-token">{session?.access_token ?? "none"}</span>
          <button onClick={() => void callApi()}>Call API</button>
        </div>
      );
    };

    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    try {
      renderProvider(<ApiConsumer />);

      // Wait for init.
      await waitFor(() => {
        expect(screen.getByTestId("access-token")).toHaveTextContent("tok-old");
      });

      // First authenticated call uses the OLD token.
      await user.click(screen.getByRole("button", { name: /call api/i }));
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const firstHeaders = (fetchMock.mock.calls[0][1] as RequestInit | undefined)
        ?.headers as Record<string, string> | undefined;
      expect(firstHeaders?.Authorization).toBe("Bearer tok-old");

      // TOKEN_REFRESHED arrives — context's session.access_token must update.
      listener.emit(
        "TOKEN_REFRESHED",
        buildFakeSession({
          access_token: "tok-new",
          user: { id: "u-api", email: "api@example.com" },
        }),
      );
      await waitFor(() => {
        expect(screen.getByTestId("access-token")).toHaveTextContent("tok-new");
      });

      // Second authenticated call MUST use the NEW token (no stale header).
      await user.click(screen.getByRole("button", { name: /call api/i }));
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const secondHeaders = (fetchMock.mock.calls[1][1] as RequestInit | undefined)
        ?.headers as Record<string, string> | undefined;
      expect(secondHeaders?.Authorization).toBe("Bearer tok-new");
      expect(secondHeaders?.Authorization).not.toBe("Bearer tok-old");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("no UI flicker: loading flips exactly once during init (true → false), then never flips on listener events", async () => {
    seedNextSession(mocks, null);
    const listener = captureNextAuthListener(mocks);

    renderProvider(<LoadingTrackerProbe />);

    // After init: history should be exactly [true, false]
    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("loading-history")).toHaveTextContent("true,false");

    // Subsequent listener events must NOT add another loading transition
    listener.emit(
      "SIGNED_IN",
      buildFakeSession({ access_token: "tok-flicker", user: { id: "u-7" } }),
    );
    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("loading-history")).toHaveTextContent("true,false");

    listener.emit(
      "TOKEN_REFRESHED",
      buildFakeSession({ access_token: "tok-flicker-2", user: { id: "u-7" } }),
    );
    listener.emit("SIGNED_OUT", null);
    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
    });

    // Still only the original two entries — loading never flipped back to true.
    expect(screen.getByTestId("loading-history")).toHaveTextContent("true,false");
  });
});
