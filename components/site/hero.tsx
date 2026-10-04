import Link from "next/link";

const BRANDS = ["ASUS", "Lenovo", "HP", "Dell", "Acer", "MSI", "Apple"];

export function Hero() {
  return (
    <>
      {/* Full-screen hero */}
      <section
        className="relative w-full overflow-hidden"
        style={{ minHeight: "100vh" }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/hero/heroimage.png')" }}
        />

        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/10" />

        {/* Text content — left side */}
        <div
          className="relative z-10 w-[80%] mx-auto"
          style={{ minHeight: "100vh", display: "flex", alignItems: "center" }}
        >
          <div className="py-16 w-full max-w-none md:max-w-[60%] lg:max-w-[55%] xl:max-w-[50%] 2xl:max-w-[45%]">
            {/* Small tagline */}
            <p className="
              mb-3 font-semibold uppercase text-blue-300
              text-xs tracking-[0.2em]
              sm:text-sm sm:tracking-[0.25em]
              md:text-sm md:tracking-[0.3em]
              lg:text-base
              xl:text-base
              2xl:text-lg
            ">
              Your Tech Place
            </p>

            {/* Large brand name */}
            <h1 className="
              font-black leading-none tracking-tight text-white
              text-[56px]
              sm:text-[80px]
              md:text-[100px]
              lg:text-[130px]
              xl:text-[155px]
              2xl:text-[180px]
            ">
              MICRON
            </h1>

            {/* Supporting heading */}
            <h2 className="
              mt-3 font-semibold text-white/90
              text-lg
              sm:text-xl
              md:text-2xl
              lg:text-3xl
              xl:text-3xl
              2xl:text-4xl
            ">
              Laptops, Computers &amp; Accessories
            </h2>

            {/* Description */}
            <p className="
              mt-4 leading-relaxed text-white/70
              text-sm
              sm:text-base
              md:text-base
              lg:text-lg
              xl:text-lg
              2xl:text-xl
            ">
              Top brands. Latest models. Genuine products. All in one place.
            </p>

            {/* CTA buttons */}
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/products?category=Business+Laptops"
                className="
                  inline-flex items-center gap-2 rounded-full bg-[#2457e8] font-semibold text-white transition hover:bg-[#1a3fb8]
                  px-5 py-2.5 text-sm
                  md:px-6 md:py-3 md:text-sm
                  lg:px-7 lg:py-3.5 lg:text-base
                "
              >
                Shop Laptops →
              </Link>
              <Link
                href="/products"
                className="
                  inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 font-semibold text-white backdrop-blur-sm transition hover:bg-white/20
                  px-5 py-2.5 text-sm
                  md:px-6 md:py-3 md:text-sm
                  lg:px-7 lg:py-3.5 lg:text-base
                "
              >
                Explore All Products
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Brands strip */}
      <section className="border-b border-[#e4e7ec] bg-white py-8 md:py-10">
        <div className="w-[80%] mx-auto">
          <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#667085]">
            Popular Brands
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 md:gap-10 lg:gap-12">
            {BRANDS.map((brand) => (
              <Link
                key={brand}
                href={`/products?brand=${encodeURIComponent(brand)}`}
                className="text-sm font-bold text-[#0b1530] opacity-60 transition hover:opacity-100 sm:text-base lg:text-lg"
              >
                {brand}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
