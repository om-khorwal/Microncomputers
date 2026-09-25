"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Specifications } from "@/lib/types";

// This is the shape of the message we send back to the product form
// when something goes wrong (or nothing, when it works).
export type ProductFormState = {
  error?: string;
};

// Turns an empty string into null. We use this because the database
// should store "no brand" as null, not as an empty string.
function emptyToNull(value: string): string | null {
  if (value === "") {
    return null;
  }
  return value;
}

// Reads the spec_key / spec_value pairs from the form and turns them into
// a simple object, e.g. { ram: "16 GB", storage: "1 TB SSD" }.
function readSpecifications(formData: FormData): Specifications {
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

// Creates a new product from the "Add Product" form.
export async function createProduct(
  previousState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  // Step 1: Read the plain text fields from the form.
  const modelNumber = String(formData.get("model_number") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("price"));

  // Step 2: Check the required fields before touching the database.
  if (modelNumber === "" || name === "") {
    return { error: "Model number and name are required." };
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    return { error: "Quantity must be a non-negative number." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a non-negative number." };
  }

  // Step 3: Build the row we want to insert.
  const newProduct = {
    model_number: modelNumber,
    name: name,
    brand: emptyToNull(brand),
    category: emptyToNull(category),
    image_url: emptyToNull(imageUrl),
    quantity: quantity,
    price: price,
    specifications: readSpecifications(formData),
  };

  // Step 4: Insert it into Supabase.
  const { error } = await supabaseAdmin.from("products").insert(newProduct);

  if (error) {
    if (error.code === "23505") {
      return { error: "A product with this model number already exists." };
    }
    return { error: error.message };
  }

  // Step 5: Tell Next.js the product pages changed, then go back to the list.
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  redirect("/admin/products");
}

// Updates an existing product from the "Edit Product" form.
export async function updateProduct(
  id: string,
  previousState: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  // Step 1: Read the plain text fields from the form.
  const modelNumber = String(formData.get("model_number") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("price"));

  // Step 2: Check the required fields before touching the database.
  if (modelNumber === "" || name === "") {
    return { error: "Model number and name are required." };
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    return { error: "Quantity must be a non-negative number." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { error: "Price must be a non-negative number." };
  }

  // Step 3: Build the updated row.
  const updatedProduct = {
    model_number: modelNumber,
    name: name,
    brand: emptyToNull(brand),
    category: emptyToNull(category),
    image_url: emptyToNull(imageUrl),
    quantity: quantity,
    price: price,
    specifications: readSpecifications(formData),
  };

  // Step 4: Save it to Supabase.
  const { error } = await supabaseAdmin
    .from("products")
    .update(updatedProduct)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "A product with this model number already exists." };
    }
    return { error: error.message };
  }

  // Step 5: Tell Next.js the product pages changed, then go back to the list.
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  revalidatePath("/");
  redirect("/admin/products");
}

// Archives or unarchives a product. Archived products stay in the database
// but are hidden from the customer site.
export async function setArchived(id: string, archived: boolean) {
  await supabaseAdmin.from("products").update({ is_archived: archived }).eq("id", id);

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
}

// Permanently deletes a product. This cannot be undone.
export async function deleteProduct(id: string) {
  await supabaseAdmin.from("products").delete().eq("id", id);

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
}
