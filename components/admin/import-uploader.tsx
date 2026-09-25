"use client";

import { useState } from "react";
import { parseSheetFile, type ParseResult } from "@/lib/import/parse";
import { importProducts, type ImportResult } from "@/app/admin/import/actions";

export function ImportUploader() {
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  async function handleFile(file: File) {
    setResult(null);
    setParseError(null);
    try {
      const parsedResult = await parseSheetFile(file);
      setParsed(parsedResult);
    } catch {
      setParseError("Could not read this file. Please upload a valid .csv or .xlsx sheet.");
      setParsed(null);
    }
  }

  async function handlePublish() {
    if (!parsed) return;
    setPublishing(true);
    const validRows = parsed.rows.filter((r) => r.issues.length === 0);
    const res = await importProducts(validRows);
    setResult(res);
    setPublishing(false);
    setParsed(null);
  }

  const validRows = parsed?.rows.filter((r) => r.issues.length === 0) ?? [];
  const invalidRows = parsed?.rows.filter((r) => r.issues.length > 0) ?? [];
  const unmappedFields = parsed
    ? (Object.entries(parsed.mapping) as [string, string | null][]).filter(([, v]) => v === null)
    : [];

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-border bg-white p-8 text-center">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
          className="text-sm"
        />
        <p className="mt-2 text-xs text-muted">
          Expected columns: Model Number, Configuration / Product Name, Quantity, Selling Price (or After GST).
        </p>
      </div>

      {parseError && <p className="text-sm text-red-600">{parseError}</p>}

      {parsed && (
        <div>
          {unmappedFields.length > 0 && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Couldn&apos;t find a column for: {unmappedFields.map(([f]) => f.replace("_", " ")).join(", ")}. Rows are
              missing that data until the sheet includes it.
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-navy">
              <strong>{validRows.length}</strong> row{validRows.length === 1 ? "" : "s"} ready to publish
              {invalidRows.length > 0 && (
                <span className="text-red-600"> · {invalidRows.length} row{invalidRows.length === 1 ? "" : "s"} will be skipped</span>
              )}
            </p>
            <button
              onClick={handlePublish}
              disabled={publishing || validRows.length === 0}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-50"
            >
              {publishing ? "Publishing…" : `Publish ${validRows.length} Products`}
            </button>
          </div>

          <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-border bg-[#f8f9fb] text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Model Number</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parsed.rows.map((row) => (
                  <tr key={row.rowNumber} className={row.issues.length > 0 ? "bg-red-50/50" : ""}>
                    <td className="px-3 py-2 text-xs text-muted">{row.rowNumber}</td>
                    <td className="px-3 py-2">{row.model_number || "—"}</td>
                    <td className="px-3 py-2">{row.name || "—"}</td>
                    <td className="px-3 py-2">{row.quantity}</td>
                    <td className="px-3 py-2">{row.price}</td>
                    <td className="px-3 py-2 text-xs">
                      {row.issues.length > 0 ? (
                        <span className="text-red-600">{row.issues.join(", ")}</span>
                      ) : (
                        <span className="text-green-700">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-border bg-white p-5">
          <h3 className="text-sm font-semibold text-navy">Import Result</h3>
          <div className="mt-3 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-bold text-green-700">{result.created}</div>
              <div className="text-xs text-muted">Created</div>
            </div>
            <div>
              <div className="text-xl font-bold text-accent">{result.updated}</div>
              <div className="text-xs text-muted">Updated</div>
            </div>
            <div>
              <div className="text-xl font-bold text-muted">{result.skipped}</div>
              <div className="text-xs text-muted">Skipped</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-4 space-y-1 text-xs text-red-600">
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
