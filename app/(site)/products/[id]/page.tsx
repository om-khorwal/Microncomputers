import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { getProductById } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const inStock = product.quantity > 0;
  const specs = Object.entries(product.specifications ?? {});

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <nav className="text-xs text-muted">
        <Link href="/products" className="hover:text-accent">All Products</Link>
        <span className="mx-1.5">/</span>
        <span className="text-navy">{product.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="aspect-[4/3] overflow-hidden rounded-lg border border-border bg-[#f3f5f9]">
          {product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary external host, see product-card.tsx
            <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
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
          <p className="mt-1 text-sm text-muted">Model: {product.model_number}</p>

          <div className="mt-6 flex items-center gap-4">
            <span className="text-3xl font-extrabold text-navy">{formatPrice(product.price)}</span>
            <span className={`rounded px-2.5 py-1 text-xs font-semibold ${inStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
              {inStock ? `${product.quantity} in stock` : "Out of stock"}
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
                  <div key={key} className="flex justify-between px-4 py-2.5 text-sm">
                    <dt className="capitalize text-muted">{key}</dt>
                    <dd className="font-medium text-navy">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
