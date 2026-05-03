import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
      signOut: mocks.signOut,
      onAuthStateChange: mocks.onAuthStateChange,
    },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() },
}));

import { AuthProvider, useAuth } from "./AuthContext";
import * as apiClient from "@/lib/apiClient";

function Probe() {
  const { isSessionExpired, sessionExpiredEvent, dismissSessionExpired } = useAuth();
  return (
    <div>
      <span data-testid="expired">{isSessionExpired ? "yes" : "no"}</span>
      <span data-testid="endpoint">{sessionExpiredEvent?.endpoint ?? "none"}</span>
      <button onClick={dismissSessionExpired}>dismiss</button>
    </div>
  );
}

describe("AuthContext — session-expired UI hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it("subscribes to onSessionExpired, flips isSessionExpired=true on emit, and dismiss clears it", async () => {
    // Capture the listener AuthContext registers via onSessionExpired.
    const captured: Array<(e: apiClient.SessionExpiredEvent) => void> = [];
    const realOn = apiClient.onSessionExpired;
    const spy = vi.spyOn(apiClient, "onSessionExpired").mockImplementation((listener) => {
      captured.push(listener);
      return realOn(listener);
    });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByTestId("expired")).toHaveTextContent("no");
    expect(captured.length).toBeGreaterThan(0);

    // Simulate a 401 emitting a session-expired event.
    act(() => {
      captured.forEach((l) =>
        l({ timestamp: "2026-01-01T00:00:00.000Z", endpoint: "/api/protected" }),
      );
    });

    expect(screen.getByTestId("expired")).toHaveTextContent("yes");
    expect(screen.getByTestId("endpoint")).toHaveTextContent("/api/protected");

    // dismissSessionExpired clears the state.
    const user = userEvent.setup();
    await user.click(screen.getByText("dismiss"));
    expect(screen.getByTestId("expired")).toHaveTextContent("no");
    expect(screen.getByTestId("endpoint")).toHaveTextContent("none");

    spy.mockRestore();
  });

  it("unsubscribes the listener on unmount", async () => {
    const unsubscribe = vi.fn();
    const spy = vi.spyOn(apiClient, "onSessionExpired").mockReturnValue(unsubscribe);

    const { unmount } = render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(unsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});
