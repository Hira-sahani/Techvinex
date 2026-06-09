declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const GA_ID = "G-FVX99DJD8L";

export const isGtagAvailable = (): boolean => {
  return typeof window !== "undefined" && typeof window.gtag === "function";
};

export const trackPageView = (path: string, title?: string) => {
  if (!isGtagAvailable()) return;
  window.gtag!("event", "page_view", {
    page_location: `${window.location.origin}${path}`,
    page_path: path,
    page_title: title || document.title,
    send_to: GA_ID,
  });
};

export const trackEvent = (
  eventName: string,
  params?: Record<string, string | number | boolean>
) => {
  if (!isGtagAvailable()) return;
  window.gtag!("event", eventName, {
    ...params,
    send_to: GA_ID,
  });
};

export const initOutboundLinkTracking = () => {
  if (typeof window === "undefined") return () => {};

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a") as HTMLAnchorElement | null;
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href) return;

    // Skip javascript: / mailto: / tel: / anchor links
    if (
      href.startsWith("javascript:") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#")
    ) {
      return;
    }

    const isExternal =
      href.startsWith("http") && !href.includes(window.location.hostname);

    if (isExternal) {
      trackEvent("outbound_click", {
        link_url: href,
        link_text: anchor.innerText?.trim() || anchor.getAttribute("aria-label") || "",
        link_domain: new URL(href).hostname,
      });
    }
  };

  document.addEventListener("click", handleClick);

  return () => {
    document.removeEventListener("click", handleClick);
  };
};
