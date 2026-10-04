import Link from "next/link";

function MicronLogo() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2457e8" />
        </linearGradient>
      </defs>
      {/* Left chevron arrow */}
      <path d="M4 7 L16 19 L4 31 L10 31 L22 19 L10 7 Z" fill="url(#logoGrad)" />
      {/* Right chevron arrow — offset, slightly translucent */}
      <path d="M17 7 L29 19 L17 31 L23 31 L35 19 L23 7 Z" fill="url(#logoGrad)" opacity="0.65" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M21 21l-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Brands", href: "/products?brand=all" },
  { label: "Why Micron", href: "/#why-us" },
  { label: "Support", href: "/#support" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#e4e7ec] shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <MicronLogo />
          <div className="leading-none">
            <span className="block text-[15px] font-black tracking-wider text-[#0b1530]">MICRON</span>
            <span className="block text-[9px] font-semibold tracking-[0.2em] text-[#667085] uppercase">Computers</span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="hidden lg:flex items-center gap-1 ml-2">
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                i === 0
                  ? "bg-[#0b1530] text-white"
                  : "text-[#0b1530] hover:bg-[#f0f4ff]"
              }`}
            >
              {link.label}
              {i === 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#2457e8]" />
              )}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <form action="/products" method="GET" className="hidden md:flex flex-1 items-center rounded-full border border-[#e4e7ec] bg-[#f9fafb] px-4 py-2.5 gap-2 focus-within:border-[#2457e8] focus-within:bg-white transition-colors">
          <span className="text-[#667085]">
            <SearchIcon />
          </span>
          <input
            type="text"
            name="q"
            placeholder="Search laptops, desktops, accessories, brands..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa5b4]"
          />
        </form>

        {/* Icons */}
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <button
            aria-label="Account"
            className="p-2 rounded-full text-[#667085] hover:bg-[#f0f4ff] hover:text-[#0b1530] transition-colors"
          >
            <UserIcon />
          </button>
          <button
            aria-label="Wishlist"
            className="p-2 rounded-full text-[#667085] hover:bg-[#f0f4ff] hover:text-[#0b1530] transition-colors"
          >
            <HeartIcon />
          </button>
          <button
            aria-label="Cart"
            className="relative p-2 rounded-full text-[#667085] hover:bg-[#f0f4ff] hover:text-[#0b1530] transition-colors"
          >
            <CartIcon />
            <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#2457e8] text-[9px] font-bold text-white">
              3
            </span>
          </button>
        </div>
      </div>

      {/* Mobile search */}
      <form action="/products" method="GET" className="md:hidden px-4 pb-3">
        <div className="flex items-center rounded-full border border-[#e4e7ec] bg-[#f9fafb] px-4 py-2.5 gap-2">
          <span className="text-[#667085]"><SearchIcon /></span>
          <input
            type="text"
            name="q"
            placeholder="Search products..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#9aa5b4]"
          />
        </div>
      </form>
    </header>
  );
}
