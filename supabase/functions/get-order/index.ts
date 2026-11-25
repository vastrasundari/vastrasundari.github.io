// POST /functions/v1/get-order  { order_number, token }
// Lets a customer view ONLY their own order, using the secret access token
// that was returned at checkout and included in their emails.
import { json, preflight, serviceClient } from "../_shared/http.ts";
import { isUuid } from "../_shared/validate.ts";

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  let body: { order_number?: unknown; token?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid request." }, 400);
  }

  const orderNumber = typeof body.order_number === "string" ? body.order_number.trim() : "";
  if (!/^VS\d{6}-\d{5,}$/.test(orderNumber) || !isUuid(body.token)) {
    return json(req, { error: "Order not found." }, 404);
  }

  const db = serviceClient();
  const { data, error } = await db
    .from("orders")
    .select(`order_number, created_at, status, payment_status, payment_method, upi_ref, upi_ref_at,
             customer_name, address_line1, address_line2, city, state, pincode,
             subtotal, shipping_fee, total, courier_name, tracking_number, cancel_reason,
             order_items(product_name, size_label, image_url, unit_price, quantity, line_total)`)
    .eq("order_number", orderNumber)
    .eq("access_token", body.token)
    .maybeSingle();

  if (error) {
    console.error("get-order failed", error);
    return json(req, { error: "Something went wrong." }, 500);
  }
  if (!data) return json(req, { error: "Order not found." }, 404);
  return json(req, { order: data });
});
