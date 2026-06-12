/**
 * Centralized Realtime bus.
 *
 * Multiplexes every postgres_changes subscription in the app onto at most
 * TWO shared Supabase channels per browser tab:
 *
 *   1. `realtime:global`            — tables with no per-user filter
 *   2. `realtime:user:<auth-uid>`   — tables filtered by the current user
 *
 * Before this module, each hook/page opened its own channel (7+ channels per
 * authenticated session). With multiplexing we cap at 2, which raises the
 * effective concurrent-user ceiling against Supabase Realtime's ~500
 * concurrent-channel soft cap by ~3-4x.
 *
 * Subscribers register a small descriptor; the bus rebuilds the underlying
 * channel (debounced 50 ms) whenever the descriptor set changes, then
 * dispatches every event to all matching handlers.
 *
 * Handlers MUST be cheap (queryClient.invalidateQueries / setQueryData).
 * Use `debouncedInvalidate` from this module for bursty tables.
 */
import {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type ChangeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

export interface RealtimeSubscription {
  /** Public-schema table name. */
  table: string;
  /** Postgres-changes filter, e.g. `user_id=eq.<uid>`. */
  filter?: string;
  /** Defaults to "*". */
  event?: ChangeEvent;
  /** "user" if `filter` references the current auth user; otherwise "global". */
  scope?: "global" | "user";
  /** Invoked for every matching change event. */
  handler: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

interface ChannelState {
  channel: RealtimeChannel | null;
  subs: Set<RealtimeSubscription>;
  rebuildTimer: ReturnType<typeof setTimeout> | null;
}

const channels: Record<"global" | "user", ChannelState> = {
  global: { channel: null, subs: new Set(), rebuildTimer: null },
  user: { channel: null, subs: new Set(), rebuildTimer: null },
};

let currentUserId: string | null = null;

function channelName(scope: "global" | "user"): string {
  return scope === "global" ? "realtime:global" : `realtime:user:${currentUserId ?? "anon"}`;
}

function rebuild(scope: "global" | "user") {
  const state = channels[scope];
  if (state.rebuildTimer) clearTimeout(state.rebuildTimer);
  state.rebuildTimer = setTimeout(() => {
    state.rebuildTimer = null;
    // Tear down old channel
    if (state.channel) {
      void supabase.removeChannel(state.channel);
      state.channel = null;
    }
    if (state.subs.size === 0) return;
    if (scope === "user" && !currentUserId) return;

    let ch = supabase.channel(channelName(scope));
    for (const sub of state.subs) {
      ch = ch.on(
        "postgres_changes" as never,
        {
          event: sub.event ?? "*",
          schema: "public",
          table: sub.table,
          ...(sub.filter ? { filter: sub.filter } : {}),
        } as never,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          try {
            sub.handler(payload);
          } catch (err) {
            // Never let a subscriber crash the bus.
            console.error("[realtimeBus] subscriber error:", err);
          }
        },
      );
    }
    ch.subscribe();
    state.channel = ch;
  }, 50);
}

/**
 * Register a subscription. Returns an unsubscribe function.
 * Safe to call before the auth user is known — user-scope subs will activate
 * once `setRealtimeUser` is called with a uid.
 */
export function subscribeRealtime(sub: RealtimeSubscription): () => void {
  const scope = sub.scope ?? (sub.filter?.includes("user_id=eq.") ? "user" : "global");
  const state = channels[scope];
  state.subs.add(sub);
  rebuild(scope);
  return () => {
    state.subs.delete(sub);
    rebuild(scope);
  };
}

/**
 * Called by AuthContext when the auth user changes. Rebuilds the user-scope
 * channel under the new identifier and tears it down on sign-out.
 */
export function setRealtimeUser(userId: string | null) {
  if (currentUserId === userId) return;
  currentUserId = userId;
  rebuild("user");
}

/** Debounced query invalidation helper (use inside handlers). */
export function debouncedInvalidate<T extends () => void>(
  fn: T,
  delayMs = 250,
): T {
  let t: ReturnType<typeof setTimeout> | null = null;
  return ((..._args: unknown[]) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn();
    }, delayMs);
  }) as T;
}

/** Diagnostics — exposed for tests / dev tools. */
export function _realtimeStats() {
  return {
    globalSubs: channels.global.subs.size,
    userSubs: channels.user.subs.size,
    activeChannels:
      (channels.global.channel ? 1 : 0) + (channels.user.channel ? 1 : 0),
    userId: currentUserId,
  };
}
