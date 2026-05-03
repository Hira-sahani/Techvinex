import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

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

describe("AuthProvider regression", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mounts without throwing and renders its children", () => {
    expect(() =>
      render(
        <AuthProvider>
          <div data-testid="child">child rendered</div>
        </AuthProvider>,
      ),
    ).not.toThrow();

    expect(screen.getByTestId("child")).toHaveTextContent("child rendered");
  });

  it("subscribes to auth state changes and exposes context to consumers", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(mocks.getSession).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId("probe")).toBeInTheDocument();
    expect(screen.getByTestId("logged-in")).toHaveTextContent("false");

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("unsubscribes from the auth listener on unmount (no leaked subscription)", () => {
    const { unmount } = render(
      <AuthProvider>
        <div />
      </AuthProvider>,
    );
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("regression: triggering logout from a consumer signs out and clears user/session in context", async () => {
    const fakeUser = { id: "u-1", email: "test@example.com" } as unknown as import("@supabase/supabase-js").User;
    const fakeSession = { user: fakeUser, access_token: "tok" } as unknown as import("@supabase/supabase-js").Session;

    // Start the session as logged-in for this test only
    mocks.getSession.mockResolvedValueOnce({ data: { session: fakeSession }, error: null });

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

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );

    // After getSession resolves, the consumer reflects the logged-in state
    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
    });
    expect(screen.getByTestId("user-email")).toHaveTextContent("test@example.com");
    expect(mocks.signOut).not.toHaveBeenCalled();

    // Trigger logout from the consumer
    await user.click(screen.getByRole("button", { name: /sign out/i }));

    // signOut was invoked
    expect(mocks.signOut).toHaveBeenCalledTimes(1);

    // Context cleared after signOut resolves
    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("user-email")).toHaveTextContent("none");
  });

  it("regression: when getSession returns a non-null session, isLoggedIn becomes true and loading becomes false", async () => {
    const fakeUser = { id: "u-2", email: "loggedin@example.com" } as unknown as import("@supabase/supabase-js").User;
    const fakeSession = { user: fakeUser, access_token: "tok-2" } as unknown as import("@supabase/supabase-js").Session;

    mocks.getSession.mockResolvedValueOnce({ data: { session: fakeSession }, error: null });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("logged-in")).toHaveTextContent("true");
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
  });

  it("regression: when getSession returns an error, isLoggedIn stays false and loading becomes false", async () => {
    mocks.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { name: "AuthError", message: "boom" } as unknown as Error,
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });
    expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
  });
});
