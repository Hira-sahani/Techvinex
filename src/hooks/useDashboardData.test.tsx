import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDashboardData } from "./useDashboardData";

describe("useDashboardData", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("transitions loading -> success", async () => {
    const fetcher = vi.fn().mockResolvedValue({ rows: [1, 2] });
    const { result } = renderHook(() =>
      useDashboardData({ fetcher, minLoadingMs: 0 }),
    );

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ rows: [1, 2] });
  });

  it("flags empty results", async () => {
    const fetcher = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(() =>
      useDashboardData<number[]>({
        fetcher,
        minLoadingMs: 0,
        isEmpty: (d) => d.length === 0,
      }),
    );
    await waitFor(() => expect(result.current.status).toBe("empty"));
    expect(result.current.isEmpty).toBe(true);
  });

  it("captures errors and supports refetch", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() =>
      useDashboardData({ fetcher, minLoadingMs: 0 }),
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("boom");

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.isSuccess).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
