-- Micron Computers: product families + exact variants
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run: if the data was already moved, it skips that part.
--
-- BEFORE: one "products" row = one model number, with its own price and stock.
--
-- AFTER:
--   products          = a product FAMILY, e.g. "HP Victus Gaming Laptop 15".
--                       Shared info only: name, brand, category, main image, archived.
--   product_variants  = one EXACT sellable configuration of a family, e.g.
--                       15-fa2689TX (Core 7 240H / 16GB / 1TB / RTX 5050).
--                       It owns the SKU, processor/RAM/storage/graphics,
--                       Micron price, quantity, specs and enrichment data.
--
-- How the existing 106 rows are moved:
--   - Every old row becomes one variant. The variant keeps the old row's id,
--     model number (as sku), price, quantity, image and enrichment data.
--   - Rows with exactly the same name (ignoring case/spaces) become variants of
--     one family. The oldest row's id becomes the family id, so its old link
--     keeps working. (Other old links are redirected by the website.)
--   - processor / ram / storage / graphics are filled in ONLY from trusted
--     specs: the ones that were already there before AI enrichment. Specs that
--     AI added are never treated as the variant's configuration.
--   - A row that AI enriched without us knowing its configuration first
--     (e.g. "Alienware M16 R2", a whole range) is set to "needs_review".
--     The AI-found specs are NOT shown as its specs; they stay saved in
--     enrichment.found_specifications for a person to check.
--   - A full copy of the old table is kept in backup.products_before_0004.

begin;

-- ----------------------------------------------------------------------------
-- 1. Backup of the old table, in a private schema the website API cannot see.
-- ----------------------------------------------------------------------------
create schema if not exists backup;
revoke all on schema backup from public;

do $$
begin
  -- Only take the backup while the old columns still exist (first run).
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'model_number'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'backup' and table_name = 'products_before_0004'
  ) then
    create table backup.products_before_0004 as select * from public.products;
    alter table backup.products_before_0004 enable row level security;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2. The new variants table.
-- ----------------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),

  -- Which family this variant belongs to. Deleting a family deletes its variants.
  product_id uuid not null references public.products(id) on delete cascade,

  -- The exact model number / SKU from the stock sheet.
  sku text not null,
  -- The SKU in capitals without outer spaces, so "14-ep0294tu" and
  -- "14-EP0294TU " count as the same SKU. Filled in automatically.
  sku_key text generated always as (upper(btrim(sku))) stored,

  -- The configuration that makes this variant different from its siblings.
  -- Only trusted data goes here (stock sheet, admin, or verified enrichment).
  processor text,
  ram text,
  storage text,
  graphics text,

  -- Micron's own price and stock. Only the stock sheet and the admin change these.
  price numeric not null default 0 check (price >= 0),
  quantity integer not null default 0 check (quantity >= 0),

  -- Any other specs (display, weight, battery...), e.g. { "weight": "2.31 kg" }.
  specifications jsonb not null default '{}'::jsonb,

  -- A photo of this exact variant. If empty, the family's image is shown.
  image_url text,

  -- Filled in by scripts/enrich-products.mjs.
  enrichment_status text
    check (enrichment_status in ('enriched', 'needs_review', 'retry_later')),
  enrichment jsonb,
  enriched_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One variant per SKU across the whole shop (ignoring case and outer spaces).
create unique index if not exists product_variants_sku_key_unique on public.product_variants (sku_key);
create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

