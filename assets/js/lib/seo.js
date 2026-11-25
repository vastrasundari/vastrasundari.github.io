// Search-engine helpers for pages whose content is loaded with JavaScript
// (product and collection pages). Google renders JS, so these tags are indexed.
export const SITE = "https://vastrasundari.duckdns.org";
export const BRAND = "Vastra Sundari";
export const CITY = "Jamnagar";

function tag(selector, create) {
  let el = document.head.querySelector(selector);
  if (!el) { el = create(); document.head.appendChild(el); }
  return el;
}
const meta = (attr, key, content) => {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

/** Sets title, description, canonical URL and social-sharing tags. */
export function setPageMeta({ title, description, path, image, type = "website" }) {
  if (title) document.title = title;
  const url = SITE + "/" + String(path || "").replace(/^\//, "");
  meta("name", "description", description);
  tag('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" })).href = url;
  meta("property", "og:title", title);
  meta("property", "og:description", description);
  meta("property", "og:url", url);
  meta("property", "og:type", type);
  if (image) meta("property", "og:image", image);
  meta("name", "twitter:title", title);
  meta("name", "twitter:description", description);
  if (image) meta("name", "twitter:image", image);
}

/** Adds (or replaces) a JSON-LD structured-data block. */
export function setJsonLd(id, data) {
  const el = tag(`script[type="application/ld+json"][data-id="${id}"]`, () => {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.dataset.id = id;
    return s;
  });
  el.textContent = JSON.stringify(data);
}

/** Plain-text excerpt for meta descriptions. */
export const excerpt = (s, n = 155) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t;
};
