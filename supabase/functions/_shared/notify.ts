// Email (Resend) + WhatsApp Business Cloud API notifications.
// All credentials come from Edge Function secrets — never from the browser.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

export type OrderEvent = "order_placed" | "confirmed" | "shipped" | "delivered" | "cancelled" | "upi_submitted";

const env = (k: string) => (Deno.env.get(k) ?? "").trim();
const list = (k: string) => env(k).split(",").map((s) => s.trim()).filter(Boolean);

const BRAND = "Vastra Sundari";
const SITE_URL = () => env("SITE_URL").replace(/\/$/, "");

const inr = (n: number | string) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

interface OrderRow {
  id: string; order_number: string; access_token: string;
  customer_name: string; customer_email: string; customer_phone: string;
  address_line1: string; address_line2: string | null; city: string; state: string; pincode: string;
  notes: string | null; subtotal: number; shipping_fee: number; total: number;
  status: string; payment_status: string; payment_method: string; upi_ref: string | null; courier_name: string | null; tracking_number: string | null;
  cancel_reason: string | null; created_at: string;
  order_items: { product_name: string; size_label: string; quantity: number; unit_price: number; line_total: number }[];
}

const isUpi = (o: OrderRow) => o.payment_method === "upi";
const METHOD_LABEL = (o: OrderRow) => (isUpi(o) ? "UPI" : "Cash on Delivery");
const totalLabel = (o: OrderRow) => (isUpi(o) ? "Total (UPI)" : "Total (COD)");

// Events without an entry here (upi_submitted) notify the store team only.
const CUSTOMER_COPY: Partial<Record<OrderEvent, { subject: (o: OrderRow) => string; heading: string; body: (o: OrderRow) => string }>> = {
  order_placed: {
    subject: (o) => `We've received your order ${o.order_number}`,
    heading: "Thank you for your order",
    body: (o) => isUpi(o)
      ? `We have received your order. Please complete your payment of <strong>${inr(o.total)}</strong> by <strong>UPI</strong>: open your order page with the button below to scan the QR code or pay with any UPI app, then enter the 12-digit UPI reference number (UTR). We will confirm your order as soon as the payment reaches us.`
      : `We have received your order and our team will confirm it shortly. Payment is <strong>Cash on Delivery</strong> — please keep the amount ready when your parcel arrives.`,
  },
  confirmed: {
    subject: (o) => `Your order ${o.order_number} is confirmed`,
    heading: "Your order is confirmed",
    body: () => `Wonderful news — your order has been confirmed and is now being carefully prepared and packed by our team.`,
  },
  shipped: {
    subject: (o) => `Your order ${o.order_number} has been shipped`,
    heading: "Your order is on its way",
    body: (o) =>
      `Your Chaniya Choli has left our studio.` +
      (o.courier_name || o.tracking_number
        ? `<br><br><strong>Courier:</strong> ${esc(o.courier_name ?? "—")}<br><strong>Tracking number:</strong> ${esc(o.tracking_number ?? "—")}`
        : "") +
      (!isUpi(o) && o.payment_status !== "paid" ? `<br><br>Please keep <strong>${inr(o.total)}</strong> ready for Cash on Delivery.` : ""),
  },
  delivered: {
    subject: (o) => `Your order ${o.order_number} has been delivered`,
    heading: "Delivered with love",
    body: () => `Your order has been delivered. We hope it makes every celebration more beautiful. Thank you for choosing ${BRAND}.`,
  },
  cancelled: {
    subject: (o) => `Your order ${o.order_number} has been cancelled`,
    heading: "Your order has been cancelled",
    body: (o) =>
      `Your order has been cancelled.` +
      (o.cancel_reason ? `<br><br><strong>Reason:</strong> ${esc(o.cancel_reason)}` : "") +
      (isUpi(o) && (o.payment_status === "paid" || o.upi_ref)
        ? `<br><br>If you have already paid by UPI, the amount of <strong>${inr(o.total)}</strong> will be refunded to your account. If you have any questions, simply reply to this email.`
        : `<br><br>No payment is due. If you have any questions, simply reply to this email.`),
  },
};

const EVENT_LABEL: Record<OrderEvent, string> = {
  order_placed: "New order received",
  confirmed: "Order confirmed",
  shipped: "Order shipped",
  delivered: "Order delivered",
  cancelled: "Order cancelled",
  upi_submitted: "UPI payment submitted",
};

