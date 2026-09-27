import { supabase } from "@/lib/supabase/supabase";
import type { ProductWithVariants } from "@/lib/types";
import { latestStockUpdate } from "@/lib/variants";

// The customer site only shows variants whose details were verified by the
// enrichment script. Variants that still need review (or were never enriched)
// stay in Supabase and in the admin panel, but customers don't see them.
// A family with no visible variant is hidden too.
const STOREFRONT_STATUS = "enriched";

export type ProductFilters = {
  q?: string;
  category?: string;
  brand?: string;
  inStockOnly?: boolean;
};


// Get every visible product family, with all of its variants.
// Newest stock update first.
//
// The catalogue is small (a few hundred laptops), so we load it once and
// filter in code below. That is much simpler than one big database query that
// searches families and variants at the same time.
async function getAllFamilies(): Promise<ProductWithVariants[]> {

  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("is_archived", false)
    .eq("product_variants.enrichment_status", STOREFRONT_STATUS);

  if (error) {
    console.log("Products error:", error);
    return [];
  }

  // A family with no (visible) variants has nothing to sell, so we hide it.
  const families = (data ?? []).filter(
    (family) => family.product_variants.length > 0
  ) as ProductWithVariants[];

  families.sort((first, second) =>
    latestStockUpdate(second).localeCompare(latestStockUpdate(first))
  );

  return families;
}


// Get all product families + optional filters
export async function getProducts(
  filters: ProductFilters = {}
): Promise<ProductWithVariants[]> {

  const families = await getAllFamilies();
  const searchText = (filters.q ?? "").trim().toLowerCase();

  return families.filter((family) => {

    // Search: family name, brand, or any variant's exact model number
    if (searchText) {
      const nameMatches = family.name.toLowerCase().includes(searchText);
      const brandMatches = (family.brand ?? "").toLowerCase().includes(searchText);
      const skuMatches = family.product_variants.some((variant) =>
        variant.sku.toLowerCase().includes(searchText)
      );

      if (!nameMatches && !brandMatches && !skuMatches) {
        return false;
      }
    }

    // Category filter
    if (filters.category && family.category !== filters.category) {
      return false;
    }

    // Brand filter
    if (filters.brand && family.brand !== filters.brand) {
      return false;
    }

    // Only families with at least one variant in stock
    if (filters.inStockOnly) {
      const anyInStock = family.product_variants.some((variant) => variant.quantity > 0);

      if (!anyInStock) {
        return false;
      }
    }

    return true;
  });
}


// Get one product family (with its variants)
export async function getProductById(
  id: string
): Promise<ProductWithVariants | null> {

  const { data, error } = await supabase
    .from("products")
    .select("*, product_variants(*)")
    .eq("id", id)
    .eq("product_variants.enrichment_status", STOREFRONT_STATUS)
    .maybeSingle();

  if (error) {
    console.log("Product error:", error);
    return null;
  }

  if (!data || data.product_variants.length === 0) {
    return null;
  }

  return data as ProductWithVariants;
}


// Old links point at a variant's id (before the family/variant split, every
// model number had its own page). Returns that variant's family id, if any.
export async function getFamilyIdForVariant(
  variantId: string
): Promise<string | null> {

  const { data, error } = await supabase
    .from("product_variants")
    .select("product_id")
    .eq("id", variantId)
    .eq("enrichment_status", STOREFRONT_STATUS)
    .maybeSingle();

  if (error) {
    console.log("Variant error:", error);
    return null;
  }

  return data?.product_id ?? null;
}


// Get latest product families
export async function getFeaturedProducts(
  limit = 5
): Promise<ProductWithVariants[]> {

  const families = await getAllFamilies();

  return families.slice(0, limit);
}


// Get all unique brands (of the families customers can see)
export async function getDistinctBrands(): Promise<string[]> {

  const families = await getAllFamilies();

  const brands = families.map((family) => family.brand).filter(Boolean);

  return [...new Set(brands)].sort() as string[];
}


// Get all unique categories (of the families customers can see)
export async function getActiveCategories(): Promise<string[]> {

  const families = await getAllFamilies();

  const categories = families.map((family) => family.category).filter(Boolean);

  return [...new Set(categories)] as string[];
}
