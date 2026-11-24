// Product catalogue management (admins write directly through RLS-protected tables).
import { sb } from "../../assets/js/lib/supabase.js";
import { esc, inr, COLLECTIONS } from "../../assets/js/lib/util.js";
import { toast } from "./app.js";

const BUCKET = "product-images";
const DEFAULT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const slugify = (s) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120);

// ============================================================== LIST
export async function renderProducts(view) {
  const { data, error } = await sb.from("products")
    .select("id, slug, name, collection, price, is_active, is_featured, is_new_arrival, created_at, product_images(image_url, sort_order), product_sizes(size_label, stock)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  view.innerHTML = `
    <div class="mb-6 flex items-end justify-between gap-4">
      <div><h1 class="font-display text-2xl text-burgundy">Products</h1>
        <p class="text-sm text-charcoal/60">${data.length} Chaniya Choli design${data.length === 1 ? "" : "s"}</p></div>
      <a href="#/products/new" class="ad-btn ad-btn--primary">+ Add product</a>
    </div>
    <div class="ad-card overflow-hidden">
      ${data.length ? `<div class="overflow-x-auto"><table class="w-full min-w-[720px]">
        <thead class="bg-ivory/60"><tr><th class="ad-th">Product</th><th class="ad-th">Collection</th><th class="ad-th text-right">Price</th>
          <th class="ad-th">Stock by size</th><th class="ad-th">Status</th></tr></thead>
        <tbody class="divide-y divide-charcoal/5">
          ${data.map((p) => {
            const img = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
            const total = p.product_sizes.reduce((n, s) => n + s.stock, 0);
            return `<tr class="cursor-pointer hover:bg-ivory/50" data-href="#/products/${p.id}">
              <td class="ad-td"><div class="flex items-center gap-3">
                ${img ? `<img src="${esc(img)}" alt="" class="h-14 w-11 rounded object-cover">` : `<div class="h-14 w-11 rounded bg-burgundy/10"></div>`}
                <div><a href="#/products/${p.id}" class="font-medium hover:text-burgundy">${esc(p.name)}</a>
                <p class="text-xs text-charcoal/50">${esc(p.slug)}</p></div></div></td>
              <td class="ad-td">${esc(COLLECTIONS[p.collection]?.label || p.collection)}</td>
              <td class="ad-td text-right">${inr(p.price)}</td>
              <td class="ad-td text-xs">${p.product_sizes.length ? p.product_sizes.map((s) =>
                `<span class="mr-1 inline-block rounded px-1.5 py-0.5 ${s.stock ? "bg-charcoal/5" : "bg-red-50 text-red-700"}">${esc(s.size_label)}: ${s.stock}</span>`).join("") : "—"}
                <p class="mt-1 text-charcoal/50">Total ${total}</p></td>
              <td class="ad-td">${p.is_active ? `<span class="ad-pill bg-green-100 text-green-800">Live</span>` : `<span class="ad-pill bg-charcoal/10 text-charcoal/70">Hidden</span>`}
                ${p.is_new_arrival ? `<span class="ad-pill bg-gold/20 text-burgundy">New</span>` : ""}</td></tr>`;
          }).join("")}
        </tbody></table></div>`
      : `<div class="p-10 text-center"><p class="text-sm text-charcoal/60">No products yet.</p>
          <a href="#/products/new" class="ad-btn ad-btn--primary mt-4">Add your first Chaniya Choli</a></div>`}
    </div>`;
  view.querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", (e) => {
    if (!e.target.closest("a")) location.hash = tr.dataset.href;
  }));
}

// ============================================================== EDITOR
export async function renderProductEditor(view, id) {
  let p = {
    name: "", slug: "", description: "", collection: "navratri", fabric: "", craft: "", color: "",
    price: "", compare_at_price: "", is_active: true, is_featured: false, is_new_arrival: true,
    product_images: [], product_sizes: DEFAULT_SIZES.map((l, i) => ({ size_label: l, stock: 0, sort_order: i })),
  };
  if (id) {
    const { data, error } = await sb.from("products")
      .select("*, product_images(*), product_sizes(*)").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) { view.innerHTML = `<div class="ad-card p-6">Product not found.</div>`; return; }
    p = data;
  }
  const images = [...p.product_images].sort((a, b) => a.sort_order - b.sort_order);
  let sizes = [...p.product_sizes].sort((a, b) => a.sort_order - b.sort_order);

  view.innerHTML = `
    <a href="#/products" class="text-sm text-charcoal/60 hover:text-burgundy">← All products</a>
    <h1 class="mb-6 mt-2 font-display text-2xl text-burgundy">${id ? esc(p.name) : "Add product"}</h1>

    <form id="productForm" class="grid gap-6 xl:grid-cols-[1fr_380px]" novalidate>
      <div class="space-y-6">
        <section class="ad-card space-y-4 p-5">
          <div><label class="ad-label" for="name">Name *</label><input class="ad-input" id="name" required maxlength="160" value="${esc(p.name)}"></div>
          <div><label class="ad-label" for="slug">URL slug *</label><input class="ad-input" id="slug" required maxlength="120" pattern="[a-z0-9]+(-[a-z0-9]+)*" value="${esc(p.slug)}">
            <p class="mt-1 text-xs text-charcoal/50">Lowercase letters, numbers and hyphens. Used in the product link.</p></div>
          <div><label class="ad-label" for="description">Description</label><textarea class="ad-input" id="description" rows="6" maxlength="5000">${esc(p.description || "")}</textarea></div>
          <div class="grid gap-4 md:grid-cols-3">
            <div><label class="ad-label" for="fabric">Fabric</label><input class="ad-input" id="fabric" maxlength="120" value="${esc(p.fabric || "")}" placeholder="e.g. Pure silk"></div>
            <div><label class="ad-label" for="craft">Craft / work</label><input class="ad-input" id="craft" maxlength="120" value="${esc(p.craft || "")}" placeholder="e.g. Kutchi mirror work"></div>
            <div><label class="ad-label" for="color">Colour</label><input class="ad-input" id="color" maxlength="60" value="${esc(p.color || "")}"></div>
          </div>
        </section>

        <section class="ad-card p-5">
          <div class="mb-3 flex items-center justify-between"><h2 class="font-semibold">Sizes & stock</h2>
            <button type="button" class="ad-btn ad-btn--ghost !py-1 text-xs" id="addSize">+ Add size</button></div>
          <div id="sizeRows" class="space-y-2"></div>
        </section>

        <section class="ad-card p-5">
          <h2 class="mb-1 font-semibold">Images</h2>
          ${id ? `
            <p class="mb-3 text-xs text-charcoal/55">JPG, PNG or WebP up to 5 MB. Portrait 3:4 works best. The first image is the cover.</p>
            <div id="imageList" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"></div>
            <label class="ad-btn ad-btn--ghost mt-4 cursor-pointer">
              <input type="file" id="imgUpload" accept="image/jpeg,image/png,image/webp,image/avif" multiple class="sr-only">Upload images
            </label>
            <span id="uploadStatus" class="ml-2 text-sm text-charcoal/60"></span>`
          : `<p class="text-sm text-charcoal/60">Save the product first, then you can upload images.</p>`}
        </section>
      </div>

      <aside class="space-y-6">
        <section class="ad-card space-y-4 p-5">
          <div><label class="ad-label" for="collection">Collection *</label>
            <select class="ad-input" id="collection">${Object.entries(COLLECTIONS).map(([k, c]) =>
              `<option value="${k}" ${p.collection === k ? "selected" : ""}>${c.label}</option>`).join("")}</select></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="ad-label" for="price">Price (₹) *</label><input class="ad-input" id="price" type="number" min="1" step="0.01" required value="${esc(p.price)}"></div>
            <div><label class="ad-label" for="compare">Compare-at (₹)</label><input class="ad-input" id="compare" type="number" min="1" step="0.01" value="${esc(p.compare_at_price ?? "")}"></div>
          </div>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="is_active" ${p.is_active ? "checked" : ""}> Live on store</label>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="is_new_arrival" ${p.is_new_arrival ? "checked" : ""}> Show in New Arrivals</label>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" id="is_featured" ${p.is_featured ? "checked" : ""}> Featured</label>
          <p id="formError" class="hidden rounded bg-red-50 p-3 text-sm text-red-700"></p>
          <button class="ad-btn ad-btn--primary w-full" id="saveBtn">${id ? "Save changes" : "Create product"}</button>
          ${id ? `<a class="block text-center text-sm text-burgundy hover:underline" href="../product.html?slug=${encodeURIComponent(p.slug)}" target="_blank" rel="noopener">View on store ↗</a>` : ""}
        </section>
        ${id ? `<section class="ad-card p-5"><h2 class="mb-2 font-semibold text-red-700">Danger zone</h2>
          <p class="mb-3 text-xs text-charcoal/60">Deleting removes the product and its images. Past orders keep their item details. To hide it temporarily, untick “Live on store” instead.</p>
          <button type="button" class="ad-btn ad-btn--danger w-full" id="deleteBtn">Delete product</button></section>` : ""}
      </aside>
    </form>`;

  // ---- name → slug (only while slug is untouched)
  const nameEl = document.getElementById("name");
  const slugEl = document.getElementById("slug");
  let slugTouched = Boolean(p.slug);
  slugEl.addEventListener("input", () => (slugTouched = true));
  nameEl.addEventListener("input", () => { if (!slugTouched) slugEl.value = slugify(nameEl.value); });

  // ---- sizes
  const sizeRows = document.getElementById("sizeRows");
  const removedSizeIds = [];
  const drawSizes = () => {
    sizeRows.innerHTML = sizes.map((s, i) => `
      <div class="flex items-center gap-2" data-i="${i}">
        <input class="ad-input !w-32" data-f="size_label" maxlength="30" value="${esc(s.size_label)}" aria-label="Size label">
        <input class="ad-input !w-28" data-f="stock" type="number" min="0" step="1" value="${esc(s.stock)}" aria-label="Stock">
        <span class="text-xs text-charcoal/50">in stock</span>
        <button type="button" class="ml-auto text-sm text-red-700 hover:underline" data-rm="${i}">Remove</button>
      </div>`).join("") || `<p class="text-sm text-charcoal/55">No sizes — the product can't be ordered until you add one.</p>`;
  };
  drawSizes();
  sizeRows.addEventListener("input", (e) => {
    const row = e.target.closest("[data-i]");
    if (!row) return;
    const s = sizes[+row.dataset.i];
    s[e.target.dataset.f] = e.target.dataset.f === "stock" ? e.target.value : e.target.value;
  });
  sizeRows.addEventListener("click", (e) => {
    const i = e.target.dataset.rm;
    if (i === undefined) return;
    const [gone] = sizes.splice(+i, 1);
    if (gone.id) removedSizeIds.push(gone.id);
    drawSizes();
  });
  document.getElementById("addSize").onclick = () => { sizes.push({ size_label: "", stock: 0 }); drawSizes(); };

  // ---- save
  const form = document.getElementById("productForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("formError");
    const fail = (m) => { err.textContent = m; err.classList.remove("hidden"); };
    err.classList.add("hidden");

    const v = (k) => document.getElementById(k).value.trim();
    const price = Number(v("price"));
    const compare = v("compare") ? Number(v("compare")) : null;
    const row = {
      name: v("name"), slug: v("slug"), description: v("description") || null,
      collection: v("collection"), fabric: v("fabric") || null, craft: v("craft") || null, color: v("color") || null,
      price, compare_at_price: compare,
      is_active: document.getElementById("is_active").checked,
      is_new_arrival: document.getElementById("is_new_arrival").checked,
      is_featured: document.getElementById("is_featured").checked,
    };
    if (row.name.length < 2) return fail("Please enter a product name.");
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(row.slug)) return fail("Slug may only contain lowercase letters, numbers and single hyphens.");
    if (!(price > 0)) return fail("Please enter a valid price.");
    if (compare !== null && !(compare > price)) return fail("Compare-at price must be higher than the price.");

    const cleanSizes = sizes.map((s, i) => ({ ...s, size_label: String(s.size_label).trim(), stock: Number(s.stock), sort_order: i }));
    if (cleanSizes.some((s) => !s.size_label)) return fail("Every size needs a label.");
    if (cleanSizes.some((s) => !Number.isInteger(s.stock) || s.stock < 0)) return fail("Stock must be a whole number of 0 or more.");
    if (new Set(cleanSizes.map((s) => s.size_label.toLowerCase())).size !== cleanSizes.length) return fail("Size labels must be unique.");

    const btn = document.getElementById("saveBtn");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      let productId = id;
      if (id) {
        const { error } = await sb.from("products").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from("products").insert(row).select("id").single();
        if (error) throw error;
        productId = data.id;
      }

      if (removedSizeIds.length) {
        const { error } = await sb.from("product_sizes").delete().in("id", removedSizeIds);
        if (error) throw error;
      }
      const existing = cleanSizes.filter((s) => s.id).map(({ id: sid, size_label, stock, sort_order }) => ({ id: sid, product_id: productId, size_label, stock, sort_order }));
      const fresh = cleanSizes.filter((s) => !s.id).map(({ size_label, stock, sort_order }) => ({ product_id: productId, size_label, stock, sort_order }));
      if (existing.length) { const { error } = await sb.from("product_sizes").upsert(existing); if (error) throw error; }
      if (fresh.length) { const { error } = await sb.from("product_sizes").insert(fresh); if (error) throw error; }

      toast(id ? "Product saved" : "Product created — now add images");
      if (!id) location.hash = `#/products/${productId}`;
      else await renderProductEditor(view, id);
    } catch (e2) {
      fail(e2.code === "23505" ? "That slug or size label is already in use." : e2.message);
      btn.disabled = false; btn.textContent = id ? "Save changes" : "Create product";
    }
  });

  if (!id) return;

  // ---- delete
  document.getElementById("deleteBtn").onclick = async () => {
    if (!confirm(`Delete “${p.name}” permanently?`)) return;
    const paths = images.map((im) => im.storage_path).filter(Boolean);
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) return toast(error.message, true);
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    toast("Product deleted");
    location.hash = "#/products";
  };

  // ---- images
  const list = document.getElementById("imageList");
  const drawImages = () => {
    list.innerHTML = images.map((im, i) => `
      <figure class="overflow-hidden rounded border border-charcoal/10 bg-white" data-i="${i}">
        <img src="${esc(im.image_url)}" alt="" class="aspect-[3/4] w-full object-cover">
        <figcaption class="flex items-center justify-between gap-1 p-2 text-xs">
          <span>${i === 0 ? `<b class="text-burgundy">Cover</b>` : `#${i + 1}`}</span>
          <span class="flex gap-2">
            <button type="button" data-act="up" ${i === 0 ? "disabled class='opacity-30'" : ""} aria-label="Move earlier">←</button>
            <button type="button" data-act="down" ${i === images.length - 1 ? "disabled class='opacity-30'" : ""} aria-label="Move later">→</button>
            <button type="button" data-act="del" class="text-red-700">Delete</button>
          </span>
        </figcaption>
      </figure>`).join("") || `<p class="col-span-full text-sm text-charcoal/55">No images yet.</p>`;
  };
  drawImages();

  const persistOrder = async () => {
    const results = await Promise.all(images.map((im, i) => sb.from("product_images").update({ sort_order: i }).eq("id", im.id)));
    const failed = results.find((r) => r.error);
    if (failed) toast(failed.error.message, true);
  };

  list.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b || b.disabled) return;
    const i = +b.closest("[data-i]").dataset.i;
    if (b.dataset.act === "del") {
      if (!confirm("Delete this image?")) return;
      const im = images[i];
      const { error } = await sb.from("product_images").delete().eq("id", im.id);
      if (error) return toast(error.message, true);
      if (im.storage_path) await sb.storage.from(BUCKET).remove([im.storage_path]);
      images.splice(i, 1);
    } else {
      const j = b.dataset.act === "up" ? i - 1 : i + 1;
      [images[i], images[j]] = [images[j], images[i]];
    }
    drawImages();
    await persistOrder();
  });

  document.getElementById("imgUpload").addEventListener("change", async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    const status = document.getElementById("uploadStatus");
    for (const [n, file] of files.entries()) {
      if (file.size > 5 * 1024 * 1024) { toast(`${file.name} is larger than 5 MB`, true); continue; }
      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) { toast(`${file.name} is not a supported image`, true); continue; }
      status.textContent = `Uploading ${n + 1} of ${files.length}…`;
      const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }[file.type];
      const path = `products/${id}/${crypto.randomUUID()}.${ext}`;
      const up = await sb.storage.from(BUCKET).upload(path, file, { cacheControl: "31536000", contentType: file.type });
      if (up.error) { toast(up.error.message, true); continue; }
      const url = sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const { data, error } = await sb.from("product_images")
        .insert({ product_id: id, image_url: url, storage_path: path, alt_text: p.name, sort_order: images.length })
        .select().single();
      if (error) { toast(error.message, true); await sb.storage.from(BUCKET).remove([path]); continue; }
      images.push(data);
      drawImages();
    }
    status.textContent = "";
  });
}
