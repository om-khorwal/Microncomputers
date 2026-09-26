// Helpers for working with a product family and its variants.
//
// This file has no database code, so it can be used both on the server and in
// the browser (the variant picker on the product page uses it).

import { VARIANT_OPTION_FIELDS } from "@/lib/types";
import type { ProductVariant, ProductWithVariants, VariantOptionField } from "@/lib/types";

// ----------------------------------------------------------------------------
// Family summaries (used by product cards and lists)
// ----------------------------------------------------------------------------

export type FamilySummary = {
  variantCount: number;
  lowestPrice: number;
  highestPrice: number;
  totalQuantity: number;
  inStock: boolean;
  /** The variant we show first: the cheapest one in stock, or the cheapest overall. */
  defaultVariant: ProductVariant;
};

/** Picks the variant to show first: cheapest in-stock one, otherwise the cheapest. */
export function pickDefaultVariant(variants: ProductVariant[]): ProductVariant {
  const inStockVariants = variants.filter((variant) => variant.quantity > 0);
  const candidates = inStockVariants.length > 0 ? inStockVariants : variants;

  let cheapest = candidates[0];

  for (const variant of candidates) {
    if (variant.price < cheapest.price) {
      cheapest = variant;
    }
  }

  return cheapest;
}

/** Works out the price range, total stock and default variant of a family. */
export function summarizeFamily(family: ProductWithVariants): FamilySummary {
  const variants = family.product_variants;
  let lowestPrice = variants[0].price;
  let highestPrice = variants[0].price;
  let totalQuantity = 0;

  for (const variant of variants) {
    lowestPrice = Math.min(lowestPrice, variant.price);
    highestPrice = Math.max(highestPrice, variant.price);
    totalQuantity = totalQuantity + variant.quantity;
  }

  return {
    variantCount: variants.length,
    lowestPrice,
    highestPrice,
    totalQuantity,
    inStock: totalQuantity > 0,
    defaultVariant: pickDefaultVariant(variants),
  };
}

/**
 * When the family's stock or price last changed: the newest variant update.
 * (Enrichment saves don't change a variant's updated_at, see migration 0004.)
 */
export function latestStockUpdate(family: ProductWithVariants): string {
  let latest = family.created_at;

  for (const variant of family.product_variants) {
    if (variant.updated_at > latest) {
      latest = variant.updated_at;
    }
  }

  return latest;
}

/** The short spec line for a variant, e.g. ["Intel Core 7 240H", "16GB", "1TB SSD"]. */
export function variantHeadline(variant: ProductVariant): string[] {
  const parts: string[] = [];

  for (const value of [variant.processor, variant.ram, variant.storage]) {
    if (value) {
      parts.push(value);
    }
  }

  return parts;
}

// ----------------------------------------------------------------------------
// The variant picker (Processor / RAM / Storage / Graphics buttons)
// ----------------------------------------------------------------------------

/** "sku" is used as an extra option when the configuration alone can't tell variants apart. */
export type OptionField = VariantOptionField | "sku";

export type OptionValue = {
  /** Simplified text used to compare values: "16 GB" and "16GB" are the same option. */
  key: string;
  /** What the customer sees on the button. */
  label: string;
};

export type OptionGroup = {
  field: OptionField;
  label: string;
  values: OptionValue[];
};

const OPTION_LABELS: Record<OptionField, string> = {
  processor: "Processor",
  ram: "RAM",
  storage: "Storage",
  graphics: "Graphics",
  sku: "Model",
};

/** Lowercase letters and numbers only. "16 GB DDR5" → "16gbddr5". */
export function simplifyText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** The comparable key of one variant for one option, e.g. ram → "16gb". Empty if unknown. */
export function optionKey(variant: ProductVariant, field: OptionField): string {
  const value = field === "sku" ? variant.sku : variant[field];
  return value ? simplifyText(value) : "";
}

