-- Micron Computers: product enrichment columns
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to re-run: only adds what is missing.
--
-- Used by scripts/enrich-products.mjs, which looks up each model number online
-- and fills in missing details. It never touches price, quantity or name.

-- 1. Where the product is in the enrichment process:
--      null           → never enriched yet
--      'enriched'     → done, nothing to check
--      'needs_review' → done, but some found specs disagree with ours
--      'retry_later'  → could not be enriched this time (no pages found, API error...)
alter table products add column if not exists enrichment_status text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_enrichment_status_check'
  ) then
    alter table products add constraint products_enrichment_status_check
      check (enrichment_status in ('enriched', 'needs_review', 'retry_later'));
  end if;
end $$;

-- 2. Everything the enrichment found that does not have its own column:
--    full product name, all verified images, online prices, source pages,
--    spec disagreements to review, and the reason for a retry.
alter table products add column if not exists enrichment jsonb;

-- 3. When the product was last enriched.
alter table products add column if not exists enriched_at timestamptz;
