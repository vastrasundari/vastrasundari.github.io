-- Demo products for previewing the store design.
-- Run in Supabase Dashboard -> SQL Editor. Safe to run more than once.
-- To remove them later, run:  delete from public.products where slug like 'demo-%';

begin;
insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-rani-mirror-work', 'Rani Mirror Work Chaniya Choli', 'Magenta silk chaniya with hand-set Kutchi mirrors, a deep purple embroidered border and a soft pink dupatta.', 'navratri', 'Silk blend', 'Mirror work', null, 4499, 5999, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/rani-mirror-work.svg', 'Rani Mirror Work Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/rani-mirror-work-detail.svg', 'Rani Mirror Work Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-rani-mirror-work' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-rani-mirror-work'
on conflict (product_id, size_label) do nothing;

insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-haldi-bandhani', 'Haldi Bandhani Chaniya Choli', 'Sunshine-yellow bandhani with tiny tie-dye dots, a red mirror border and a matching dupatta for garba nights.', 'navratri', 'Silk blend', 'Mirror work', null, 3299, null, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/haldi-bandhani.svg', 'Haldi Bandhani Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/haldi-bandhani-detail.svg', 'Haldi Bandhani Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-haldi-bandhani' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-haldi-bandhani'
on conflict (product_id, size_label) do nothing;

insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-peacock-silk', 'Peacock Silk Chaniya Choli', 'Peacock-teal silk with zari florals, a golden border and a sea-green dupatta.', 'festive', 'Silk blend', 'Mirror work', null, 5299, 6499, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/peacock-silk.svg', 'Peacock Silk Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/peacock-silk-detail.svg', 'Peacock Silk Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-peacock-silk' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-peacock-silk'
on conflict (product_id, size_label) do nothing;

insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-blush-bloom', 'Blush Bloom Chaniya Choli', 'Blush-pink georgette with threadwork blossoms, an ivory-gold border and a sheer net dupatta.', 'bridal', 'Silk blend', 'Mirror work', null, 6999, 8999, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/blush-bloom.svg', 'Blush Bloom Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/blush-bloom-detail.svg', 'Blush Bloom Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-blush-bloom' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-blush-bloom'
on conflict (product_id, size_label) do nothing;

insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-sage-garden', 'Sage Garden Chaniya Choli', 'Sage-green cotton silk with garden motifs, a cream border and a light mint dupatta.', 'festive', 'Silk blend', 'Mirror work', null, 3899, null, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/sage-garden.svg', 'Sage Garden Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/sage-garden-detail.svg', 'Sage Garden Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-sage-garden' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-sage-garden'
on conflict (product_id, size_label) do nothing;

insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-royal-maroon-bridal', 'Royal Maroon Bridal Chaniya Choli', 'Bridal maroon velvet with heavy zardozi, a broad gold border and a rose-red dupatta.', 'bridal', 'Silk blend', 'Mirror work', null, 12999, 15999, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/royal-maroon-bridal.svg', 'Royal Maroon Bridal Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/royal-maroon-bridal-detail.svg', 'Royal Maroon Bridal Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-royal-maroon-bridal' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-royal-maroon-bridal'
on conflict (product_id, size_label) do nothing;

insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-ivory-chikan', 'Ivory Chikan Chaniya Choli', 'Ivory chikankari with pearl accents, a fine gold border and an airy organza dupatta.', 'festive', 'Silk blend', 'Mirror work', null, 4799, null, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/ivory-chikan.svg', 'Ivory Chikan Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/ivory-chikan-detail.svg', 'Ivory Chikan Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-ivory-chikan' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-ivory-chikan'
on conflict (product_id, size_label) do nothing;

insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-midnight-zari', 'Midnight Zari Chaniya Choli', 'Midnight-blue silk with gold zari jaal, a rich border and a royal-blue dupatta.', 'bridal', 'Silk blend', 'Mirror work', null, 7499, 8999, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/midnight-zari.svg', 'Midnight Zari Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/midnight-zari-detail.svg', 'Midnight Zari Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-midnight-zari' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-midnight-zari'
on conflict (product_id, size_label) do nothing;

insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-kesariya-garba', 'Kesariya Garba Chaniya Choli', 'Kesariya orange with mirror work and a green border — made for spinning through nine nights of garba.', 'navratri', 'Silk blend', 'Mirror work', null, 2999, 3999, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/kesariya-garba.svg', 'Kesariya Garba Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/kesariya-garba-detail.svg', 'Kesariya Garba Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-kesariya-garba' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-kesariya-garba'
on conflict (product_id, size_label) do nothing;

insert into public.products (slug, name, description, collection, fabric, craft, color, price, compare_at_price, is_active, is_new_arrival)
values ('demo-lilac-leheriya', 'Lilac Leheriya Chaniya Choli', 'Lilac leheriya waves with mirror buttis, a golden border and a lavender dupatta.', 'navratri', 'Silk blend', 'Mirror work', null, 3599, null, true, true)
on conflict (slug) do nothing;
insert into public.product_images (product_id, image_url, alt_text, sort_order)
select id, img.url, img.alt, img.ord from public.products,
  (values ('https://vastrasundari.duckdns.org/assets/images/demo/lilac-leheriya.svg', 'Lilac Leheriya Chaniya Choli', 0), ('https://vastrasundari.duckdns.org/assets/images/demo/lilac-leheriya-detail.svg', 'Lilac Leheriya Chaniya Choli — fabric detail', 1)) as img(url, alt, ord)
where slug = 'demo-lilac-leheriya' and not exists (select 1 from public.product_images i where i.product_id = products.id);
insert into public.product_sizes (product_id, size_label, stock, sort_order)
select id, sz.label, sz.stock, sz.ord from public.products,
  (values ('S', 5, 0), ('M', 5, 1), ('L', 5, 2), ('XL', 3, 3), ('XXL', 0, 4)) as sz(label, stock, ord)
where slug = 'demo-lilac-leheriya'
on conflict (product_id, size_label) do nothing;

commit;
