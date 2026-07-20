import { describe, it, expect, vi } from "vitest";
import type { ToolHandlerResult } from "@lovable.dev/mcp-js";
import listExploreJobsTool from "./list-explore-jobs";
import searchExploreJobsTool from "./search-explore-jobs";

const { mockChain } = vi.hoisted(() => {
  let nextResult: { data: unknown; error: null } = { data: [], error: null };
  const self: Record<string, unknown> = {
    setResult: (r: unknown) => {
      nextResult = { data: r, error: null };
    },
  };
  const chain = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (onResolved: (v: unknown) => unknown, onRejected: (e: unknown) => unknown) =>
            Promise.resolve(nextResult).then(onResolved, onRejected);
        }
        if (prop === "setResult") {
          return self.setResult;
        }
        return () => chain;
      },
    },
  );
  return { mockChain: chain as typeof chain & { setResult: (r: unknown) => void } };
});

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

function textContent(result: ToolHandlerResult) {
  const block = result.content?.[0];
  return block && "text" in block ? (block as { text: string }).text : undefined;
}

describe("list_explore_jobs empty result", () => {
  it("returns success with empty jobs array and a helpful message", async () => {
    mockChain.setResult([]);

    const result = await listExploreJobsTool.handler(
      { search: "nonexistent-role" } as unknown as Parameters<typeof listExploreJobsTool.handler>[0],
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
    mockChain.setResult(jobs);

    const result = await listExploreJobsTool.handler(
      { search: "found" } as unknown as Parameters<typeof listExploreJobsTool.handler>[0],
      makeCtx() as unknown as Parameters<typeof listExploreJobsTool.handler>[1],
    );

    expect(result.structuredContent?.jobs).toEqual(jobs);
    expect(result.structuredContent?.message).toBeUndefined();
  });
});

describe("search_explore_jobs empty result", () => {
  it("returns success with empty jobs array and a helpful message for 'react remote'", async () => {
    mockChain.setResult([]);

    const result = await searchExploreJobsTool.handler(
      { query: "react", location: "remote" } as unknown as Parameters<typeof searchExploreJobsTool.handler>[0],
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
    mockChain.setResult(jobs);

    const result = await searchExploreJobsTool.handler(
      { query: "react" } as unknown as Parameters<typeof searchExploreJobsTool.handler>[0],
      makeCtx() as unknown as Parameters<typeof searchExploreJobsTool.handler>[1],
    );

    expect(result.structuredContent?.jobs).toEqual(jobs);
    expect(result.structuredContent?.message).toBeUndefined();
  });
});
