import Link from "next/link";
import { notFound } from "next/navigation";
import { VariantForm } from "@/components/admin/variant-form";
import { createVariant } from "@/app/admin/products/variant-actions";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Add Variant | Micron Admin" };
export const dynamic = "force-dynamic";

export default async function NewVariantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Step 1: Make sure the product family exists.
  const { data: product } = await supabaseAdmin.from("products").select("id, name").eq("id", id).maybeSingle();

  if (!product) {
    notFound();
  }

  // Step 2: createVariant expects (productId, previousState, formData);
  // bind() "locks in" the product id ahead of time.
  const createVariantForThisProduct = createVariant.bind(null, id);

  return (
    <div>
      <Link href={`/admin/products/${id}`} className="text-xs font-medium text-muted hover:text-navy">
        ← {product.name}
      </Link>
      <h1 className="mt-2 text-xl font-bold text-navy">Add Variant</h1>
      <div className="mt-6">
        <VariantForm action={createVariantForThisProduct} submitLabel="Add Variant" />
      </div>
    </div>
  );
}
