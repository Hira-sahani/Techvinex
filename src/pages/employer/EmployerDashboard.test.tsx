import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import EmployerDashboard from "./EmployerDashboard";

const mockUseEmployerJobs = vi.fn();
const mockUseEmployerCandidates = vi.fn();
const mockUseEmployerInterviews = vi.fn();
const mockUseMinimumLoading = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@/hooks/useEmployerData", () => ({
  useEmployerJobs: () => mockUseEmployerJobs(),
  useEmployerCandidates: () => mockUseEmployerCandidates(),
  useEmployerInterviews: () => mockUseEmployerInterviews(),
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

vi.mock("@/components/skeletons/DashboardSkeletons", () => ({
  EmployerDashboardSkeleton: () => <div>Employer Dashboard Skeleton</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseEmployerJobs.mockReturnValue({ data: [], isLoading: false, isFetching: false, error: null, refetch: vi.fn() });
  mockUseEmployerCandidates.mockReturnValue({ data: [], isLoading: false, isFetching: false, error: null, refetch: vi.fn() });
  mockUseEmployerInterviews.mockReturnValue({ data: [], isLoading: false, isFetching: false, error: null, refetch: vi.fn() });
  mockUseMinimumLoading.mockReturnValue(false);
});

describe("EmployerDashboard", () => {
  it("shows skeleton while loading branch is active", () => {
    mockUseMinimumLoading.mockReturnValue(true);

    render(
      <MemoryRouter>
        <EmployerDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByText("Employer Dashboard Skeleton")).toBeInTheDocument();
  });

  it("shows real content after loading completes", () => {
    mockUseEmployerJobs.mockReturnValue({
      data: [{ id: "1", title: "React Engineer", status: "active", location: "Remote", type: "Full-time", created_at: new Date().toISOString() }],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseEmployerCandidates.mockReturnValue({
      data: [{ id: "c1", candidate_name: "Aman", status: "shortlisted", updated_at: new Date().toISOString(), job_id: "1", ai_score: 82 }],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseEmployerInterviews.mockReturnValue({
      data: [{ id: "i1", candidate_name: "Aman", job_title: "React Engineer", scheduled_date: "2026-05-01", scheduled_time: "11:00", status: "scheduled" }],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <EmployerDashboard />
      </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByText(/react engineer/i)).toBeInTheDocument();
    expect(screen.queryByText("Employer Dashboard Skeleton")).not.toBeInTheDocument();
  });
});
