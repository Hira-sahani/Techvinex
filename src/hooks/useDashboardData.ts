import { useCallback, useEffect, useRef, useState } from "react";
import { useMinimumLoading } from "./useMinimumLoading";

export type DashboardStatus = "idle" | "loading" | "success" | "error" | "empty";

export type UseDashboardDataOptions<T> = {
  /** Async fetcher invoked on mount and on refetch(). */
  fetcher: () => Promise<T>;
  /** Re-run fetcher when any of these values change. */
  deps?: ReadonlyArray<unknown>;
  /** Returns true when the fetched data should be treated as "empty". */
  isEmpty?: (data: T) => boolean;
  /** Minimum time skeletons stay visible to avoid flicker. */
  minLoadingMs?: number;
  /** Skip fetching (e.g. waiting for auth). isLoading stays true. */
  enabled?: boolean;
  /** Optional callbacks. */
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

export type UseDashboardDataResult<T> = {
  data: T | null;
  error: Error | null;
  status: DashboardStatus;
  /** Gated through useMinimumLoading — use this to render skeletons. */
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
};

/**
 * Common loading/error/empty gate for dashboard data fetches.
 * Standardizes status handling and skeleton minimum duration across pages.
 */
export function useDashboardData<T>({
  fetcher,
  deps = [],
  isEmpty,
  minLoadingMs = 650,
  enabled = true,
  onSuccess,
  onError,
}: UseDashboardDataOptions<T>): UseDashboardDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [rawLoading, setRawLoading] = useState<boolean>(enabled);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    setRawLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(result);
      onSuccess?.(result);
    } catch (err) {
      if (!mountedRef.current) return;
      const normalized =
        err instanceof Error
          ? err
          : new Error(
              (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string"
                ? (err as any).message
                : typeof err === "string"
                  ? err
                  : "Something went wrong. Please try again.")
            );
      setError(normalized);
      onError?.(normalized);
    } finally {
      if (mountedRef.current) setRawLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onError, onSuccess]);

  useEffect(() => {
    if (!enabled) {
      setRawLoading(true);
      return;
    }
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, run, ...deps]);

  const isLoading = useMinimumLoading(rawLoading, minLoadingMs);
  const empty = !isLoading && !error && data !== null && (isEmpty?.(data) ?? false);

  let status: DashboardStatus = "idle";
  if (isLoading) status = "loading";
  else if (error) status = "error";
  else if (empty) status = "empty";
  else if (data !== null) status = "success";

  return {
    data,
    error,
    status,
    isLoading,
    isError: !isLoading && !!error,
    isEmpty: empty,
    isSuccess: status === "success",
    refetch: run,
  };
}
