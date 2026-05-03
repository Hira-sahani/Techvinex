import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import CandidateDashboard from "./CandidateDashboard";

const mockUseAuth = vi.fn();
const mockUseMinimumLoading = vi.fn();
const mockNavigate = vi.fn();
const fromMock = vi.fn();
const mockedSupabaseFns = vi.hoisted(() => ({
  removeChannel: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useMinimumLoading", () => ({
  useMinimumLoading: (...args: unknown[]) => mockUseMinimumLoading(...args),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => fromMock(...args),
    channel: () => ({
      on: () => ({ on: () => ({ on: () => ({ subscribe: () => ({}) }) }) }),
    }),
    removeChannel: mockedSupabaseFns.removeChannel,
  },
}));

vi.mock("@/components/SidebarNav", () => ({ default: () => <div>Sidebar</div> }));
vi.mock("@/components/TopStatusBar", () => ({ default: () => <div>Top Status</div> }));
vi.mock("@/components/ProfileDropdown", () => ({ default: () => <div>Profile Dropdown</div> }));
vi.mock("@/components/NotificationBell", () => ({ default: () => <div>Notification Bell</div> }));
vi.mock("@/components/skeletons/DashboardSkeletons", () => ({ CandidateDashboardSkeleton: () => <div>Candidate Dashboard Skeleton</div> }));
vi.mock("@/components/dashboard/ApplicationPipeline", () => ({ default: () => <div>Application Pipeline</div> }));
vi.mock("@/components/dashboard/DashboardStats", () => ({ default: () => <div>Dashboard Stats</div> }));
vi.mock("@/components/dashboard/UpcomingInterviews", () => ({ default: () => <div>Upcoming Interviews</div> }));

const createQuery = (table: string) => {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => {
      if (table === "profiles") {
        return { data: { full_name: "Aman Singh", email: "a@test.com" }, error: null };
      }
      return { data: null, error: null };
    },
    order: () => builder,
    limit: async () => ({ data: [], error: null }),
    then: (resolve: (value: unknown) => void) => {
      resolve({ data: [], error: null });
    },
  };

  return builder;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
  mockUseMinimumLoading.mockReturnValue(false);
  fromMock.mockImplementation((table: string) => createQuery(table));
});

describe("CandidateDashboard", () => {
  it("shows skeleton while loading branch is active", () => {
    mockUseMinimumLoading.mockReturnValue(true);

    render(
      <MemoryRouter>
        <CandidateDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText("Candidate Dashboard Skeleton")).toBeInTheDocument();
  });

  it("shows content after loading completes", async () => {
    render(
      <MemoryRouter>
        <CandidateDashboard />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: /welcome back, aman/i })).toBeInTheDocument();
    expect(screen.getByText("Dashboard Stats")).toBeInTheDocument();
    expect(screen.queryByText("Candidate Dashboard Skeleton")).not.toBeInTheDocument();
  });
});
