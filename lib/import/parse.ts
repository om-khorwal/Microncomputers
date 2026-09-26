import * as XLSX from "xlsx";

export type ParsedRow = {
  rowNumber: number;
  model_number: string;
  name: string;
  quantity: number;
  price: number;
  // Optional columns. Empty string when the sheet doesn't have them.
  family: string;
  brand: string;
  processor: string;
  ram: string;
  storage: string;
  graphics: string;
  issues: string[];
};

/** Columns every sheet must have. */
const REQUIRED_FIELDS = ["model_number", "name", "quantity", "price"] as const;

/**
 * Columns a sheet MAY have. They let one sheet describe several
 * configurations (variants) of the same product family:
 *   family    - the product family, e.g. "HP Victus 15". Rows with the same
 *               family become variants of one product. If missing, the
 *               product name is used as the family.
 *   processor / ram / storage / graphics - the exact configuration.
 */
const OPTIONAL_FIELDS = ["family", "brand", "processor", "ram", "storage", "graphics"] as const;

type SheetField = (typeof REQUIRED_FIELDS)[number] | (typeof OPTIONAL_FIELDS)[number];

export type ParseResult = {
  rows: ParsedRow[];
  headers: string[];
  mapping: Record<SheetField, string | null>;
  /** Required columns that could not be found in the sheet. */
  missingRequired: string[];
};

/** Header text -> canonical field, matched after lowercasing and stripping non-alphanumerics. */
const SYNONYMS: Record<SheetField, string[]> = {
  model_number: ["modelnumber", "modelno", "model", "modelnum", "sku", "partnumber"],
  name: ["configurationproductname", "productname", "configuration", "name", "description", "config"],
  quantity: ["quantity", "qty", "stock", "availableqty"],
  // Prefer an explicit selling price; fall back to after/before GST if that's all the sheet has.
  price: ["sellingprice", "price", "aftergst", "rate", "beforegst"],
  family: ["family", "productfamily", "series", "basemodel", "basename"],
  brand: ["brand", "make", "manufacturer"],
  processor: ["processor", "cpu", "chip"],
  ram: ["ram", "memory"],
  storage: ["storage", "ssd", "hdd", "disk"],
  graphics: ["graphics", "gpu", "graphicscard"],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildMapping(headers: string[]): ParseResult["mapping"] {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const mapping = {} as ParseResult["mapping"];

  (Object.keys(SYNONYMS) as SheetField[]).forEach((field) => {
    mapping[field] = null;

    for (const synonym of SYNONYMS[field]) {
      const match = normalized.find((h) => h.norm === synonym);
      if (match) {
        mapping[field] = match.raw;
        break;
      }
    }
  });

  return mapping;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/[₹,\s]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function parseSheetFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const headers = raw.length > 0 ? Object.keys(raw[0]) : [];
  const mapping = buildMapping(headers);
  const missingRequired = REQUIRED_FIELDS.filter((field) => mapping[field] === null).map((field) => field.replace("_", " "));

  // Reads one text cell for a field, or "" if the sheet has no such column.
  function readText(record: Record<string, unknown>, field: SheetField): string {
    const column = mapping[field];
    return column ? String(record[column] ?? "").trim() : "";
  }

  const rows: ParsedRow[] = raw.map((record, i) => {
    const issues: string[] = [];

    const model_number = readText(record, "model_number");
    const name = readText(record, "name");
    const quantity = mapping.quantity ? toNumber(record[mapping.quantity]) : null;
    const price = mapping.price ? toNumber(record[mapping.price]) : null;

    if (!model_number) issues.push("Missing model number");
    if (!name) issues.push("Missing product name");
    if (quantity === null) issues.push("Quantity is not a number");
    else if (!Number.isInteger(quantity) || quantity < 0) issues.push("Quantity must be a whole number, 0 or more");
    if (price === null) issues.push("Price is not a number");
    else if (price < 0) issues.push("Price cannot be negative");

    return {
      rowNumber: i + 2, // +1 for header row, +1 for 1-indexing
      model_number,
      name,
      quantity: quantity ?? 0,
      price: price ?? 0,
      family: readText(record, "family"),
      brand: readText(record, "brand"),
      processor: readText(record, "processor"),
      ram: readText(record, "ram"),
      storage: readText(record, "storage"),
      graphics: readText(record, "graphics"),
      issues,
    };
  });

  return { rows, headers, mapping, missingRequired };
}
