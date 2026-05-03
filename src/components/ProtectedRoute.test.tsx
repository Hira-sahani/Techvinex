import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

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

import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "./ProtectedRoute";

const renderApp = (initialPath: string) =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route
            path="/secret"
            element={
              <ProtectedRoute>
                <div data-testid="secret-page">Secret content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

describe("ProtectedRoute integration", () => {
  it("redirects to /login when isLoggedIn is false", async () => {
    mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });

    renderApp("/secret");

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("secret-page")).not.toBeInTheDocument();
  });

  it("renders the protected content when isLoggedIn is true", async () => {
    const fakeUser = { id: "u-1", email: "test@example.com" } as unknown as import("@supabase/supabase-js").User;
    const fakeSession = { user: fakeUser, access_token: "tok" } as unknown as import("@supabase/supabase-js").Session;
    mocks.getSession.mockResolvedValueOnce({ data: { session: fakeSession }, error: null });

    renderApp("/secret");

    await waitFor(() => {
      expect(screen.getByTestId("secret-page")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
  });
});
