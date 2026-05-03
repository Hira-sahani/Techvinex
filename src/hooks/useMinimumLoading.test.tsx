import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useMinimumLoading } from "./useMinimumLoading";

describe("useMinimumLoading", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps loading visible for the minimum duration after fast responses", () => {
    const { result, rerender } = renderHook(({ loading }) => useMinimumLoading(loading, 650), {
      initialProps: { loading: true },
    });

    expect(result.current).toBe(true);

    rerender({ loading: false });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(649);
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe(false);
  });
});
