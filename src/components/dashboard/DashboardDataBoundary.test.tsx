import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DashboardDataBoundary } from "./DashboardDataBoundary";
import type { UseDashboardDataResult } from "@/hooks/useDashboardData";

function makeQuery<T>(overrides: Partial<UseDashboardDataResult<T>>): UseDashboardDataResult<T> {
  return {
    data: null,
    error: null,
    status: "idle",
    isLoading: false,
    isError: false,
    isEmpty: false,
    isSuccess: false,
    refetch: vi.fn(async () => {}),
    ...overrides,
  } as UseDashboardDataResult<T>;
}

const Skeleton = () => <div data-testid="sk">loading…</div>;
const renderContent = (data: string[]) => <div data-testid="content">{data.join(",")}</div>;

describe("DashboardDataBoundary", () => {
  it("renders skeleton when loading", () => {
    render(
      <DashboardDataBoundary query={makeQuery<string[]>({ isLoading: true, status: "loading" })} skeleton={<Skeleton />}>
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByTestId("sk")).toBeInTheDocument();
    expect(screen.queryByTestId("content")).toBeNull();
  });

  it("renders error state with retry that calls refetch", () => {
    const refetch = vi.fn(async () => {});
    render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ isError: true, status: "error", error: new Error("Boom"), refetch })}
        skeleton={<Skeleton />}
        errorConfig={{ title: "Failed" }}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Boom")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders empty state with action when isEmpty and empty config provided", () => {
    const onAction = vi.fn();
    render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ isEmpty: true, status: "empty", data: [] })}
        skeleton={<Skeleton />}
        empty={{ title: "Nothing here", description: "Add one", actionLabel: "Create", onAction }}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /create/i }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("renders content when data is present and not empty/error/loading", () => {
    render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ status: "success", isSuccess: true, data: ["a", "b"] })}
        skeleton={<Skeleton />}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByTestId("content")).toHaveTextContent("a,b");
  });

  it("falls back to skeleton when data is null and no other state set", () => {
    render(
      <DashboardDataBoundary query={makeQuery<string[]>({ status: "idle" })} skeleton={<Skeleton />}>
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByTestId("sk")).toBeInTheDocument();
  });

  it("transitions skeleton -> content on rerender", () => {
    const { rerender } = render(
      <DashboardDataBoundary query={makeQuery<string[]>({ isLoading: true, status: "loading" })} skeleton={<Skeleton />}>
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByTestId("sk")).toBeInTheDocument();

    rerender(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ status: "success", isSuccess: true, data: ["x"] })}
        skeleton={<Skeleton />}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.queryByTestId("sk")).toBeNull();
    expect(screen.getByTestId("content")).toHaveTextContent("x");
  });

  it("ignores empty config when not isEmpty", () => {
    render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ status: "success", isSuccess: true, data: ["a"] })}
        skeleton={<Skeleton />}
        empty={{ title: "EMPTY", description: "no" }}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.queryByText("EMPTY")).toBeNull();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});
