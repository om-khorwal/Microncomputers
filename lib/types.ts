export type Specifications = Record<string, string>;

/** One price found on another shop's website while enriching a variant. */
export type OnlinePrice = {
  store_name: string;
  price_inr: number;
  product_url: string;
  in_stock: boolean | null;
};

/** One verified product photo found while enriching a variant. */
export type EnrichmentImage = {
  url: string;
  from_page: string;
  matched_by: string;
};

/** What scripts/enrich-products.mjs saves in a variant's `enrichment` column. */
export type ProductEnrichment = {
  full_product_name?: string | null;
  images?: EnrichmentImage[];
  online_prices?: OnlinePrice[];
  source_urls?: string[];
  found_specifications?: Specifications;
  spec_conflicts?: { spec: string; ours: string; found: string }[];
  review_reasons?: string[];
  retry_reason?: string;
  notes?: string | null;
  family?: FamilyFinding;
  name_check?: NameCheck;
};

/** Our stock-sheet name compared with the verified web name. */
export type NameCheck = {
  status: "matches" | "mismatch" | "not_checked";
  sheet_name: string;
  web_name: string | null;
  reasons: string[];
  sources: string[];
};

/** Which product family enrichment found for a variant, and what it did about it. */
export type FamilyFinding = {
  status: "verified" | "needs_review";
  family_name: string | null;
  family_key: string | null;
  brand: string | null;
  confidence: string;
  manufacturer_page: string | null;
  supporting_websites: string[];
  evidence: { url: string; quote: string }[];
  reasons: string[];
  decision: string;
  /** The family the variant was in before it was moved (null if not moved). */
  moved_from: string | null;
};

export type EnrichmentStatus = "enriched" | "needs_review" | "retry_later";

/**
 * A product FAMILY, e.g. "HP Victus Gaming Laptop 15".
 * Holds only what all its variants share. Price and stock live on the variants.
 */
export type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  /** The family's main photo. Used when a variant has no photo of its own. */
  image_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * One exact, sellable configuration of a family, e.g. 15-fa2689TX
 * (Core 7 240H / 16GB / 1TB SSD / RTX 5050). This is what the stock sheet counts.
 */
export type ProductVariant = {
  id: string;
  product_id: string;
  /** The exact model number / SKU from the stock sheet. */
  sku: string;
  /** The SKU in capitals without outer spaces. Used to find duplicates. */
  sku_key: string;
  processor: string | null;
  ram: string | null;
  storage: string | null;
  graphics: string | null;
  /** Micron's own price. Only the stock sheet and the admin change it. */
  price: number;
  /** Micron's own stock. Only the stock sheet and the admin change it. */
  quantity: number;
  /** Any other specs, e.g. { weight: "2.31 kg" }. */
  specifications: Specifications;
  image_url: string | null;
  enrichment_status: EnrichmentStatus | null;
  enrichment: ProductEnrichment | null;
  enriched_at: string | null;
  created_at: string;
  updated_at: string;
};

/** A family together with all of its variants. */
export type ProductWithVariants = Product & {
  product_variants: ProductVariant[];
};

/** The four configuration fields that make one variant different from another. */
export const VARIANT_OPTION_FIELDS = ["processor", "ram", "storage", "graphics"] as const;
export type VariantOptionField = (typeof VARIANT_OPTION_FIELDS)[number];

/** The static category taxonomy. Simple and fixed on purpose — no categories table. */
export const CATEGORIES = [
  "Business Laptops",
  "Gaming Laptops",
  "Ultrabooks",
  "2-in-1 Laptops",
  "Student Laptops",
  "Workstations",
] as const;
