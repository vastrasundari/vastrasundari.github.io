// Builds sitemap.xml from the static pages plus every live product.
// Usage: npm run sitemap   (then commit and push sitemap.xml)
import fs from "node:fs";

const SITE = "https://vastrasundari.duckdns.org";
const cfg = fs.readFileSync(new URL("../assets/js/config.js", import.meta.url), "utf8");
const pick = (k) => (cfg.match(new RegExp(`${k}:\\s*"([^"]*)"`)) || [])[1] || "";
const url = pick("SUPABASE_URL"), key = pick("SUPABASE_ANON_KEY");

const today = new Date().toISOString().slice(0, 10);
const pages = [
  ["", "daily", "1.0"],
  ["shop.html", "daily", "0.9"],
  ["shop.html?collection=navratri", "weekly", "0.9"],
  ["shop.html?collection=bridal", "weekly", "0.9"],
  ["shop.html?collection=festive", "weekly", "0.9"],
  ["shop.html?new=1", "daily", "0.8"],
].map(([p, f, pr]) => ({ loc: `${SITE}/${p}`, lastmod: today, changefreq: f, priority: pr }));

let products = [];
if (url && key) {
  const res = await fetch(`${url}/rest/v1/products?select=slug,updated_at,product_images(image_url)&is_active=eq.true&order=created_at.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  products = await res.json();
}
for (const p of products) {
  pages.push({
    loc: `${SITE}/product.html?slug=${encodeURIComponent(p.slug)}`,
    lastmod: (p.updated_at || today).slice(0, 10), changefreq: "weekly", priority: "0.7",
    images: (p.product_images || []).map((i) => i.image_url),
  });
}

const x = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${pages.map((p) => `  <url>
    <loc>${x(p.loc)}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>${(p.images || []).map((i) => `
    <image:image><image:loc>${x(i)}</image:loc></image:image>`).join("")}
  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(new URL("../sitemap.xml", import.meta.url), xml);
console.log(`sitemap.xml: ${pages.length} URLs (${products.length} products)`);
