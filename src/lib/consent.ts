export type ConsentCategories = {
  necessary: true; // always
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
};

export const CONSENT_STORAGE_KEY = "cookie_consent_v1";
export const CONSENT_EVENT = "cookie-consent-change";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const getConsent = (): ConsentCategories | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      necessary: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      functional: !!parsed.functional,
    };
  } catch {
    return null;
  }
};

export const hasConsentDecision = (): boolean => getConsent() !== null;

export const hasAnalyticsConsent = (): boolean => {
  const c = getConsent();
  return !!c?.analytics;
};

const applyToGtag = (c: ConsentCategories) => {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    ad_storage: c.marketing ? "granted" : "denied",
    ad_user_data: c.marketing ? "granted" : "denied",
    ad_personalization: c.marketing ? "granted" : "denied",
    analytics_storage: c.analytics ? "granted" : "denied",
    functionality_storage: c.functional ? "granted" : "denied",
    personalization_storage: c.functional ? "granted" : "denied",
  });
};

export const setConsent = (c: Omit<ConsentCategories, "necessary">) => {
  const full: ConsentCategories = { necessary: true, ...c };
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(full));
  } catch {}
  applyToGtag(full);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: full }));
};

export const acceptAll = () => setConsent({ analytics: true, marketing: true, functional: true });
export const rejectAll = () => setConsent({ analytics: false, marketing: false, functional: false });
