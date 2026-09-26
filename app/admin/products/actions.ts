"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { duplicateSkuMessage, readFamilyFields, readVariantFields } from "@/app/admin/products/form-helpers";

// This is the shape of the message we send back to the product form
// when something goes wrong (or nothing, when it works).
export type ProductFormState = {
  error?: string;
};

// Tells Next.js the product pages changed, so they show fresh data.
function refreshProductPages(productId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");

  if (productId) {
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath(`/products/${productId}`);
  }
}

// Creates a new product family together with its first variant,
// from the "Add Product" form.
export async function createProduct(
  previousState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  // Step 1: Read and check both parts of the form before touching the database.
  const family = readFamilyFields(formData);
  if (family.error || !family.fields) {
    return { error: family.error };
  }

  const variant = readVariantFields(formData);
  if (variant.error || !variant.fields) {
    return { error: variant.error };
  }

  // Step 2: Create the family.
  const { data: newFamily, error: familyError } = await supabaseAdmin
    .from("products")
    .insert(family.fields)
    .select("id")
    .single();

  if (familyError || !newFamily) {
    return { error: familyError?.message ?? "Could not create the product." };
  }

  // Step 3: Create its first variant.
  const { error: variantError } = await supabaseAdmin
    .from("product_variants")
    .insert({ ...variant.fields, product_id: newFamily.id });

  if (variantError) {
    // Undo step 2, so we don't leave an empty family behind.
    await supabaseAdmin.from("products").delete().eq("id", newFamily.id);

    if (variantError.code === "23505") {
      return { error: await duplicateSkuMessage(variant.fields.sku) };
    }
    return { error: variantError.message };
  }

  // Step 4: Refresh the pages, then open the new product so more variants can be added.
  refreshProductPages(newFamily.id);
  redirect(`/admin/products/${newFamily.id}`);
}

// Updates a family's shared details (name, brand, category, image)
// from the "Edit Product" form. Variants are edited separately.
export async function updateProduct(
  id: string,
  previousState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  // Step 1: Read and check the form.
  const family = readFamilyFields(formData);
  if (family.error || !family.fields) {
    return { error: family.error };
  }

  // Step 2: Save it to Supabase.
  const { error } = await supabaseAdmin.from("products").update(family.fields).eq("id", id);

  if (error) {
    return { error: error.message };
  }

  // Step 3: Refresh the pages, then go back to the list.
  refreshProductPages(id);
  redirect("/admin/products");
}

// Archives or unarchives a product family. Archived products stay in the
// database but are hidden from the customer site, with all their variants.
export async function setArchived(id: string, archived: boolean) {
  await supabaseAdmin.from("products").update({ is_archived: archived }).eq("id", id);

  refreshProductPages(id);
}

// Permanently deletes a product family AND all of its variants.
// This cannot be undone.
export async function deleteProduct(id: string) {
  await supabaseAdmin.from("products").delete().eq("id", id);

  refreshProductPages(id);
}
