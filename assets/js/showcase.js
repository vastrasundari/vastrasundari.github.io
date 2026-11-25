// Home page boutique showcase: outfits hang on a gold rail, the selected one
// is large and sharp in front, the rest wait smaller and softly blurred on both
// sides. Choosing another moves that actual garment element to the centre with
// a 3D flip and swaps the details card. Data comes from lib/catalog.js.
import { esc, inr, COLLECTIONS, imageFallback } from "./lib/util.js";
import { addToCart, inWishlist, toggleWishlist } from "./lib/cart.js";
import { fetchShowcaseProducts } from "./lib/catalog.js";

const root = document.getElementById("showcase");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    <li class="hang" data-i="${i}" style="--i:${i}">
      <button type="button" class="hang__btn" aria-label="Show ${esc(p.name)}" aria-pressed="false">
        <span class="hang__swing">${hook}<span class="hang__garment">${garment(p)}</span></span>
      </button>
    </li>`).join("");

  const strip = root.querySelector(".showcase__thumbs");
  strip.innerHTML = products.map((p, i) => `
    <li><button type="button" class="strip__btn" data-i="${i}" aria-label="${esc(p.name)}" aria-pressed="false">${garment(p)}</button></li>`).join("");

  const dotsEl = root.querySelector(".showcase__dots");
  dotsEl.innerHTML = products.map((p, i) =>
    `<button type="button" data-i="${i}" aria-label="Design ${i + 1} of ${products.length}: ${esc(p.name)}"></button>`).join("");
  const dots = [...dotsEl.children];
  dotsEl.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]");
    if (b) select(+b.dataset.i);
  });

  const items = [...line.children];
  // one-shot sway ends -> hand the element back to its idle floating loop
  line.addEventListener("animationend", (e) => e.target.classList.remove("is-swaying"));
  const thumbs = [...strip.querySelectorAll("button")];
  const panel = root.querySelector(".showcase__panel");
  const stage = root.querySelector(".showcase__stage");
  let sel = 0;

  const AUTO_MS = 5000;
  const HOLD_AFTER_USER_MS = 9000;
  const autoEnabled = !reduceMotion && products.length > 1;
  let autoTimer = null, holdUntil = 0, userPaused = false, hovering = false, focused = false, onScreen = true;
  function schedule() {
    clearTimeout(autoTimer);
    if (!autoEnabled || userPaused) return;
    autoTimer = setTimeout(() => {
      if (hovering || focused || !onScreen || document.hidden || Date.now() < holdUntil) return schedule();
      select(sel + 1, { auto: true });
    }, AUTO_MS);
  }

  // ---------- 3D layout ----------
  function layout() {
    const W = stage.clientWidth;
    const mobile = W < 900;
    const H = mobile ? 470 : stage.clientHeight;             // phones: garments live in a fixed 470px band
    // the rod's centre line comes from the CSS rail (its size is set by --rail-h)
    const bar = stage.querySelector(".rail__bar").getBoundingClientRect();
    const rodY = bar.top + bar.height / 2 - stage.getBoundingClientRect().top;
    const room = H - rodY - (mobile ? 20 : 150);            // keep the bottom strip clear
    const selW = Math.max(140, Math.min(mobile ? W * 0.56 : W * 0.25, room * 0.6));
    const smallW = selW * (mobile ? 0.46 : 0.5);
    const step = smallW * 0.82;
    const cx = mobile ? W / 2 : W * 0.38;
    const panelW = Math.min(350, W * 0.25);
    const panelLeft = cx + selW / 2 + 28;
    stage.style.setProperty("--sel-w", `${selW}px`);
    if (!mobile) {
      panel.style.left = `${panelLeft}px`;
      panel.style.width = `${panelW}px`;
    } else {
      panel.style.left = panel.style.width = "";
    }
    const rightStart = mobile ? cx + selW / 2 + step * 0.55 : panelLeft + panelW + 20 + smallW / 2;

    const n = items.length;
    items.forEach((li, i) => {
      // circular offset: the line wraps, so the next design always waits on the right
      let d = i - sel;
      if (n > 2) { d = ((d % n) + n) % n; if (d > n / 2) d -= n; }
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
      const transform = `translate3d(${x - selW / 2}px, 0, ${z}px) rotateY(${rot}deg) scale(${scale})`;
      if (li._x !== undefined && Math.abs(x - li._x) > W * 0.62 && root.classList.contains("is-ready")) {
        // wrapping from one end of the line to the other: jump there invisibly, then fade in
        li.style.transition = "none";
        li.style.opacity = 0;
        li.style.transform = transform;
        void li.offsetWidth;
        li.style.transition = "";
        requestAnimationFrame(() => { li.style.opacity = opacity; });
      } else {
        li.style.transform = transform;
        li.style.opacity = opacity;
      }
      li._x = x;
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
    const imgs = p.images.slice(0, 4);
    const sizes = p.sizes;
    panel.innerHTML = `
      <div class="sc-panel__top">
        <p class="sc-panel__kicker">${esc(COLLECTIONS[p.collection]?.label || "")}</p>
        ${p.badge ? `<span class="sc-panel__badge${p.badge === "Bestseller" ? " is-best" : ""}">${esc(p.badge)}</span>` : ""}
      </div>
      <h2 class="sc-panel__name" id="scName">${esc(p.name)}</h2>
      <p class="sc-panel__price"><strong>${inr(p.price)}</strong>
        ${p.discount ? `<s>${inr(p.compare_at_price)}</s><span class="sc-panel__off">${p.discount}% OFF</span>` : ""}</p>
      ${p.description ? `<p class="sc-panel__desc">${esc(p.description)}</p>` : ""}
      ${p.fabric || p.craft ? `<dl class="sc-panel__facts">
        ${p.fabric ? `<div><dt>Fabric</dt><dd>${esc(p.fabric)}</dd></div>` : ""}
        ${p.craft ? `<div><dt>Work</dt><dd>${esc(p.craft)}</dd></div>` : ""}
      </dl>` : ""}
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
  function select(i, { initial = false, auto = false } = {}) {
    i = (i + products.length) % products.length;
    if (!auto && !initial) holdUntil = Date.now() + HOLD_AFTER_USER_MS;
    schedule();
    if (i === sel && !initial) return;
    // don't make screen readers announce every automatic change
    panel.setAttribute("aria-live", auto ? "off" : "polite");
    const prev = sel;
    sel = i;
    layout();
    thumbs.forEach((t, k) => t.setAttribute("aria-pressed", String(k === sel)));
    dots.forEach((d, k) => (k === sel ? d.setAttribute("aria-current", "true") : d.removeAttribute("aria-current")));
    // centre the active thumbnail inside the strip only (never scroll the page)
    const t = thumbs[sel].parentElement;
    strip.scrollTo({ left: t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2, behavior: reduceMotion || initial ? "auto" : "smooth" });

    if (!reduceMotion && !initial) {
      // the garment arriving in the centre turns round in 3D; the one leaving sways a little
      const g = items[sel].querySelector(".hang__garment");
      g.classList.remove("is-flipping");
      void g.offsetWidth;
      g.classList.add("is-flipping");
      const sw = items[prev].querySelector(".hang__swing");
      sw.classList.remove("is-swaying");
      void sw.offsetWidth;
      sw.classList.add("is-swaying");
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

  // ---------- auto-scroll ----------
  // Advances every few seconds; pauses while the pointer or keyboard focus is on the
  // showcase, for a while after any manual choice, when it is off screen or the tab is
  // hidden, and whenever the viewer presses Pause. Off for reduced-motion users.
  const wrap = root.querySelector(".showcase__thumbs-wrap");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "strip__nav strip__play";
  wrap.append(toggle);
  const syncToggle = () => {
    toggle.setAttribute("aria-label", userPaused ? "Play automatic scrolling" : "Pause automatic scrolling");
    toggle.innerHTML = userPaused
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>`;
  };
  toggle.addEventListener("click", () => { userPaused = !userPaused; syncToggle(); schedule(); });
  if (!autoEnabled) toggle.remove(); else syncToggle();

  root.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
  root.addEventListener("pointerleave", () => { hovering = false; schedule(); });
  root.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") holdUntil = Date.now() + HOLD_AFTER_USER_MS; });
  root.addEventListener("focusin", (e) => { focused = e.target.matches(":focus-visible"); });   // keyboard focus only
  root.addEventListener("focusout", (e) => { if (!root.contains(e.relatedTarget)) { focused = false; schedule(); } });
  document.addEventListener("visibilitychange", schedule);
  new IntersectionObserver(([en]) => { onScreen = en.isIntersecting; schedule(); }, { threshold: 0.35 }).observe(root);

  new ResizeObserver(() => layout()).observe(stage);
  select(0, { initial: true });
  requestAnimationFrame(() => root.classList.add("is-ready"));
}

fetchShowcaseProducts().then(render).catch((e) => {
  console.error(e);
  render([]);
});
