import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardStateCardProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
};

export const DashboardStateCard = ({
  title,
  description,
  icon: Icon = Inbox,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: DashboardStateCardProps) => (
  <div className={cn("rounded-xl border border-border bg-card p-8 sm:p-10 text-center animate-in fade-in-0 duration-200", className)}>
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Icon className="h-5 w-5" />
    </div>
    <h2 className="text-base font-semibold text-foreground">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
    {(actionLabel || secondaryActionLabel) && (
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {actionLabel && onAction && (
          <Button size="sm" onClick={onAction} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button size="sm" variant="outline" onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    )}
  </div>
);

export const DashboardErrorState = ({
  title = "Failed to load dashboard",
  description = "Something went wrong while loading the latest data. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) => (
  <DashboardStateCard
    icon={AlertCircle}
    title={title}
    description={description}
    actionLabel={onRetry ? "Try again" : undefined}
    onAction={onRetry}
    className={className}
  />
);

export const DashboardEmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}) => (
  <DashboardStateCard
    icon={Inbox}
    title={title}
    description={description}
    actionLabel={actionLabel}
    onAction={onAction}
    secondaryActionLabel={secondaryActionLabel}
    onSecondaryAction={onSecondaryAction}
    className={className}
  />
);
