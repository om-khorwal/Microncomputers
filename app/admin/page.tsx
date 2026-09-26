import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Admin Dashboard | Micron Computers" };
export const dynamic = "force-dynamic";

const LOW_STOCK_THRESHOLD = 3;

export default async function AdminDashboard() {
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("is_archived, product_variants(quantity, updated_at, enrichment_status)");

  if (error) {
    return <p className="text-sm text-red-600">Failed to load dashboard: {error.message}</p>;
  }

  // Step through every non-archived product family and its variants once and
  // build up the stats we want to show, instead of chaining several
  // filter/reduce calls together. Stock is counted per variant (per exact model).
  let totalProducts = 0;
  let totalVariants = 0;
  let totalUnits = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let needsReview = 0;
  let lastUpdated: string | null = null;

  for (const product of products ?? []) {
    // Archived products don't count towards any of the dashboard numbers.
    if (product.is_archived) {
      continue;
    }

    totalProducts++;

    for (const variant of product.product_variants) {
      totalVariants++;
      totalUnits = totalUnits + variant.quantity;

      if (variant.quantity === 0) {
        outOfStock++;
      } else if (variant.quantity <= LOW_STOCK_THRESHOLD) {
        lowStock++;
      }

      if (variant.enrichment_status === "needs_review") {
        needsReview++;
      }

      if (lastUpdated === null || variant.updated_at > lastUpdated) {
        lastUpdated = variant.updated_at;
      }
    }
  }

  const cards = [
    { label: "Active Products", value: totalProducts },
    { label: "Variants (exact models)", value: totalVariants },
    { label: "Total Units in Stock", value: totalUnits },
    { label: "Low Stock Variants (≤ 3)", value: lowStock },
    { label: "Out of Stock Variants", value: outOfStock },
    { label: "Variants Needing Review", value: needsReview },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-navy">Dashboard</h1>
      <p className="mt-1 text-sm text-muted">
        {lastUpdated ? `Last stock update: ${new Date(lastUpdated).toLocaleString()}` : "No products yet."}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-border bg-white p-5">
            <div className="text-2xl font-bold text-navy">{c.value}</div>
            <div className="mt-1 text-xs text-muted">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/products/new" className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark">
          + Add Product
        </Link>
        <Link href="/admin/import" className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:bg-black/5">
          Upload Price Sheet
        </Link>
        <Link href="/admin/products" className="rounded-md border border-border bg-white px-5 py-2.5 text-sm font-semibold text-navy hover:bg-black/5">
          Manage Products
        </Link>
      </div>
    </div>
  );
}
