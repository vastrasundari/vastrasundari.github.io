// Shared Supabase client for the storefront and admin (ES module).
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const cfg = window.VS_CONFIG || {};
export const isConfigured = Boolean(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);

export const sb = isConfigured
  ? createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: "vs-auth" },
    })
  : null;

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || null;
  }
}

/** Calls an Edge Function and throws ApiError with the server's message on failure. */
export async function callFunction(name, body, accessToken) {
  if (!isConfigured) throw new ApiError("The store is not connected yet. Please try again later.", 503);
  let res;
  try {
    res = await fetch(`${cfg.SUPABASE_URL}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: cfg.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken || cfg.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Network error — please check your connection and try again.", 0);
  }
  let data = {};
  try { data = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status, data.fields);
  return data;
}

export const NOT_CONFIGURED_HTML = `
  <div class="vs-empty">
    <p class="font-display text-2xl text-burgundy">Our boutique is being prepared</p>
    <p class="mt-2 text-sm text-charcoal/70">The collection will appear here once the store is connected.</p>
  </div>`;
