import { describe, it, expect, vi } from "vitest";
import listExploreJobsTool from "./list-explore-jobs";
import searchExploreJobsTool from "./search-explore-jobs";

// Mock the Supabase client so every tool sees an empty explore_jobs result set.
const mockChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
};

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => mockChain),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

function makeCtx(authenticated = true) {
  return {
    isAuthenticated: () => authenticated,
    getUserId: () => (authenticated ? "00000000-0000-0000-0000-000000000001" : null),
    getToken: () => (authenticated ? "test-token" : null),
  };
}

function textContent(result: { content: Array<{ type: string; text?: string }> }) {
  return result.content[0].text;
}

describe("list_explore_jobs empty result", () => {
  it("returns success with empty jobs array and a helpful message", async () => {
    mockChain.limit.mockResolvedValueOnce({ data: [], error: null });

    const result = await listExploreJobsTool.handler(
      { search: "nonexistent-role" },
      makeCtx() as unknown as Parameters<typeof listExploreJobsTool.handler>[1],
    );

    expect(result.isError).toBeFalsy();
    expect(textContent(result)).toBe("[]");
    expect(result.structuredContent).toMatchObject({
      jobs: [],
      message: "No jobs are currently available for this role. Please check back later or try another search.",
    });
  });

  it("does not include the no-match message when jobs are found", async () => {
    const jobs = [{ id: "job-1", title: "Found Role" }];
    mockChain.limit.mockResolvedValueOnce({ data: jobs, error: null });

    const result = await listExploreJobsTool.handler(
      { search: "found" },
      makeCtx() as unknown as Parameters<typeof listExploreJobsTool.handler>[1],
    );

    expect(result.structuredContent.jobs).toEqual(jobs);
    expect(result.structuredContent.message).toBeUndefined();
  });
});

describe("search_explore_jobs empty result", () => {
  it("returns success with empty jobs array and a helpful message for 'react remote'", async () => {
    mockChain.range.mockResolvedValueOnce({ data: [], error: null });

    const result = await searchExploreJobsTool.handler(
      { query: "react", location: "remote" },
      makeCtx() as unknown as Parameters<typeof searchExploreJobsTool.handler>[1],
    );

    expect(result.isError).toBeFalsy();
    expect(textContent(result)).toBe("[]");
    expect(result.structuredContent).toMatchObject({
      jobs: [],
      offset: 0,
      limit: 20,
      message: "No jobs are currently available for this role. Please check back later or try another search.",
    });
  });

  it("does not include the no-match message when jobs are found", async () => {
    const jobs = [{ id: "job-2", title: "Remote React Engineer" }];
    mockChain.range.mockResolvedValueOnce({ data: jobs, error: null });

    const result = await searchExploreJobsTool.handler(
      { query: "react" },
      makeCtx() as unknown as Parameters<typeof searchExploreJobsTool.handler>[1],
    );

    expect(result.structuredContent.jobs).toEqual(jobs);
    expect(result.structuredContent.message).toBeUndefined();
  });
});
