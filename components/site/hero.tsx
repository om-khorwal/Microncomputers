import Link from "next/link";

// ── Background: gradient + SVG mountains ──────────────────────────────────────
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c1a3a] via-[#0a1628] to-[#06101e]" />

      {/* Atmospheric haze — upper center */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 h-[340px] w-[700px] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(ellipse, #4a7cf0 0%, #1a3a8a 40%, transparent 75%)" }}
      />

      {/* SVG mountain silhouettes */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 600"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        {/* Far mountains — lightest, furthest back */}
        <path
          d="M0 380 L80 260 L160 320 L240 200 L320 280 L400 220 L440 600 L0 600 Z"
          fill="#0f2048"
          opacity="0.7"
        />
        <path
          d="M1000 340 L1080 200 L1160 270 L1240 180 L1320 260 L1400 200 L1440 300 L1440 600 L1000 600 Z"
          fill="#0f2048"
          opacity="0.7"
        />

        {/* Mid mountains — darker */}
        <path
          d="M0 420 L60 300 L130 360 L200 240 L280 320 L330 270 L380 340 L420 600 L0 600 Z"
          fill="#091830"
          opacity="0.9"
        />
        <path
          d="M1060 400 L1120 260 L1200 330 L1270 200 L1360 290 L1400 240 L1440 330 L1440 600 L1060 600 Z"
          fill="#091830"
          opacity="0.9"
        />

        {/* Foreground rock edges */}
        <path
          d="M0 480 L40 400 L100 440 L160 390 L220 430 L260 600 L0 600 Z"
          fill="#060e1c"
        />
        <path
          d="M1180 460 L1240 380 L1300 420 L1360 370 L1420 410 L1440 440 L1440 600 L1180 600 Z"
          fill="#060e1c"
        />
      </svg>

      {/* Bottom dark fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#04080f] to-transparent" />
    </div>
  );
}

// ── MICRON giant text behind the laptop ───────────────────────────────────────
function HeroBrandText() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
      {/* Tagline */}
      <p className="text-[11px] sm:text-xs font-semibold tracking-[0.3em] text-white/60 uppercase mb-1 mt-[-40px]">
        Your Tech&nbsp;<span className="text-[#60a5fa]">Place</span>
      </p>
      {/* Giant MICRON */}
      <span
        className="block font-black text-white leading-none"
        style={{
          fontSize: "clamp(72px, 16vw, 220px)",
          letterSpacing: "-0.02em",
          opacity: 0.12,
          textShadow: "0 0 80px rgba(96,165,250,0.3)",
        }}
      >
        MICRON
      </span>
    </div>
  );
}

// ── SVG Laptop ────────────────────────────────────────────────────────────────
function HeroLaptop() {
  return (
    <div className="animate-float" style={{ filter: "drop-shadow(0 20px 60px rgba(36,87,232,0.4))" }}>
      <svg
        viewBox="0 0 480 360"
        className="w-full max-w-[480px]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="screenWall" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#030d1f" />
            <stop offset="35%" stopColor="#0d2a6e" />
            <stop offset="65%" stopColor="#1a4fd6" />
            <stop offset="100%" stopColor="#0a1f5c" />
          </linearGradient>
          <linearGradient id="screenWall2" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2457e8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#0a1628" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bezelGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a3e" />
            <stop offset="100%" stopColor="#1a1a28" />
          </linearGradient>
          <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e1e30" />
            <stop offset="100%" stopColor="#0e0e1e" />
          </linearGradient>
          <linearGradient id="hingeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2c2c3e" />
            <stop offset="100%" stopColor="#18182a" />
          </linearGradient>
          <radialGradient id="glowSpot" cx="60%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="glowSpot2" cx="30%" cy="70%" r="40%">
            <stop offset="0%" stopColor="#818cf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <clipPath id="screenClip">
            <rect x="30" y="10" width="420" height="262" rx="6" />
          </clipPath>
        </defs>

        {/* Screen bezel */}
        <rect x="22" y="4" width="436" height="276" rx="10" fill="url(#bezelGrad)" />

        {/* Screen surface */}
        <rect x="30" y="10" width="420" height="262" rx="6" fill="url(#screenWall)" />

        {/* Wallpaper glow layers */}
        <rect x="30" y="10" width="420" height="262" rx="6" fill="url(#glowSpot)" clipPath="url(#screenClip)" />
        <rect x="30" y="10" width="420" height="262" rx="6" fill="url(#glowSpot2)" clipPath="url(#screenClip)" />
        <rect x="30" y="10" width="420" height="262" rx="6" fill="url(#screenWall2)" clipPath="url(#screenClip)" />

        {/* Abstract fluid wallpaper shapes */}
        <g clipPath="url(#screenClip)" opacity="0.5">
          <ellipse cx="300" cy="120" rx="160" ry="100" fill="#3b82f6" opacity="0.2" />
          <ellipse cx="180" cy="200" rx="140" ry="90" fill="#6366f1" opacity="0.15" />
          <path d="M200 60 Q320 30 400 140 Q360 200 280 160 Q200 120 200 60Z" fill="#60a5fa" opacity="0.15" />
          <path d="M80 150 Q160 80 240 160 Q200 240 120 220 Q60 200 80 150Z" fill="#818cf8" opacity="0.12" />
        </g>

        {/* Camera notch */}
        <rect x="228" y="7" width="24" height="5" rx="2.5" fill="#111" />

        {/* Subtle screen glare */}
        <path
          d="M38 18 L180 18 L150 60 L38 60 Z"
          fill="white"
          opacity="0.04"
          clipPath="url(#screenClip)"
        />

        {/* Hinge */}
        <rect x="22" y="280" width="436" height="8" rx="3" fill="url(#hingeGrad)" />

        {/* Base / keyboard deck */}
        <path d="M0 288 L480 288 L460 348 L20 348 Z" fill="url(#baseGrad)" />

        {/* Keyboard area subtle tint */}
        <rect x="60" y="298" width="360" height="36" rx="3" fill="#ffffff" opacity="0.03" />

        {/* Keyboard rows (simplified) */}
        {[0, 1, 2, 3].map((row) => (
          <rect
            key={row}
            x={68 + row * 2}
            y={300 + row * 8}
            width={344 - row * 4}
            height="5"
            rx="1.5"
            fill="#ffffff"
            opacity="0.06"
          />
        ))}

        {/* Trackpad */}
        <rect x="178" y="308" width="124" height="30" rx="5" fill="#ffffff" opacity="0.06" />

        {/* Apple-style logo glow on lid */}
        <circle cx="240" cy="148" r="18" fill="#ffffff" opacity="0.04" />

        {/* Bottom edge shine */}
        <path d="M20 348 L460 348 L470 352 L10 352 Z" fill="#ffffff" opacity="0.04" />
      </svg>
    </div>
  );
}

// ── Rock / platform ───────────────────────────────────────────────────────────
function HeroPlatform() {
  return (
    <div className="relative -mt-8">
      {/* Blue glow under the platform */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-[380px] blur-2xl"
        style={{ background: "radial-gradient(ellipse, rgba(99,102,241,0.5) 0%, rgba(36,87,232,0.3) 40%, transparent 75%)" }}
      />
      <svg
        viewBox="0 0 600 160"
        className="w-full max-w-[560px] relative"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="rockGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#18182e" />
            <stop offset="100%" stopColor="#080810" />
          </linearGradient>
          <linearGradient id="rockEdge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2a45" />
            <stop offset="100%" stopColor="#0a0a18" />
          </linearGradient>
          <radialGradient id="purpleGlow" cx="50%" cy="10%" r="60%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Main rock body */}
        <path
          d="M60 140 L30 110 L20 80 L50 55 L100 40 L160 30 L220 22 L280 20 L340 22 L400 30 L460 38 L510 48 L550 70 L570 95 L560 120 L540 140 Z"
          fill="url(#rockGrad)"
        />

        {/* Rock top face — lighter to show depth */}
        <path
          d="M60 140 L30 110 L50 55 L100 40 L160 30 L220 22 L280 20 L340 22 L400 30 L460 38 L510 48 L550 70 L540 65 L490 42 L440 33 L380 25 L310 18 L250 18 L190 24 L130 34 L80 50 L45 72 L40 105 L60 130 Z"
          fill="url(#rockEdge)"
          opacity="0.8"
        />

        {/* Purple/violet glow from behind */}
        <path
          d="M60 140 L30 110 L20 80 L50 55 L100 40 L160 30 L220 22 L280 20 L340 22 L400 30 L460 38 L510 48 L550 70 L570 95 L560 120 L540 140 Z"
          fill="url(#purpleGlow)"
        />

        {/* Rock texture streaks */}
        <path d="M180 28 Q200 50 195 80" stroke="#ffffff" strokeWidth="0.5" opacity="0.06" fill="none" />
        <path d="M320 20 Q350 42 345 75" stroke="#ffffff" strokeWidth="0.5" opacity="0.06" fill="none" />
        <path d="M440 36 Q460 58 455 90" stroke="#ffffff" strokeWidth="0.5" opacity="0.06" fill="none" />

        {/* Rock bottom fade */}
        <path
          d="M60 140 L540 140 L550 160 L50 160 Z"
          fill="#04080f"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

// ── Floating hotspot cards ────────────────────────────────────────────────────
function PlusButton() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-bold animate-pulse-dot">
      +
    </div>
  );
}

function HeroHotspots() {
  return (
    <>
      {/* FHD+ Display — top-right corner of laptop screen */}
      <div className="absolute top-[12%] left-[54%] hidden lg:flex items-center gap-2">
        <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 text-white shadow-lg whitespace-nowrap">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <div>
              <p className="text-xs font-bold">FHD+ Display</p>
              <p className="text-[10px] text-white/70">Vivid &amp; Sharp</p>
            </div>
          </div>
        </div>
        <PlusButton />
      </div>

      {/* Latest Gen Processor — left side of laptop, mid-height */}
      <div className="absolute top-[40%] left-[33%] hidden lg:flex items-center gap-2">
        <PlusButton />
        <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 text-white shadow-lg whitespace-nowrap">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="7" y="7" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div>
              <p className="text-xs font-bold">Latest Gen Processor</p>
              <p className="text-[10px] text-white/70">High Performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lightweight — bottom-right, above rock */}
      <div className="absolute top-[57%] left-[50%] hidden lg:flex items-center gap-2">
        <PlusButton />
        <div className="rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 text-white shadow-lg whitespace-nowrap">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p className="text-xs font-bold">Lightweight Design</p>
              <p className="text-[10px] text-white/70">Built for Productivity</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Benefit cards — right column ──────────────────────────────────────────────
function HeroBenefits() {
  const benefits = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="1" y="3" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M16 8h6l-1 5h-5V8z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
      title: "Fast Delivery",
      sub: "Across India",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: "100% Genuine",
      sub: "Products",
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.79a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: "Expert Support",
      sub: "Before & After Purchase",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {benefits.map((b) => (
        <div
          key={b.title}
          className="flex items-center gap-3 rounded-xl bg-white/8 backdrop-blur-sm border border-white/10 px-4 py-3 text-white"
        >
          <span className="text-[#60a5fa] shrink-0">{b.icon}</span>
          <div>
            <p className="text-sm font-bold">{b.title}</p>
            <p className="text-[11px] text-white/60">{b.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Left content ──────────────────────────────────────────────────────────────
function HeroContent() {
  return (
    <div className="flex flex-col justify-center">
      <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-black leading-[1.1] text-white">
        Laptops,<br />
        Computers &amp;<br />
        Accessories
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-white/60 max-w-[220px]">
        Top brands. Latest models. Genuine products. All in one place.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/products?category=Business+Laptops"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0b1530] hover:bg-white/90 transition-colors flex items-center gap-1.5"
        >
          Shop Laptops <span>→</span>
        </Link>
        <Link
          href="/products"
          className="rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
        >
          Explore All Products
        </Link>
      </div>
    </div>
  );
}

// ── Brand logos ───────────────────────────────────────────────────────────────
function HeroBrands() {
  const brands = [
    {
      name: "ASUS",
      svg: (
        <svg viewBox="0 0 60 22" className="h-5" fill="currentColor" aria-label="ASUS">
          <text x="0" y="18" fontFamily="Arial Black, sans-serif" fontSize="18" fontWeight="900" letterSpacing="1">asus</text>
        </svg>
      ),
    },
    { name: "Lenovo", label: "Lenovo" },
    {
      name: "HP",
      svg: (
        <svg viewBox="0 0 32 32" className="h-6 w-6" fill="currentColor" aria-label="HP">
          <path d="M16 0C7.163 0 0 7.163 0 16s7.163 16 16 16 16-7.163 16-16S24.837 0 16 0zm-3.5 22h-3l4-12h3l-4 12zm10 0h-3l1.5-4.5h-3L16 22h-3l4-12h6c1.657 0 2.5.843 2 2.5L23 16c-.5 1.657-1.843 2.5-3.5 2.5H18l-1.5 3.5zm.5-6h-3l1-3h3l-1 3z" />
        </svg>
      ),
    },
    { name: "Dell", label: "DELL" },
    { name: "Acer", label: "acer" },
    { name: "MSI", label: "msi" },
    {
      name: "Apple",
      svg: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-label="Apple">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mt-8">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-3">Popular Brands</p>
      <div className="flex flex-wrap items-center gap-3">
        {brands.map((b) =>
          b.svg ? (
            <span key={b.name} className="text-white/60 hover:text-white/90 transition-colors cursor-pointer">
              {b.svg}
            </span>
          ) : (
            <span
              key={b.name}
              className="text-white/60 hover:text-white/90 transition-colors cursor-pointer font-black text-base tracking-tight"
              style={{ fontFamily: "Arial Black, sans-serif" }}
            >
              {b.label}
            </span>
          )
        )}
      </div>
    </div>
  );
}

// ── Pagination dots (decorative) ──────────────────────────────────────────────
function HeroPagination() {
  return (
    <div className="absolute bottom-6 right-6 flex items-center gap-2">
      <div className="flex gap-1.5 mr-2">
        <span className="h-2 w-6 rounded-full bg-white/80" />
        <span className="h-2 w-2 rounded-full bg-white/30" />
        <span className="h-2 w-2 rounded-full bg-white/30" />
      </div>
      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors" aria-label="Previous">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors" aria-label="Next">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

// ── Category cards (bottom white strip) ──────────────────────────────────────
const HERO_CATEGORIES = [
  {
    label: "Laptops",
    sub: "Work, Play, Create",
    href: "/products?category=Business+Laptops",
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14" aria-hidden="true">
        <rect x="8" y="4" width="64" height="40" rx="4" fill="#c7d2fe" />
        <rect x="14" y="10" width="52" height="28" rx="2" fill="#818cf8" opacity="0.6" />
        <rect x="2" y="44" width="76" height="6" rx="3" fill="#a5b4fc" />
        <rect x="28" y="50" width="24" height="6" rx="2" fill="#c7d2fe" />
      </svg>
    ),
  },
  {
    label: "Desktops",
    sub: "Performance Builds",
    href: "/products",
    icon: (
      <svg viewBox="0 0 80 80" className="w-16 h-16" aria-hidden="true">
        {/* Tower */}
        <rect x="8" y="4" width="36" height="60" rx="4" fill="#1e1b4b" />
        <rect x="14" y="12" width="24" height="4" rx="2" fill="#6366f1" opacity="0.7" />
        <circle cx="20" cy="22" r="4" fill="#818cf8" opacity="0.7" />
        <rect x="14" y="30" width="24" height="2" rx="1" fill="#4f46e5" opacity="0.5" />
        {/* RGB fans */}
        <circle cx="26" cy="44" r="8" fill="#312e81" />
        <circle cx="26" cy="44" r="4" fill="#7c3aed" opacity="0.6" />
        {/* Monitor */}
        <rect x="48" y="10" width="28" height="20" rx="2" fill="#4f46e5" opacity="0.8" />
        <rect x="50" y="12" width="24" height="16" rx="1" fill="#818cf8" opacity="0.5" />
        <rect x="58" y="30" width="8" height="4" fill="#312e81" />
        <rect x="52" y="34" width="20" height="2" rx="1" fill="#4f46e5" />
      </svg>
    ),
  },
  {
    label: "Monitors",
    sub: "Crystal Clear View",
    href: "/products",
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14" aria-hidden="true">
        <rect x="4" y="4" width="72" height="44" rx="4" fill="#0f172a" />
        <rect x="8" y="8" width="64" height="36" rx="2" fill="#1e40af" opacity="0.8" />
        <rect x="8" y="8" width="64" height="36" rx="2" fill="url(#monGrad)" />
        <defs>
          <linearGradient id="monGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <rect x="32" y="48" width="16" height="6" rx="1" fill="#0f172a" />
        <rect x="20" y="54" width="40" height="3" rx="1.5" fill="#1e293b" />
      </svg>
    ),
  },
  {
    label: "Accessories",
    sub: "Keyboards, Mice & More",
    href: "/products",
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14" aria-hidden="true">
        {/* Headphones */}
        <path d="M20 32 Q20 12 40 12 Q60 12 60 32" stroke="#1e40af" strokeWidth="4" fill="none" strokeLinecap="round" />
        <rect x="12" y="28" width="12" height="20" rx="6" fill="#2563eb" />
        <rect x="56" y="28" width="12" height="20" rx="6" fill="#2563eb" />
        <rect x="14" y="30" width="8" height="16" rx="4" fill="#3b82f6" opacity="0.6" />
        <rect x="58" y="30" width="8" height="16" rx="4" fill="#3b82f6" opacity="0.6" />
      </svg>
    ),
  },
  {
    label: "Components",
    sub: "Upgrade & Build",
    href: "/products",
    icon: (
      <svg viewBox="0 0 80 60" className="w-20 h-14" aria-hidden="true">
        {/* GPU */}
        <rect x="4" y="16" width="72" height="30" rx="4" fill="#1e1b4b" />
        <rect x="10" y="20" width="34" height="22" rx="3" fill="#312e81" />
        <circle cx="27" cy="31" r="8" fill="#4f46e5" opacity="0.7" />
        <circle cx="27" cy="31" r="4" fill="#818cf8" opacity="0.6" />
        <rect x="48" y="22" width="22" height="6" rx="2" fill="#4f46e5" opacity="0.5" />
        <rect x="48" y="30" width="22" height="6" rx="2" fill="#4f46e5" opacity="0.5" />
        <rect x="16" y="46" width="4" height="8" rx="1" fill="#6366f1" />
        <rect x="24" y="46" width="4" height="8" rx="1" fill="#6366f1" />
        <rect x="32" y="46" width="4" height="8" rx="1" fill="#6366f1" />
      </svg>
    ),
  },
];

function HeroCategories() {
  return (
    <div className="bg-white px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {HERO_CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="group flex items-center justify-between rounded-2xl border border-[#e4e7ec] bg-white px-4 py-4 hover:border-[#2457e8] hover:shadow-md transition-all"
            >
              <div>
                <p className="text-sm font-bold text-[#0b1530]">{cat.label}</p>
                <p className="text-[10px] text-[#667085] mt-0.5">{cat.sub}</p>
                <div className="mt-3 flex h-7 w-7 items-center justify-center rounded-full border border-[#e4e7ec] group-hover:border-[#2457e8] group-hover:bg-[#eef2fb] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" stroke="#2457e8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                {cat.icon}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Exported hero ─────────────────────────────────────────────────────────────
export function Hero() {
  return (
    <>
      {/* Dark hero section */}
      <section className="relative overflow-hidden" style={{ minHeight: "580px" }}>
        {/* Layer 0: Background */}
        <HeroBackground />

        {/* Layer 1: MICRON brand text (behind everything) */}
        <HeroBrandText />

        {/* Hotspot cards — absolute over the whole section, desktop only */}
        <HeroHotspots />

        {/* Layer 2: Main content grid */}
        <div className="relative z-20 mx-auto max-w-7xl px-6 pt-10 pb-0 h-full">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.8fr_1fr] items-start min-h-[520px]">

            {/* Left: text content + brands */}
            <div className="lg:pt-16">
              <HeroContent />
              <HeroBrands />
            </div>

            {/* Center: laptop + platform stacked */}
            <div className="relative flex flex-col items-center justify-end min-h-[420px]">
              <div className="relative z-10 w-full px-4">
                <HeroLaptop />
              </div>
              <div className="w-full -mt-2">
                <HeroPlatform />
              </div>
            </div>

            {/* Right: benefit cards */}
            <div className="lg:pt-20 hidden lg:block">
              <HeroBenefits />
            </div>
          </div>
        </div>

        {/* Pagination decorative */}
        <HeroPagination />
      </section>

      {/* White category strip */}
      <HeroCategories />
    </>
  );
}
