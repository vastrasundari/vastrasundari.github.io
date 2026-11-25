// Orders list + order detail with status / payment management.
import { sb, callFunction } from "../../assets/js/lib/supabase.js";
import { esc, inr, formatDate, STATUS_LABEL, PAYMENT_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_METHOD_SHORT } from "../../assets/js/lib/util.js";
import { accessToken, toast } from "./app.js";

const STATUS_STYLE = {
  order_received: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};
export const statusPill = (s) => `<span class="ad-pill ${STATUS_STYLE[s] || ""}">${STATUS_LABEL[s] || esc(s)}</span>`;
export const paymentPill = (p, method = "cod", upiRef = null) => {
  const verify = method === "upi" && p === "pending" && upiRef;
  const cls = p === "paid" ? "bg-green-100 text-green-800" : verify ? "bg-amber-100 text-amber-800" : "bg-charcoal/10 text-charcoal/70";
  return `<span class="ad-pill ${cls}">${PAYMENT_METHOD_SHORT[method] || esc(method)} · ${verify ? "Verify UTR" : PAYMENT_LABEL[p] || esc(p)}</span>`;
};

const PAGE_SIZE = 25;

// ============================================================== LIST
export async function renderOrders(view, params) {
  const status = STATUS_LABEL[params.get("status")] ? params.get("status") : "";
  const payment = PAYMENT_LABEL[params.get("payment")] ? params.get("payment") : "";
  // strip characters that have meaning in PostgREST filter syntax
  const q = (params.get("q") || "").replace(/[,()"\\%*]/g, "").trim().slice(0, 80);
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);

  let query = sb.from("orders")
    .select("id, order_number, customer_name, customer_phone, customer_email, city, total, status, payment_status, payment_method, upi_ref, created_at, order_items(quantity)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (payment) query = query.eq("payment_status", payment);
  if (q) {
    const v = `"%${q}%"`;
    const digits = q.replace(/\D/g, "");
    const parts = [`order_number.ilike.${v}`, `customer_name.ilike.${v}`, `customer_email.ilike.${v}`];
    if (digits.length >= 4) parts.push(`customer_phone.ilike."%${digits.slice(-10)}%"`);
    query = query.or(parts.join(","));
  }
  const { data, error, count } = await query;
  if (error) throw error;

  const setParam = (k, v) => {
    const p = new URLSearchParams(params);
    v ? p.set(k, v) : p.delete(k);
    if (k !== "page") p.delete("page");
    location.hash = `#/orders${p.toString() ? "?" + p : ""}`;
  };

  const pages = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));

  view.innerHTML = `
    <div class="mb-6"><h1 class="font-display text-2xl text-burgundy">Orders</h1>
      <p class="text-sm text-charcoal/60">${count ?? 0} order${count === 1 ? "" : "s"}${status ? ` · ${STATUS_LABEL[status]}` : ""}${payment ? ` · Payment ${PAYMENT_LABEL[payment]}` : ""}${q ? ` · matching “${esc(q)}”` : ""}</p></div>

    <div class="ad-card mb-4 flex flex-col gap-3 p-3 md:flex-row md:items-center">
      <form id="searchForm" class="flex flex-1 gap-2">
        <input class="ad-input" name="q" value="${esc(q)}" placeholder="Search order no., name, phone or email" aria-label="Search orders">
        <button class="ad-btn ad-btn--primary">Search</button>
      </form>
      <select id="statusFilter" class="ad-input md:!w-48" aria-label="Filter by status">
        <option value="">All statuses</option>
        ${Object.entries(STATUS_LABEL).map(([k, l]) => `<option value="${k}" ${k === status ? "selected" : ""}>${l}</option>`).join("")}
      </select>
      <select id="paymentFilter" class="ad-input md:!w-44" aria-label="Filter by payment">
        <option value="">All payments</option>
        ${Object.entries(PAYMENT_LABEL).map(([k, l]) => `<option value="${k}" ${k === payment ? "selected" : ""}>Payment ${l}</option>`).join("")}
      </select>
      ${status || payment || q ? `<a href="#/orders" class="text-sm text-burgundy hover:underline md:ml-1">Clear</a>` : ""}
    </div>

    <div class="ad-card overflow-hidden">
      ${data.length ? `<div class="overflow-x-auto"><table class="w-full min-w-[760px]">
        <thead class="bg-ivory/60"><tr>
          <th class="ad-th">Order</th><th class="ad-th">Customer</th><th class="ad-th">Date</th><th class="ad-th">Items</th>
          <th class="ad-th">Status</th><th class="ad-th">Payment</th><th class="ad-th text-right">Total</th></tr></thead>
        <tbody class="divide-y divide-charcoal/5">
          ${data.map((o) => `<tr class="cursor-pointer hover:bg-ivory/50" data-href="#/orders/${o.id}">
            <td class="ad-td font-medium text-burgundy"><a href="#/orders/${o.id}">${esc(o.order_number)}</a></td>
            <td class="ad-td">${esc(o.customer_name)}<br><span class="text-xs text-charcoal/50">${esc(o.customer_phone)} · ${esc(o.city)}</span></td>
            <td class="ad-td whitespace-nowrap text-charcoal/70">${formatDate(o.created_at)}</td>
            <td class="ad-td">${o.order_items.reduce((n, i) => n + i.quantity, 0)}</td>
            <td class="ad-td">${statusPill(o.status)}</td>
            <td class="ad-td">${paymentPill(o.payment_status, o.payment_method, o.upi_ref)}</td>
            <td class="ad-td text-right font-medium">${inr(o.total)}</td></tr>`).join("")}
        </tbody></table></div>`
      : `<p class="p-10 text-center text-sm text-charcoal/55">No orders found.</p>`}
    </div>

    ${pages > 1 ? `<div class="mt-4 flex items-center justify-between text-sm">
      <button class="ad-btn ad-btn--ghost" id="prevPage" ${page <= 1 ? "disabled" : ""}>← Previous</button>
      <span class="text-charcoal/60">Page ${page} of ${pages}</span>
      <button class="ad-btn ad-btn--ghost" id="nextPage" ${page >= pages ? "disabled" : ""}>Next →</button></div>` : ""}`;

  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    setParam("q", e.target.q.value.trim());
  });
  document.getElementById("statusFilter").onchange = (e) => setParam("status", e.target.value);
  document.getElementById("paymentFilter").onchange = (e) => setParam("payment", e.target.value);
  document.getElementById("prevPage")?.addEventListener("click", () => setParam("page", String(page - 1)));
  document.getElementById("nextPage")?.addEventListener("click", () => setParam("page", String(page + 1)));
  view.querySelectorAll("tr[data-href]").forEach((tr) => tr.addEventListener("click", () => (location.hash = tr.dataset.href)));
}

