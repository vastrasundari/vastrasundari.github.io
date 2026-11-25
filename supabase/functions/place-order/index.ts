// POST /functions/v1/place-order
// Public endpoint used by checkout.html. Validates input, creates the order
// atomically in Postgres (prices + stock from the DB), then sends notifications.
import { friendlyDbError, json, preflight, runInBackground, serviceClient } from "../_shared/http.ts";
import { validateCheckout } from "../_shared/validate.ts";
import { notifyOrderEvent } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json(req, { error: "Request too large." }, 413);
    body = JSON.parse(raw);
  } catch {
    return json(req, { error: "Invalid request." }, 400);
  }

  // Honeypot: real customers never see or fill this field.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return json(req, { error: "Unable to place order." }, 400);
  }

  const v = validateCheckout(body);
  if (!v.ok) return json(req, { error: "Please correct the highlighted fields.", fields: v.errors }, 422);

  const db = serviceClient();
  const { data, error } = await db.rpc("create_order", {
    p_customer: v.data.customer,
    p_address: v.data.address,
    p_items: v.data.items,
    p_notes: v.data.notes,
    p_payment_method: v.data.payment_method,
  });

  if (error) {
    console.error("create_order failed", error);
    const f = friendlyDbError(error.message);
    return json(req, { error: f.error }, f.status);
  }

  const result = data as { order_id: string; order_number: string; access_token: string };

  // Customer + admin email and business WhatsApp alert — after the response where supported.
  await runInBackground(notifyOrderEvent(db, result.order_id, "order_placed"));

  return json(req, { order_number: result.order_number, access_token: result.access_token }, 201);
});
