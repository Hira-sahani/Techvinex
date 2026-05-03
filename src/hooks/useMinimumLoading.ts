import { useEffect, useRef, useState } from "react";

/**
 * Keeps loading UI visible for a minimum duration to prevent flicker
 * on very fast responses and make transitions feel deliberate.
 */
export const useMinimumLoading = (isLoading: boolean, minDuration = 650) => {
  const [showLoading, setShowLoading] = useState(isLoading);
  const startedAtRef = useRef<number | null>(isLoading ? Date.now() : null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (isLoading) {
      startedAtRef.current = Date.now();
      setShowLoading(true);
      return;
    }

    if (!showLoading) return;

    const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : minDuration;
    const remaining = Math.max(0, minDuration - elapsed);

    timeoutRef.current = window.setTimeout(() => {
      setShowLoading(false);
      timeoutRef.current = null;
    }, remaining);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isLoading, minDuration, showLoading]);

  return showLoading;
};