function optionLabel(variant: ProductVariant, field: OptionField): string {
  const value = field === "sku" ? variant.sku : variant[field];
  return value ? value : "Not listed";
}

/**
 * Decides which option groups to show for a family.
 * - Only options that actually differ between variants are shown
 *   (if every variant has 16GB RAM, there is nothing to choose).
 * - If two variants still look the same after that (e.g. their configuration
 *   is unknown), a "Model" group with the exact SKUs is added so the customer
 *   can always reach every variant.
 * - Only values that exist on a real variant are ever listed.
 */
export function buildOptionGroups(variants: ProductVariant[]): OptionGroup[] {
  if (variants.length <= 1) {
    return [];
  }

  const groups: OptionGroup[] = [];

  for (const field of VARIANT_OPTION_FIELDS) {
    const values: OptionValue[] = [];

    for (const variant of variants) {
      const key = optionKey(variant, field);

      if (!values.some((value) => value.key === key)) {
        values.push({ key, label: optionLabel(variant, field) });
      }
    }

    if (values.length > 1) {
      groups.push({ field, label: OPTION_LABELS[field], values });
    }
  }

  // Can every variant be told apart by the groups so far?
  const combinations = new Set<string>();

  for (const variant of variants) {
    combinations.add(groups.map((group) => optionKey(variant, group.field)).join("|"));
  }

  if (combinations.size < variants.length) {
    groups.push({
      field: "sku",
      label: OPTION_LABELS.sku,
      values: variants.map((variant) => ({ key: optionKey(variant, "sku"), label: variant.sku })),
    });
  }

  return groups;
}

/**
 * How an option button should look, given the variant currently selected:
 * - "selected":  the current variant has this value
 * - "available": another variant has this value AND all the other current choices
 * - "changes-others": a variant with this value exists, but picking it also
 *   changes another option (e.g. i7 only comes with 16GB). It is still a real,
 *   buyable variant - never an impossible combination.
 */
export type OptionState = "selected" | "available" | "changes-others";

export function getOptionState(
  variants: ProductVariant[],
  groups: OptionGroup[],
  current: ProductVariant,
  field: OptionField,
  key: string
): OptionState {
  if (optionKey(current, field) === key) {
    return "selected";
  }

  const exactSwapExists = variants.some((variant) => {
    if (optionKey(variant, field) !== key) {
      return false;
    }

    return groups.every((group) => group.field === field || optionKey(variant, group.field) === optionKey(current, group.field));
  });

  return exactSwapExists ? "available" : "changes-others";
}

/**
 * The customer clicked an option. Returns the real variant to switch to:
 * one with the clicked value that keeps as many of the other current choices
 * as possible. Earlier groups count more (Processor > RAM > Storage > Graphics),
 * so clicking "16GB" on an AMD laptop keeps AMD rather than switching to Intel.
 * Ties go to in-stock variants, then the lower price.
 */
export function chooseVariant(
  variants: ProductVariant[],
  groups: OptionGroup[],
  current: ProductVariant,
  field: OptionField,
  key: string
): ProductVariant {
  let best: ProductVariant | null = null;
  let bestScore = -1;

  for (const variant of variants) {
    if (optionKey(variant, field) !== key) {
      continue;
    }

    // Each kept choice adds points; the first group is worth the most
    // (with 4 groups: 16, 8, 4, 2), so one kept processor beats a kept
    // storage + graphics together.
    let score = 0;

    groups.forEach((group, index) => {
      if (group.field !== field && optionKey(variant, group.field) === optionKey(current, group.field)) {
        score = score + 2 ** (groups.length - index);
      }
    });

    const isBetter =
      best === null ||
      score > bestScore ||
      (score === bestScore && variant.quantity > 0 && best.quantity === 0) ||
      (score === bestScore && (variant.quantity > 0) === (best.quantity > 0) && variant.price < best.price);

    if (isBetter) {
      best = variant;
      bestScore = score;
    }
  }

  return best ?? current;
}
