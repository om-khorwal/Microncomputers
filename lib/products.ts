import { supabase } from "@/lib/supabase/supabase";
import type { Product } from "@/lib/types";

export type ProductFilters = {
  q?: string;
  category?: string;
  brand?: string;
  inStockOnly?: boolean;
};


// Get all products + optional filters
export async function getProducts(
  filters: ProductFilters = {}
): Promise<Product[]> {

  let query = supabase
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false });

  // Search
  if (filters.q) {
    query = query.or(
      `name.ilike.%${filters.q}%,model_number.ilike.%${filters.q}%,brand.ilike.%${filters.q}%`
    );
  }

  // Category filter
  if (filters.category) {
    query = query.eq("category", filters.category);
  }

  // Brand filter
  if (filters.brand) {
    query = query.eq("brand", filters.brand);
  }

  // Only products with stock
  if (filters.inStockOnly) {
    query = query.gt("quantity", 0);
  }

  const { data, error } = await query;

  if (error) {
    console.log("Products error:", error);
    return [];
  }

  return data ?? [];
}


// Get one product
export async function getProductById(
  id: string
): Promise<Product | null> {

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.log("Product error:", error);
    return null;
  }

  return data ?? null;
}


// Get latest products
export async function getFeaturedProducts(
  limit = 5
): Promise<Product[]> {

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.log("Featured products error:", error);
    return [];
  }

  return data ?? [];
}


// Get all unique brands
export async function getDistinctBrands(): Promise<string[]> {

  const { data, error } = await supabase
    .from("products")
    .select("brand")
    .not("brand", "is", null);

  if (error) {
    console.log("Brands error:", error);
    return [];
  }

  const brands = data?.map((product) => product.brand).filter(Boolean) ?? [];

  return [...new Set(brands)] as string[];
}


// Get all unique categories
export async function getActiveCategories(): Promise<string[]> {

  const { data, error } = await supabase
    .from("products")
    .select("category")
    .not("category", "is", null);

  if (error) {
    console.log("Categories error:", error);
    return [];
  }

  const categories =
    data?.map((product) => product.category).filter(Boolean) ?? [];

  return [...new Set(categories)] as string[];
}