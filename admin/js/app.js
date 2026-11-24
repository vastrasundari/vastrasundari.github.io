// Admin SPA: authentication, admin verification, shell and hash router.
import { sb, isConfigured } from "../../assets/js/lib/supabase.js";
import { esc } from "../../assets/js/lib/util.js";
import { renderDashboard } from "./dashboard.js";
import { renderOrders, renderOrderDetail } from "./orders.js";
import { renderProducts, renderProductEditor } from "./products.js";

const app = document.getElementById("app");
export const state = { session: null, admin: null };

export function toast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.toggle("bg-red-700", isError);
  t.classList.toggle("bg-charcoal", !isError);
  t.style.opacity = "1";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.style.opacity = "0"), 3500);
}

/** Current access token (refreshed by supabase-js automatically). */
export async function accessToken() {
  const { data } = await sb.auth.getSession();
  if (!data.session) { location.hash = ""; await boot(); throw new Error("Session expired"); }
  return data.session.access_token;
}

// ---------------------------------------------------------------- auth views
function loginView(message = "", isError = true) {
  app.innerHTML = `
  <div class="grid min-h-screen place-items-center bg-burgundy px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <p class="font-display text-2xl tracking-[.25em] text-ivory">VASTRA SUNDARI</p>
        <p class="mt-1 text-xs uppercase tracking-[.3em] text-gold">Admin</p>
      </div>
      <form id="loginForm" class="ad-card space-y-4 p-6" novalidate>
        <h1 class="text-lg font-semibold">Sign in</h1>
        ${message ? `<p class="rounded-md ${isError ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"} px-3 py-2 text-sm">${esc(message)}</p>` : ""}
        <div><label class="ad-label" for="email">Email</label><input class="ad-input" id="email" type="email" autocomplete="username" required></div>
        <div><label class="ad-label" for="password">Password</label><input class="ad-input" id="password" type="password" autocomplete="current-password" required></div>
        <button class="ad-btn ad-btn--primary w-full" id="loginBtn">Sign in</button>
        <button type="button" class="w-full text-center text-xs text-charcoal/60 hover:text-burgundy" id="forgotBtn">Forgot password?</button>
      </form>
      <p class="mt-6 text-center text-xs text-ivory/60"><a href="../index.html" class="hover:text-ivory">← Back to store</a></p>
    </div>
  </div>`;

  const form = document.getElementById("loginForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("loginBtn");
    btn.disabled = true; btn.textContent = "Signing in…";
    const { error } = await sb.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.password.value,
    });
    if (error) return loginView(error.message === "Invalid login credentials" ? "Incorrect email or password." : error.message);
    await boot();
  });

  document.getElementById("forgotBtn").addEventListener("click", async () => {
    const email = form.email.value.trim();
    if (!email) return loginView("Enter your email above, then click “Forgot password?”.");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split("#")[0] });
    loginView(error ? error.message : "If that email belongs to an admin, a reset link has been sent.", Boolean(error));
  });
}

function setPasswordView() {
  app.innerHTML = `
  <div class="grid min-h-screen place-items-center bg-burgundy px-4">
    <form id="pwForm" class="ad-card w-full max-w-sm space-y-4 p-6">
      <h1 class="text-lg font-semibold">Set a new password</h1>
      <div><label class="ad-label" for="pw">New password (min. 10 characters)</label><input class="ad-input" id="pw" type="password" minlength="10" autocomplete="new-password" required></div>
      <p class="hidden text-sm text-red-700" id="pwErr"></p>
      <button class="ad-btn ad-btn--primary w-full">Save password</button>
    </form>
  </div>`;
  document.getElementById("pwForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pw = document.getElementById("pw").value;
    const err = document.getElementById("pwErr");
    if (pw.length < 10) { err.textContent = "Use at least 10 characters."; err.classList.remove("hidden"); return; }
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) { err.textContent = error.message; err.classList.remove("hidden"); return; }
    history.replaceState(null, "", location.pathname);
    toast("Password updated");
    await boot();
  });
}

// ---------------------------------------------------------------- shell
const NAV = [
  ["#/dashboard", "Dashboard", '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z"/>'],
  ["#/orders", "Orders", '<path d="M6 7h12l-1 13H7L6 7Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>'],
  ["#/products", "Products", '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/>'],
];

function shell() {
  app.innerHTML = `
  <div class="md:flex">
    <aside class="bg-burgundy text-ivory md:fixed md:inset-y-0 md:w-60">
      <div class="flex items-center justify-between px-5 py-4 md:block md:py-6">
        <div>
          <p class="font-display text-lg tracking-[.2em]">VASTRA SUNDARI</p>
          <p class="text-[10px] uppercase tracking-[.3em] text-gold">Admin Panel</p>
        </div>
        <button id="signOutTop" class="text-xs text-ivory/70 md:hidden">Sign out</button>
      </div>
      <nav class="ad-nav flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1">
        ${NAV.map(([h, l, ic]) => `<a href="${h}" data-nav="${h}"><svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24">${ic}</svg>${l}</a>`).join("")}
        <a href="../index.html" target="_blank" rel="noopener"><svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>View store</a>
      </nav>
      <div class="absolute bottom-0 hidden w-60 border-t border-white/10 p-4 text-xs md:block">
        <p class="truncate text-ivory/70">${esc(state.admin.email)}</p>
        <button id="signOut" class="mt-2 text-gold hover:text-ivory">Sign out</button>
      </div>
    </aside>
    <main class="min-w-0 flex-1 p-4 md:ml-60 md:p-8" id="view"></main>
  </div>`;
  const out = async () => { await sb.auth.signOut(); location.hash = ""; loginView("You have been signed out.", false); };
  document.getElementById("signOut").onclick = out;
  document.getElementById("signOutTop").onclick = out;
}

async function route() {
  if (!state.admin) return;
  if (!document.getElementById("view")) shell();
  const view = document.getElementById("view");
  const hash = location.hash || "#/dashboard";
  document.querySelectorAll("[data-nav]").forEach((a) => a.classList.toggle("is-active", hash.startsWith(a.dataset.nav)));
  view.innerHTML = `<div class="py-20 text-center text-burgundy"><span class="vs-spinner"></span></div>`;
  window.scrollTo(0, 0);

  const [path, query = ""] = hash.slice(1).split("?");
  const [, section, id] = path.split("/");
  try {
    if (section === "orders" && id) await renderOrderDetail(view, id);
    else if (section === "orders") await renderOrders(view, new URLSearchParams(query));
    else if (section === "products" && id) await renderProductEditor(view, id === "new" ? null : id);
    else if (section === "products") await renderProducts(view);
    else await renderDashboard(view);
  } catch (e) {
    console.error(e);
    view.innerHTML = `<div class="ad-card p-6 text-sm text-red-700">Something went wrong: ${esc(e.message || e)}</div>`;
  }
}

// ---------------------------------------------------------------- boot
async function boot() {
  if (!isConfigured) {
    app.innerHTML = `<div class="grid min-h-screen place-items-center p-6"><div class="ad-card max-w-md p-6 text-sm">
      <h1 class="mb-2 text-lg font-semibold">Supabase is not configured</h1>
      <p>Add <code>SUPABASE_URL</code> and <code>SUPABASE_ANON_KEY</code> to <code>assets/js/config.js</code>. See README.md.</p></div></div>`;
    return;
  }

  // Password-recovery links land here with #type=recovery / access_token in the URL.
  if (/type=recovery/.test(location.hash)) return; // handled by onAuthStateChange below

  const { data } = await sb.auth.getSession();
  state.session = data.session;
  state.admin = null;
  if (!state.session) return loginView();

  const { data: admin, error } = await sb.from("admin_users")
    .select("user_id, email, full_name, role")
    .eq("user_id", state.session.user.id)
    .maybeSingle();
  if (error || !admin) {
    await sb.auth.signOut();
    return loginView("This account does not have admin access.");
  }
  state.admin = admin;
  if (!location.hash || !location.hash.startsWith("#/")) location.hash = "#/dashboard";
  shell();
  route();
}

if (sb) {
  sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") setPasswordView();
    if (event === "SIGNED_OUT") { state.admin = null; }
  });
}
window.addEventListener("hashchange", route);
boot();
