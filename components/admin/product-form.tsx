"use client";

import { useActionState, useState } from "react";
import { CATEGORIES } from "@/lib/types";
import type { Product } from "@/lib/types";
import type { ProductFormState } from "@/app/admin/products/actions";

type SpecRow = { key: string; value: string };

export function ProductForm({
  action,
  product,
  submitLabel,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  product?: Product;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const initialSpecs: SpecRow[] = product?.specifications
    ? Object.entries(product.specifications).map(([key, value]) => ({ key, value }))
    : [{ key: "", value: "" }];
  const [specs, setSpecs] = useState<SpecRow[]>(initialSpecs);

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {state.error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Model Number *">
          <input name="model_number" defaultValue={product?.model_number} required className={inputClass} />
        </Field>
        <Field label="Product Name *">
          <input name="name" defaultValue={product?.name} required className={inputClass} />
        </Field>
        <Field label="Brand">
          <input name="brand" defaultValue={product?.brand ?? ""} className={inputClass} />
        </Field>
        <Field label="Category">
          <select name="category" defaultValue={product?.category ?? ""} className={inputClass}>
            <option value="">— None —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Quantity *">
          <input name="quantity" type="number" min={0} defaultValue={product?.quantity ?? 0} required className={inputClass} />
        </Field>
        <Field label="Wholesale Price (₹) *">
          <input name="price" type="number" min={0} step="0.01" defaultValue={product?.price ?? ""} required className={inputClass} />
        </Field>
        <Field label="Image URL" full>
          <input name="image_url" defaultValue={product?.image_url ?? ""} placeholder="https://…" className={inputClass} />
        </Field>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-navy">Specifications</span>
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
                placeholder="e.g. processor"
                className={inputClass}
              />
              <input
                name="spec_value"
                value={row.value}
                onChange={(e) => setSpecs(specs.map((s, si) => (si === i ? { ...s, value: e.target.value } : s)))}
                placeholder="e.g. Intel Core i5"
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

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

const inputClass = "w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block text-sm ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block font-medium text-navy">{label}</span>
      {children}
    </label>
  );
}
