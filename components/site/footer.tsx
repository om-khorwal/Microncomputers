import Link from "next/link";
import { CATEGORIES } from "@/lib/types";
import { whatsappGeneralLink } from "@/lib/whatsapp";

export function Footer() {
  const whatsappLink = whatsappGeneralLink();

  return (
    <footer className="bg-navy text-white/70">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <span className="text-lg font-bold tracking-tight text-white">Micron Computers</span>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Wholesale and refurbished laptops with live stock and pricing — no more chasing
            outdated price sheets.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Quick Links</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/" className="hover:text-white">Home</Link></li>
            <li><Link href="/products" className="hover:text-white">All Products</Link></li>
            <li><Link href="/#why-us" className="hover:text-white">Why Micron</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Shop by Category</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {CATEGORIES.slice(0, 5).map((c) => (
              <li key={c}>
                <Link href={`/products?category=${encodeURIComponent(c)}`} className="hover:text-white">
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white">Enquiries</h3>
          <p className="mt-4 text-sm">
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Chat with us on WhatsApp
              </a>
            ) : (
              "Reach out via the enquire button on any product."
            )}
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Micron Computers. All rights reserved.
      </div>
    </footer>
  );
}
