// POST /functions/v1/submit-upi-ref  { order_number, token, upi_ref }
// Public endpoint used by order.html after a UPI payment. The buyer proves
// ownership of the order with its secret access token and records the
// 12-digit UPI reference (UTR). This does NOT mark the order as paid: an admin
// checks the bank account and confirms the payment in the admin panel.
import { friendlyDbError, json, preflight, runInBackground, serviceClient } from "../_shared/http.ts";
import { isUuid } from "../_shared/validate.ts";
import { notifyOrderEvent } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  let body: { order_number?: unknown; token?: unknown; upi_ref?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid request." }, 400);
  }

  const orderNumber = typeof body.order_number === "string" ? body.order_number.trim() : "";
  if (!/^VS\d{6}-\d{5,}$/.test(orderNumber) || !isUuid(body.token)) {
    return json(req, { error: "Order not found." }, 404);
  }
  const ref = String(body.upi_ref ?? "").replace(/\s/g, "");
  if (!/^\d{12}$/.test(ref)) {
    return json(req, { error: "Please enter the 12-digit UPI reference number (UTR).", fields: { upi_ref: "Enter the 12-digit UTR / UPI reference number." } }, 422);
  }

  const db = serviceClient();
  const { data, error } = await db.rpc("submit_upi_ref", {
    p_order_number: orderNumber,
    p_token: body.token,
    p_ref: ref,
  });
  if (error) {
    const f = friendlyDbError(error.message);
    if (f.status === 500) console.error("submit_upi_ref failed", error);
    return json(req, { error: f.error }, f.status);
  }

  const result = data as { order_id: string; changed: boolean };
  if (result.changed) await runInBackground(notifyOrderEvent(db, result.order_id, "upi_submitted"));

  return json(req, { ok: true, upi_ref: ref });
});
