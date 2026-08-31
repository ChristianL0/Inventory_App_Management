-- =====================================================================
-- Inventory & QR Tracking — Supabase schema
-- Run in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- SUPPLIERS
-- ---------------------------------------------------------------------
create table suppliers (
    id uuid primary key default gen_random_uuid(),
    company_name text not null,
    country text,
    city text,
    website text,
    alibaba_profile text,
    made_in_china_profile text,
    contact_person text,
    email text,
    phone text,
    category text,
    status text default 'active',
    rating numeric,
    notes text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_suppliers_company_name on suppliers(company_name);
create index idx_suppliers_country on suppliers(country);

-- ---------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------
create sequence if not exists products_sample_seq start 1;

create or replace function generate_sample_id() returns text as $$
declare
  next_val int;
begin
  next_val := nextval('products_sample_seq');
  return 'INV-' || extract(year from now())::text || '-' || lpad(next_val::text, 6, '0');
end;
$$ language plpgsql;

create table products (
    id uuid primary key default gen_random_uuid(),
    sample_id text unique not null default generate_sample_id(),
    product_name text not null,
    category text,
    architect_name text,
    description text,
    qr_image_url text,
    qr_target_url text,
    qr_generated_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_products_category on products(category);
create index idx_products_sample_id on products(sample_id);

-- ---------------------------------------------------------------------
-- PRODUCT <-> SUPPLIER (many-to-many junction table)
-- ---------------------------------------------------------------------
create table product_suppliers (
    id uuid primary key default gen_random_uuid(),
    product_id uuid not null references products(id) on delete cascade,
    supplier_id uuid not null references suppliers(id) on delete cascade,
    supplier_part_number text,
    price_quoted numeric,
    currency text,
    moq integer,
    lead_time_days integer,
    notes text,
    created_at timestamptz default now(),
    unique (product_id, supplier_id)
);

create index idx_ps_product on product_suppliers(product_id);
create index idx_ps_supplier on product_suppliers(supplier_id);

-- ---------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_products_updated_at
before update on products
for each row execute function set_updated_at();

create trigger trg_suppliers_updated_at
before update on suppliers
for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table products enable row level security;
alter table suppliers enable row level security;
alter table product_suppliers enable row level security;

-- Public (unauthenticated) read — required for the public /product/:sample_id page
create policy "public can view products" on products for select using (true);
create policy "public can view suppliers" on suppliers for select using (true);
create policy "public can view product_suppliers" on product_suppliers for select using (true);

-- Admin-only writes. Requires a `role: "admin"` claim in the user's app_metadata —
-- set this via the Supabase dashboard (Authentication -> Users -> edit user ->
-- App metadata) or the Auth Admin API when provisioning admin accounts.
create policy "admins can insert products" on products for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins can update products" on products for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins can delete products" on products for delete
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins can insert suppliers" on suppliers for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins can update suppliers" on suppliers for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins can delete suppliers" on suppliers for delete
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins can insert product_suppliers" on product_suppliers for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins can update product_suppliers" on product_suppliers for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
create policy "admins can delete product_suppliers" on product_suppliers for delete
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ---------------------------------------------------------------------
-- Storage bucket for QR images (run once — Supabase also lets you do this
-- via Dashboard -> Storage -> New bucket -> name "qr-codes" -> Public: ON)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('qr-codes', 'qr-codes', true)
on conflict (id) do nothing;

create policy "public can view qr images" on storage.objects for select
  using (bucket_id = 'qr-codes');

create policy "admins can upload qr images" on storage.objects for insert
  with check (bucket_id = 'qr-codes' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "admins can update qr images" on storage.objects for update
  using (bucket_id = 'qr-codes' and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
