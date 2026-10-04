import { Hero } from "@/components/site/hero";
import { CategoryGrid } from "@/components/site/category-grid";
import { PromoBanner } from "@/components/site/promo-banner";
import { ProductGrid } from "@/components/site/product-grid";
import { WhyChoose } from "@/components/site/why-choose";
import { getFeaturedProducts } from "@/lib/products";
import Link from "next/link";

// Stock/price are volatile by design — always render fresh, never a stale build-time snapshot.
export const dynamic = "force-dynamic";

export default async function Home() {
  const allFeatured = await getFeaturedProducts(20);
  const featured = allFeatured
    .filter((p) => p.image_url || p.product_variants.some((v) => v.image_url))
    .slice(0, 10);

  return (
    <>
      <Hero />
      <CategoryGrid />
      <PromoBanner />

      <section className="w-[80%] mx-auto py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Latest Stock</h2>
            <div className="mt-3 h-1 w-12 rounded bg-accent" />
          </div>
          <Link href="/products" className="text-sm font-semibold text-accent hover:text-accent-dark">
            View All Products →
          </Link>
        </div>
        <div className="mt-10">
          <ProductGrid
            products={featured}
            emptyMessage="No products yet — add or import stock from the admin area to get started."
          />
        </div>
      </section>

      <WhyChoose />
    </>
  );
}
