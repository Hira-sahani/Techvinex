import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock the supabase client BEFORE importing AuthProvider so the module picks
// up the mock when it pulls supabase from "@/integrations/supabase/client".
const unsubscribe = vi.fn();
const onAuthStateChange = vi.fn(() => ({
  data: { subscription: { unsubscribe } },
}));
const getSession = vi.fn(() =>
  Promise.resolve({ data: { session: null }, error: null }),
);
const signOut = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { onAuthStateChange, getSession, signOut },
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
    // If React hooks/runtime fail (e.g. duplicate React copies / null useState),
    // this render call would throw. We explicitly assert it does not.
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

    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(getSession).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId("probe")).toBeInTheDocument();
    expect(screen.getByTestId("logged-in")).toHaveTextContent("false");

    // After getSession resolves, loading should flip to false
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
    expect(unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
