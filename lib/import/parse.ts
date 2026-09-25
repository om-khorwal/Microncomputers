import * as XLSX from "xlsx";

export type ParsedRow = {
  rowNumber: number;
  model_number: string;
  name: string;
  quantity: number;
  price: number;
  issues: string[];
};

export type ParseResult = {
  rows: ParsedRow[];
  headers: string[];
  mapping: Record<"model_number" | "name" | "quantity" | "price", string | null>;
};

/** Header text -> canonical field, matched after lowercasing and stripping non-alphanumerics. */
const SYNONYMS: Record<"model_number" | "name" | "quantity" | "price", string[]> = {
  model_number: ["modelnumber", "modelno", "model", "modelnum"],
  name: ["configurationproductname", "productname", "configuration", "name", "description", "config"],
  quantity: ["quantity", "qty", "stock", "availableqty"],
  // Prefer an explicit selling price; fall back to after/before GST if that's all the sheet has.
  price: ["sellingprice", "price", "aftergst", "rate", "beforegst"],
};

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildMapping(headers: string[]): ParseResult["mapping"] {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const mapping: ParseResult["mapping"] = { model_number: null, name: null, quantity: null, price: null };

  (Object.keys(SYNONYMS) as (keyof typeof SYNONYMS)[]).forEach((field) => {
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

  const rows: ParsedRow[] = raw.map((record, i) => {
    const issues: string[] = [];

    const model_number = mapping.model_number ? String(record[mapping.model_number] ?? "").trim() : "";
    const name = mapping.name ? String(record[mapping.name] ?? "").trim() : "";
    const quantity = mapping.quantity ? toNumber(record[mapping.quantity]) : null;
    const price = mapping.price ? toNumber(record[mapping.price]) : null;

    if (!model_number) issues.push("Missing model number");
    if (!name) issues.push("Missing product name");
    if (quantity === null) issues.push("Quantity is not a number");
    if (price === null) issues.push("Price is not a number");

    return {
      rowNumber: i + 2, // +1 for header row, +1 for 1-indexing
      model_number,
      name,
      quantity: quantity ?? 0,
      price: price ?? 0,
      issues,
    };
  });

  return { rows, headers, mapping };
}
