"use client";

import { useActionState } from "react";
import { Field, FormError, SpecificationsEditor, SubmitButton, inputClass } from "@/components/admin/form-parts";
import type { ProductFormState } from "@/app/admin/products/actions";
import type { ProductVariant } from "@/lib/types";

// The inputs for one variant: exact model number, configuration, Micron price
// and stock, photo and other specs. Used on its own (VariantForm below) and
// inside the "Add Product" form for the first variant.
export function VariantFields({ variant }: { variant?: ProductVariant }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Model Number / SKU *" full>
          <input name="sku" defaultValue={variant?.sku} required placeholder="e.g. 15-fa2689TX" className={inputClass} />
        </Field>
        <Field label="Processor">
          <input name="processor" defaultValue={variant?.processor ?? ""} placeholder="e.g. Intel Core i5-13420H" className={inputClass} />
        </Field>
        <Field label="RAM">
          <input name="ram" defaultValue={variant?.ram ?? ""} placeholder="e.g. 16GB" className={inputClass} />
        </Field>
        <Field label="Storage">
          <input name="storage" defaultValue={variant?.storage ?? ""} placeholder="e.g. 512GB SSD" className={inputClass} />
        </Field>
        <Field label="Graphics">
          <input name="graphics" defaultValue={variant?.graphics ?? ""} placeholder="e.g. NVIDIA GeForce RTX 4050 6GB" className={inputClass} />
        </Field>
        <Field label="Quantity *">
          <input name="quantity" type="number" min={0} step={1} defaultValue={variant?.quantity ?? 0} required className={inputClass} />
        </Field>
        <Field label="Wholesale Price (₹) *">
          <input name="price" type="number" min={0} step="0.01" defaultValue={variant?.price ?? ""} required className={inputClass} />
        </Field>
        <Field label="Variant Image URL (optional - otherwise the product image is used)" full>
          <input name="variant_image_url" defaultValue={variant?.image_url ?? ""} placeholder="https://…" className={inputClass} />
        </Field>
      </div>

      <SpecificationsEditor initial={variant?.specifications} />
    </div>
  );
}

// The full "Add Variant" / "Edit Variant" form. When editing, it also shows
// what enrichment found, so the admin can review it and set the status.
export function VariantForm({
  action,
  variant,
  submitLabel,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  variant?: ProductVariant;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError message={state.error} />

      <VariantFields variant={variant} />

      {variant && <EnrichmentReview variant={variant} />}

      <SubmitButton pending={pending} label={submitLabel} />
    </form>
  );
}

// Shows what the enrichment script found for this variant, and lets the admin
// change the review status. Nothing here is copied into the variant
// automatically - the admin types any correct values into the fields above.
function EnrichmentReview({ variant }: { variant: ProductVariant }) {
  const enrichment = variant.enrichment;
  const foundSpecs = Object.entries(enrichment?.found_specifications ?? {});
  const reasons = enrichment?.review_reasons ?? [];
  const conflicts = enrichment?.spec_conflicts ?? [];
  const family = enrichment?.family;
  const nameCheck = enrichment?.name_check;

  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-navy">Enrichment Review</h2>
        <p className="mt-0.5 text-xs text-muted">
          Found online by the enrichment script. Nothing here is shown to customers unless the status is
          &quot;Enriched&quot; or you copy values into the fields above.
        </p>
      </div>

      <div className="space-y-4 px-4 py-4 text-sm">
        <Field label="Review status">
          <select name="enrichment_status" defaultValue={variant.enrichment_status ?? ""} className={inputClass}>
            <option value="">Not enriched</option>
            <option value="enriched">Enriched (verified for this exact model)</option>
            <option value="needs_review">Needs review</option>
            <option value="retry_later">Retry later</option>
          </select>
        </Field>

        {enrichment?.retry_reason && <p className="text-xs text-muted">Last retry reason: {enrichment.retry_reason}</p>}

        {reasons.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Why it needs review</div>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-navy">
              {reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {conflicts.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Disagreements (yours was kept)</div>
            <ul className="mt-1 space-y-1 text-xs text-navy">
              {conflicts.map((conflict) => (
                <li key={conflict.spec}>
                  <strong>{conflict.spec}</strong>: yours &quot;{conflict.ours}&quot; · found &quot;{conflict.found}&quot;
                </li>
              ))}
            </ul>
          </div>
        )}

        {nameCheck?.status === "mismatch" && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">Name mismatch</div>
            <dl className="mt-1 space-y-0.5 text-xs text-navy">
              <div>
                <span className="text-muted">Our sheet: </span>
                {nameCheck.sheet_name}
              </div>
              <div>
                <span className="text-muted">Verified web name: </span>
                {nameCheck.web_name}
              </div>
            </dl>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-navy">
              {nameCheck.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {nameCheck.sources.length > 0 && (
              <p className="mt-1 break-all text-xs text-muted">Sources: {nameCheck.sources.join(", ")}</p>
            )}
          </div>
        )}

        {family && (
          <div>
            <div
              className={`text-xs font-semibold uppercase tracking-wide ${family.status === "verified" ? "text-green-700" : "text-amber-700"}`}
            >
              Product family {family.status === "verified" ? "(verified)" : "(needs review)"}
            </div>
            <dl className="mt-1 space-y-0.5 text-xs text-navy">
              <div>
                <span className="text-muted">Detected: </span>
                {family.family_name ?? "—"}
              </div>
              <div>
                <span className="text-muted">Evidence: </span>
                {family.confidence}
                {family.supporting_websites.length > 0 && ` · ${family.supporting_websites.join(", ")}`}
              </div>
              <div>
                <span className="text-muted">Decision: </span>
                {family.decision}
              </div>
            </dl>
            {family.reasons.length > 0 && (
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-navy">
                {family.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {foundSpecs.length > 0 && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Specs found online</div>
            <dl className="mt-1 divide-y divide-border rounded-md border border-border text-xs">
              {foundSpecs.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 px-3 py-1.5">
                  <dt className="text-muted">{key}</dt>
                  <dd className="text-right text-navy">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {!enrichment && <p className="text-xs text-muted">This variant has not been enriched yet.</p>}
      </div>
    </div>
  );
}
