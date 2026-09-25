import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ProductRowActions } from "@/components/admin/product-row-actions";

export const metadata = { title: "Products | Micron Admin" };
export const dynamic = "force-dynamic";

// Shows a small colored badge for a product's current status.
function StatusBadge({ isArchived, quantity }: { isArchived: boolean; quantity: number }) {
  if (isArchived) {
    return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-muted">Archived</span>;
  }

  if (quantity === 0) {
    return <span className="rounded bg-red-50 px-2 py-0.5 text-xs text-red-600">Out of stock</span>;
  }

  return <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Live</span>;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const searchTerm = params.q ?? "";

  // Step 1: Start with all products, newest update first.
  let query = supabaseAdmin.from("products").select("*").order("updated_at", { ascending: false });

  // Step 2: If the admin typed a search term, filter by name or model number.
  if (searchTerm !== "") {
    query = query.or(`name.ilike.%${searchTerm}%,model_number.ilike.%${searchTerm}%`);
  }

  // Step 3: Run the query.
  const { data: products, error } = await query;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy">Products</h1>
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
          placeholder="Search by model or name…"
          className="w-full max-w-sm rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </form>

      {error && <p className="mt-4 text-sm text-red-600">Failed to load products: {error.message}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-[#f8f9fb] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(products ?? []).map((product) => {
              const rowClassName = product.is_archived ? "opacity-50" : "";

              return (
                <tr key={product.id} className={rowClassName}>
                  <td className="px-4 py-3 font-medium text-navy">{product.model_number}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/products/${product.id}`} className="hover:text-accent">
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{product.quantity}</td>
                  <td className="px-4 py-3">{formatPrice(product.price)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge isArchived={product.is_archived} quantity={product.quantity} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {new Date(product.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <ProductRowActions id={product.id} archived={product.is_archived} />
                  </td>
                </tr>
              );
            })}

            {(products ?? []).length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
