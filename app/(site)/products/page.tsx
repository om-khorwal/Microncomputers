import { ProductFilters } from "@/components/site/product-filters";
import { ProductGrid } from "@/components/site/product-grid";
import { getDistinctBrands, getProducts } from "@/lib/products";

export const metadata = { title: "All Products | Micron Computers" };

type SearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = first(params.q);
  const category = first(params.category);
  const brand = first(params.brand);
  const inStockOnly = first(params.inStock) === "1";

  const [products, brands] = await Promise.all([
    getProducts({ q, category, brand, inStockOnly }),
    getDistinctBrands(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
        {category || "All Products"}
      </h1>
      <p className="mt-1 text-sm text-muted">{products.length} product{products.length === 1 ? "" : "s"} found</p>

      <div className="mt-6">
        <ProductFilters q={q} category={category} brand={brand} inStockOnly={inStockOnly} brands={brands} />
      </div>

      <div className="mt-8">
        <ProductGrid products={products} emptyMessage="No products match your filters." />
      </div>
    </div>
  );
}
