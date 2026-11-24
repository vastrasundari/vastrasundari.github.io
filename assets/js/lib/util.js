// Small shared helpers (ES module).

/** Escape text before inserting into HTML. Use for ALL dynamic values. */
export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export const qs = (k) => new URLSearchParams(location.search).get(k);

export const COLLECTIONS = {
  navratri: { label: "Navratri Collection", blurb: "Vibrant mirror work and bandhani made for nine nights of garba." },
  bridal:   { label: "Bridal Collection",   blurb: "Heirloom craftsmanship for the most cherished day." },
  festive:  { label: "Festive Collection",  blurb: "Graceful silhouettes for Diwali, weddings and every celebration." },
};

export const STATUS_LABEL = {
  order_received: "Order Received",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
export const PAYMENT_LABEL = { pending: "Pending", paid: "Paid" };

export const formatDate = (iso, withTime = true) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });

/** First image url for a product row with product_images embedded. */
export const primaryImage = (p) =>
  [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url || "";

/** Decorative stand-in shown only when a product has no photo yet. */
export const imageFallback = (name) => `
  <div class="vs-noimg" role="img" aria-label="${esc(name)}">
    <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2 23 17 38 20 23 23 20 38 17 23 2 20 17 17Z"/></svg>
  </div>`;

export function productCard(p) {
  const img = primaryImage(p);
  const inStock = (p.product_sizes || []).some((s) => s.stock > 0);
  return `
  <a href="product.html?slug=${encodeURIComponent(p.slug)}" class="vs-card group">
    <div class="vs-card__media">
      ${img ? `<img src="${esc(img)}" alt="${esc(p.name)}" loading="lazy">` : imageFallback(p.name)}
      ${p.is_new_arrival ? `<span class="vs-badge">New</span>` : ""}
      ${!inStock ? `<span class="vs-badge vs-badge--muted">Sold out</span>` : ""}
    </div>
    <div class="pt-4 text-center">
      <p class="text-[10.5px] uppercase tracking-[.22em] text-gold">${esc(COLLECTIONS[p.collection]?.label || "")}</p>
      <h3 class="mt-1 font-display text-lg leading-snug text-charcoal group-hover:text-maroon transition-colors">${esc(p.name)}</h3>
      <p class="mt-1 text-sm">
        <span class="font-medium text-burgundy">${inr(p.price)}</span>
        ${p.compare_at_price ? `<span class="ml-2 text-charcoal/45 line-through">${inr(p.compare_at_price)}</span>` : ""}
      </p>
    </div>
  </a>`;
}

export const PRODUCT_CARD_SELECT =
  "id, slug, name, collection, price, compare_at_price, is_new_arrival, is_featured, created_at, product_images(image_url, sort_order), product_sizes(stock)";
