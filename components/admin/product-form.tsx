"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton, inputClass } from "@/components/admin/form-parts";
import { VariantFields } from "@/components/admin/variant-form";
import { CATEGORIES } from "@/lib/types";
import type { Product } from "@/lib/types";
import type { ProductFormState } from "@/app/admin/products/actions";

// The product FAMILY form: name, brand, category and main image.
// When creating a new product, it also asks for the first variant
// (model number, configuration, price, stock), because a product needs at
// least one variant to be sold.
export function ProductForm({
  action,
  product,
  submitLabel,
  withFirstVariant,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  product?: Product;
  submitLabel: string;
  withFirstVariant?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError message={state.error} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Product Name *" full>
          <input name="name" defaultValue={product?.name} required placeholder="e.g. HP Victus Gaming Laptop 15" className={inputClass} />
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
        <Field label="Product Image URL" full>
          <input name="image_url" defaultValue={product?.image_url ?? ""} placeholder="https://…" className={inputClass} />
        </Field>
      </div>

      {withFirstVariant && (
        <div className="rounded-lg border border-border bg-white p-4">
          <h2 className="text-sm font-semibold text-navy">First Variant</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted">
            The exact model you are selling. You can add more configurations after saving.
          </p>
          <VariantFields />
        </div>
      )}

      <SubmitButton pending={pending} label={submitLabel} />
    </form>
  );
}
