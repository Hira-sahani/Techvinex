import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

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
      resetPasswordForEmail: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}));

import { AuthProvider } from "@/contexts/AuthContext";
import AuthRedirectHandler from "./AuthRedirectHandler";

// Minimal location probe so the test can assert the current pathname.
const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="pathname">{location.pathname}</div>;
};

const renderApp = (initialPath = "/login") =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <AuthRedirectHandler />
        <LocationProbe />
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route path="/explore" element={<div data-testid="explore-page">Explore</div>} />
          <Route path="/onboarding" element={<div data-testid="onboarding-page">Onboarding</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

describe("Login page redirect (e2e-style)", () => {
  it("redirects an existing logged-in user away from /login to /explore", async () => {
    const existingUser = {
      id: "existing-user",
      email: "existing@example.com",
      email_confirmed_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days old
    };
    const session = {
      access_token: "tok",
      refresh_token: "ref",
      user: existingUser,
    };

    mocks.getSession.mockResolvedValueOnce({
      data: { session },
      error: null,
    });

    renderApp("/login");

    // Initially on /login while AuthProvider resolves
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");

    await waitFor(() => {
      expect(screen.getByTestId("pathname")).toHaveTextContent("/explore");
    });
    expect(screen.getByTestId("explore-page")).toBeInTheDocument();
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });

  it("does not redirect away from /login when there is no session", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

    renderApp("/login");

    // Wait long enough for any redirect effects to flush, then assert we stayed put
    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
    expect(screen.getByTestId("pathname")).toHaveTextContent("/login");
  });
});
