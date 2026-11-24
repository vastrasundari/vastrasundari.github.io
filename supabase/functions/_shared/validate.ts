// Server-side checkout validation. Never trust the browser.

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka",
  "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

function str(v: unknown): string {
  return typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim() : "";
}

/** Normalises +91 / 0 prefixes, spaces and dashes to a 10-digit Indian mobile number. */
export function normalisePhone(v: unknown): string {
  let d = String(v ?? "").replace(/[^\d]/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

export interface CheckoutInput {
  customer: { full_name: string; email: string; phone: string };
  address: { line1: string; line2: string; city: string; state: string; pincode: string };
  items: { size_id: string; quantity: number }[];
  notes: string;
}

export function validateCheckout(body: unknown):
  { ok: true; data: CheckoutInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const b = (body ?? {}) as Record<string, any>;
  const c = (b.customer ?? {}) as Record<string, unknown>;
  const a = (b.address ?? {}) as Record<string, unknown>;

  const full_name = str(c.full_name);
  const email = str(c.email).toLowerCase();
  const phone = normalisePhone(c.phone);
  const line1 = str(a.line1);
  const line2 = str(a.line2);
  const city = str(a.city);
  const state = str(a.state);
  const pincode = str(a.pincode).replace(/\s/g, "");
  const notes = str(b.notes);

  if (full_name.length < 2 || full_name.length > 100 || !/^[\p{L} .'-]+$/u.test(full_name))
    errors.full_name = "Please enter your full name.";
  if (!EMAIL.test(email) || email.length > 254) errors.email = "Please enter a valid email address.";
  if (!/^[6-9]\d{9}$/.test(phone)) errors.phone = "Please enter a valid 10-digit Indian mobile number.";
  if (line1.length < 5 || line1.length > 200) errors.line1 = "Please enter your full address.";
  if (line2.length > 200) errors.line2 = "Address line 2 is too long.";
  if (city.length < 2 || city.length > 60) errors.city = "Please enter your city.";
  if (!INDIAN_STATES.includes(state)) errors.state = "Please select your state.";
  if (!/^[1-9]\d{5}$/.test(pincode)) errors.pincode = "Please enter a valid 6-digit PIN code.";
  if (notes.length > 500) errors.notes = "Order notes must be under 500 characters.";

  const rawItems = Array.isArray(b.items) ? b.items : [];
  const items: CheckoutInput["items"] = [];
  if (rawItems.length === 0) errors.items = "Your bag is empty.";
  else if (rawItems.length > 20) errors.items = "Too many items in one order.";
  else {
    for (const it of rawItems) {
      const q = Number(it?.quantity);
      if (!isUuid(it?.size_id) || !Number.isInteger(q) || q < 1 || q > 10) {
        errors.items = "Your bag contains an invalid item. Please refresh and try again.";
        break;
      }
      items.push({ size_id: it.size_id, quantity: q });
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    data: { customer: { full_name, email, phone }, address: { line1, line2, city, state, pincode }, items, notes },
  };
}
