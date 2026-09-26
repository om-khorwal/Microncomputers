import Link from "next/link";
import { notFound } from "next/navigation";
import { VariantForm } from "@/components/admin/variant-form";
import { updateVariant } from "@/app/admin/products/variant-actions";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ProductVariant } from "@/lib/types";

export const metadata = { title: "Edit Variant | Micron Admin" };
export const dynamic = "force-dynamic";

export default async function EditVariantPage({
  params,
}: {
  params: Promise<{ id: string; variantId: string }>;
}) {
  const { id, variantId } = await params;

  // Step 1: Look up the variant, and check it belongs to this product family.
  const { data } = await supabaseAdmin
    .from("product_variants")
    .select("*, products(name)")
    .eq("id", variantId)
    .eq("product_id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const variant = data as ProductVariant & { products: { name: string } };

  // Step 2: updateVariant expects (productId, variantId, previousState, formData);
  // bind() "locks in" both ids ahead of time.
  const updateThisVariant = updateVariant.bind(null, id, variantId);

  return (
    <div>
      <Link href={`/admin/products/${id}`} className="text-xs font-medium text-muted hover:text-navy">
        ← {variant.products.name}
      </Link>
      <h1 className="mt-2 text-xl font-bold text-navy">Edit Variant {variant.sku}</h1>
      <div className="mt-6">
        <VariantForm action={updateThisVariant} variant={variant} submitLabel="Save Variant" />
      </div>
    </div>
  );
}
