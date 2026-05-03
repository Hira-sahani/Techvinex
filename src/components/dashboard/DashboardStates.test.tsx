import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardEmptyState, DashboardErrorState } from "./DashboardStates";

describe("DashboardStates", () => {
  it("renders empty state actions", () => {
    const onPrimary = vi.fn();
    const onSecondary = vi.fn();

    render(
      <DashboardEmptyState
        title="No data"
        description="Nothing here yet"
        actionLabel="Create"
        onAction={onPrimary}
        secondaryActionLabel="Browse"
        onSecondaryAction={onSecondary}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    fireEvent.click(screen.getByRole("button", { name: /browse/i }));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("renders retry action for error state", () => {
    const onRetry = vi.fn();

    render(<DashboardErrorState description="Failed" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
