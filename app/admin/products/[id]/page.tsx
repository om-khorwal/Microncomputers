import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { EnrichmentBadge } from "@/components/admin/enrichment-badge";
import { VariantRowActions } from "@/components/admin/variant-row-actions";
import { updateProduct } from "@/app/admin/products/actions";
import { formatPrice } from "@/lib/format";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ProductWithVariants } from "@/lib/types";

export const metadata = { title: "Edit Product | Micron Admin" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Step 1: Look up the product family we're editing, with its variants.
  const { data } = await supabaseAdmin
    .from("products")
    .select("*, product_variants(*)")
    .eq("id", id)
    .maybeSingle();

  // Step 2: If it doesn't exist (bad link, already deleted), show a 404 page.
  if (!data) {
    notFound();
  }

  const product = data as ProductWithVariants;
  const variants = [...product.product_variants].sort((first, second) => first.sku.localeCompare(second.sku));

  // Step 3: updateProduct expects (id, previousState, formData), but the form
  // only gives us (previousState, formData). bind() "locks in" the id ahead of time.
  const updateThisProduct = updateProduct.bind(null, id);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-navy">Edit Product</h1>
        <Link href={`/products/${id}`} className="text-xs font-medium text-accent hover:text-accent-dark">
          View on site →
        </Link>
      </div>

      <div className="mt-6">
        <ProductForm action={updateThisProduct} product={product} submitLabel="Save Product Details" />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-navy">Variants</h2>
          <p className="mt-0.5 text-xs text-muted">
            Each variant is one exact model number with its own configuration, price and stock.
          </p>
        </div>
        <Link
          href={`/admin/products/${id}/variants/new`}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          + Add Variant
        </Link>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-[#f8f9fb] text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Model / SKU</th>
              <th className="px-4 py-3">Processor</th>
              <th className="px-4 py-3">RAM</th>
              <th className="px-4 py-3">Storage</th>
              <th className="px-4 py-3">Graphics</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Enrichment</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {variants.map((variant) => (
              <tr key={variant.id}>
                <td className="px-4 py-3 font-medium text-navy">{variant.sku}</td>
                <td className="px-4 py-3 text-xs">{variant.processor ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{variant.ram ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{variant.storage ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{variant.graphics ?? "—"}</td>
                <td className="px-4 py-3">{variant.quantity}</td>
                <td className="px-4 py-3">{formatPrice(variant.price)}</td>
                <td className="px-4 py-3">
                  <EnrichmentBadge status={variant.enrichment_status} />
                </td>
                <td className="px-4 py-3">
                  <VariantRowActions productId={id} variantId={variant.id} />
                </td>
              </tr>
            ))}

            {variants.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted">
                  No variants yet - this product is hidden from the site until you add one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