function itemsTable(o: OrderRow): string {
  const rows = o.order_items.map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #eee3cc;font-size:14px;color:#252323">
        ${esc(i.product_name)}<br><span style="font-size:12px;color:#7a6f6f">Size: ${esc(i.size_label)} · Qty: ${i.quantity}</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #eee3cc;font-size:14px;color:#252323;text-align:right;white-space:nowrap">${inr(i.line_total)}</td>
    </tr>`).join("");
  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px">
    ${rows}
    <tr><td style="padding:8px 0 0;font-size:13px;color:#7a6f6f">Subtotal</td><td style="padding:8px 0 0;text-align:right;font-size:13px;color:#7a6f6f">${inr(o.subtotal)}</td></tr>
    <tr><td style="padding:4px 0;font-size:13px;color:#7a6f6f">Shipping</td><td style="padding:4px 0;text-align:right;font-size:13px;color:#7a6f6f">${Number(o.shipping_fee) === 0 ? "Complimentary" : inr(o.shipping_fee)}</td></tr>
    <tr><td style="padding:8px 0;font-size:16px;color:#641B32;font-weight:bold">${totalLabel(o)}</td><td style="padding:8px 0;text-align:right;font-size:16px;color:#641B32;font-weight:bold">${inr(o.total)}</td></tr>
  </table>`;
}

function address(o: OrderRow): string {
  return [o.customer_name, o.address_line1, o.address_line2, `${o.city}, ${o.state} ${o.pincode}`, `Phone: ${o.customer_phone}`]
    .filter(Boolean).map(esc).join("<br>");
}

function layout(heading: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#FAF7F0;font-family:Georgia,'Times New Roman',serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FAF7F0;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border:1px solid #e8dcc0">
        <tr><td style="background:#641B32;padding:28px;text-align:center">
          <div style="font-size:22px;letter-spacing:6px;color:#FAF7F0">VASTRA SUNDARI</div>
          <div style="font-size:12px;font-style:italic;color:#C5A04A;margin-top:6px">The Art of Traditional Elegance</div>
        </td></tr>
        <tr><td style="padding:32px 28px;font-family:Arial,Helvetica,sans-serif;color:#252323;line-height:1.6">
          <h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;color:#641B32;margin:0 0 16px">${heading}</h1>
          ${inner}
        </td></tr>
        <tr><td style="background:#FAF7F0;padding:18px;text-align:center;font-family:Arial,sans-serif;font-size:11px;color:#7a6f6f;border-top:1px solid #e8dcc0">
          ${BRAND} · Exclusive Gujarati Chaniya Choli
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}

function customerEmail(o: OrderRow, event: OrderEvent) {
  const copy = CUSTOMER_COPY[event];
  if (!copy) return null;
  const link = SITE_URL() ? `${SITE_URL()}/order.html?no=${encodeURIComponent(o.order_number)}&t=${o.access_token}` : "";
  const inner = `
    <p style="margin:0 0 8px;font-size:14px">Dear ${esc(o.customer_name)},</p>
    <p style="margin:0;font-size:14px">${copy.body(o)}</p>
    <p style="margin:24px 0 0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C5A04A">Order ${esc(o.order_number)}</p>
    ${itemsTable(o)}
    <p style="margin:24px 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C5A04A">Delivery address</p>
    <p style="margin:0;font-size:14px">${address(o)}</p>
    ${link ? `<p style="margin:28px 0 0;text-align:center"><a href="${esc(link)}" style="display:inline-block;background:#641B32;color:#FAF7F0;text-decoration:none;padding:12px 28px;font-size:12px;letter-spacing:2px;text-transform:uppercase">View your order</a></p>` : ""}`;
  return {
    subject: copy.subject(o),
    html: layout(copy.heading, inner),
    text: `${copy.heading}\n\nOrder ${o.order_number}\n${totalLabel(o)}: ${inr(o.total)}\n${link}`,
  };
}

function adminEmail(o: OrderRow, event: OrderEvent) {
  const admin = SITE_URL() ? `${SITE_URL()}/admin/#/orders/${o.id}` : "";
  const inner = `
    <p style="margin:0;font-size:14px"><strong>${esc(EVENT_LABEL[event])}</strong> — ${esc(o.order_number)}</p>
    <p style="margin:8px 0 0;font-size:14px">Customer: ${esc(o.customer_name)} · ${esc(o.customer_phone)} · ${esc(o.customer_email)}</p>
    <p style="margin:4px 0 0;font-size:14px">Status: ${esc(o.status)} · Payment: ${esc(o.payment_status)} (${METHOD_LABEL(o)})</p>
    ${o.upi_ref ? `<p style="margin:4px 0 0;font-size:14px"><strong>UPI reference (UTR): ${esc(o.upi_ref)}</strong> — check your bank account for ${inr(o.total)} before marking the order as paid.</p>` : ""}
    ${o.cancel_reason && event === "cancelled" ? `<p style="margin:4px 0 0;font-size:14px">Reason: ${esc(o.cancel_reason)}</p>` : ""}
    ${o.notes ? `<p style="margin:4px 0 0;font-size:14px">Customer note: ${esc(o.notes)}</p>` : ""}
    ${itemsTable(o)}
    <p style="margin:24px 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#C5A04A">Ship to</p>
    <p style="margin:0;font-size:14px">${address(o)}</p>
    ${admin ? `<p style="margin:28px 0 0;text-align:center"><a href="${esc(admin)}" style="display:inline-block;background:#641B32;color:#FAF7F0;text-decoration:none;padding:12px 28px;font-size:12px;letter-spacing:2px;text-transform:uppercase">Open in admin</a></p>` : ""}`;
  return {
    subject: `[${BRAND}] ${EVENT_LABEL[event]}: ${o.order_number} — ${inr(o.total)}`,
    html: layout(EVENT_LABEL[event], inner),
    text: `${EVENT_LABEL[event]}: ${o.order_number}\n${o.customer_name} ${o.customer_phone}\nTotal: ${inr(o.total)}\n${admin}`,
  };
}

