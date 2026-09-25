import Link from "next/link";
import { CATEGORIES } from "@/lib/types";
import { whatsappGeneralLink } from "@/lib/whatsapp";

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M1.5 19.5h21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 19.5l1-3.5h4l1 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Navbar() {
  const whatsappLink = whatsappGeneralLink();

  return (
    <header className="sticky top-0 z-40 bg-white">
      {/* Utility bar */}
      <div className="hidden bg-navy text-xs text-white/80 sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2">
          <span>Wholesale laptops &amp; computers — live stock, updated daily</span>
          {whatsappLink ? (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-white">
              Chat with us on WhatsApp
            </a>
          ) : (
            <span>Wholesale enquiries welcome</span>
          )}
        </div>
      </div>

      {/* Main bar */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3.5 sm:gap-8">
          <Link href="/" className="flex items-center gap-2 text-navy shrink-0">
            <LogoMark />
            <span className="text-lg font-bold tracking-tight">Micron Computers</span>
          </Link>

          <form action="/products" method="GET" className="hidden flex-1 md:block">
            <div className="flex items-center rounded-md border border-border focus-within:border-accent">
              <input
                type="text"
                name="q"
                placeholder="Search by model number, name, or brand…"
                className="w-full rounded-l-md px-4 py-2.5 text-sm outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                aria-label="Search"
                className="flex items-center justify-center rounded-r-md bg-accent px-4 py-2.5 text-white hover:bg-accent-dark"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </form>

          <a
            href={whatsappLink ?? "/products"}
            target={whatsappLink ? "_blank" : undefined}
            rel={whatsappLink ? "noopener noreferrer" : undefined}
            className="ml-auto shrink-0 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            Enquire Now
          </a>
        </div>

        <form action="/products" method="GET" className="px-6 pb-3 md:hidden">
          <div className="flex items-center rounded-md border border-border">
            <input
              type="text"
              name="q"
              placeholder="Search products…"
              className="w-full rounded-l-md px-4 py-2.5 text-sm outline-none placeholder:text-muted"
            />
            <button type="submit" className="rounded-r-md bg-accent px-4 py-2.5 text-white">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Category bar */}
      <div className="hidden bg-navy sm:block">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 text-xs font-semibold uppercase tracking-wide text-white/90">
          <div className="group relative">
            <button className="flex items-center gap-2 border-r border-white/10 py-3 pr-6 text-white">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Shop by Category
            </button>
            <div className="invisible absolute left-0 top-full z-50 w-64 rounded-b-md border border-border bg-white py-2 opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100">
              {CATEGORIES.map((c) => (
                <Link
                  key={c}
                  href={`/products?category=${encodeURIComponent(c)}`}
                  className="block px-4 py-2 text-xs font-normal normal-case text-foreground hover:bg-black/5"
                >
                  {c}
                </Link>
              ))}
            </div>
          </div>
          <Link href="/" className="py-3 text-white hover:text-white/70">
            Home
          </Link>
          <Link href="/products" className="py-3 text-white hover:text-white/70">
            All Products
          </Link>
          <Link href="/#why-us" className="py-3 text-white hover:text-white/70">
            Why Micron
          </Link>
        </div>
      </div>
    </header>
  );
}
