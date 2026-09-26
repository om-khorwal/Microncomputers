// Helpers for reading the admin product and variant forms.
// Used by actions.ts and variant-actions.ts (server code only).

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { EnrichmentStatus, Specifications } from "@/lib/types";

// Turns an empty string into null. We use this because the database
// should store "no brand" as null, not as an empty string.
export function emptyToNull(value: string): string | null {
  if (value === "") {
    return null;
  }
  return value;
}

// Reads one text field from the form, with outer spaces removed.
export function readText(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

// Reads the spec_key / spec_value pairs from the form and turns them into
// a simple object, e.g. { weight: "1.8 kg", display: "15.6-inch FHD" }.
export function readSpecifications(formData: FormData): Specifications {
  const keys = formData.getAll("spec_key") as string[];
  const values = formData.getAll("spec_value") as string[];

  const specifications: Specifications = {};

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i].trim();
    const value = (values[i] ?? "").trim();

    // Skip blank rows - the admin may have added a spec row and left it empty.
    if (key === "" || value === "") {
      continue;
    }

    specifications[key] = value;
  }

  return specifications;
}

// The family fields: name, brand, category, image.
export function readFamilyFields(formData: FormData) {
  const name = readText(formData, "name");

  if (name === "") {
    return { error: "Product name is required." };
  }

  return {
    fields: {
      name: name,
      brand: emptyToNull(readText(formData, "brand")),
      category: emptyToNull(readText(formData, "category")),
      image_url: emptyToNull(readText(formData, "image_url")),
    },
  };
}

// The variant fields: SKU, configuration, Micron price and stock, other specs.
export function readVariantFields(formData: FormData) {
  const sku = readText(formData, "sku");
  const price = Number(formData.get("price"));
  const quantity = Number(formData.get("quantity"));

  if (sku === "") {
    return { error: "Model number / SKU is required." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a non-negative number." };
  }

  if (!Number.isInteger(quantity) || quantity < 0) {
    return { error: "Quantity must be a whole number, 0 or more." };
  }

  return {
    fields: {
      sku: sku,
      processor: emptyToNull(readText(formData, "processor")),
      ram: emptyToNull(readText(formData, "ram")),
      storage: emptyToNull(readText(formData, "storage")),
      graphics: emptyToNull(readText(formData, "graphics")),
      price: price,
      quantity: quantity,
      image_url: emptyToNull(readText(formData, "variant_image_url")),
      specifications: readSpecifications(formData),
    },
  };
}

// Reads the "Review status" dropdown on the variant edit form.
// An empty choice means "not enriched".
export function readEnrichmentStatus(formData: FormData): EnrichmentStatus | null {
  const status = readText(formData, "enrichment_status");

  if (status === "enriched" || status === "needs_review" || status === "retry_later") {
    return status;
  }

  return null;
}

// Builds a friendly message when a SKU is already taken, naming the family
// that has it, e.g. "15-fa2689TX already exists in HP Victus Gaming Laptop 15."
export async function duplicateSkuMessage(sku: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("product_variants")
    .select("sku, products(name)")
    .eq("sku_key", sku.trim().toUpperCase())
    .maybeSingle();

  const family = data?.products as { name: string } | { name: string }[] | null | undefined;
  const familyName = Array.isArray(family) ? family[0]?.name : family?.name;

  if (familyName) {
    return `Model number ${data?.sku} already exists in "${familyName}". Each model number can only be listed once.`;
  }

  return "A variant with this model number already exists. Each model number can only be listed once.";
}
