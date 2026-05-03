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

  it("error retry button label is 'Try again' (not 'Retry')", () => {
    render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ isError: true, status: "error", error: new Error("x"), refetch: vi.fn(async () => {}) })}
        skeleton={<Skeleton />}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^retry$/i })).toBeNull();
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

  it("renders empty state without action button when actionLabel is missing", () => {
    const onAction = vi.fn();
    render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ isEmpty: true, status: "empty", data: [] })}
        skeleton={<Skeleton />}
        empty={{ title: "Nothing here", description: "Add one", onAction }}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Add one")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("renders empty state without action button when onAction is missing", () => {
    render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ isEmpty: true, status: "empty", data: [] })}
        skeleton={<Skeleton />}
        empty={{ title: "Nothing here", description: "Add one", actionLabel: "Create" }}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create/i })).toBeNull();
  });

  it("renders empty state with title/description only when no action props provided", () => {
    render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ isEmpty: true, status: "empty", data: [] })}
        skeleton={<Skeleton />}
        empty={{ title: "All clear", description: "Nothing to show" }}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByText("All clear")).toBeInTheDocument();
    expect(screen.getByText("Nothing to show")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByTestId("content")).toBeNull();
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

  it("shows skeleton when isLoading is true even if isError or isEmpty are also set", () => {
    const refetch = vi.fn(async () => {});
    const { rerender } = render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({
          isLoading: true,
          isError: true,
          status: "loading",
          error: new Error("Boom"),
          refetch,
        })}
        skeleton={<Skeleton />}
        errorConfig={{ title: "Failed" }}
        empty={{ title: "Nothing here", description: "Add one" }}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByTestId("sk")).toBeInTheDocument();
    expect(screen.queryByText("Failed")).toBeNull();
    expect(screen.queryByText("Boom")).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();

    rerender(
      <DashboardDataBoundary
        query={makeQuery<string[]>({
          isLoading: true,
          isEmpty: true,
          status: "loading",
          data: [],
        })}
        skeleton={<Skeleton />}
        empty={{ title: "Nothing here", description: "Add one", actionLabel: "Create", onAction: vi.fn() }}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );
    expect(screen.getByTestId("sk")).toBeInTheDocument();
    expect(screen.queryByText("Nothing here")).toBeNull();
    expect(screen.queryByRole("button", { name: /create/i })).toBeNull();
  });
});
