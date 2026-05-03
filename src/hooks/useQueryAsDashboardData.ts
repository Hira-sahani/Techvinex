import { useMemo } from "react";
import { useMinimumLoading } from "./useMinimumLoading";
import type { UseDashboardDataResult, DashboardStatus } from "./useDashboardData";

/**
 * Adapts a react-query-like result into the UseDashboardDataResult shape so
 * pages already using react-query can flow through DashboardDataBoundary.
 */
type QueryLike<T> = {
  data: T | undefined;
  error: unknown;
  isLoading: boolean;
  isFetching?: boolean;
  refetch: () => Promise<unknown>;
};

export function useQueryAsDashboardData<T>(
  query: QueryLike<T>,
  opts: { isEmpty?: (data: T) => boolean; minLoadingMs?: number } = {},
): UseDashboardDataResult<T> {
  const raw = query.isLoading || (query.isFetching && query.data === undefined);
  const isLoading = useMinimumLoading(raw, opts.minLoadingMs ?? 650);

  return useMemo(() => {
    const error =
      query.error instanceof Error ? query.error : query.error ? new Error(String(query.error)) : null;
    const data = (query.data ?? null) as T | null;
    const empty = !isLoading && !error && data !== null && (opts.isEmpty?.(data) ?? false);

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
      refetch: async () => {
        await query.refetch();
      },
    };
  }, [isLoading, query, opts]);
}
