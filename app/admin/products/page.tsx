import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ProductWithVariants } from "@/lib/types";
import { latestStockUpdate, summarizeFamily } from "@/lib/variants";
import { EnrichmentBadge } from "@/components/admin/enrichment-badge";
import { ProductRowActions } from "@/components/admin/product-row-actions";

export const metadata = { title: "Products | Micron Admin" };
export const dynamic = "force-dynamic";

// Shows a small colored badge for a product family's current status.
function StatusBadge({ isArchived, quantity, isEmpty }: { isArchived: boolean; quantity: number; isEmpty: boolean }) {
  // All its variants were moved to a verified family. Hidden on the site; safe to clean up later.
  if (isEmpty) {
    return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-muted">Empty</span>;
  }

  if (isArchived) {
    return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-muted">Archived</span>;
  }

  if (quantity === 0) {
    return <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-600">Out of stock</span>;
  }

  return <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Live</span>;
}

// "₹76,000" or "₹76,000 – ₹82,000"
function priceRange(lowest: number, highest: number): string {
  if (lowest === highest) {
    return formatPrice(lowest);
  }
  return `${formatPrice(lowest)} – ${formatPrice(highest)}`;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const searchTerm = (params.q ?? "").trim();

  // Step 1: Load every family with its variants (archived ones too - this is the admin).
  const { data, error } = await supabaseAdmin.from("products").select("*, product_variants(*)");
  let products = (data ?? []) as ProductWithVariants[];

  // Step 2: If the admin typed a search term, keep families whose name, brand
  // or any variant's model number matches.
  if (searchTerm !== "") {
    const lowerSearch = searchTerm.toLowerCase();

    products = products.filter((product) => {
      const nameMatches = product.name.toLowerCase().includes(lowerSearch);
      const brandMatches = (product.brand ?? "").toLowerCase().includes(lowerSearch);
      const skuMatches = product.product_variants.some((variant) => variant.sku.toLowerCase().includes(lowerSearch));
      return nameMatches || brandMatches || skuMatches;
    });
  }

  // Step 3: Newest stock update first.
  products.sort((first, second) => latestStockUpdate(second).localeCompare(latestStockUpdate(first)));

  const variantCount = products.reduce((total, product) => total + product.product_variants.length, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy">Products</h1>
          <p className="mt-0.5 text-xs text-muted">
            {products.length} products · {variantCount} variants
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          + Add Product
        </Link>
      </div>

      <form action="/admin/products" method="GET" className="mt-4">
        <input
          type="text"
          name="q"
          defaultValue={searchTerm}
          placeholder="Search by name, brand or model number…"
          className="w-full max-w-sm rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      {error && <p className="mt-4 text-sm text-red-600">Failed to load products: {error.message}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-[#f8f9fb] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Product / Model</th>
              <th className="px-4 py-3">Configuration</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>

          {products.map((product) => {
            const hasVariants = product.product_variants.length > 0;
            const summary = hasVariants ? summarizeFamily(product) : null;
            const rowClassName = product.is_archived ? "opacity-50" : "";

            // Each family is its own <tbody>: one family row, then one row per variant.
            return (
              <tbody key={product.id} className={`border-b border-border ${rowClassName}`}>
                <tr className="bg-[#fbfcfd]">
                  <td className="px-4 py-3" colSpan={2}>
                    <Link href={`/admin/products/${product.id}`} className="font-semibold text-navy hover:text-accent">
                      {product.name}
                    </Link>
                    <span className="ml-2 text-xs text-muted">
                      {product.brand ?? "No brand"} · {product.product_variants.length} variant
                      {product.product_variants.length === 1 ? "" : "s"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{summary ? summary.totalQuantity : 0}</td>
                  <td className="px-4 py-3 font-medium">
                    {summary ? priceRange(summary.lowestPrice, summary.highestPrice) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge isArchived={product.is_archived} quantity={summary ? summary.totalQuantity : 0} isEmpty={!hasVariants} />
                  </td>
                  <td className="px-4 py-3">
                    <ProductRowActions id={product.id} archived={product.is_archived} />
                  </td>
                </tr>

                {product.product_variants.map((variant) => (
                  <tr key={variant.id} className="text-xs">
                    <td className="py-2 pl-8 pr-4">
                      <Link
                        href={`/admin/products/${product.id}/variants/${variant.id}`}
                        className="font-medium text-navy hover:text-accent"
                      >
                        {variant.sku}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted">
                      {[variant.processor, variant.ram, variant.storage, variant.graphics].filter(Boolean).join(" · ") ||
                        "Configuration not set"}
                    </td>
                    <td className="px-4 py-2">{variant.quantity}</td>
                    <td className="px-4 py-2">{formatPrice(variant.price)}</td>
                    <td className="px-4 py-2">
                      <EnrichmentBadge status={variant.enrichment_status} />
                    </td>
                    <td className="px-4 py-2"></td>
                  </tr>
                ))}
              </tbody>
            );
          })}

          {products.length === 0 && !error && (
            <tbody>
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted">
                  No products yet.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
