-- Micron Computers: enrichment saves should not count as "product updated"
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run.
--
-- The storefront and admin lists are sorted by updated_at (newest first).
-- scripts/enrich-products.mjs fills in specs, images etc., but that is not a
-- stock or admin change, so it should not push the product to the top.
--
-- How we tell them apart: every enrichment save changes enriched_at, and
-- nothing else (admin edits, sheet imports) ever touches enriched_at.

-- 1. A products-only version of the updated_at trigger.
create or replace function set_products_updated_at()
returns trigger as $$
begin
  if new.enriched_at is distinct from old.enriched_at then
    -- Enrichment save: leave updated_at exactly as it was.
    return new;
  end if;

  -- Any other change (admin edit, sheet import): record the time.
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at
  before update on products
  for each row execute function set_products_updated_at();

-- 2. One-off repair: the first enrichment test (16-r1707TX, before this fix)
--    bumped its updated_at. Put back the value it had before that test.
--    The trigger is paused so it does not overwrite the value we set.
alter table products disable trigger products_set_updated_at;

update products
set updated_at = '2026-09-12 13:35:38.379175+00'
where model_number = '16-r1707TX'
  and updated_at > '2026-09-25 00:00:00+00';

alter table products enable trigger products_set_updated_at;