// ============================================================== DETAIL
const NEXT = {
  order_received: { status: "confirmed", label: "Confirm Order" },
  confirmed: { status: "shipped", label: "Mark as Shipped" },
  shipped: { status: "delivered", label: "Mark as Delivered" },
};

export async function renderOrderDetail(view, id) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid order id");
  const { data: o, error } = await sb.from("orders")
    .select(`*, order_items(*), order_status_history(*), notification_log(event, channel, recipient, success, detail, created_at)`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!o) { view.innerHTML = `<div class="ad-card p-6">Order not found. <a class="text-burgundy underline" href="#/orders">Back to orders</a></div>`; return; }

  const history = [...o.order_status_history].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const notifs = [...o.notification_log].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const next = NEXT[o.status];
  const canCancel = !["delivered", "cancelled"].includes(o.status);
  const phone = o.customer_phone;
  const itemsCount = o.order_items.reduce((n, i) => n + i.quantity, 0);

  view.innerHTML = `
    <a href="#/orders" class="text-sm text-charcoal/60 hover:text-burgundy">← All orders</a>
    <div class="mb-6 mt-2 flex flex-wrap items-center gap-3">
      <h1 class="font-display text-2xl text-burgundy">${esc(o.order_number)}</h1>
      ${statusPill(o.status)} ${paymentPill(o.payment_status, o.payment_method, o.upi_ref)}
      <span class="text-sm text-charcoal/55">Placed ${formatDate(o.created_at)}</span>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div class="space-y-6">
        <section class="ad-card overflow-hidden">
          <h2 class="border-b border-charcoal/10 px-5 py-3 font-semibold">Products (${itemsCount})</h2>
          <div class="overflow-x-auto"><table class="w-full min-w-[520px]">
            <thead class="bg-ivory/60"><tr><th class="ad-th">Product</th><th class="ad-th">Size</th><th class="ad-th text-right">Price</th><th class="ad-th text-right">Qty</th><th class="ad-th text-right">Total</th></tr></thead>
            <tbody class="divide-y divide-charcoal/5">
              ${o.order_items.map((i) => `<tr>
                <td class="ad-td"><div class="flex items-center gap-3">
                  ${i.image_url ? `<img src="${esc(i.image_url)}" alt="" class="h-14 w-11 rounded object-cover">` : `<div class="h-14 w-11 rounded bg-burgundy/10"></div>`}
                  <span class="font-medium">${esc(i.product_name)}</span></div></td>
                <td class="ad-td"><span class="rounded border border-charcoal/15 px-2 py-0.5 text-xs font-semibold">${esc(i.size_label)}</span></td>
                <td class="ad-td text-right">${inr(i.unit_price)}</td>
                <td class="ad-td text-right">${i.quantity}</td>
                <td class="ad-td text-right font-medium">${inr(i.line_total)}</td></tr>`).join("")}
            </tbody></table></div>
          <dl class="space-y-1 border-t border-charcoal/10 px-5 py-4 text-sm">
            <div class="flex justify-between"><dt class="text-charcoal/60">Subtotal</dt><dd>${inr(o.subtotal)}</dd></div>
            <div class="flex justify-between"><dt class="text-charcoal/60">Shipping</dt><dd>${inr(o.shipping_fee)}</dd></div>
            <div class="flex justify-between pt-1 text-base font-semibold"><dt>Total (${PAYMENT_METHOD_LABEL[o.payment_method] || "Cash on Delivery"})</dt><dd class="text-burgundy">${inr(o.total)}</dd></div>
          </dl>
        </section>

        <div class="grid gap-6 md:grid-cols-2">
          <section class="ad-card p-5">
            <h2 class="mb-3 font-semibold">Customer</h2>
            <p class="font-medium">${esc(o.customer_name)}</p>
            <p class="mt-1 text-sm"><a class="text-burgundy hover:underline" href="tel:+91${esc(phone)}">+91 ${esc(phone)}</a>
              · <a class="text-green-700 hover:underline" href="https://wa.me/91${esc(phone)}" target="_blank" rel="noopener">WhatsApp</a></p>
            <p class="mt-1 break-all text-sm"><a class="text-burgundy hover:underline" href="mailto:${esc(o.customer_email)}">${esc(o.customer_email)}</a></p>
            ${o.notes ? `<p class="mt-3 rounded bg-amber-50 p-3 text-sm"><span class="font-medium">Note:</span> ${esc(o.notes)}</p>` : ""}
          </section>
          <section class="ad-card p-5">
            <h2 class="mb-3 font-semibold">Shipping address</h2>
            <address class="text-sm not-italic leading-6">${esc(o.customer_name)}<br>${esc(o.address_line1)}<br>
              ${o.address_line2 ? esc(o.address_line2) + "<br>" : ""}${esc(o.city)}, ${esc(o.state)} – ${esc(o.pincode)}</address>
            ${o.courier_name || o.tracking_number ? `<p class="mt-3 text-sm"><span class="text-charcoal/60">Courier:</span> ${esc(o.courier_name || "—")}<br><span class="text-charcoal/60">Tracking:</span> ${esc(o.tracking_number || "—")}</p>` : ""}
            ${o.cancel_reason ? `<p class="mt-3 text-sm text-red-700"><span class="font-medium">Cancelled:</span> ${esc(o.cancel_reason)}</p>` : ""}
          </section>
        </div>

        <section class="ad-card p-5">
          <h2 class="mb-4 font-semibold">History</h2>
          <ol class="relative space-y-4 border-l border-charcoal/15 pl-5">
            ${history.map((h) => `<li class="relative">
              <span class="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full ${h.change_type === "payment" ? "bg-green-600" : "bg-burgundy"}"></span>
              <p class="text-sm"><span class="font-medium">${h.change_type === "payment" ? "Payment" : "Status"}:</span>
                ${h.from_value ? `${esc(labelFor(h.change_type, h.from_value))} → ` : ""}${esc(labelFor(h.change_type, h.to_value))}</p>
              ${h.note ? `<p class="text-sm text-charcoal/70">${esc(h.note)}</p>` : ""}
              <p class="text-xs text-charcoal/50">${formatDate(h.created_at)}${h.changed_by ? " · by admin" : ""}</p></li>`).join("")}
          </ol>
        </section>

        <section class="ad-card p-5">
          <h2 class="mb-3 font-semibold">Notifications</h2>
          ${notifs.length ? `<ul class="divide-y divide-charcoal/5 text-sm">
            ${notifs.map((n) => `<li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span class="ad-pill ${n.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}">${n.success ? "Sent" : "Failed"}</span>
              <span class="uppercase text-xs text-charcoal/60">${esc(n.channel)}</span>
              <span>${esc(n.event.replace("_", " "))} → ${esc(n.recipient)}</span>
              <span class="ml-auto text-xs text-charcoal/50">${formatDate(n.created_at)}</span>
              ${!n.success ? `<p class="w-full text-xs text-red-700">${esc(n.detail)}</p>` : ""}</li>`).join("")}</ul>`
          : `<p class="text-sm text-charcoal/55">No notifications recorded yet (they can take a few seconds to appear).</p>`}
        </section>
      </div>

      <aside class="space-y-6">
        <section class="ad-card p-5">
          <h2 class="mb-1 font-semibold">Order status</h2>
          <p class="mb-4 text-sm text-charcoal/60">Current: ${STATUS_LABEL[o.status]}. The customer is emailed on every change.</p>
          ${next ? `
            <form id="nextForm" class="space-y-3">
              ${next.status === "shipped" ? `
                <div><label class="ad-label" for="courier">Courier</label><input class="ad-input" id="courier" maxlength="80" placeholder="e.g. Delhivery"></div>
                <div><label class="ad-label" for="tracking">Tracking number</label><input class="ad-input" id="tracking" maxlength="80"></div>` : ""}
              <div><label class="ad-label" for="nextNote">Internal note (optional)</label><input class="ad-input" id="nextNote" maxlength="500"></div>
              <button class="ad-btn ad-btn--primary w-full">${next.label}</button>
            </form>` : `<p class="rounded bg-ivory p-3 text-sm text-charcoal/70">This order is ${STATUS_LABEL[o.status].toLowerCase()} — no further status changes.</p>`}

          ${canCancel ? `
            <details class="mt-5 border-t border-charcoal/10 pt-4">
              <summary class="cursor-pointer text-sm font-medium text-red-700">Cancel order…</summary>
              <form id="cancelForm" class="mt-3 space-y-3">
                <div><label class="ad-label" for="cancelReason">Reason (sent to customer) *</label>
                  <textarea class="ad-input" id="cancelReason" rows="2" maxlength="500" required></textarea></div>
                <p class="text-xs text-charcoal/60">Stock for these items will be returned to inventory.</p>
                <button class="ad-btn ad-btn--danger w-full">Cancel this order</button>
              </form>
            </details>` : ""}
        </section>

        <section class="ad-card p-5">
          <h2 class="mb-1 font-semibold">Payment (${PAYMENT_METHOD_LABEL[o.payment_method] || esc(o.payment_method)})</h2>
          <p class="mb-4 text-sm">Status: ${paymentPill(o.payment_status, o.payment_method, o.upi_ref)}${o.paid_at ? `<br><span class="text-xs text-charcoal/55">Paid ${formatDate(o.paid_at)}</span>` : ""}</p>
          ${o.payment_method === "upi" ? (o.upi_ref
            ? `<div class="mb-4 rounded bg-amber-50 p-3 text-sm"><p class="text-xs uppercase tracking-wider text-charcoal/60">Customer's UPI reference (UTR)</p>
                <p class="mt-1 font-mono text-lg font-semibold tracking-wider">${esc(o.upi_ref)}</p>
                <p class="text-xs text-charcoal/55">Submitted ${formatDate(o.upi_ref_at)}</p>
                ${o.payment_status === "pending" ? `<p class="mt-2 text-xs text-charcoal/70">Open your bank / UPI app and check that <strong>${inr(o.total)}</strong> was received with this UTR before marking as paid.</p>` : ""}</div>`
            : `<p class="mb-4 rounded bg-ivory p-3 text-sm text-charcoal/70">Waiting for the customer to pay by UPI and submit their UTR. You can also mark it paid if you see the payment in your bank app.</p>`) : ""}
          ${o.payment_status === "pending" && o.status !== "cancelled" ? `
            <form id="payForm" class="space-y-3">
              <div><label class="ad-label" for="payNote">Note (optional)</label><input class="ad-input" id="payNote" maxlength="500" placeholder="${o.payment_method === "upi" ? "e.g. Verified in bank app" : "e.g. Collected by courier"}"></div>
              <button class="ad-btn ad-btn--primary w-full bg-green-700 hover:bg-green-800">Mark ${inr(o.total)} as Paid</button>
            </form>` : ""}
          ${o.payment_status === "paid" ? `<button id="unpayBtn" class="ad-btn ad-btn--ghost w-full">Revert to Pending</button>` : ""}
        </section>
      </aside>
    </div>`;

  const reload = () => renderOrderDetail(view, id);

  async function submit(body, btn, okMsg) {
    btn.disabled = true;
    const orig = btn.textContent;
    btn.textContent = "Saving…";
    try {
      await callFunction("admin-update-order", { order_id: id, ...body }, await accessToken());
      toast(okMsg);
      await reload();
    } catch (e) {
      toast(e.message, true);
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  document.getElementById("nextForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    submit({
      action: "status",
      status: next.status,
      note: document.getElementById("nextNote").value,
      courier_name: document.getElementById("courier")?.value || "",
      tracking_number: document.getElementById("tracking")?.value || "",
    }, e.submitter, `Order ${STATUS_LABEL[next.status].toLowerCase()}`);
  });

  document.getElementById("cancelForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const reason = document.getElementById("cancelReason").value.trim();
    if (!reason) return toast("Please enter a reason", true);
    if (!confirm(`Cancel order ${o.order_number}? The customer will be notified.`)) return;
    submit({ action: "status", status: "cancelled", note: reason }, e.submitter, "Order cancelled");
  });

  document.getElementById("payForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    submit({ action: "payment", payment_status: "paid", note: document.getElementById("payNote").value }, e.submitter, "Payment marked as paid");
  });

  document.getElementById("unpayBtn")?.addEventListener("click", (e) => {
    if (!confirm("Set payment back to Pending?")) return;
    submit({ action: "payment", payment_status: "pending", note: "Reverted by admin" }, e.currentTarget, "Payment set to pending");
  });
}

function labelFor(type, v) {
  if (v === "upi_ref_submitted") return "UPI reference submitted";
  return (type === "payment" ? PAYMENT_LABEL : STATUS_LABEL)[v] || v;
}
