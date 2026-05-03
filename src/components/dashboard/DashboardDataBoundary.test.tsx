import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("empty state action renders configured label and triggers its callback exactly once", () => {
    const onAction = vi.fn();
    render(
      <DashboardDataBoundary
        query={makeQuery<string[]>({ isEmpty: true, status: "empty", data: [] })}
        skeleton={<Skeleton />}
        empty={{
          title: "No jobs yet",
          description: "Post a job to get started",
          actionLabel: "Post a job",
          onAction,
        }}
      >
        {renderContent}
      </DashboardDataBoundary>,
    );

    const btn = screen.getByRole("button", { name: "Post a job" });
    expect(btn).toHaveAccessibleName("Post a job");
    expect(screen.queryByRole("button", { name: /create/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /add/i })).toBeNull();

    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
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

  it("shows skeleton while loading and hides it once content renders", () => {
    const Boundary = (q: UseDashboardDataResult<string[]>) => (
      <DashboardDataBoundary query={q} skeleton={<Skeleton />}>
        {renderContent}
      </DashboardDataBoundary>
    );

    const { rerender } = render(Boundary(makeQuery<string[]>({ isLoading: true, status: "loading" })));

    // While loading: skeleton visible, content absent
    expect(screen.getByTestId("sk")).toBeInTheDocument();
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();

    // After data resolves: skeleton hidden, content visible
    rerender(Boundary(makeQuery<string[]>({ status: "success", isSuccess: true, data: ["hello"] })));
    expect(screen.queryByTestId("sk")).not.toBeInTheDocument();
    const content = screen.getByTestId("content");
    expect(content).toBeInTheDocument();
    expect(content).toBeVisible();
    expect(content).toHaveTextContent("hello");
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
  });

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

  describe("accessibility", () => {
    it("error state exposes role='alert' with aria-label and live region", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isError: true, status: "error", error: new Error("Boom"), refetch: vi.fn(async () => {}) })}
          skeleton={<Skeleton />}
          errorConfig={{ title: "Failed to load" }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("aria-label", "Failed to load");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("empty state exposes role='status' with aria-label and polite live region", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isEmpty: true, status: "empty", data: [] })}
          skeleton={<Skeleton />}
          empty={{ title: "Nothing here", description: "Add one", actionLabel: "Create", onAction: vi.fn() }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-label", "Nothing here");
      expect(status).toHaveAttribute("aria-live", "polite");
    });

    it("error state retry button has accessible role 'button' and accessible name 'Try again'", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isError: true, status: "error", error: new Error("Boom"), refetch: vi.fn(async () => {}) })}
          skeleton={<Skeleton />}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      const btn = screen.getByRole("button", { name: "Try again" });
      expect(btn.tagName).toBe("BUTTON");
      expect(btn).toHaveAccessibleName("Try again");
      expect(btn).toBeEnabled();
      expect(btn.querySelector("[aria-hidden='true']")).not.toBeNull();
    });

    it("error retry button is keyboard reachable and activates via Enter", async () => {
      const user = userEvent.setup();
      const refetch = vi.fn(async () => {});
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isError: true, status: "error", error: new Error("Boom"), refetch })}
          skeleton={<Skeleton />}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      await user.tab();
      const btn = screen.getByRole("button", { name: "Try again" });
      expect(btn).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("regression: 'Try again' button is keyboard accessible (Tab focus, Enter + Space) and triggers refetch", async () => {
      const user = userEvent.setup();
      const refetch = vi.fn(async () => {});
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isError: true, status: "error", error: new Error("Boom"), refetch })}
          skeleton={<Skeleton />}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );

      const btn = screen.getByRole("button", { name: "Try again" });
      expect(btn).toBeEnabled();
      expect(btn).not.toHaveAttribute("tabindex", "-1");

      await user.tab();
      expect(btn).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(refetch).toHaveBeenCalledTimes(1);

      await user.keyboard(" ");
      expect(refetch).toHaveBeenCalledTimes(2);
    });

    it("empty state primary and secondary actions are keyboard reachable in order", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      const onSecondaryAction = vi.fn();
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isEmpty: true, status: "empty", data: [] })}
          skeleton={<Skeleton />}
          empty={{
            title: "No data",
            description: "Try again later",
            actionLabel: "Refresh",
            onAction,
            secondaryActionLabel: "Manage",
            onSecondaryAction,
          }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      const primary = screen.getByRole("button", { name: "Refresh" });
      const secondary = screen.getByRole("button", { name: "Manage" });

      await user.tab();
      expect(primary).toHaveFocus();
      await user.keyboard(" ");
      expect(onAction).toHaveBeenCalledTimes(1);

      await user.tab();
      expect(secondary).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(onSecondaryAction).toHaveBeenCalledTimes(1);
    });
  });

  describe("snapshots", () => {
    it("matches snapshot for loading state", () => {
      const { container } = render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isLoading: true, status: "loading" })}
          skeleton={<Skeleton />}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it("matches snapshot for error state", () => {
      const { container } = render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({
            isError: true,
            status: "error",
            error: new Error("Network down"),
            refetch: vi.fn(async () => {}),
          })}
          skeleton={<Skeleton />}
          errorConfig={{ title: "Failed to load", description: "Network down" }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      expect(container.firstChild).toMatchSnapshot();
    });

    it("matches snapshot for empty state with primary + secondary actions", () => {
      const { container } = render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isEmpty: true, status: "empty", data: [] })}
          skeleton={<Skeleton />}
          empty={{
            title: "No items yet",
            description: "Create your first item to get started",
            actionLabel: "Create",
            onAction: () => {},
            secondaryActionLabel: "Learn more",
            onSecondaryAction: () => {},
          }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  describe("skeleton passthrough", () => {
    it("renders the provided skeleton node verbatim with its className and data attributes", () => {
      const CustomSkeleton = (
        <div
          data-testid="custom-skeleton"
          data-variant="dashboard"
          aria-label="Loading dashboard"
          className="h-40 w-full rounded-lg bg-muted animate-pulse"
        >
          <span className="sr-only">Loading…</span>
        </div>
      );

      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isLoading: true, status: "loading" })}
          skeleton={CustomSkeleton}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );

      const node = screen.getByTestId("custom-skeleton");
      expect(node).toBeInTheDocument();
      expect(node).toHaveClass("h-40", "w-full", "rounded-lg", "bg-muted", "animate-pulse");
      expect(node).toHaveAttribute("data-variant", "dashboard");
      expect(node).toHaveAttribute("aria-label", "Loading dashboard");
      expect(node).toHaveTextContent("Loading…");
    });

    it("forwards a functional component skeleton with its props preserved", () => {
      const Sk = ({ label, rows }: { label: string; rows: number }) => (
        <div data-testid="fn-skeleton" data-rows={rows}>
          {label}
        </div>
      );

      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isLoading: true, status: "loading" })}
          skeleton={<Sk label="Loading rows" rows={5} />}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );

      const node = screen.getByTestId("fn-skeleton");
      expect(node).toHaveTextContent("Loading rows");
      expect(node).toHaveAttribute("data-rows", "5");
    });
  });

  describe("empty state precedence", () => {
    it("does NOT render empty state when isLoading is true (skeleton wins)", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isLoading: true, isEmpty: true, status: "loading", data: [] })}
          skeleton={<Skeleton />}
          empty={{ title: "No data", description: "Nothing here", actionLabel: "Add", onAction: vi.fn() }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      expect(screen.getByTestId("sk")).toBeInTheDocument();
      expect(screen.queryByText("No data")).toBeNull();
      expect(screen.queryByRole("button", { name: /add/i })).toBeNull();
    });

    it("does NOT render empty state when isError is true (error wins over empty)", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({
            isError: true,
            isEmpty: true,
            status: "error",
            error: new Error("Boom"),
            data: [],
            refetch: vi.fn(async () => {}),
          })}
          skeleton={<Skeleton />}
          errorConfig={{ title: "Failed" }}
          empty={{ title: "No data", description: "Nothing here", actionLabel: "Add", onAction: vi.fn() }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      expect(screen.getByText("Failed")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
      expect(screen.queryByText("No data")).toBeNull();
      expect(screen.queryByRole("button", { name: /add/i })).toBeNull();
    });

    it("renders empty state ONLY when isLoading=false and isError=false", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({
            isLoading: false,
            isError: false,
            isEmpty: true,
            status: "empty",
            data: [],
          })}
          skeleton={<Skeleton />}
          empty={{ title: "No data", description: "Nothing here", actionLabel: "Add", onAction: vi.fn() }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );
      expect(screen.getByText("No data")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
      expect(screen.queryByTestId("sk")).toBeNull();
    });

    it("regression: 'Add' button calls onAction when empty state is shown (click + Enter)", async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({ isEmpty: true, status: "empty", data: [] })}
          skeleton={<Skeleton />}
          empty={{
            title: "No items yet",
            description: "Add your first item",
            actionLabel: "Add",
            onAction,
          }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );

      const btn = screen.getByRole("button", { name: "Add" });
      expect(onAction).not.toHaveBeenCalled();

      // Click triggers callback
      fireEvent.click(btn);
      expect(onAction).toHaveBeenCalledTimes(1);

      // Keyboard activation (Enter) also triggers callback
      btn.focus();
      await user.keyboard("{Enter}");
      expect(onAction).toHaveBeenCalledTimes(2);
    });

    it("regression: does NOT render empty state when isEmpty is false, even if isLoading and isError are both false", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({
            isLoading: false,
            isError: false,
            isEmpty: false,
            isSuccess: true,
            status: "success",
            data: ["a", "b"],
          })}
          skeleton={<Skeleton />}
          empty={{
            title: "Should not appear",
            description: "Empty config provided but isEmpty=false",
            actionLabel: "Add",
            onAction: vi.fn(),
          }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );

      // Empty state must not be rendered
      expect(screen.queryByText("Should not appear")).toBeNull();
      expect(screen.queryByText("Empty config provided but isEmpty=false")).toBeNull();
      expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();

      // Content should be rendered instead
      expect(screen.getByTestId("content")).toHaveTextContent("a,b");
    });

    it("regression: status='loading' but isLoading=false → boundary uses flags, renders empty state", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({
            // Inconsistent: status says loading, but flag says we're done
            status: "loading",
            isLoading: false,
            isError: false,
            isEmpty: true,
            data: [],
          })}
          skeleton={<Skeleton />}
          empty={{ title: "No data", description: "Nothing here", actionLabel: "Add", onAction: vi.fn() }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );

      // Boundary trusts flags: skeleton must NOT render, empty must render
      expect(screen.queryByTestId("sk")).toBeNull();
      expect(screen.getByText("No data")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    });

    it("regression: status='error' but isError=false → boundary uses flags, renders empty state", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({
            // Inconsistent: status says error, but flag says we're not erroring
            status: "error",
            isLoading: false,
            isError: false,
            isEmpty: true,
            error: new Error("stale error message"),
            data: [],
          })}
          skeleton={<Skeleton />}
          errorConfig={{ title: "Should not appear" }}
          empty={{ title: "Empty wins", description: "Flags drive UI", actionLabel: "Add", onAction: vi.fn() }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );

      // Error UI must NOT render (flag is false)
      expect(screen.queryByText("Should not appear")).toBeNull();
      expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
      expect(screen.queryByText("stale error message")).toBeNull();

      // Empty state wins because isEmpty=true
      expect(screen.getByText("Empty wins")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    });

    it("regression: status='success' but isEmpty=true → empty state still wins over content", () => {
      render(
        <DashboardDataBoundary
          query={makeQuery<string[]>({
            // Inconsistent: status says success, but isEmpty flag is true with empty data
            status: "success",
            isSuccess: true,
            isLoading: false,
            isError: false,
            isEmpty: true,
            data: [],
          })}
          skeleton={<Skeleton />}
          empty={{ title: "Still empty", description: "isEmpty wins", actionLabel: "Add", onAction: vi.fn() }}
        >
          {renderContent}
        </DashboardDataBoundary>,
      );

      expect(screen.getByText("Still empty")).toBeInTheDocument();
      expect(screen.queryByTestId("content")).toBeNull();
    });
  });
});
