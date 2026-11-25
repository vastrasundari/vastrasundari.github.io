// Product data for the storefront components (kept apart from the UI code).
import { sb, isConfigured } from "./supabase.js";

const SHOWCASE_SELECT = `id, slug, name, description, collection, fabric, craft, price, compare_at_price,
  is_featured, is_new_arrival, created_at,
  product_images(image_url, alt_text, sort_order), product_sizes(id, size_label, stock, sort_order)`;

/** Normalises a product row: sorted images/sizes and a display badge. */
export function normalizeProduct(p) {
  const price = Number(p.price);
  const compare = p.compare_at_price ? Number(p.compare_at_price) : null;
  return {
    ...p,
    price,
    compare_at_price: compare,
    discount: compare && compare > price ? Math.round((1 - price / compare) * 100) : 0,
    badge: p.is_featured ? "Bestseller" : p.is_new_arrival ? "New Arrival" : "",
    images: [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order),
    sizes: [...(p.product_sizes || [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}

/** Live products for the home page showcase: bestsellers first, then newest. */
export async function fetchShowcaseProducts(limit = 14) {
  if (!isConfigured) return [];
  const { data, error } = await sb.from("products").select(SHOWCASE_SELECT)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data.map(normalizeProduct);
}
