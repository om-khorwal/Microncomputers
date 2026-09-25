import Link from "next/link";
import { formatPrice, headlineSpecs } from "@/lib/format";
import type { Product } from "@/lib/types";

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

export function ProductCard({ product }: { product: Product }) {
  const specs = headlineSpecs(product.specifications);
  const inStock = product.quantity > 0;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-white transition hover:shadow-md">
      <Link href={`/products/${product.id}`} className="relative block aspect-[4/3] w-full overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- image_url can be any external host (sheet/admin supplied), so next/image's remotePatterns allowlist doesn't fit here.
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
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
          {product.model_number}
        </span>
        <Link href={`/products/${product.id}`} className="line-clamp-2 text-sm font-semibold text-navy hover:text-accent">
          {product.name}
        </Link>

        {specs.length > 0 && (
          <p className="line-clamp-1 text-xs text-muted">{specs.join(" · ")}</p>
        )}

        <div className="mt-auto pt-3">
          <div className="text-base font-bold text-navy">{formatPrice(product.price)}</div>
          <div className={`text-xs ${inStock ? "text-muted" : "text-red-600"}`}>
            {inStock ? `${product.quantity} in stock` : "Out of stock"}
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
