// Shopping bag stored in localStorage. Prices here are for display only —
// the server recalculates everything from the database at checkout.
const KEY = "vs_cart_v1";
const ORDERS_KEY = "vs_orders_v1";

const read = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ }
};

export const getCart = () => read(KEY, []).filter((i) => i && i.sizeId && i.qty > 0);

function save(items) {
  write(KEY, items);
  window.dispatchEvent(new CustomEvent("cart:change", { detail: items }));
}

export const cartCount = () => getCart().reduce((n, i) => n + i.qty, 0);
export const cartSubtotal = () => getCart().reduce((n, i) => n + i.price * i.qty, 0);

/** item: {sizeId, productId, slug, name, size, price, image, qty, maxStock} */
export function addToCart(item) {
  const items = getCart();
  const existing = items.find((i) => i.sizeId === item.sizeId);
  const cap = Math.min(10, item.maxStock ?? 10);
  if (existing) existing.qty = Math.min(cap, existing.qty + item.qty);
  else items.push({ ...item, qty: Math.min(cap, item.qty) });
  save(items);
}

export function setQty(sizeId, qty) {
  const items = getCart();
  const it = items.find((i) => i.sizeId === sizeId);
  if (!it) return;
  it.qty = Math.max(1, Math.min(10, qty));
  save(items);
}

export const removeFromCart = (sizeId) => save(getCart().filter((i) => i.sizeId !== sizeId));
export const replaceCart = (items) => save(items);
export const clearCart = () => save([]);

// Orders placed on this device (order number + private access token) for "My Orders".
export const getSavedOrders = () => read(ORDERS_KEY, []);
export function saveOrder(order_number, token) {
  const list = getSavedOrders().filter((o) => o.order_number !== order_number);
  list.unshift({ order_number, token, at: new Date().toISOString() });
  write(ORDERS_KEY, list.slice(0, 20));
}

// Wishlist (product slugs) — device-local.
const WISH_KEY = "vs_wishlist_v1";
export const getWishlist = () => read(WISH_KEY, []);
export const inWishlist = (slug) => getWishlist().includes(slug);
export function toggleWishlist(slug) {
  const list = getWishlist();
  const next = list.includes(slug) ? list.filter((s) => s !== slug) : [slug, ...list];
  write(WISH_KEY, next);
  window.dispatchEvent(new CustomEvent("wishlist:change", { detail: next }));
  return next.includes(slug);
}
