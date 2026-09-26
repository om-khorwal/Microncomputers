import Link from "next/link";
import { formatPrice, headlineSpecs } from "@/lib/format";
import type { ProductWithVariants } from "@/lib/types";
import { summarizeFamily, variantHeadline } from "@/lib/variants";

function PlaceholderThumb() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f3f5f9] text-navy/30">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1.5 19.5h21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

// One card per product family. If the family has several variants, the card
// shows the lowest price ("From ₹…") and how many configurations there are.
export function ProductCard({ product }: { product: ProductWithVariants }) {
  const summary = summarizeFamily(product);
  const defaultVariant = summary.defaultVariant;
  const inStock = summary.inStock;
  const hasSeveralPrices = summary.lowestPrice !== summary.highestPrice;

  // Spec line: the default variant's processor / RAM / storage, or its other specs.
  let specs = variantHeadline(defaultVariant);

  if (specs.length === 0) {
    specs = headlineSpecs(defaultVariant.specifications);
  }

  // Use the variant's own photo, otherwise the family photo.
  const imageUrl = defaultVariant.image_url ?? product.image_url;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-white transition hover:shadow-md">
      <Link href={`/products/${product.id}`} className="relative block aspect-[4/3] w-full overflow-hidden">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- image_url can be any external host (sheet/admin supplied), so next/image's remotePatterns allowlist doesn't fit here.
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full bg-white object-contain p-3 transition group-hover:scale-105"
          />
        ) : (
          <PlaceholderThumb />
        )}
        {!inStock && (
          <span className="absolute left-2 top-2 rounded bg-navy px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            Out of Stock
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {summary.variantCount > 1 ? `${summary.variantCount} configurations` : defaultVariant.sku}
        </span>
        <Link href={`/products/${product.id}`} className="line-clamp-2 text-sm font-semibold text-navy hover:text-accent">
          {product.name}
        </Link>

        {specs.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted">{specs.join(" · ")}</p>
        )}

        <div className="mt-auto pt-3">
          <div className="text-base font-bold text-navy">
            {hasSeveralPrices && <span className="text-xs font-medium text-muted">From </span>}
            {formatPrice(summary.lowestPrice)}
          </div>
          <div className={`text-xs ${inStock ? "text-muted" : "text-red-600"}`}>
            {inStock ? `${summary.totalQuantity} in stock` : "Out of stock"}
          </div>

          {/* Cart and checkout aren't built yet, so these buttons are disabled placeholders. */}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled
              title="Cart is coming soon"
              className="flex-1 rounded-md border border-border py-2 text-xs font-semibold text-navy disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to Cart
            </button>
            <button
              type="button"
              disabled
              title="Checkout is coming soon"
              className="flex-1 rounded-md bg-accent py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
