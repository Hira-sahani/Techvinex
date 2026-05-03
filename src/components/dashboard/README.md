# Dashboard Loading System

Common gate for all dashboards: `useDashboardData` (fetch + state) + `DashboardDataBoundary` (render skeleton/error/empty/content).

## `useDashboardData`

Wraps an async fetcher and returns a normalized query result.

### Signature

```ts
useDashboardData<T>({
  fetcher: () => Promise<T>,
  isEmpty?: (data: T) => boolean,   // default: null/[]/{} → empty
  enabled?: boolean,                 // default: true
  minDuration?: number,              // default: 650 (ms) — flicker guard
  deps?: unknown[],                  // re-fetch triggers
}): {
  data: T | null,
  status: "idle" | "loading" | "success" | "error" | "empty",
  isLoading, isError, isEmpty, isSuccess,
  error: Error | null,
  refetch: () => Promise<void>,
}
```

### Defaults

- **Min duration**: 650 ms (range 500–800 ms recommended) — prevents skeleton flash on fast responses.
- **Empty detection**: `null`, `[]`, `{}` are treated as empty.
- **Auto-fetch**: runs on mount when `enabled !== false`; re-runs when `deps` change.
- **Errors**: caught and exposed via `error`; component stays mounted (no layout shift).

### Example

```tsx
const stats = useDashboardData({
  fetcher: async () => {
    const { data, error } = await supabase.from("jobs").select("*");
    if (error) throw error;
    return data;
  },
  isEmpty: (rows) => rows.length === 0,
  deps: [userId],
});
```

## `DashboardDataBoundary`

Declarative wrapper that renders the right state for a query.

### Signature

```tsx
<DashboardDataBoundary
  query={query}                     // from useDashboardData
  skeleton={<MySkeleton />}         // shown while loading
  empty={{                          // optional — shown when isEmpty
    title, description,
    actionLabel?, onAction?,
    secondaryActionLabel?, onSecondaryAction?,
  }}
  errorConfig={{ title?, description? }}  // optional overrides
>
  {(data) => <Content data={data} />}
</DashboardDataBoundary>
```

### Render priority

1. `isLoading` → `skeleton`
2. `isError` → `<DashboardErrorState>` with retry → `query.refetch()`
3. `isEmpty` + `empty` provided → `<DashboardEmptyState>`
4. `data` present → `children(data)`
5. fallback → `skeleton`

### Example

```tsx
const query = useDashboardData({ fetcher: fetchJobs, isEmpty: (j) => j.length === 0 });

<DashboardDataBoundary
  query={query}
  skeleton={<EmployerDashboardSkeleton statCount={4} />}
  empty={{
    title: "No requirements yet",
    description: "Create your first requirement to start matching candidates.",
    actionLabel: "Create requirement",
    onAction: () => navigate("/employer/requirements"),
  }}
>
  {(jobs) => <JobsGrid jobs={jobs} />}
</DashboardDataBoundary>
```

## Per-dashboard skeletons

All skeletons in `@/components/skeletons/DashboardSkeletons` accept layout props (`statCount`, `statCols`, `listRows`, `chartHeight`, `extraSlot`, `className`) so each page customizes its layout while sharing the same gate.

## Notes

- Use one boundary per logical data section; don't gate the whole page on multiple unrelated fetches unless they truly belong together.
- For multi-source pages (like `EmployerDashboard`), combine `isLoading` flags into `useMinimumLoading(loading, 650)` and render the skeleton manually — the boundary is best for single-source queries.
- Theme-aware via semantic tokens; respects `prefers-reduced-motion`.
