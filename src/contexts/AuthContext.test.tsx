import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

const renderProvider = (children: React.ReactNode = <Probe />) =>
  render(<AuthProvider>{children}</AuthProvider>);

describe("AuthProvider regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
