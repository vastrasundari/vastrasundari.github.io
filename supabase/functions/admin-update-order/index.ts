// POST /functions/v1/admin-update-order
// Admin-only. Body:
//   { order_id, action: "status",  status: "confirmed"|"shipped"|"delivered"|"cancelled",
//     note?, courier_name?, tracking_number? }
//   { order_id, action: "payment", payment_status: "pending"|"paid", note? }
// Requires the admin's Supabase Auth access token in the Authorization header.
import { friendlyDbError, json, preflight, runInBackground, serviceClient } from "../_shared/http.ts";
import { isUuid } from "../_shared/validate.ts";
import { notifyOrderEvent, type OrderEvent } from "../_shared/notify.ts";

const STATUSES = ["confirmed", "shipped", "delivered", "cancelled"] as const;
const PAYMENT = ["pending", "paid"] as const;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;

  const db = serviceClient();

  // 1. Authenticate the caller and confirm they are an admin.
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt) return json(req, { error: "Not signed in." }, 401);
  const { data: userData, error: userErr } = await db.auth.getUser(jwt);
  if (userErr || !userData?.user) return json(req, { error: "Session expired. Please sign in again." }, 401);
  const userId = userData.user.id;

  const { data: admin } = await db.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  if (!admin) return json(req, { error: "You do not have admin access." }, 403);

  // 2. Validate the request.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "Invalid request." }, 400);
  }
  if (!isUuid(body.order_id)) return json(req, { error: "Invalid order." }, 400);
  const note = clip(body.note, 500);

  // 3. Apply the change atomically in Postgres.
  if (body.action === "status") {
    const status = body.status as typeof STATUSES[number];
    if (!STATUSES.includes(status)) return json(req, { error: "Invalid status." }, 400);

    const { error } = await db.rpc("apply_order_status", {
      p_order_id: body.order_id,
      p_new_status: status,
      p_actor: userId,
      p_note: note,
      p_courier: clip(body.courier_name, 80),
      p_tracking: clip(body.tracking_number, 80),
    });
    if (error) {
      const f = friendlyDbError(error.message);
      if (f.status === 500) console.error("apply_order_status failed", error);
      return json(req, { error: f.error }, f.status);
    }
    await runInBackground(notifyOrderEvent(db, body.order_id as string, status as OrderEvent));
    return json(req, { ok: true });
  }

  if (body.action === "payment") {
    const ps = body.payment_status as typeof PAYMENT[number];
    if (!PAYMENT.includes(ps)) return json(req, { error: "Invalid payment status." }, 400);
    const { error } = await db.rpc("apply_payment_status", {
      p_order_id: body.order_id,
      p_new_status: ps,
      p_actor: userId,
      p_note: note,
    });
    if (error) {
      const f = friendlyDbError(error.message);
      if (f.status === 500) console.error("apply_payment_status failed", error);
      return json(req, { error: f.error }, f.status);
    }
    return json(req, { ok: true });
  }

  return json(req, { error: "Unknown action." }, 400);
});
