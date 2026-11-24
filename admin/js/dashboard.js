import { sb } from "../../assets/js/lib/supabase.js";
import { esc, inr, formatDate } from "../../assets/js/lib/util.js";
import { statusPill, paymentPill } from "./orders.js";

export async function renderDashboard(view) {
  const [statsRes, recentRes] = await Promise.all([
    sb.rpc("admin_dashboard_stats"),
    sb.from("orders")
      .select("id, order_number, customer_name, customer_phone, total, status, payment_status, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  if (statsRes.error) throw statsRes.error;
  if (recentRes.error) throw recentRes.error;
  const s = statsRes.data;

  const card = (label, value, href, accent = "") => `
    <a href="${href}" class="ad-card block p-5 transition hover:shadow-md">
      <p class="text-xs font-medium uppercase tracking-wider text-charcoal/55">${label}</p>
      <p class="mt-2 text-2xl font-semibold ${accent}">${value}</p>
    </a>`;

  view.innerHTML = `
    <div class="mb-6 flex items-end justify-between">
      <div><h1 class="font-display text-2xl text-burgundy">Dashboard</h1>
      <p class="text-sm text-charcoal/60">Overview of all orders</p></div>
      <button class="ad-btn ad-btn--ghost" id="refreshDash">Refresh</button>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-3">
      ${card("Total Sales", inr(s.total_sales), "#/orders", "text-burgundy")}
      ${card("COD Collected", inr(s.collected), "#/orders?payment=paid", "text-green-700")}
      ${card("COD Outstanding", inr(s.cod_outstanding), "#/orders?payment=pending", "text-amber-700")}
    </div>

    <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      ${card("Total Orders", s.total_orders, "#/orders")}
      ${card("Pending", s.order_received, "#/orders?status=order_received", "text-amber-700")}
      ${card("Confirmed", s.confirmed, "#/orders?status=confirmed", "text-blue-700")}
      ${card("Shipped", s.shipped, "#/orders?status=shipped", "text-indigo-700")}
      ${card("Delivered", s.delivered, "#/orders?status=delivered", "text-green-700")}
      ${card("Cancelled", s.cancelled, "#/orders?status=cancelled", "text-red-700")}
    </div>

    <section class="ad-card mt-8 overflow-hidden">
      <div class="flex items-center justify-between border-b border-charcoal/10 px-4 py-3">
        <h2 class="font-semibold">Recent Orders</h2>
        <a href="#/orders" class="text-sm text-burgundy hover:underline">View all →</a>
      </div>
      ${recentRes.data.length ? `
      <div class="overflow-x-auto"><table class="w-full min-w-[640px]">
        <thead class="bg-ivory/60"><tr>
          <th class="ad-th">Order</th><th class="ad-th">Customer</th><th class="ad-th">Date</th>
          <th class="ad-th">Status</th><th class="ad-th">Payment</th><th class="ad-th text-right">Total</th></tr></thead>
        <tbody class="divide-y divide-charcoal/5">
          ${recentRes.data.map((o) => `<tr class="cursor-pointer hover:bg-ivory/50" data-href="#/orders/${o.id}">
            <td class="ad-td font-medium text-burgundy"><a href="#/orders/${o.id}">${esc(o.order_number)}</a></td>
            <td class="ad-td">${esc(o.customer_name)}<br><span class="text-xs text-charcoal/50">${esc(o.customer_phone)}</span></td>
            <td class="ad-td text-charcoal/70">${formatDate(o.created_at)}</td>
            <td class="ad-td">${statusPill(o.status)}</td>
            <td class="ad-td">${paymentPill(o.payment_status)}</td>
            <td class="ad-td text-right font-medium">${inr(o.total)}</td></tr>`).join("")}
        </tbody></table></div>`
      : `<p class="p-8 text-center text-sm text-charcoal/55">No orders yet.</p>`}
    </section>`;

  document.getElementById("refreshDash").onclick = () => renderDashboard(view);
  view.querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", () => (location.hash = tr.dataset.href)));
}
