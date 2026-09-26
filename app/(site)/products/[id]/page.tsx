import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductVariantView } from "@/components/site/product-variant-view";
import { getFamilyIdForVariant, getProductById } from "@/lib/products";
import { pickDefaultVariant } from "@/lib/variants";

export const dynamic = "force-dynamic";

export default async function ProductDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { id } = await params;
  const { variant: variantId } = await searchParams;

  const product = await getProductById(id);

  if (!product) {
    // Old links used one page per model number. Those ids are now variant ids,
    // so send the visitor to the family page with that variant selected.
    const familyId = await getFamilyIdForVariant(id);

    if (familyId) {
      redirect(`/products/${familyId}?variant=${id}`);
    }

    notFound();
  }

  // Start with the variant in the link (?variant=...), otherwise the cheapest in stock.
  const variants = product.product_variants;
  const initialVariant = variants.find((variant) => variant.id === variantId) ?? pickDefaultVariant(variants);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <nav className="text-xs text-muted">
        <Link href="/products" className="hover:text-accent">All Products</Link>
        <span className="mx-1.5">/</span>
        <span className="text-navy">{product.name}</span>
      </nav>

      <ProductVariantView product={product} initialVariantId={initialVariant.id} />
    </div>
  );
}
