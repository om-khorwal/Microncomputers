"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";

// One row of data that comes from the uploaded sheet.
export type ImportRow = {
  model_number: string;
  name: string;
  quantity: number;
  price: number;
};

// A summary of what happened after we tried to save the sheet.
export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

type ExistingProduct = {
  id: string;
  model_number: string;
  name: string;
};

// Takes the rows parsed from the uploaded sheet and saves them to Supabase.
// - A model number we already have gets its quantity and price updated.
// - A model number we don't have yet gets created as a new product.
export async function importProducts(rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

  // Step 1: Keep only valid rows, and de-duplicate by model number.
  // If the sheet lists the same model number twice, the last row wins.
  const rowsByModelNumber = new Map<string, ImportRow>();

  for (const row of rows) {
    const isValid =
      row.model_number !== "" &&
      row.name !== "" &&
      Number.isFinite(row.quantity) &&
      Number.isFinite(row.price);

    if (!isValid) {
      result.skipped++;
      continue;
    }

    rowsByModelNumber.set(row.model_number, row);
  }

  const modelNumbers = Array.from(rowsByModelNumber.keys());

  // Nothing valid to import.
  if (modelNumbers.length === 0) {
    return result;
  }

  // Step 2: Find out which of these model numbers already exist in the database.
  const { data: existingProducts, error: fetchError } = await supabaseAdmin
    .from("products")
    .select("id, model_number, name")
    .in("model_number", modelNumbers);

  if (fetchError) {
    result.errors.push(`Could not check existing products: ${fetchError.message}`);
    return result;
  }

  const existingByModelNumber = new Map<string, ExistingProduct>();
  for (const product of existingProducts ?? []) {
    existingByModelNumber.set(product.model_number, product);
  }

  // Step 3: Sort each row into "create as new product" or "update existing product".
  const productsToInsert: { model_number: string; name: string; quantity: number; price: number }[] = [];
  const productsToUpdate: { id: string; model_number: string; quantity: number; price: number; name: string | null }[] =
    [];

  for (const [modelNumber, row] of rowsByModelNumber) {
    const existingProduct = existingByModelNumber.get(modelNumber);

    if (existingProduct) {
      // This product already exists. Quantity and price are "volatile" data from
      // the sheet, so we always update them. Name is only filled in if it was
      // missing before - we never overwrite good existing metadata.
      let nameToSave: string | null = null;
      if (!existingProduct.name) {
        nameToSave = row.name;
      }

      productsToUpdate.push({
        id: existingProduct.id,
        model_number: modelNumber,
        quantity: row.quantity,
        price: row.price,
        name: nameToSave,
      });
    } else {
      // This is a brand new model number - create it.
      productsToInsert.push({
        model_number: modelNumber,
        name: row.name,
        quantity: row.quantity,
        price: row.price,
      });
    }
  }

  // Step 4: Create the new products, all in one request.
  if (productsToInsert.length > 0) {
    const { error, count } = await supabaseAdmin
      .from("products")
      .insert(productsToInsert, { count: "exact" });

    if (error) {
      result.errors.push(`Insert failed: ${error.message}`);
    } else {
      result.created += count ?? productsToInsert.length;
    }
  }

  // Step 5: Update the existing products one at a time, so if one row fails
  // we still know exactly which model number caused it.
  for (const product of productsToUpdate) {
    const fieldsToUpdate: { quantity: number; price: number; name?: string } = {
      quantity: product.quantity,
      price: product.price,
    };

    if (product.name) {
      fieldsToUpdate.name = product.name;
    }

    const { error } = await supabaseAdmin.from("products").update(fieldsToUpdate).eq("id", product.id);

    if (error) {
      result.errors.push(`Update failed for ${product.model_number}: ${error.message}`);
    } else {
      result.updated++;
    }
  }

  // Step 6: Refresh the pages that show product data so the new stock shows up.
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");

  return result;
}
