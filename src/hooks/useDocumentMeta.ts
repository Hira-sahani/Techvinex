import { useEffect } from "react";

interface DocumentMetaOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
  /** JSON-LD structured data object(s). Injected as <script type="application/ld+json"> tags. */
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
  /** If true, adds <meta name="robots" content="noindex,nofollow">. */
  noindex?: boolean;
}

const setMeta = (property: string, content: string, isName = false) => {
  const attr = isName ? "name" : "property";
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const JSONLD_DATA_ATTR = "data-managed-jsonld";

const useDocumentMeta = ({ title, description, image, url, type = "website", author, jsonLd, noindex }: DocumentMetaOptions) => {
  useEffect(() => {
    const prevTitle = document.title;

    if (title) {
      const fullTitle = title.includes("Techvinex") ? title : `${title} | Techvinex`;
      document.title = fullTitle;
      setMeta("og:title", fullTitle);
      setMeta("twitter:title", fullTitle, true);
    }

    if (description) {
      setMeta("description", description, true);
      setMeta("og:description", description);
      setMeta("twitter:description", description, true);
    }

    if (image) {
      setMeta("og:image", image);
      setMeta("twitter:image", image, true);
    }

    const absoluteUrl = url
      ? (url.startsWith("http") ? url : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`)
      : `${window.location.origin}${window.location.pathname}`;
    setMeta("og:url", absoluteUrl);
    const link = (document.querySelector('link[rel="canonical"]') as HTMLLinkElement)
      || (() => { const l = document.createElement("link"); l.rel = "canonical"; document.head.appendChild(l); return l; })();
    link.href = absoluteUrl;

    setMeta("og:type", type);
    setMeta("twitter:card", "summary_large_image", true);

    if (author) setMeta("article:author", author);

    // robots
    if (noindex) {
      let robots = document.querySelector('meta[name="robots"][data-managed="1"]') as HTMLMetaElement | null;
      if (!robots) {
        robots = document.createElement("meta");
        robots.setAttribute("name", "robots");
        robots.setAttribute("data-managed", "1");
        document.head.appendChild(robots);
      }
      robots.setAttribute("content", "noindex,nofollow");
    }

    // JSON-LD injection (replaces previous managed scripts on each render)
    const existing = document.head.querySelectorAll(`script[type="application/ld+json"][${JSONLD_DATA_ATTR}]`);
    existing.forEach((n) => n.remove());
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach((obj) => {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.setAttribute(JSONLD_DATA_ATTR, "1");
        s.text = JSON.stringify(obj);
        document.head.appendChild(s);
      });
    }

    return () => {
      document.title = prevTitle;
      const managed = document.head.querySelectorAll(`script[type="application/ld+json"][${JSONLD_DATA_ATTR}]`);
      managed.forEach((n) => n.remove());
      const robots = document.querySelector('meta[name="robots"][data-managed="1"]');
      if (robots) robots.remove();
    };
  }, [title, description, image, url, type, author, JSON.stringify(jsonLd), noindex]);
};

export default useDocumentMeta;
