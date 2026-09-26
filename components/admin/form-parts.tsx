"use client";

import { useState } from "react";
import type { Specifications } from "@/lib/types";

// Small building blocks shared by the product form and the variant form.

export const inputClass = "w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent";

export function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-sm ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block font-medium text-navy">{label}</span>
      {children}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}

export function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

type SpecRow = { key: string; value: string };

// The "Other specifications" editor: rows of name + value, sent to the
// server as spec_key / spec_value pairs.
export function SpecificationsEditor({ initial }: { initial?: Specifications | null }) {
  const initialRows: SpecRow[] =
    initial && Object.keys(initial).length > 0
      ? Object.entries(initial).map(([key, value]) => ({ key, value }))
      : [{ key: "", value: "" }];

  const [specs, setSpecs] = useState<SpecRow[]>(initialRows);

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-navy">Other Specifications</span>
        <button
          type="button"
          onClick={() => setSpecs([...specs, { key: "", value: "" }])}
          className="text-xs font-semibold text-accent hover:text-accent-dark"
        >
          + Add Spec
        </button>
      </div>
      <div className="mt-2 space-y-2">
        {specs.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input
              name="spec_key"
              value={row.key}
              onChange={(e) => setSpecs(specs.map((s, si) => (si === i ? { ...s, key: e.target.value } : s)))}
              placeholder="e.g. display"
              className={inputClass}
            />
            <input
              name="spec_value"
              value={row.value}
              onChange={(e) => setSpecs(specs.map((s, si) => (si === i ? { ...s, value: e.target.value } : s)))}
              placeholder="e.g. 15.6-inch FHD 144Hz"
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setSpecs(specs.filter((_, si) => si !== i))}
              className="shrink-0 rounded-md border border-border px-3 text-sm text-muted hover:bg-black/5"
              aria-label="Remove spec"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
