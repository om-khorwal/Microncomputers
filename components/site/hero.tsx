import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-gradient-to-b from-[#eef2fb] to-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Wholesale &amp; Refurbished
          </span>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-navy sm:text-5xl">
            Reliable Laptops.
            <br />
            <span className="text-accent">Wholesale Pricing.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted">
            Browse our current stock of refurbished and wholesale laptops — quantity and
            pricing are updated straight from our latest stock sheet, every time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              Shop Now
            </Link>
            <Link
              href="/products"
              className="rounded-md border border-navy px-6 py-3 text-sm font-semibold text-navy hover:bg-navy hover:text-white"
            >
              Explore Range
            </Link>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-border pt-6 text-xs text-muted">
            <div>
              <dt className="font-semibold text-navy">Live Stock</dt>
              <dd>Updated from source sheet</dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Wholesale Pricing</dt>
              <dd>Direct, no markup surprises</dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Fast Response</dt>
              <dd>Enquire directly on WhatsApp</dd>
            </div>
          </dl>
        </div>

        <div className="relative mx-auto aspect-[4/3] w-full max-w-lg">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-navy to-navy-soft" />
          <svg
            viewBox="0 0 400 300"
            className="absolute inset-0 h-full w-full p-10"
            aria-hidden="true"
          >
            <rect x="60" y="40" width="280" height="170" rx="10" fill="#1a2550" stroke="#3a4a8a" strokeWidth="2" />
            <rect x="75" y="55" width="250" height="140" rx="4" fill="#2457e8" opacity="0.25" />
            <rect x="30" y="215" width="340" height="16" rx="6" fill="#0b1530" stroke="#3a4a8a" strokeWidth="2" />
            <path d="M170 231h60l8 14h-76z" fill="#0b1530" stroke="#3a4a8a" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </section>
  );
}
