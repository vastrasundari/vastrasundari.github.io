/*
 * Public site configuration — safe to commit.
 *
 * SUPABASE_URL and SUPABASE_ANON_KEY are designed to be public: every
 * table is protected by Row Level Security and all sensitive operations
 * run in Edge Functions. NEVER put the service_role key (or any email /
 * WhatsApp credentials) in this file.
 *
 * Find these values in Supabase Dashboard → Project Settings → API.
 */
window.VS_CONFIG = {
  SUPABASE_URL: "",        // e.g. "https://abcdefghijklm.supabase.co"
  SUPABASE_ANON_KEY: "",   // the "anon" / "publishable" key

  // Shown in the footer & contact section when filled in (leave "" to hide).
  CONTACT_EMAIL: "",
  CONTACT_PHONE: "",       // e.g. "+91 98765 43210"
  WHATSAPP_NUMBER: "",     // digits with country code, e.g. "919876543210"
  STUDIO_ADDRESS: "",
};
