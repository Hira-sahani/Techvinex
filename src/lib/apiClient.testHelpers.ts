import { expect } from "vitest";
import {
  onSessionExpired,
  getRecentUnauthorizedEvents,
  type SessionExpiredEvent,
  type UnauthorizedEvent,
} from "./apiClient";

/**
 * Test helper that captures session-expired bus emissions and offers
 * convenience assertions for the unauthorized telemetry ring buffer.
 *
 * Usage:
 *   let capture: UnauthorizedCapture;
 *   beforeEach(() => { capture = createUnauthorizedCapture(); });
 *   afterEach(() => capture.dispose());
 *
 *   // ... run apiFetch calls ...
 *
 *   capture.expectNoBusEmissions();
 *   capture.expectAllRetryAttemptedFalse();
 */
export interface UnauthorizedCapture {
  /** Bus events captured since the helper was created. */
  readonly busEvents: ReadonlyArray<SessionExpiredEvent>;

  /** Telemetry events recorded since the helper was created (slice of ring). */
  newTelemetryEvents(): UnauthorizedEvent[];

  /** Subset of telemetry events whose endpoint includes the given substring. */
  telemetryFor(substring: string): UnauthorizedEvent[];

  /** Subset of bus events whose endpoint includes the given substring. */
  busFor(substring: string): SessionExpiredEvent[];

  /** Drain microtasks so void-handled unauthorized handlers can finish. */
  drain(ticks?: number): Promise<void>;

  // ---- Counts ----

  /** Map of endpoint -> count of telemetry events for that endpoint. */
  telemetryCountsByEndpoint(): Record<string, number>;

  /** Map of endpoint -> count of bus events for that endpoint. */
  busCountsByEndpoint(): Record<string, number>;

  /**
   * Counts of telemetry events bucketed by retryAttempted value.
   * Returns { true: number, false: number }.
   */
  telemetryCountsByRetryAttempted(): { true: number; false: number };

  /**
   * Count of telemetry events with retryAttempted === value, optionally
   * filtered by an endpoint substring.
   */
  countRetryAttempted(value: boolean, endpointSubstring?: string): number;

  /** Total telemetry events captured. */
  totalTelemetry(): number;

  /** Total bus events captured. */
  totalBus(): number;

  // ---- Assertions ----

  /** Assert NO bus events were emitted at all. */
  expectNoBusEmissions(): void;

  /**
   * Assert no bus event references the given endpoint substring (e.g. assert
   * 500-routed URLs never appear on the session-expired bus).
   */
  expectNoBusEmissionsFor(substring: string): void;

  /** Assert every captured telemetry event has retryAttempted === false. */
  expectAllRetryAttemptedFalse(): void;

  /**
   * Assert every telemetry event whose endpoint includes the substring has
   * retryAttempted === false.
   */
  expectRetryAttemptedFalseFor(substring: string): void;

  /** Assert the count of telemetry events with retryAttempted=true equals 0. */
  expectRetryAttemptedCounterZero(): void;

  /** Cleanup — unsubscribe the bus listener. Idempotent. */
  dispose(): void;
}

export function createUnauthorizedCapture(): UnauthorizedCapture {
  const bus: SessionExpiredEvent[] = [];
  const baseline = getRecentUnauthorizedEvents().length;
  const unsubscribe = onSessionExpired((e) => bus.push(e));
  let disposed = false;

  const newTelemetryEvents = () =>
    getRecentUnauthorizedEvents().slice(baseline) as UnauthorizedEvent[];

  return {
    get busEvents() {
      return bus;
    },
    newTelemetryEvents,
    telemetryFor: (substring) =>
      newTelemetryEvents().filter((e) => e.endpoint.includes(substring)),
    busFor: (substring) => bus.filter((e) => e.endpoint.includes(substring)),

    async drain(ticks = 4) {
      for (let i = 0; i < ticks; i++) await Promise.resolve();
    },

    telemetryCountsByEndpoint() {
      const out: Record<string, number> = {};
      for (const e of newTelemetryEvents()) {
        out[e.endpoint] = (out[e.endpoint] ?? 0) + 1;
      }
      return out;
    },

    busCountsByEndpoint() {
      const out: Record<string, number> = {};
      for (const e of bus) {
        out[e.endpoint] = (out[e.endpoint] ?? 0) + 1;
      }
      return out;
    },

    telemetryCountsByRetryAttempted() {
      const out = { true: 0, false: 0 };
      for (const e of newTelemetryEvents()) {
        if (e.retryAttempted) out.true += 1;
        else out.false += 1;
      }
      return out;
    },

    countRetryAttempted(value, endpointSubstring) {
      return newTelemetryEvents().filter(
        (e) =>
          e.retryAttempted === value &&
          (endpointSubstring === undefined ||
            e.endpoint.includes(endpointSubstring)),
      ).length;
    },

    totalTelemetry() {
      return newTelemetryEvents().length;
    },

    totalBus() {
      return bus.length;
    },

    expectNoBusEmissions() {
      expect(bus, "expected no session-expired bus emissions").toHaveLength(0);
    },

    expectNoBusEmissionsFor(substring) {
      const matching = bus.filter((e) => e.endpoint.includes(substring));
      expect(
        matching,
        `expected no bus emissions for endpoint containing "${substring}"`,
      ).toHaveLength(0);
    },

    expectAllRetryAttemptedFalse() {
      const events = newTelemetryEvents();
      for (const ev of events) {
        expect(
          ev.retryAttempted,
          `event for ${ev.endpoint} (reason=${ev.reason}) should have retryAttempted=false`,
        ).toBe(false);
      }
    },

    expectRetryAttemptedFalseFor(substring) {
      const events = newTelemetryEvents().filter((e) =>
        e.endpoint.includes(substring),
      );
      for (const ev of events) {
        expect(
          ev.retryAttempted,
          `event for ${ev.endpoint} (reason=${ev.reason}) should have retryAttempted=false`,
        ).toBe(false);
      }
    },

    expectRetryAttemptedCounterZero() {
      const count = newTelemetryEvents().filter((e) => e.retryAttempted).length;
      expect(
        count,
        "expected zero telemetry events with retryAttempted=true",
      ).toBe(0);
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
    },
  };
}
