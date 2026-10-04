"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Support", href: "/support" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function isActive(href: string): boolean {
    if (href.startsWith("/#")) return false;
    const path = href.split("?")[0].split("#")[0];
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white border-b border-[#e4e7ec] shadow-sm"
          : "bg-transparent border-transparent"
      }`}
    >
      <div className="w-[80%] mx-auto flex items-center justify-between py-4">
        {/* Logo */}
        <Link
          href="/"
          className={`text-[17px] font-black tracking-wide transition-colors duration-300 ${
            scrolled ? "text-[#0b1530]" : "text-white"
          }`}
        >
          Micron Computers
        </Link>

        {/* Nav links + Contact */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-300 ${
                  scrolled
                    ? active
                      ? "text-[#2457e8] font-semibold"
                      : "text-[#0b1530] hover:text-[#2457e8]"
                    : active
                    ? "text-white font-semibold"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          <Link
            href="/contact"
            className={`rounded-full px-5 py-2 text-sm font-semibold text-white transition-all duration-300 ${
              scrolled
                ? "bg-[#2457e8] hover:bg-[#1a3fb8]"
                : "bg-white/20 hover:bg-white/30 backdrop-blur-sm"
            }`}
          >
            Contact
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          className={`md:hidden p-2 transition-colors duration-300 ${
            scrolled ? "text-[#0b1530]" : "text-white"
          }`}
          aria-label="Open menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}
