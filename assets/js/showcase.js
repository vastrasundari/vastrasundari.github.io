// Home page "clothesline" showcase: every product hangs on one rod, the
// selected one is large in front, the rest hang smaller on both sides.
// Selecting another product swings it forward (3D) and swaps the details panel.
import { sb, isConfigured } from "./lib/supabase.js";
import { esc, inr, COLLECTIONS, imageFallback } from "./lib/util.js";
import { addToCart, inWishlist, toggleWishlist } from "./lib/cart.js";

const root = document.getElementById("showcase");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const SELECT = `id, slug, name, description, collection, fabric, craft, price, compare_at_price, is_featured, created_at,
  product_images(image_url, alt_text, sort_order), product_sizes(id, size_label, stock, sort_order)`;

async function load() {
  if (!isConfigured) return [];
  const { data, error } = await sb.from("products").select(SELECT)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(14);
  if (error) throw error;
  return data.map((p) => ({
    ...p,
    images: [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order),
    sizes: [...(p.product_sizes || [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

const garment = (p, cls = "") => p.images[0]
  ? `<img class="${cls}" src="${esc(p.images[0].image_url)}" alt="" loading="lazy" decoding="async" draggable="false">`
  : `<div class="${cls} hang__noimg">${imageFallback(p.name)}</div>`;

const hook = `<svg class="hang__hook" viewBox="0 0 60 46" aria-hidden="true">
  <path d="M30 2a6 6 0 1 1-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M30 8v8L4 40h52L30 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

function render(products) {
  root.classList.remove("is-loading");
  if (!products.length) {
    root.querySelector(".showcase__stage").innerHTML = `
      <div class="showcase__empty"><p class="font-display text-3xl">New designs arriving soon</p>
      <a href="shop.html" class="btn btn--gold mt-6">Explore Collection</a></div>`;
    root.querySelectorAll(".showcase__panel, .showcase__strip, .showcase__arrow").forEach((el) => el.remove());
    return;
  }

  const line = root.querySelector(".showcase__line");
  line.innerHTML = products.map((p, i) => `
    <li class="hang" data-i="${i}">
      <button type="button" class="hang__btn" aria-label="Show ${esc(p.name)}" aria-pressed="false">
        <span class="hang__swing">${hook}<span class="hang__garment">${garment(p)}</span></span>
      </button>
    </li>`).join("");

  const strip = root.querySelector(".showcase__thumbs");
  strip.innerHTML = products.map((p, i) => `
    <li><button type="button" class="strip__btn" data-i="${i}" aria-label="${esc(p.name)}" aria-pressed="false">${garment(p)}</button></li>`).join("");

  const items = [...line.children];
  const thumbs = [...strip.querySelectorAll("button")];
  const panel = root.querySelector(".showcase__panel");
  const stage = root.querySelector(".showcase__stage");
  let sel = 0;

  // ---------- 3D layout ----------
  function layout() {
    const W = stage.clientWidth;
    const mobile = W < 900;
    const H = mobile ? 430 : stage.clientHeight;             // phones: garments live in a fixed 430px band
    const rodY = mobile ? 34 : 48;
    const room = H - rodY - (mobile ? 20 : 150);            // keep the bottom strip clear
    const selW = Math.max(140, Math.min(mobile ? W * 0.56 : W * 0.25, room * 0.6));
    const smallW = selW * (mobile ? 0.46 : 0.5);
    const step = smallW * 0.82;
    const cx = mobile ? W / 2 : W * 0.38;
    const panelW = Math.min(350, W * 0.25);
    const panelLeft = cx + selW / 2 + 28;
    stage.style.setProperty("--sel-w", `${selW}px`);
    stage.style.setProperty("--rod-y", `${rodY}px`);
    if (!mobile) {
      panel.style.left = `${panelLeft}px`;
      panel.style.width = `${panelW}px`;
    } else {
      panel.style.left = panel.style.width = "";
    }
    const rightStart = mobile ? cx + selW / 2 + step * 0.55 : panelLeft + panelW + 20 + smallW / 2;

    items.forEach((li, i) => {
      const d = i - sel;
      const a = Math.abs(d);
      let x, scale, z, rot, opacity;
      if (d === 0) {
        x = cx; scale = 1; z = 0; rot = 0; opacity = 1;
      } else {
        scale = smallW / selW * Math.max(0.82, 1 - (a - 1) * 0.05);
        z = -120 - a * 30;
        rot = d < 0 ? 14 : -14;
        x = d < 0 ? cx - selW / 2 - step * 0.55 - (a - 1) * step : rightStart + (a - 1) * step;
        opacity = a > (mobile ? 2 : 5) ? 0 : 1 - (a - 1) * 0.08;
      }
      li.style.transform = `translate3d(${x - selW / 2}px, 0, ${z}px) rotateY(${rot}deg) scale(${scale})`;
      li.style.opacity = opacity;
      li.style.zIndex = String(100 - a);
      li.classList.toggle("is-selected", d === 0);
      li.style.pointerEvents = opacity === 0 ? "none" : "";
      const btn = li.querySelector("button");
      btn.setAttribute("aria-pressed", String(d === 0));
      btn.tabIndex = opacity === 0 ? -1 : 0;
    });
  }

  // ---------- details panel ----------
  function fillPanel(p) {
    const off = p.compare_at_price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
    const imgs = p.images.slice(0, 4);
    const sizes = p.sizes;
    panel.innerHTML = `
      <p class="sc-panel__kicker">${esc(COLLECTIONS[p.collection]?.label || "")}</p>
      <h2 class="sc-panel__name" id="scName">${esc(p.name)}</h2>
      <p class="sc-panel__price"><strong>${inr(p.price)}</strong>
        ${p.compare_at_price ? `<s>${inr(p.compare_at_price)}</s><span class="sc-panel__off">${off}% OFF</span>` : ""}</p>
      ${p.description ? `<p class="sc-panel__desc">${esc(p.description)}</p>` : (p.craft || p.fabric) ? `<p class="sc-panel__desc">${esc([p.craft, p.fabric].filter(Boolean).join(" · "))}</p>` : ""}
      ${imgs.length ? `
        <a class="sc-panel__main" href="product.html?slug=${encodeURIComponent(p.slug)}" aria-label="View ${esc(p.name)} details">
          <img src="${esc(imgs[0].image_url)}" alt="${esc(imgs[0].alt_text || p.name)}" id="scMain">
          <span class="sc-panel__zoom" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5M11 8.5v5M8.5 11h5"/></svg></span>
        </a>
        ${imgs.length > 1 ? `<div class="sc-panel__thumbs">${imgs.map((im, i) => `
          <button type="button" data-img="${i}" aria-label="Photo ${i + 1}" aria-pressed="${i === 0}"><img src="${esc(im.image_url)}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}` : ""}
      ${sizes.length ? `
        <div class="sc-panel__sizes" role="group" aria-label="Size">
          <span>Size:</span>
          ${sizes.map((s) => `<button type="button" data-size="${esc(s.id)}" aria-pressed="false" ${s.stock > 0 ? "" : "disabled"}
            title="${s.stock > 0 ? "" : "Sold out"}">${esc(s.size_label)}</button>`).join("")}
        </div>` : ""}
      <button type="button" class="sc-panel__add" id="scAdd" disabled>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
        <span>${sizes.some((s) => s.stock > 0) ? "Select a size" : "Sold out"}</span></button>
      <button type="button" class="sc-panel__wish" id="scWish" aria-pressed="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>
        <span>Add to Wishlist</span></button>
      <p class="sc-panel__msg" id="scMsg" role="status"></p>
      <a class="sc-panel__more" href="product.html?slug=${encodeURIComponent(p.slug)}">View full details →</a>`;

    let size = null;
    const add = panel.querySelector("#scAdd");
    panel.querySelector(".sc-panel__thumbs")?.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-img]");
      if (!b) return;
      const im = imgs[+b.dataset.img];
      const main = panel.querySelector("#scMain");
      main.src = im.image_url;
      main.alt = im.alt_text || p.name;
      panel.querySelectorAll("[data-img]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    });
    panel.querySelector(".sc-panel__sizes")?.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-size]");
      if (!b || b.disabled) return;
      size = sizes.find((s) => s.id === b.dataset.size);
      panel.querySelectorAll("[data-size]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      add.disabled = false;
      add.querySelector("span").textContent = "Add to Bag";
    });
    add.addEventListener("click", () => {
      if (!size) return;
      addToCart({
        sizeId: size.id, productId: p.id, slug: p.slug, name: p.name, size: size.size_label,
        price: Number(p.price), image: p.images[0]?.image_url || "", qty: 1, maxStock: size.stock,
      });
      panel.querySelector("#scMsg").innerHTML = `Added to your bag — <a href="cart.html">View bag</a>`;
    });
    const wish = panel.querySelector("#scWish");
    const syncWish = (on) => {
      wish.setAttribute("aria-pressed", String(on));
      wish.querySelector("span").textContent = on ? "In your Wishlist" : "Add to Wishlist";
    };
    syncWish(inWishlist(p.slug));
    wish.addEventListener("click", () => syncWish(toggleWishlist(p.slug)));
  }

  // ---------- selection ----------
  let panelTimer;
  function select(i, { initial = false } = {}) {
    i = (i + products.length) % products.length;
    if (i === sel && !initial) return;
    const prev = sel;
    sel = i;
    layout();
    thumbs.forEach((t, k) => t.setAttribute("aria-pressed", String(k === sel)));
    // centre the active thumbnail inside the strip only (never scroll the page)
    const t = thumbs[sel].parentElement;
    strip.scrollTo({ left: t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2, behavior: reduceMotion || initial ? "auto" : "smooth" });

    if (!reduceMotion && !initial) {
      // the newly selected garment swings forward; its old neighbour sways a little
      for (const k of [sel, prev]) {
        const sw = items[k].querySelector(".hang__swing");
        sw.classList.remove("is-swinging", "is-swaying");
        void sw.offsetWidth;
        sw.classList.add(k === sel ? "is-swinging" : "is-swaying");
      }
    }

    clearTimeout(panelTimer);
    if (initial || reduceMotion) return fillPanel(products[sel]);
    panel.classList.add("is-changing");
    panelTimer = setTimeout(() => {
      fillPanel(products[sel]);
      panel.classList.remove("is-changing");
    }, 260);
  }

  line.addEventListener("click", (e) => {
    const li = e.target.closest(".hang");
    if (li) select(+li.dataset.i);
  });
  strip.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (b) select(+b.dataset.i);
  });
  root.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => select(sel + Number(b.dataset.step))));
  root.querySelector(".showcase__thumbs-wrap").addEventListener("click", (e) => {
    const b = e.target.closest("[data-scroll]");
    if (b) strip.scrollBy({ left: Number(b.dataset.scroll) * strip.clientWidth * 0.8, behavior: "smooth" });
  });
  stage.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); select(sel - 1); items[sel].querySelector("button").focus(); }
    if (e.key === "ArrowRight") { e.preventDefault(); select(sel + 1); items[sel].querySelector("button").focus(); }
  });

  // swipe on touch screens
  let x0 = null;
  stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) select(sel + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });

  new ResizeObserver(() => layout()).observe(stage);
  select(0, { initial: true });
  requestAnimationFrame(() => root.classList.add("is-ready"));
}

load().then(render).catch((e) => {
  console.error(e);
  render([]);
});
