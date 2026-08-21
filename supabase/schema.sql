-- ============================================================================
-- OLEVS / AETERNUS  —  luxury handmade watches storefront
--
-- IMPORTANT — why every table carries a `watch_` prefix:
-- This Supabase project already hosts another site, which owns a `public.products`
-- table (bigint id, `category`, `is_featured`, 12 live rows) and several others.
-- An unprefixed `create table if not exists public.products` silently does nothing
-- against that table and leaves this store reading someone else's columns. The
-- prefix keeps the two applications in one project without either one touching
-- the other's data.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- products
-- ----------------------------------------------------------------------------
create table if not exists public.watch_products (
  id             uuid primary key default gen_random_uuid(),
  name           text        not null,
  price          numeric     not null check (price >= 0),   -- stored in DA
  description    text,
  image_url      text,
  stock_quantity integer     not null default 0 check (stock_quantity >= 0),
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- delivery_fees
--
-- The two fees live in a table rather than in code so the owner can change them
-- with a data edit instead of a redeploy. The CHECK constraint below is the
-- point of the table: it makes "Home is always priced higher than Office" a
-- property the database enforces, not a convention the front-end remembers.
-- ----------------------------------------------------------------------------
create table if not exists public.watch_delivery_fees (
  method text primary key check (method in ('home', 'office')),
  fee    numeric not null check (fee >= 0),
  label  text    not null
);

insert into public.watch_delivery_fees (method, fee, label) values
  ('office', 400, 'Office / Stopdesk Pickup'),
  ('home',   700, 'Home Delivery')
on conflict (method) do nothing;

-- Enforce the ordering rule across rows. A statement-level constraint trigger is
-- used because a CHECK cannot see another row.
create or replace function public.watch_assert_home_fee_is_higher()
returns trigger
language plpgsql
as $$
declare
  home_fee   numeric;
  office_fee numeric;
begin
  select fee into home_fee   from public.watch_delivery_fees where method = 'home';
  select fee into office_fee from public.watch_delivery_fees where method = 'office';

  if home_fee is not null and office_fee is not null and home_fee <= office_fee then
    raise exception
      'Home delivery (% DA) must cost more than office pickup (% DA)', home_fee, office_fee;
  end if;
  return null;
end;
$$;

drop trigger if exists watch_delivery_fees_ordering on public.watch_delivery_fees;
create constraint trigger watch_delivery_fees_ordering
  after insert or update on public.watch_delivery_fees
  deferrable initially deferred
  for each row execute function public.watch_assert_home_fee_is_higher();

-- ----------------------------------------------------------------------------
-- orders
-- ----------------------------------------------------------------------------
create table if not exists public.watch_orders (
  id              uuid primary key default gen_random_uuid(),
  customer_name   text        not null check (length(trim(customer_name)) > 0),
  phone           text        not null check (length(trim(phone)) > 0),
  wilaya          text        not null,
  commune         text        not null,
  delivery_method text        not null check (delivery_method in ('home', 'office')),
  items           jsonb       not null,   -- [{product_id, product_name, quantity, price}]
  delivery_fee    numeric     not null,
  total_amount    numeric     not null,
  status          text        not null default 'new'
                              check (status in ('new', 'confirmed', 'shipped')),
  created_at      timestamptz not null default now()
);

create index if not exists watch_orders_created_at_idx on public.watch_orders (created_at desc);
create index if not exists watch_orders_status_idx     on public.watch_orders (status);

-- ----------------------------------------------------------------------------
-- Order integrity
--
-- An anonymous visitor can post any JSON they like to this table, so the money
-- columns arriving from the browser are a claim, not a fact. This trigger
-- re-derives them from the products table and the delivery_fees table before the
-- row is stored: unit prices, the line quantities, the delivery fee and the
-- total are all recomputed server-side.
--
-- It refuses rather than defaults. An unknown product id, a non-positive
-- quantity or a quantity above the stock on hand raises, because the alternative
-- -- accepting the customer's number for a product the shop cannot identify --
-- writes an order nobody can fulfil and nothing downstream would flag.
-- ----------------------------------------------------------------------------
create or replace function public.watch_normalise_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item        jsonb;
  rebuilt     jsonb := '[]'::jsonb;
  subtotal    numeric := 0;
  fee         numeric;
  prod        public.watch_products%rowtype;
  qty         integer;
begin
  if jsonb_typeof(new.items) <> 'array' or jsonb_array_length(new.items) = 0 then
    raise exception 'An order must contain at least one item';
  end if;

  for item in select * from jsonb_array_elements(new.items)
  loop
    select * into prod
      from public.watch_products
     where id = (item ->> 'product_id')::uuid;

    if not found then
      raise exception 'Unknown product %', item ->> 'product_id';
    end if;

    qty := coalesce((item ->> 'quantity')::integer, 0);

    if qty <= 0 then
      raise exception 'Quantity for % must be greater than zero', prod.name;
    end if;

    if qty > prod.stock_quantity then
      raise exception 'Only % of % remain in stock', prod.stock_quantity, prod.name;
    end if;

    -- price and name come from the products table, never from the request body
    rebuilt := rebuilt || jsonb_build_object(
      'product_id',   prod.id,
      'product_name', prod.name,
      'quantity',     qty,
      'price',        prod.price
    );

    subtotal := subtotal + (prod.price * qty);
  end loop;

  select df.fee into fee
    from public.watch_delivery_fees df
   where df.method = new.delivery_method;

  if fee is null then
    raise exception 'No delivery fee configured for method %', new.delivery_method;
  end if;

  new.items        := rebuilt;
  new.delivery_fee := fee;
  new.total_amount := subtotal + fee;
  new.status       := 'new';       -- a new order is always 'new', whatever was posted

  return new;
end;
$$;

drop trigger if exists watch_orders_normalise on public.watch_orders;
create trigger watch_orders_normalise
  before insert on public.watch_orders
  for each row execute function public.watch_normalise_order();

-- Decrement stock once the order row is committed.
create or replace function public.watch_decrement_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
begin
  for item in select * from jsonb_array_elements(new.items)
  loop
    update public.watch_products
       set stock_quantity = stock_quantity - (item ->> 'quantity')::integer
     where id = (item ->> 'product_id')::uuid;
  end loop;
  return null;
end;
$$;

drop trigger if exists watch_orders_decrement_stock on public.watch_orders;
create trigger watch_orders_decrement_stock
  after insert on public.watch_orders
  for each row execute function public.watch_decrement_stock();

-- ============================================================================
-- Row Level Security
--
-- anon           : read products and delivery fees; insert an order. Nothing else.
-- authenticated  : the shop owner. Full control of products, read + update orders.
--
-- Note that anon has no SELECT on orders at all, so a visitor cannot read back
-- the row they just wrote. The checkout page therefore inserts with
-- `Prefer: return=minimal` (supabase-js does this when .select() is not chained).
-- ============================================================================

alter table public.watch_products      enable row level security;
alter table public.watch_orders        enable row level security;
alter table public.watch_delivery_fees enable row level security;

-- products ------------------------------------------------------------------
drop policy if exists watch_products_read_public   on public.watch_products;
drop policy if exists watch_products_write_owner   on public.watch_products;

create policy watch_products_read_public
  on public.watch_products for select
  to anon, authenticated
  using (true);

create policy watch_products_write_owner
  on public.watch_products for all
  to authenticated
  using (true)
  with check (true);

-- delivery_fees --------------------------------------------------------------
drop policy if exists watch_delivery_fees_read_public on public.watch_delivery_fees;
drop policy if exists watch_delivery_fees_write_owner on public.watch_delivery_fees;

create policy watch_delivery_fees_read_public
  on public.watch_delivery_fees for select
  to anon, authenticated
  using (true);

create policy watch_delivery_fees_write_owner
  on public.watch_delivery_fees for all
  to authenticated
  using (true)
  with check (true);

-- orders ---------------------------------------------------------------------
drop policy if exists watch_orders_insert_public on public.watch_orders;
drop policy if exists watch_orders_read_owner    on public.watch_orders;
drop policy if exists watch_orders_update_owner  on public.watch_orders;

create policy watch_orders_insert_public
  on public.watch_orders for insert
  to anon, authenticated
  with check (true);

create policy watch_orders_read_owner
  on public.watch_orders for select
  to authenticated
  using (true);

create policy watch_orders_update_owner
  on public.watch_orders for update
  to authenticated
  using (true)
  with check (true);

-- Deliberately no DELETE policy on orders: an order is a commercial record and
-- the dashboard has no delete affordance for one.

-- ============================================================================
-- Storage: product images
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('watch-product-images', 'watch-product-images', true)
on conflict (id) do update set public = true;

drop policy if exists watch_product_images_read_public  on storage.objects;
drop policy if exists watch_product_images_write_owner  on storage.objects;

create policy watch_product_images_read_public
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'watch-product-images');

create policy watch_product_images_write_owner
  on storage.objects for all
  to authenticated
  using (bucket_id = 'watch-product-images')
  with check (bucket_id = 'watch-product-images');
