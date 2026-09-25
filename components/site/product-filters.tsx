import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

export function ProductFilters({
  q,
  category,
  brand,
  inStockOnly,
  brands,
}: {
  q: string;
  category: string;
  brand: string;
  inStockOnly: boolean;
  brands: string[];
}) {
  return (
    <form action="/products" method="GET" className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
      <input
        type="text"
        name="q"
        defaultValue={q}
        placeholder="Search by model or name…"
        className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent lg:col-span-2"
      />

      <select name="category" defaultValue={category} className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent">
        <option value="">All Categories</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select name="brand" defaultValue={brand} className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-accent">
        <option value="">All Brands</option>
        {brands.map((b) => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>

      <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
        <input type="checkbox" name="inStock" value="1" defaultChecked={inStockOnly} className="accent-accent" />
        In stock only
      </label>

      <div className="flex gap-2 lg:col-span-5">
        <button type="submit" className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
          Apply Filters
        </button>
        <Link href="/products" className="rounded-md border border-border px-5 py-2 text-sm font-semibold text-navy hover:bg-black/5">
          Clear
        </Link>
      </div>
    </form>
  );
}
