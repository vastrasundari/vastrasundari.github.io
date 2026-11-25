# Vastra Sundari

Luxury e-commerce website for **Vastra Sundari** — exclusive Gujarati Chaniya Choli.

- **Frontend:** static HTML + Tailwind CSS + JavaScript, hosted on **GitHub Pages**
- **Database & Auth:** **Supabase** (PostgreSQL with Row Level Security, Supabase Auth, Storage)
- **Backend:** **Supabase Edge Functions** (Deno) for checkout, order lookup and admin order updates
- **Notifications:** **Resend** (email) and **WhatsApp Business Cloud API**
- **Payments:** Cash on Delivery

---

## Contents

1. [How it works](#how-it-works)
2. [Project structure](#project-structure)
3. [Supabase setup](#1-supabase-setup)
4. [Create an admin account](#2-create-an-admin-account)
5. [Email setup (Resend)](#3-email-setup-resend)
6. [WhatsApp setup](#4-whatsapp-business-setup)
7. [Environment variables](#5-environment-variables)
8. [Deploy the Edge Functions](#6-deploy-the-edge-functions)
9. [Connect the website](#7-connect-the-website)
10. [GitHub Pages deployment](#8-github-pages-deployment)
11. [Using the admin panel](#using-the-admin-panel)
12. [Security model](#security-model)
13. [Local development](#local-development)
14. [Troubleshooting](#troubleshooting)

---

## How it works

```
 Customer browser (GitHub Pages)                    Supabase
 ─────────────────────────────────                  ──────────────────────────────────────────
 shop / product pages ── read active products ───▶  PostgreSQL (RLS: public read of live catalogue)
 checkout.html ───────── POST place-order ───────▶  Edge Function ──▶ create_order() (one transaction:
                                                      validate        prices from DB, lock + decrement stock,
                                                                      customer, order, items, history)
                                                                 └──▶ Resend email (customer + admin)
                                                                 └──▶ WhatsApp alert (business number)
 order.html ──────────── POST get-order ─────────▶  Edge Function (order number + secret token)

 Admin browser (/admin/)
 ─────────────────────────────────
 sign in ─────────────── Supabase Auth ──────────▶  admin_users check
 dashboard / orders ──── read via RLS (admins) ──▶  PostgreSQL
 products ────────────── write via RLS (admins) ─▶  PostgreSQL + Storage (product-images)
 status / payment ────── POST admin-update-order ▶  Edge Function ──▶ apply_order_status() /
                                                                      apply_payment_status()
                                                                 └──▶ email + WhatsApp notifications
```

**Order lifecycle**

| Status            | Next allowed               | Notification                          |
| ----------------- | -------------------------- | ------------------------------------- |
| Order Received    | Confirmed, Cancelled       | Sent when the order is placed         |
| Confirmed         | Shipped, Cancelled         | Customer + admin email, WhatsApp      |
| Shipped           | Delivered, Cancelled       | Includes courier & tracking number    |
| Delivered         | — (final)                  | Customer + admin email, WhatsApp      |
| Cancelled         | — (final, stock restored)  | Includes cancellation reason          |

Payment (COD) starts as **Pending**; an admin marks it **Paid** after the cash is collected.

---

## Project structure

```
index.html            Home (clothesline showcase, collections, new arrivals, about)
shop.html             Catalogue with collection filters, search, sorting
product.html          Product page (gallery, sizes with stock, add to bag, wishlist)
cart.html             Shopping bag (re-validates price/stock against the database)
checkout.html         Cash on Delivery checkout
order.html            Order confirmation / tracking + "My orders" on this device
wishlist.html         Saved designs
admin/                Admin panel (login, dashboard, orders, products)
assets/
  css/style.css       Brand styles (header, showcase, home sections, footer)
  css/tailwind.css    Compiled Tailwind — generated, do not edit by hand
  js/config.js        PUBLIC config: Supabase URL + anon key, contact details
  js/layout.js        Shared header / nav / search / footer
  js/main.js          Header behaviour, drawer, search, counters
  js/showcase.js      Home page boutique slider (gold rail, 3D flip, autoplay, details card)
  js/lib/             supabase client, catalog (product data), cart, helpers
src/tailwind.css      Tailwind source (components)
supabase/
  schema.sql          Tables, constraints, indexes, functions, RLS, storage bucket
  config.toml         Edge Function settings
  .env.example        Template for Edge Function secrets
  functions/
    place-order/          Checkout (public)
    get-order/            Order lookup by number + secret token (public)
    admin-update-order/   Order status & payment changes (admins only)
    _shared/              CORS, validation, notifications
```

---

## 1. Supabase setup

1. Create a project at <https://supabase.com/dashboard> (choose a region close to India, e.g. **Mumbai – ap-south-1**).
2. Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates every table, index, constraint, database function, Row Level Security policy and the `product-images` storage bucket. It is safe to run again after updates.
3. **Authentication → Sign In / Providers → Email**:
   - **Turn OFF "Allow new users to sign up".** Only admins have accounts; customers check out as guests. (Admin access is also enforced by the `admin_users` table, so even a stray sign-up gets no access.)
4. **Authentication → URL Configuration**:
   - **Site URL:** `https://vastrasundari.duckdns.org`
   - **Redirect URLs:** add `https://vastrasundari.duckdns.org/admin/` (used by "Forgot password").

Tables created: `products`, `product_images`, `product_sizes`, `customers`, `orders`, `order_items`, `order_status_history`, `admin_users`, plus `notification_log` (a record of every email/WhatsApp attempt, visible on each order in the admin).

---

## 2. Create an admin account

1. **Authentication → Users → Add user → Create new user**. Enter the admin's email and a strong password, tick **Auto Confirm User**.
2. Copy the new user's **UID**, then run in the **SQL Editor**:

   ```sql
   insert into public.admin_users (user_id, email, full_name, role)
   select id, email, 'Store Owner', 'owner'
   from auth.users
   where email = 'owner@yourdomain.com';   -- the email you just created
   ```

3. Sign in at `https://vastrasundari.duckdns.org/admin/`.

To **remove** an admin: `delete from public.admin_users where email = 'person@yourdomain.com';`

---

## 3. Email setup (Resend)

1. Create an account at <https://resend.com>.
2. **Domains → Add domain** and add the DNS records it shows at your domain registrar. Wait until the domain shows **Verified**. (Without a verified domain Resend can only send to your own address.)
3. **API Keys → Create API key** with "Sending access".
4. Set these secrets (see [step 5](#5-environment-variables)):
   - `RESEND_API_KEY` — the key
   - `EMAIL_FROM` — e.g. `Vastra Sundari <orders@yourdomain.com>` (must use the verified domain)
   - `EMAIL_REPLY_TO` — where customer replies should go
   - `ADMIN_EMAILS` — comma-separated inboxes that get every order notification

Emails sent: order placed, confirmed, shipped (with courier/tracking), delivered and cancelled (with reason) — to the customer, and a copy to `ADMIN_EMAILS`.

---

## 4. WhatsApp Business setup

Notifications go from your WhatsApp Business number to the business/owner number(s) you configure, using the **WhatsApp Cloud API**. The access token stays inside the Edge Function — it is never sent to the browser.

1. Go to <https://developers.facebook.com> → **My Apps → Create App** → type **Business**, and add the **WhatsApp** product.
2. In **WhatsApp → API Setup** note the **Phone number ID**. Add your real business phone number when ready (the test number works for trials, but only to verified recipient numbers).
3. Create a **permanent access token**: **Business Settings → Users → System users → Add** (Admin) → **Generate token** for your app with permissions `whatsapp_business_messaging` and `whatsapp_business_management`.
4. Create the message template in **WhatsApp Manager → Message templates → Create template**:
   - **Category:** Utility
   - **Name:** `order_alert`
   - **Language:** English (`en`)
   - **Body** (exactly 6 variables, in this order):

     ```
     Vastra Sundari: {{1}}
     Order: {{2}}
     Customer: {{3}} ({{4}})
     Amount: {{5}}
     Items: {{6}}
     ```

     Sample values for review: `New order received`, `VS261124-01001`, `Asha Patel`, `9876543210`, `₹4,999`, `Rani Mirror Work Chaniya Choli (M) x1`.
   - Submit and wait for **Approved** (usually minutes).
5. Set the secrets: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME=order_alert`, `WHATSAPP_TEMPLATE_LANG=en`, and `WHATSAPP_ADMIN_NUMBERS` (recipient number(s) with country code, digits only, e.g. `919876543210`).

> If you name the template differently or use another language code, update `WHATSAPP_TEMPLATE_NAME` / `WHATSAPP_TEMPLATE_LANG` to match.

---

## 5. Environment variables

There are **two** kinds of configuration — keep them separate:

| Where | What | Public? |
| --- | --- | --- |
| `assets/js/config.js` | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, contact details | **Yes** — safe in the browser; protected by RLS |
| Supabase Edge Function secrets | Resend + WhatsApp credentials, admin emails, site URL | **No** — server only |

**Never** put the `service_role` key, Resend key or WhatsApp token in `config.js` or anywhere in the repository. Edge Functions receive `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` automatically from Supabase.

**Edge Function secrets** (template: [`supabase/.env.example`](supabase/.env.example)):

| Variable | Required | Example |
| --- | --- | --- |
| `SITE_URL` | yes | `https://vastrasundari.duckdns.org` |
| `ALLOWED_ORIGINS` | recommended | `https://vastrasundari.duckdns.org,https://vastrasundari.github.io` |
| `RESEND_API_KEY` | yes | `re_…` |
| `EMAIL_FROM` | yes | `Vastra Sundari <orders@yourdomain.com>` |
| `EMAIL_REPLY_TO` | optional | `support@yourdomain.com` |
| `ADMIN_EMAILS` | yes | `owner@yourdomain.com,team@yourdomain.com` |
| `WHATSAPP_ACCESS_TOKEN` | for WhatsApp | `EAA…` |
| `WHATSAPP_PHONE_NUMBER_ID` | for WhatsApp | `123456789012345` |
| `WHATSAPP_ADMIN_NUMBERS` | for WhatsApp | `919876543210` |
| `WHATSAPP_TEMPLATE_NAME` | optional | `order_alert` (default) |
| `WHATSAPP_TEMPLATE_LANG` | optional | `en` (default) |
| `WHATSAPP_API_VERSION` | optional | `v21.0` (default) |

Set them either in **Dashboard → Edge Functions → Secrets**, or with the CLI:

```bash
cp supabase/.env.example supabase/.env      # fill in real values; supabase/.env is git-ignored
supabase secrets set --env-file supabase/.env
```

If a provider is not configured, orders still work — the failed notification is recorded in the order's **Notifications** panel in the admin.

---

## 6. Deploy the Edge Functions

Install the [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started), then from the project root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF     # from the dashboard URL
supabase functions deploy place-order
supabase functions deploy get-order
supabase functions deploy admin-update-order
```

`supabase/config.toml` sets `verify_jwt = false` for these functions: each function performs its own checks (strict input validation for the public ones; Auth token + `admin_users` membership for the admin one). This also keeps them compatible with Supabase's newer publishable API keys.

---

## 7. Connect the website

Edit [`assets/js/config.js`](assets/js/config.js) with values from **Project Settings → API**:

```js
window.VS_CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR_ANON_OR_PUBLISHABLE_KEY",
  CONTACT_EMAIL: "hello@yourdomain.com",
  CONTACT_PHONE: "+91 98765 43210",
  WHATSAPP_NUMBER: "919876543210",
  STUDIO_ADDRESS: "Ahmedabad, Gujarat",
};
```

Then add products in **Admin → Products** (name, collection, price, sizes with stock, images). Products appear on the store as soon as they are marked **Live on store**.

---

## 8. GitHub Pages deployment

The site is plain static files — no build is needed on GitHub.

1. Commit and push to the `main` branch of `vastrasundari/vastrasundari.github.io`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, **Branch: `main` / `(root)`**.
3. After 1–2 minutes the site is live at <https://vastrasundari.duckdns.org> (the `github.io` address redirects there) and the admin at <https://vastrasundari.duckdns.org/admin/>.

If you change styles that use Tailwind classes, rebuild the CSS before committing:

```bash
npm install
npm run build:css
```

### Free subdomain: vastrasundari.duckdns.org

The site uses a free [DuckDNS](https://www.duckdns.org) subdomain pointed at GitHub Pages — no domain purchase, no server, free HTTPS.

1. Sign in at <https://www.duckdns.org> (GitHub/Google login) and add the subdomain `vastrasundari`.
2. In the **current ip** field enter `185.199.108.153` (a GitHub Pages IP) and click **update ip**. Optionally set **ipv6** to `2606:50c0:8000::153`.
3. The repository contains a `CNAME` file with `vastrasundari.duckdns.org`; GitHub Pages reads it (also visible in **Settings → Pages → Custom domain**).
4. When the DNS check passes in **Settings → Pages**, tick **Enforce HTTPS** (GitHub issues a free Let's Encrypt certificate and renews it automatically).

The DuckDNS token is **not** needed for this setup and must never be committed. GitHub's Pages IPs are fixed, so no IP-update job is required.

To move to a purchased domain later, replace the `CNAME` file contents and update `SITE_URL`, `ALLOWED_ORIGINS` and the Supabase Auth URLs.

**Home page showcase:** the top of the home page hangs up to 14 live products on a gold rail (featured products first, then newest). Clicking a garment, the arrows, the dots, a thumbnail or a swipe moves that garment to the centre with a 3D flip; it also advances by itself every 5 seconds (paused on hover, after a manual choice, off screen, or with the Pause button; off for reduced-motion users). Products marked **Featured** show a *Bestseller* badge, others marked *New arrival* show *New Arrival*; *Fabric* and *Craft* appear as Fabric / Work. The first photo of each product is the hanging garment, so a **portrait photo of the outfit alone on a transparent (PNG/WebP) or plain light background** looks best; the details panel uses the other photos too.

---

## Using the admin panel

- **Dashboard** — total sales, COD collected/outstanding, counts of total / pending / confirmed / shipped / delivered / cancelled orders, and recent orders. Each card links to the filtered order list.
- **Orders** — search by order number, customer name, phone or email; filter by status and payment status; paginated.
- **Order detail** — customer contact (call / WhatsApp / email links), shipping address, products with sizes, quantities, prices and totals, full status history and the notification log. Actions:
  - **Confirm → Mark as Shipped** (courier + tracking) **→ Mark as Delivered**
  - **Cancel order** with a reason (stock is returned automatically)
  - **Mark as Paid** / **Revert to Pending** for COD
- **Products** — create/edit/hide/delete products, manage sizes and stock, upload and reorder images.

---

## Security model

- **Row Level Security is enabled on every table.**
  - Anyone can read *live* products, their images and sizes — nothing else.
  - Customers, orders, order items, history and notification logs are readable **only by admins** (`admin_users`).
  - No browser role can insert, update or delete orders — not even admins. Orders are created by `create_order()` and changed by `apply_order_status()` / `apply_payment_status()`, which are executable **only by the service role** inside Edge Functions.
  - Product/catalogue writes and image uploads require an admin.
- **Checkout is validated on the server**: name, email, Indian mobile, address, 6-digit PIN, state list, item IDs and quantities (1–10). Prices are always taken from the database, stock is locked and decremented in the same transaction, and a failed check rolls back the whole order. There is a honeypot field and a limit of 5 orders per phone number per hour.
- **Customers can only see their own order**, via the unguessable `access_token` included in their confirmation link/email.
- **Admin actions** require a valid Supabase Auth session *and* membership in `admin_users`, verified inside the Edge Function. Status changes follow the allowed lifecycle only.
- **Secrets** (service role key, Resend key, WhatsApp token) exist only as Edge Function secrets.
- All customer-provided text is HTML-escaped before display in the store, admin panel and emails.

The schema was tested against PostgreSQL (37 checks: RLS for anon / non-admin / admin, pricing, stock locking and rollback, lifecycle rules, cancellation restock, payment rules and dashboard figures).

---

## Local development

```bash
npm install            # Tailwind CLI only
npm run watch:css      # rebuild Tailwind on change
# serve the folder with any static server, e.g.:
python3 -m http.server 8080      # → http://localhost:8080
```

ES modules require a web server (opening files with `file://` will not work). Add your local origin (e.g. `http://localhost:8080`) to `ALLOWED_ORIGINS` while developing.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Store shows "Our boutique is being prepared" | `SUPABASE_URL` / `SUPABASE_ANON_KEY` missing in `assets/js/config.js` |
| Admin login says "does not have admin access" | Insert the user into `admin_users` (step 2) |
| Checkout says "Network error" | Edge Functions not deployed, or your site origin is missing from `ALLOWED_ORIGINS` |
| Orders work but no emails | Check the order's **Notifications** panel for the Resend error; verify your domain and `EMAIL_FROM` |
| WhatsApp error `132001` | Template name/language doesn't match an **approved** template |
| WhatsApp error `131030` | Recipient not in the allowed list while using the test number |
| Image upload fails | File > 5 MB or not JPG/PNG/WebP/AVIF; make sure `schema.sql` ran (it creates the bucket) |
| Edge Function logs | Dashboard → Edge Functions → *function* → Logs |
