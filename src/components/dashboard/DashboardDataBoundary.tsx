import type { ReactNode } from "react";
import { DashboardEmptyState, DashboardErrorState } from "./DashboardStates";
import type { UseDashboardDataResult } from "@/hooks/useDashboardData";

type EmptyConfig = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
};

type ErrorConfig = {
  title?: string;
  description?: string;
};

type Props<T> = {
  query: UseDashboardDataResult<T>;
  skeleton: ReactNode;
  empty?: EmptyConfig;
  errorConfig?: ErrorConfig;
  children: (data: T) => ReactNode;
};

/**
 * Renders the right UI for a dashboard data query:
 * skeleton -> error -> empty -> content. Keeps gating consistent across pages.
 */
export function DashboardDataBoundary<T>({
  query,
  skeleton,
  empty,
  errorConfig,
  children,
}: Props<T>) {
  if (query.isLoading) return <>{skeleton}</>;

  if (query.isError) {
    return (
      <DashboardErrorState
        title={errorConfig?.title}
        description={errorConfig?.description ?? query.error?.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.isEmpty && empty) {
    return (
      <DashboardEmptyState
        title={empty.title}
        description={empty.description}
        actionLabel={empty.actionLabel}
        onAction={empty.onAction}
        secondaryActionLabel={empty.secondaryActionLabel}
        onSecondaryAction={empty.onSecondaryAction}
      />
    );
  }

  if (query.data !== null) return <>{children(query.data)}</>;

  return <>{skeleton}</>;
}
