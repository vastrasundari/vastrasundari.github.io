-- =====================================================================
--  VASTRA SUNDARI — Supabase PostgreSQL schema
--  Run this whole file once in Supabase Dashboard → SQL Editor.
--  It is idempotent where practical (safe to re-run for functions,
--  policies and triggers; tables use IF NOT EXISTS).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum
    ('order_received', 'confirmed', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cod');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- Administrators. A row here = full admin access. Linked to Supabase Auth.
create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  role        text not null default 'admin' check (role in ('owner', 'admin')),
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique
                    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  name              text not null check (char_length(name) between 2 and 160),
  description       text check (char_length(description) <= 5000),
  collection        text not null default 'festive'
                    check (collection in ('navratri', 'bridal', 'festive')),
  fabric            text check (char_length(fabric) <= 120),
  craft             text check (char_length(craft) <= 120),       -- e.g. Kutchi mirror work, Bandhani
  color             text check (char_length(color) <= 60),
  price             numeric(10, 2) not null check (price > 0),
  compare_at_price  numeric(10, 2) check (compare_at_price is null or compare_at_price > price),
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  is_new_arrival    boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists products_active_collection_idx on public.products (is_active, collection);
create index if not exists products_active_created_idx    on public.products (is_active, created_at desc);

create table if not exists public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  image_url     text not null check (image_url ~ '^https://'),
  storage_path  text,                    -- path inside the product-images bucket (null for external URLs)
  alt_text      text check (char_length(alt_text) <= 200),
  sort_order    int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists product_images_product_idx on public.product_images (product_id, sort_order);

create table if not exists public.product_sizes (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products (id) on delete cascade,
  size_label  text not null check (char_length(size_label) between 1 and 30),
  stock       int  not null default 0 check (stock >= 0),
  sort_order  int  not null default 0,
  unique (product_id, size_label)
);
create index if not exists product_sizes_product_idx on public.product_sizes (product_id, sort_order);

create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null check (char_length(full_name) between 2 and 100),
  email       text not null unique check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text not null check (phone ~ '^[6-9][0-9]{9}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists customers_phone_idx on public.customers (phone);

create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text not null unique,
  access_token      uuid not null default gen_random_uuid(),   -- lets the buyer view their own confirmation page
  customer_id       uuid not null references public.customers (id) on delete restrict,

  -- snapshot of contact + shipping details at time of order
  customer_name     text not null,
  customer_email    text not null,
  customer_phone    text not null,
  address_line1     text not null check (char_length(address_line1) between 5 and 200),
  address_line2     text check (char_length(address_line2) <= 200),
  city              text not null check (char_length(city) between 2 and 60),
  state             text not null check (char_length(state) between 2 and 60),
  pincode           text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  notes             text check (char_length(notes) <= 500),

  subtotal          numeric(10, 2) not null check (subtotal >= 0),
  shipping_fee      numeric(10, 2) not null default 0 check (shipping_fee >= 0),
  total             numeric(10, 2) not null check (total >= 0),

  payment_method    public.payment_method not null default 'cod',
  payment_status    public.payment_status not null default 'pending',
  status            public.order_status   not null default 'order_received',

  courier_name      text check (char_length(courier_name) <= 80),
  tracking_number   text check (char_length(tracking_number) <= 80),
  cancel_reason     text check (char_length(cancel_reason) <= 500),
  paid_at           timestamptz,
  confirmed_at      timestamptz,
  shipped_at        timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint orders_total_matches check (total = subtotal + shipping_fee)
);
create index if not exists orders_created_idx        on public.orders (created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_customer_idx       on public.orders (customer_id);
create index if not exists orders_phone_idx          on public.orders (customer_phone);
create index if not exists orders_email_idx          on public.orders (customer_email);

create table if not exists public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders (id) on delete cascade,
  product_id       uuid references public.products (id) on delete set null,
  product_size_id  uuid references public.product_sizes (id) on delete set null,
  product_name     text not null,
  size_label       text not null,
  image_url        text,
  unit_price       numeric(10, 2) not null check (unit_price >= 0),
  quantity         int not null check (quantity between 1 and 10),
  line_total       numeric(10, 2) not null,
  constraint order_items_line_total check (line_total = unit_price * quantity)
);
create index if not exists order_items_order_idx   on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

create table if not exists public.order_status_history (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  change_type     text not null check (change_type in ('status', 'payment')),
  from_value      text,
  to_value        text not null,
  note            text check (char_length(note) <= 500),
  changed_by      uuid references auth.users (id) on delete set null,   -- null = system / customer checkout
  created_at      timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- Delivery log for every email / WhatsApp attempt (useful for debugging providers).
create table if not exists public.notification_log (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references public.orders (id) on delete cascade,
  event       text not null,
  channel     text not null check (channel in ('email', 'whatsapp')),
  recipient   text not null,
  success     boolean not null,
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists notification_log_order_idx on public.notification_log (order_id, created_at);

-- ---------------------------------------------------------------------
-- 2. Helpers & triggers
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists products_updated_at  on public.products;
create trigger products_updated_at  before update on public.products  for each row execute function public.set_updated_at();
drop trigger if exists customers_updated_at on public.customers;
create trigger customers_updated_at before update on public.customers for each row execute function public.set_updated_at();
drop trigger if exists orders_updated_at    on public.orders;
create trigger orders_updated_at    before update on public.orders    for each row execute function public.set_updated_at();

-- True when the signed-in user is listed in admin_users.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. create_order — the ONLY way an order is created.
--    Called exclusively by the place-order Edge Function (service_role).
--    Prices come from the database, stock is locked and decremented
--    atomically, and everything succeeds or fails together.
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_customer jsonb,   -- {full_name, email, phone}
  p_address  jsonb,   -- {line1, line2, city, state, pincode}
  p_items    jsonb,   -- [{size_id, quantity}, ...]
  p_notes    text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_shipping_fee   constant numeric := 0;   -- complimentary shipping; change here if needed
  v_customer_id    uuid;
  v_order_id       uuid;
  v_order_number   text;
  v_access_token   uuid;
  v_subtotal       numeric(10, 2) := 0;
  v_item           record;
  v_row            record;
  v_email          text := lower(trim(p_customer->>'email'));
  v_phone          text := trim(p_customer->>'phone');
  v_recent         int;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'CART_EMPTY' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'CART_TOO_LARGE' using errcode = 'P0001';
  end if;

  -- basic abuse guard: max 5 orders per phone per hour
  select count(*) into v_recent from public.orders
   where customer_phone = v_phone and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- upsert customer by email
  insert into public.customers (full_name, email, phone)
  values (trim(p_customer->>'full_name'), v_email, v_phone)
  on conflict (email) do update
     set full_name = excluded.full_name, phone = excluded.phone
  returning id into v_customer_id;

  v_order_number := 'VS' || to_char(now() at time zone 'Asia/Kolkata', 'YYMMDD')
                    || '-' || lpad(nextval('public.order_number_seq')::text, 5, '0');

  insert into public.orders (
    order_number, customer_id, customer_name, customer_email, customer_phone,
    address_line1, address_line2, city, state, pincode, notes,
    subtotal, shipping_fee, total
  ) values (
    v_order_number, v_customer_id, trim(p_customer->>'full_name'), v_email, v_phone,
    trim(p_address->>'line1'), nullif(trim(coalesce(p_address->>'line2', '')), ''),
    trim(p_address->>'city'), trim(p_address->>'state'), trim(p_address->>'pincode'),
    nullif(trim(coalesce(p_notes, '')), ''),
    0, v_shipping_fee, v_shipping_fee
  ) returning id, access_token into v_order_id, v_access_token;

  -- merge duplicate sizes, then lock each size row in a stable order (avoids deadlocks)
  for v_item in
    select (e->>'size_id')::uuid as size_id, sum((e->>'quantity')::int) as qty
      from jsonb_array_elements(p_items) e
     group by 1
     order by 1
  loop
    if v_item.qty < 1 or v_item.qty > 10 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    select s.id, s.size_label, s.stock, p.id as product_id, p.name, p.price, p.is_active,
           (select i.image_url from public.product_images i
             where i.product_id = p.id order by i.sort_order, i.created_at limit 1) as image_url
      into v_row
      from public.product_sizes s
      join public.products p on p.id = s.product_id
     where s.id = v_item.size_id
       for update of s;

    if not found or not v_row.is_active then
      raise exception 'PRODUCT_UNAVAILABLE' using errcode = 'P0001';
    end if;
    if v_row.stock < v_item.qty then
      raise exception 'OUT_OF_STOCK:%', v_row.name || ' (' || v_row.size_label || ')' using errcode = 'P0001';
    end if;

    update public.product_sizes set stock = stock - v_item.qty where id = v_row.id;

    insert into public.order_items (order_id, product_id, product_size_id, product_name,
                                    size_label, image_url, unit_price, quantity, line_total)
    values (v_order_id, v_row.product_id, v_row.id, v_row.name,
            v_row.size_label, v_row.image_url, v_row.price, v_item.qty, v_row.price * v_item.qty);

    v_subtotal := v_subtotal + v_row.price * v_item.qty;
  end loop;

  update public.orders
     set subtotal = v_subtotal, total = v_subtotal + v_shipping_fee
   where id = v_order_id;

  insert into public.order_status_history (order_id, change_type, from_value, to_value, note)
  values (v_order_id, 'status', null, 'order_received', 'Order placed by customer (Cash on Delivery)'),
         (v_order_id, 'payment', null, 'pending', 'COD — payment to be collected on delivery');

  return jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'access_token', v_access_token
  );
end $$;
revoke all on function public.create_order(jsonb, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb, jsonb, text) to service_role;

-- ---------------------------------------------------------------------
-- 4. Admin order updates — called only by the admin-update-order
--    Edge Function after it has verified the caller is an admin.
-- ---------------------------------------------------------------------
create or replace function public.apply_order_status(
  p_order_id   uuid,
  p_new_status public.order_status,
  p_actor      uuid,
  p_note       text,
  p_courier    text,
  p_tracking   text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order   public.orders%rowtype;
  v_allowed boolean;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001'; end if;

  v_allowed := case v_order.status
    when 'order_received' then p_new_status in ('confirmed', 'cancelled')
    when 'confirmed'      then p_new_status in ('shipped', 'cancelled')
    when 'shipped'        then p_new_status in ('delivered', 'cancelled')
    else false                                     -- delivered / cancelled are final
  end;
  if not v_allowed then
    raise exception 'INVALID_TRANSITION:% -> %', v_order.status, p_new_status using errcode = 'P0001';
  end if;
  if p_new_status = 'cancelled' and nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'CANCEL_REASON_REQUIRED' using errcode = 'P0001';
  end if;

  update public.orders set
    status          = p_new_status,
    courier_name    = case when p_new_status = 'shipped' then nullif(trim(coalesce(p_courier, '')), '')  else courier_name end,
    tracking_number = case when p_new_status = 'shipped' then nullif(trim(coalesce(p_tracking, '')), '') else tracking_number end,
    cancel_reason   = case when p_new_status = 'cancelled' then trim(p_note) else cancel_reason end,
    confirmed_at    = case when p_new_status = 'confirmed' then now() else confirmed_at end,
    shipped_at      = case when p_new_status = 'shipped'   then now() else shipped_at end,
    delivered_at    = case when p_new_status = 'delivered' then now() else delivered_at end,
    cancelled_at    = case when p_new_status = 'cancelled' then now() else cancelled_at end
  where id = p_order_id;

  -- return stock to inventory on cancellation
  if p_new_status = 'cancelled' then
    update public.product_sizes s
       set stock = s.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = p_order_id and oi.product_size_id = s.id;
  end if;

  insert into public.order_status_history (order_id, change_type, from_value, to_value, note, changed_by)
  values (p_order_id, 'status', v_order.status::text, p_new_status::text,
          nullif(trim(coalesce(p_note, '')), ''), p_actor);

  return jsonb_build_object('order_id', p_order_id, 'from', v_order.status, 'to', p_new_status);
end $$;
revoke all on function public.apply_order_status(uuid, public.order_status, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_order_status(uuid, public.order_status, uuid, text, text, text) to service_role;

create or replace function public.apply_payment_status(
  p_order_id   uuid,
  p_new_status public.payment_status,
  p_actor      uuid,
  p_note       text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_order.payment_status = p_new_status then
    raise exception 'PAYMENT_UNCHANGED' using errcode = 'P0001';
  end if;
  if p_new_status = 'paid' and v_order.status = 'cancelled' then
    raise exception 'ORDER_CANCELLED' using errcode = 'P0001';
  end if;

  update public.orders
     set payment_status = p_new_status,
         paid_at = case when p_new_status = 'paid' then now() else null end
   where id = p_order_id;

  insert into public.order_status_history (order_id, change_type, from_value, to_value, note, changed_by)
  values (p_order_id, 'payment', v_order.payment_status::text, p_new_status::text,
          nullif(trim(coalesce(p_note, '')), ''), p_actor);

  return jsonb_build_object('order_id', p_order_id, 'from', v_order.payment_status, 'to', p_new_status);
end $$;
revoke all on function public.apply_payment_status(uuid, public.payment_status, uuid, text) from public, anon, authenticated;
grant execute on function public.apply_payment_status(uuid, public.payment_status, uuid, text) to service_role;

-- Dashboard figures (admins only).
create or replace function public.admin_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'total_orders',     count(*),
    'order_received',   count(*) filter (where status = 'order_received'),
    'confirmed',        count(*) filter (where status = 'confirmed'),
    'shipped',          count(*) filter (where status = 'shipped'),
    'delivered',        count(*) filter (where status = 'delivered'),
    'cancelled',        count(*) filter (where status = 'cancelled'),
    'total_sales',      coalesce(sum(total) filter (where status <> 'cancelled'), 0),
    'collected',        coalesce(sum(total) filter (where payment_status = 'paid'), 0),
    'cod_outstanding',  coalesce(sum(total) filter (where payment_status = 'pending' and status <> 'cancelled'), 0)
  ) into v from public.orders;
  return v;
end $$;
revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------
alter table public.admin_users          enable row level security;
alter table public.products             enable row level security;
alter table public.product_images       enable row level security;
alter table public.product_sizes        enable row level security;
alter table public.customers            enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.notification_log     enable row level security;

-- admin_users: an admin can see the admin list; a user can see their own row
-- (used by the login screen to confirm admin status). No writes from clients.
drop policy if exists admin_users_select on public.admin_users;
create policy admin_users_select on public.admin_users
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Catalogue: public can read active products; admins manage everything.
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_images_public_read on public.product_images;
create policy product_images_public_read on public.product_images
  for select to anon, authenticated using (
    public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.is_active));
drop policy if exists product_images_admin_write on public.product_images;
create policy product_images_admin_write on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists product_sizes_public_read on public.product_sizes;
create policy product_sizes_public_read on public.product_sizes
  for select to anon, authenticated using (
    public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.is_active));
drop policy if exists product_sizes_admin_write on public.product_sizes;
create policy product_sizes_admin_write on public.product_sizes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Customer & order data: admins may READ. Nobody writes from the browser —
-- creation and updates happen only via Edge Functions (service_role) and the
-- security-definer functions above, so orders cannot be tampered with.
drop policy if exists customers_admin_read on public.customers;
create policy customers_admin_read on public.customers
  for select to authenticated using (public.is_admin());

drop policy if exists orders_admin_read on public.orders;
create policy orders_admin_read on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists order_items_admin_read on public.order_items;
create policy order_items_admin_read on public.order_items
  for select to authenticated using (public.is_admin());

drop policy if exists order_status_history_admin_read on public.order_status_history;
create policy order_status_history_admin_read on public.order_status_history
  for select to authenticated using (public.is_admin());

drop policy if exists notification_log_admin_read on public.notification_log;
create policy notification_log_admin_read on public.notification_log
  for select to authenticated using (public.is_admin());

-- Defence in depth: strip direct write privileges on order data from client roles.
revoke insert, update, delete on public.customers, public.orders, public.order_items,
  public.order_status_history, public.notification_log, public.admin_users from anon, authenticated;
revoke all on public.customers, public.orders, public.order_items,
  public.order_status_history, public.notification_log from anon;
revoke usage, select on sequence public.order_number_seq from anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Storage bucket for product photography
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- =====================================================================
-- After running this file, create your first admin — see README.md
-- section "Create an admin account".
-- =====================================================================
