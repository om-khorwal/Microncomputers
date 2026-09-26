import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/app/admin/products/actions";

export const metadata = { title: "Add Product | Micron Admin" };

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-navy">Add Product</h1>
      <div className="mt-6">
        <ProductForm action={createProduct} submitLabel="Create Product" withFirstVariant />
      </div>
    </div>
  );
}