-- ----------------------------------------------------------------------------
-- 3. Move the existing rows into families + variants (first run only).
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'model_number'
  ) then
    raise notice 'Data was already moved to product_variants - skipping step 3.';
    return;
  end if;

  -- 3a. Decide which family each old row belongs to: the oldest row with the
  --     same name (ignoring case and outer spaces).
  create temporary table family_of on commit drop as
  select
    p.id as old_id,
    first_value(p.id) over (
      partition by lower(btrim(p.name))
      order by p.created_at, p.id
    ) as family_id
  from public.products p;

  -- 3b. Work out the trusted specs of each old row: everything except the
  --     specs that AI enrichment added (listed in enrichment.specs_added).
  create temporary table old_rows on commit drop as
  select
    p.*,
    f.family_id,
    coalesce(p.specifications, '{}'::jsonb)
      - coalesce(
          array(select jsonb_array_elements_text(p.enrichment -> 'specs_added')),
          array[]::text[]
        ) as trusted_specs
  from public.products p
  join family_of f on f.old_id = p.id;

  -- 3c. Create one variant per old row.
  insert into public.product_variants (
    id, product_id, sku, processor, ram, storage, graphics,
    price, quantity, specifications, image_url,
    enrichment_status, enrichment, enriched_at, created_at, updated_at
  )
  select
    r.id,
    r.family_id,
    r.model_number,
    nullif(btrim(r.trusted_specs ->> 'processor'), ''),
    nullif(btrim(r.trusted_specs ->> 'ram'), ''),
    nullif(btrim(r.trusted_specs ->> 'storage'), ''),
    nullif(btrim(coalesce(r.trusted_specs ->> 'graphics', r.trusted_specs ->> 'gpu')), ''),
    coalesce(r.price, 0),
    coalesce(r.quantity, 0),

    -- Other specs = everything except the four configuration specs above.
    -- If the configuration was not known before enrichment, AI-added specs are
    -- left out (they are still in enrichment.found_specifications).
    case
      when r.enrichment_status in ('enriched', 'needs_review')
           and not (r.trusted_specs ?| array['processor', 'ram', 'storage'])
        then r.trusted_specs
      else coalesce(r.specifications, '{}'::jsonb)
    end - array['processor', 'ram', 'storage', 'graphics', 'gpu'],

    r.image_url,

    case
      when r.enrichment_status in ('enriched', 'needs_review')
           and not (r.trusted_specs ?| array['processor', 'ram', 'storage'])
        then 'needs_review'
      else r.enrichment_status
    end,

    case
      when r.enrichment_status in ('enriched', 'needs_review')
           and not (r.trusted_specs ?| array['processor', 'ram', 'storage'])
        then coalesce(r.enrichment, '{}'::jsonb) || jsonb_build_object(
          'review_reasons', jsonb_build_array(
            'Moved to variants: the exact configuration was not known before AI enrichment, '
            || 'so the found specs could not be checked against this variant. '
            || 'They are in found_specifications for review.'
          )
        )
      else r.enrichment
    end,

    r.enriched_at,
    r.created_at,
    r.updated_at
  from old_rows r;

  -- 3d. Families that got several rows: give the family the first image and
  --     brand found among its rows, if the family row itself has none.
  update public.products fam
  set
    brand = coalesce(fam.brand, (
      select r.brand from old_rows r
      where r.family_id = fam.id and r.brand is not null
      order by r.created_at limit 1
    )),
    image_url = coalesce(fam.image_url, (
      select r.image_url from old_rows r
      where r.family_id = fam.id and r.image_url is not null
      order by r.created_at limit 1
    ))
  where fam.id in (select family_id from old_rows where family_id <> id);

  -- 3e. Remove the old rows that are now variants of another family.
  --     (Their data is in product_variants and in the backup.)
  delete from public.products
  where id in (select id from old_rows where family_id <> id);

  -- 3f. Remove the columns that now live on product_variants.
  --     The enrichment trigger from 0003 uses enriched_at, so replace it first.
  drop trigger if exists products_set_updated_at on public.products;

  alter table public.products drop constraint if exists products_model_number_key;
  alter table public.products drop constraint if exists products_enrichment_status_check;
  alter table public.products
    drop column model_number,
    drop column price,
    drop column quantity,
    drop column specifications,
    drop column enrichment_status,
    drop column enrichment,
    drop column enriched_at;
end $$;

-- ----------------------------------------------------------------------------
-- 4. updated_at triggers.
-- ----------------------------------------------------------------------------

-- Families: any change records the time (same as migration 0001).
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function set_updated_at();

-- Variants: enrichment saves (they always change enriched_at) do NOT count as
-- an update, so they don't reorder the "latest stock" lists. Same idea as 0003.
create or replace function set_variant_updated_at()
returns trigger as $$
begin
  if new.enriched_at is distinct from old.enriched_at then
    return new;
  end if;

  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function set_variant_updated_at();

-- The products-only function from 0003 is no longer used.
drop function if exists set_products_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Security: the public website may only READ variants of visible families.
--    All writes go through the server-side service-role key (admin + scripts).
-- ----------------------------------------------------------------------------
alter table public.product_variants enable row level security;

drop policy if exists "Public can read variants of visible products" on public.product_variants;
create policy "Public can read variants of visible products"
  on public.product_variants for select
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and p.is_archived = false
    )
  );

commit;

-- ----------------------------------------------------------------------------
-- 6. Check the result (shown in the SQL editor after running).
--    Expected on first run: backup_rows = 106, variants = 106.
-- ----------------------------------------------------------------------------
select
  (select count(*) from backup.products_before_0004) as backup_rows,
  (select count(*) from public.products)             as families,
  (select count(*) from public.product_variants)     as variants,
  (select count(*) from public.product_variants where enrichment_status = 'needs_review') as needs_review;
