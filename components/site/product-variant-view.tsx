"use client";

import { useState } from "react";
import { formatDate, formatPrice, formatSpecLabel, onlinePriceSource } from "@/lib/format";
import type { ProductVariant, ProductWithVariants } from "@/lib/types";
import { buildOptionGroups, chooseVariant, getOptionState } from "@/lib/variants";

// The product page for one family. The customer picks options (processor,
// RAM, storage...) and everything below updates to that exact variant:
// price, stock, model number, specs, photo and online prices.
//
// The picker can only ever land on a real variant, so an impossible
// combination is never shown as selected.
export function ProductVariantView({
  product,
  initialVariantId,
}: {
  product: ProductWithVariants;
  initialVariantId: string;
}) {
  const variants = product.product_variants;
  const optionGroups = buildOptionGroups(variants);

  const [selectedId, setSelectedId] = useState(initialVariantId);
  const variant = variants.find((item) => item.id === selectedId) ?? variants[0];

  // Switch to another variant, and put its id in the address bar so the link
  // can be shared. replaceState doesn't reload the page.
  function selectVariant(nextVariant: ProductVariant) {
    setSelectedId(nextVariant.id);
    window.history.replaceState(null, "", `?variant=${nextVariant.id}`);
  }

  const inStock = variant.quantity > 0;
  const imageUrl = variant.image_url ?? product.image_url;

  // Only show web-found extras when enrichment verified this exact variant.
  const isVerified = variant.enrichment_status === "enriched";
  const fullProductName = isVerified ? variant.enrichment?.full_product_name : null;
  const showFullProductName = fullProductName && fullProductName !== product.name;
  const onlinePrices = isVerified ? variant.enrichment?.online_prices ?? [] : [];

  // The spec table: configuration first, then any other specs.
  const specs: [string, string][] = [];

  for (const field of ["processor", "ram", "storage", "graphics"] as const) {
    const value = variant[field];

    if (value) {
      specs.push([field, value]);
    }
  }

  for (const [key, value] of Object.entries(variant.specifications ?? {})) {
    specs.push([key, value]);
  }

  return (
    <div className="mt-6 grid gap-10 lg:grid-cols-2">
      <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-[#f3f5f9]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary external host, see product-card.tsx
          <img src={imageUrl} alt={product.name} className="h-full w-full bg-white object-contain p-4" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-navy/30">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1.5 19.5h21" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      <div>
        {product.brand && (
          <span className="text-xs font-bold uppercase tracking-wider text-accent">{product.brand}</span>
        )}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{product.name}</h1>
        {showFullProductName && <p className="mt-1 text-sm font-medium text-navy/80">{fullProductName}</p>}
        <p className="mt-1 text-sm text-muted">Model: {variant.sku}</p>

        {optionGroups.length > 0 && (
          <div className="mt-6 space-y-4">
            {optionGroups.map((group) => (
              <div key={group.field}>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">{group.label}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.values.map((value) => {
                    const state = getOptionState(variants, optionGroups, variant, group.field, value.key);

                    let buttonClass = "border-border text-navy hover:border-accent";
                    let title: string | undefined;

                    if (state === "selected") {
                      buttonClass = "border-accent bg-accent/10 font-semibold text-accent";
                    } else if (state === "changes-others") {
                      buttonClass = "border-dashed border-border text-muted hover:border-accent hover:text-navy";
                      title = "Available in a different configuration - other options will change too";
                    }

                    return (
                      <button
                        key={value.key}
                        type="button"
                        title={title}
                        aria-pressed={state === "selected"}
                        onClick={() => selectVariant(chooseVariant(variants, optionGroups, variant, group.field, value.key))}
                        className={`rounded-md border px-3 py-1.5 text-sm transition ${buttonClass}`}
                      >
                        {value.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <span className="text-3xl font-extrabold text-navy">{formatPrice(variant.price)}</span>
          <span className={`rounded px-2.5 py-1 text-xs font-semibold ${inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {inStock ? `${variant.quantity} in stock` : "Out of stock"}
          </span>
        </div>

        {/* Cart and checkout aren't built yet, so these buttons are disabled placeholders. */}
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled
            title="Cart is coming soon"
            className="rounded-md border border-navy px-6 py-3 text-sm font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to Cart
          </button>
          <button
            type="button"
            disabled
            title="Checkout is coming soon"
            className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Buy Now
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">Online ordering is coming soon.</p>

        {specs.length > 0 && (
          <div className="mt-8 rounded-lg border border-border">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-navy">Specifications</h2>
            <dl className="divide-y divide-border">
              {specs.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-6 px-4 py-2.5 text-sm">
                  <dt className="shrink-0 text-muted">{formatSpecLabel(key)}</dt>
                  <dd className="text-right font-medium text-navy">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {onlinePrices.length > 0 && (
          <div className="mt-6 rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-sm font-semibold text-navy">Prices at other shops</h2>
              <p className="mt-0.5 text-xs text-muted">
                For reference only
                {variant.enriched_at && <> · checked on {formatDate(variant.enriched_at)}</>}
              </p>
            </div>
            <ul className="divide-y divide-border">
              {onlinePrices.map((onlinePrice) => {
                // Only call it "Flipkart" etc. if the link is really on that shop's website.
                const source = onlinePriceSource(onlinePrice.store_name, onlinePrice.product_url);

                return (
                  <li key={onlinePrice.store_name + onlinePrice.product_url} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
                    <span className="text-navy">
                      {source.label}
                      {source.listedFor && <span className="ml-1 text-xs text-muted">(lists {source.listedFor} price)</span>}
                      {onlinePrice.in_stock === false && <span className="ml-2 text-xs text-red-600">Out of stock</span>}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold text-navy">{formatPrice(onlinePrice.price_inr)}</span>
                      <a
                        href={onlinePrice.product_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        View
                      </a>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
