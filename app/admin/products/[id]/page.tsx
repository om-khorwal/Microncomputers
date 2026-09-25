import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { updateProduct } from "@/app/admin/products/actions";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata = { title: "Edit Product | Micron Admin" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Step 1: Look up the product we're editing.
  const { data: product } = await supabaseAdmin.from("products").select("*").eq("id", id).maybeSingle();

  // Step 2: If it doesn't exist (bad link, already deleted), show a 404 page.
  if (!product) {
    notFound();
  }

  // Step 3: updateProduct expects (id, previousState, formData), but the form
  // only gives us (previousState, formData). bind() "locks in" the id ahead of time.
  const updateThisProduct = updateProduct.bind(null, id);

  return (
    <div>
      <h1 className="text-xl font-bold text-navy">Edit Product</h1>
      <div className="mt-6">
        <ProductForm action={updateThisProduct} product={product} submitLabel="Save Changes" />
      </div>
    </div>
  );
}
