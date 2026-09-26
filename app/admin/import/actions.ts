"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveImportRows, type ImportResult, type ImportRow } from "@/lib/import/save";

// Takes the rows parsed from the uploaded sheet and saves them to Supabase.
// - A model number we already have gets its quantity and price updated.
// - A model number we don't have yet gets created as a new variant, inside
//   its product family (created too if needed).
// The details are in lib/import/save.ts.
export async function importProducts(rows: ImportRow[]): Promise<ImportResult> {
  const result = await saveImportRows(supabaseAdmin, rows);

  // Refresh the pages that show product data so the new stock shows up.
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");

  return result;
}
