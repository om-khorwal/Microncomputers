import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

const ICONS: Record<(typeof CATEGORIES)[number], string> = {
  "Business Laptops": "M4 6h16v11H4zM9 20h6M4 6l8-3 8 3",
  "Gaming Laptops": "M4 7h16l2 10H2zM8 12h3M12 12h.01M15 11v2",
  Ultrabooks: "M5 8h14v9H5zM3 19h18",
  "2-in-1 Laptops": "M6 4h12v12H6zM4 18h16",
  "Student Laptops": "M4 6h16v10H4zM2 18h20M12 2L2 7l10 5 10-5z",
  Workstations: "M6 5h12v9H6zM9 20h6M10 14v3h4v-3M4 5h1M19 5h1",
};

export function CategoryGrid() {
  return (
    <section className="w-[80%] mx-auto py-16 md:py-20">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Shop by Category</h2>
        <div className="mx-auto mt-3 h-1 w-12 rounded bg-accent" />
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/products?category=${encodeURIComponent(category)}`}
            className="group flex flex-col items-center gap-3 rounded-lg border border-border bg-white p-6 text-center transition hover:border-accent hover:shadow-md"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eef2fb] text-navy group-hover:bg-accent group-hover:text-white">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d={ICONS[category]} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-sm font-semibold text-navy">{category}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
