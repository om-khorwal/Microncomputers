"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ProductFormState } from "@/app/admin/products/actions";
import { duplicateSkuMessage, readEnrichmentStatus, readVariantFields } from "@/app/admin/products/form-helpers";

// Tells Next.js this family's pages changed, so they show fresh data.
function refreshFamilyPages(productId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/");
}

// Adds a new variant (exact model number / configuration) to a family.
export async function createVariant(
  productId: string,
  previousState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  // Step 1: Read and check the form.
  const variant = readVariantFields(formData);
  if (variant.error || !variant.fields) {
    return { error: variant.error };
  }

  // Step 2: Insert it. The database refuses a model number that already exists.
  const { error } = await supabaseAdmin
    .from("product_variants")
    .insert({ ...variant.fields, product_id: productId });

  if (error) {
    if (error.code === "23505") {
      return { error: await duplicateSkuMessage(variant.fields.sku) };
    }
    return { error: error.message };
  }

  // Step 3: Refresh the pages, then go back to the family.
  refreshFamilyPages(productId);
  redirect(`/admin/products/${productId}`);
}

// Saves changes to one variant.
export async function updateVariant(
  productId: string,
  variantId: string,
  previousState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  // Step 1: Read and check the form.
  const variant = readVariantFields(formData);
  if (variant.error || !variant.fields) {
    return { error: variant.error };
  }

  // The admin can mark a flagged variant as reviewed (or flag it) here.
  const fieldsToSave = {
    ...variant.fields,
    enrichment_status: readEnrichmentStatus(formData),
  };

  // Step 2: Save it.
  const { error } = await supabaseAdmin
    .from("product_variants")
    .update(fieldsToSave)
    .eq("id", variantId)
    .eq("product_id", productId);

  if (error) {
    if (error.code === "23505") {
      return { error: await duplicateSkuMessage(variant.fields.sku) };
    }
    return { error: error.message };
  }

  // Step 3: Refresh the pages, then go back to the family.
  refreshFamilyPages(productId);
  redirect(`/admin/products/${productId}`);
}

// Permanently deletes one variant. The family and its other variants stay.
export async function deleteVariant(productId: string, variantId: string) {
  await supabaseAdmin.from("product_variants").delete().eq("id", variantId).eq("product_id", productId);

  refreshFamilyPages(productId);
}
