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
  SUPABASE_URL: "https://bgvneqehpekmguqihwml.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_YiiG5pATql0xnAj0FoCrQg_0Y6bl_0A",

  // Shown in the footer & contact section when filled in (leave "" to hide).
  CONTACT_EMAIL: "khandarvipul@gmail.com",
  CONTACT_PHONE: "+91 95106 68822",
  WHATSAPP_NUMBER: "919510668822",
  STUDIO_ADDRESS: "Jamnagar, Gujarat",

  // UPI is the only payment method at checkout – UPI_ID must be set or checkout is disabled.
  // Customers pay to this UPI ID, enter their UTR, and an admin marks the order as paid.
  UPI_ID: "khandarvipul@okhdfcbank",
  UPI_PAYEE_NAME: "Vastra Sundari",
};
