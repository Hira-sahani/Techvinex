import { useEffect } from "react";

interface DocumentMetaOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  author?: string;
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

const useDocumentMeta = ({ title, description, image, url, type = "website", author }: DocumentMetaOptions) => {
  useEffect(() => {
    const prevTitle = document.title;

    if (title) {
      const fullTitle = `${title} | Atlas Blog`;
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

    if (url) {
      setMeta("og:url", url);
      const link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
        || (() => { const l = document.createElement("link"); l.rel = "canonical"; document.head.appendChild(l); return l; })();
      link.href = url;
    }

    setMeta("og:type", type);
    setMeta("twitter:card", "summary_large_image", true);

    if (author) {
      setMeta("article:author", author);
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, description, image, url, type, author]);
};

export default useDocumentMeta;