async function sendEmail(to: string, msg: { subject: string; html: string; text: string }): Promise<string> {
  const key = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM");
  if (!key || !from) throw new Error("Email not configured (RESEND_API_KEY / EMAIL_FROM)");
  const body: Record<string, unknown> = { from, to: [to], subject: msg.subject, html: msg.html, text: msg.text };
  if (env("EMAIL_REPLY_TO")) body.reply_to = env("EMAIL_REPLY_TO");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  return text.slice(0, 200);
}

// WhatsApp template parameters may not contain newlines/tabs or 4+ consecutive spaces.
const waParam = (s: string) => s.replace(/[\n\r\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 200) || "-";

async function sendWhatsApp(to: string, o: OrderRow, event: OrderEvent): Promise<string> {
  const token = env("WHATSAPP_ACCESS_TOKEN");
  const phoneId = env("WHATSAPP_PHONE_NUMBER_ID");
  const template = env("WHATSAPP_TEMPLATE_NAME") || "order_alert";
  const lang = env("WHATSAPP_TEMPLATE_LANG") || "en";
  const version = env("WHATSAPP_API_VERSION") || "v21.0";
  if (!token || !phoneId) throw new Error("WhatsApp not configured (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID)");

  const items = o.order_items.map((i) => `${i.product_name} (${i.size_label}) x${i.quantity}`).join(", ");
  // Template body (see README): {{1}} event, {{2}} order no, {{3}} customer, {{4}} phone, {{5}} amount, {{6}} items
  const params = [EVENT_LABEL[event], o.order_number, o.customer_name, o.customer_phone, inr(o.total), items]
    .map((t) => ({ type: "text", text: waParam(t) }));

  const res = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/[^\d]/g, ""),
      type: "template",
      template: { name: template, language: { code: lang }, components: [{ type: "body", parameters: params }] },
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${text.slice(0, 300)}`);
  return text.slice(0, 200);
}

/** Sends every notification for an order event and records each attempt in notification_log. */
export async function notifyOrderEvent(db: SupabaseClient, orderId: string, event: OrderEvent): Promise<void> {
  const { data: order, error } = await db
    .from("orders")
    .select("*, order_items(product_name,size_label,quantity,unit_price,line_total)")
    .eq("id", orderId)
    .single<OrderRow>();
  if (error || !order) {
    console.error("notify: order not found", orderId, error);
    return;
  }

  const jobs: { channel: "email" | "whatsapp"; recipient: string; run: () => Promise<string> }[] = [];

  const c = customerEmail(order, event);
  if (c) jobs.push({ channel: "email", recipient: order.customer_email, run: () => sendEmail(order.customer_email, c) });

  const a = adminEmail(order, event);
  for (const to of list("ADMIN_EMAILS")) jobs.push({ channel: "email", recipient: to, run: () => sendEmail(to, a) });

  for (const to of list("WHATSAPP_ADMIN_NUMBERS")) {
    jobs.push({ channel: "whatsapp", recipient: to, run: () => sendWhatsApp(to, order, event) });
  }

  const results = await Promise.allSettled(jobs.map((j) => j.run()));
  const rows = results.map((r, i) => ({
    order_id: order.id,
    event,
    channel: jobs[i].channel,
    recipient: jobs[i].recipient,
    success: r.status === "fulfilled",
    detail: r.status === "fulfilled" ? r.value : String((r as PromiseRejectedResult).reason?.message ?? r.reason).slice(0, 500),
  }));
  rows.filter((r) => !r.success).forEach((r) => console.error(`notify ${r.channel} → ${r.recipient} failed: ${r.detail}`));
  if (rows.length) await db.from("notification_log").insert(rows);
}
