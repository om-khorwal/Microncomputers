-- Micron Computers V1 schema tweaks
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run: guards against re-adding columns/constraints that already exist.

-- 1. Stable metadata columns the sheet import needs but doesn't always own.
alter table products add column if not exists brand text;
alter table products add column if not exists category text;
alter table products add column if not exists is_archived boolean not null default false;

-- 2. model_number is the import's identity key — must be unique to upsert on.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_model_number_key'
  ) then
    alter table products add constraint products_model_number_key unique (model_number);
  end if;
end $$;

-- 3. Keep updated_at honest on every row change (manual edits and import upserts alike).
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_updated_at();

-- 4. Lock the table down: public/customer site reads only; all writes go through
--    the server-side service-role key (admin Server Actions), which bypasses RLS.
--    Nothing here lets the anon/publishable key insert, update, or delete.
alter table products enable row level security;

drop policy if exists "Public can read non-archived products" on products;
create policy "Public can read non-archived products"
  on products for select
  using (is_archived = false);
