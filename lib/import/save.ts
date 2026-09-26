// Saves the rows of an uploaded stock sheet to Supabase.
//
// Every row is one EXACT model number (a variant). For each row:
//   - Model number already in the shop → update ONLY its Micron price and quantity.
//     Nothing else about it is touched (configuration, specs, enrichment).
//   - New model number → add it as a new variant. It joins the product family
//     named in the "Family" column (or, if the sheet has none, the family with
//     the same name as the row's product name). If that family doesn't exist
//     yet, it is created.
//
// Model numbers are compared ignoring capitals and outer spaces, so
// "14-ep0294tu" in the sheet updates the existing "14-EP0294TU".
//
// The database connection is passed in, so this file works both from the
// admin Server Action and from test scripts.

import type { SupabaseClient } from "@supabase/supabase-js";

// One row of data that comes from the uploaded sheet.
export type ImportRow = {
  model_number: string;
  name: string;
  quantity: number;
  price: number;
  // Optional columns - empty string when the sheet doesn't have them.
  family?: string;
  brand?: string;
  processor?: string;
  ram?: string;
  storage?: string;
  graphics?: string;
};

// A summary of what happened after we tried to save the sheet.
export type ImportResult = {
  createdProducts: number;
  createdVariants: number;
  updated: number;
  skipped: number;
  errors: string[];
};

// "14-ep0294tu " → "14-EP0294TU". Must match the database's sku_key column.
export function skuKey(modelNumber: string): string {
  return modelNumber.trim().toUpperCase();
}

// "  HP Victus 15 " → "hp victus 15". Used to match family names.
function familyKey(name: string): string {
  return name.trim().toLowerCase();
}

function emptyToNull(value: string | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed === "" ? null : trimmed;
}

// Splits a list into smaller lists, so no single database request gets too big.
function inChunks<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

export async function saveImportRows(supabase: SupabaseClient, rows: ImportRow[]): Promise<ImportResult> {
  const result: ImportResult = { createdProducts: 0, createdVariants: 0, updated: 0, skipped: 0, errors: [] };

  // Step 1: Keep only valid rows, and de-duplicate by model number.
  // If the sheet lists the same model number twice, the last row wins.
  const rowsBySku = new Map<string, ImportRow>();

  for (const row of rows) {
    const isValid =
      row.model_number.trim() !== "" &&
      row.name.trim() !== "" &&
      Number.isInteger(row.quantity) &&
      row.quantity >= 0 &&
      Number.isFinite(row.price) &&
      row.price >= 0;

    if (!isValid) {
      result.skipped++;
      continue;
    }

    rowsBySku.set(skuKey(row.model_number), row);
  }

  const skuKeys = Array.from(rowsBySku.keys());

  // Nothing valid to import.
  if (skuKeys.length === 0) {
    return result;
  }

  // Step 2: Find out which of these model numbers already exist as variants.
  const existingIdBySku = new Map<string, string>();

  for (const chunk of inChunks(skuKeys, 100)) {
    const { data, error } = await supabase.from("product_variants").select("id, sku_key").in("sku_key", chunk);

    if (error) {
      result.errors.push(`Could not check existing model numbers: ${error.message}`);
      return result;
    }

    for (const variant of data ?? []) {
      existingIdBySku.set(variant.sku_key, variant.id);
    }
  }

  // Step 3: Update existing variants - Micron price and quantity ONLY.
  // One at a time, so if one row fails we still know exactly which model number caused it.
  const newRows: ImportRow[] = [];

  for (const [key, row] of rowsBySku) {
    const existingId = existingIdBySku.get(key);

    if (!existingId) {
      newRows.push(row);
      continue;
    }

    const { error } = await supabase
      .from("product_variants")
      .update({ quantity: row.quantity, price: row.price })
      .eq("id", existingId);

    if (error) {
      result.errors.push(`Update failed for ${row.model_number}: ${error.message}`);
    } else {
      result.updated++;
    }
  }

  if (newRows.length === 0) {
    return result;
  }

  // Step 4: Find (or create) the family for every new model number.
  const { data: families, error: familiesError } = await supabase.from("products").select("id, name");

  if (familiesError) {
    result.errors.push(`Could not load products: ${familiesError.message}`);
    return result;
  }

  const familyIdByName = new Map<string, string>();

  for (const family of families ?? []) {
    // If two families have the same name, keep the first one we saw.
    if (!familyIdByName.has(familyKey(family.name))) {
      familyIdByName.set(familyKey(family.name), family.id);
    }
  }

  // The family name for a row: the Family column, otherwise the product name.
  function familyNameOf(row: ImportRow): string {
    return emptyToNull(row.family) ?? row.name.trim();
  }

  const familiesToCreate = new Map<string, { name: string; brand: string | null }>();

  for (const row of newRows) {
    const name = familyNameOf(row);

    if (!familyIdByName.has(familyKey(name)) && !familiesToCreate.has(familyKey(name))) {
      familiesToCreate.set(familyKey(name), { name: name, brand: emptyToNull(row.brand) });
    }
  }

  if (familiesToCreate.size > 0) {
    const { data: created, error } = await supabase
      .from("products")
      .insert(Array.from(familiesToCreate.values()))
      .select("id, name");

    if (error) {
      result.errors.push(`Creating new products failed: ${error.message}`);
      return result;
    }

    for (const family of created ?? []) {
      familyIdByName.set(familyKey(family.name), family.id);
    }

    result.createdProducts += created?.length ?? 0;
  }

  // Step 5: Create the new variants, all in one request.
  // The configuration comes from the sheet (trusted), never from a guess.
  const variantsToInsert = newRows.map((row) => ({
    product_id: familyIdByName.get(familyKey(familyNameOf(row))),
    sku: row.model_number.trim(),
    processor: emptyToNull(row.processor),
    ram: emptyToNull(row.ram),
    storage: emptyToNull(row.storage),
    graphics: emptyToNull(row.graphics),
    quantity: row.quantity,
    price: row.price,
  }));

  const { error: insertError, count } = await supabase
    .from("product_variants")
    .insert(variantsToInsert, { count: "exact" });

  if (insertError) {
    if (insertError.code === "23505") {
      result.errors.push("Insert failed: a model number in this sheet was added by someone else at the same time. Please upload again.");
    } else {
      result.errors.push(`Insert failed: ${insertError.message}`);
    }
  } else {
    result.createdVariants += count ?? variantsToInsert.length;
  }

  return result;
}
