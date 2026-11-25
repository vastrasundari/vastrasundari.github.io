// Shared HTTP helpers: CORS, JSON responses, Supabase service client.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  // If ALLOWED_ORIGINS is not configured, fall back to "*" (endpoints still
  // enforce their own auth/validation; CORS is not a security boundary).
  const allowOrigin = allowed.length === 0 ? "*" : allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  return null;
}

/** Service-role client. Bypasses RLS — use only inside Edge Functions. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not available");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Run work after the response is sent when the runtime supports it. */
// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;
export function runInBackground(p: Promise<unknown>): Promise<unknown> | void {
  const guarded = p.catch((e) => console.error("background task failed", e));
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(guarded);
    return;
  }
  return guarded;
}

/** Maps database exception codes raised in schema.sql to customer-friendly messages. */
export function friendlyDbError(message: string): { status: number; error: string } {
  const m = message ?? "";
  if (m.includes("OUT_OF_STOCK:")) {
    const what = m.split("OUT_OF_STOCK:")[1]?.trim();
    return { status: 409, error: `Sorry, ${what} no longer has enough stock. Please update your bag.` };
  }
  const map: Record<string, [number, string]> = {
    CART_EMPTY: [400, "Your bag is empty."],
    CART_TOO_LARGE: [400, "Too many items in one order."],
    INVALID_QUANTITY: [400, "Each item can be ordered in quantities of 1 to 10."],
    PRODUCT_UNAVAILABLE: [409, "One of the items in your bag is no longer available. Please update your bag."],
    RATE_LIMITED: [429, "Too many orders were placed from this phone number recently. Please try again later or contact us."],
    ORDER_NOT_FOUND: [404, "Order not found."],
    INVALID_TRANSITION: [409, "That status change is not allowed from the order's current status."],
    CANCEL_REASON_REQUIRED: [400, "Please enter a reason for cancelling."],
    PAYMENT_UNCHANGED: [409, "Payment status is already set to that value."],
    ORDER_CANCELLED: [409, "This order has been cancelled."],
    INVALID_PAYMENT_METHOD: [400, "Please choose a payment method."],
    NOT_UPI_ORDER: [409, "This order is not a UPI order."],
    ALREADY_PAID: [409, "Payment for this order has already been confirmed."],
    INVALID_UPI_REF: [400, "Please enter the 12-digit UPI reference number (UTR)."],
  };
  for (const [code, [status, error]] of Object.entries(map)) {
    if (m.includes(code)) return { status, error };
  }
  return { status: 500, error: "Something went wrong. Please try again." };
}
