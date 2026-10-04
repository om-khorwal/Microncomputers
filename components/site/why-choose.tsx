const FEATURES = [
  {
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    label: "Wholesale Pricing",
    desc: "Genuine wholesale rates on every unit in stock — no retail markup, no hidden fees.",
  },
  {
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    label: "Always Up to Date",
    desc: "Stock and prices pulled from a live sheet — what you see is what's actually available today.",
  },
  {
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    label: "Quality Checked",
    desc: "Every refurbished unit is inspected before it's listed. No surprises on delivery.",
  },
  {
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    label: "Direct from the Owner",
    desc: "Enquire on WhatsApp and you hear back from the owner — no call centre, no bot.",
  },
  {
    icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
    label: "Authenticity Guaranteed",
    desc: "No duplicates, no counterfeits, no refurbs passed off as new. Every product is exactly what it says.",
  },
];

export function WhyChoose() {
  return (
    <section id="why-us" className="w-full bg-white py-16 md:py-24">
      <div className="w-[80%] mx-auto flex flex-col gap-12 lg:flex-row lg:gap-20 lg:items-start">

        {/* Left: headline */}
        <div className="lg:w-[38%] lg:shrink-0 lg:pt-1">
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-accent mb-4">
            What We Offer
          </p>
          <h2 className="text-3xl font-black leading-[1.07] tracking-tight text-navy sm:text-4xl xl:text-5xl">
            Everything you need,{" "}
            <span className="text-navy/40">nothing you don't.</span>
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted max-w-xs">
            Five things every customer gets — no exceptions, no extra charges.
          </p>
        </div>

        {/* Right: 2×2 grid + full-width last card */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {FEATURES.map((f, i) => {
            const isLast = i === FEATURES.length - 1;
            return (
              <div
                key={f.label}
                className={`
                  group rounded-2xl border border-border bg-white p-6
                  transition-all duration-200
                  hover:border-accent/40 hover:shadow-md
                  ${isLast ? "sm:col-span-2 flex items-center gap-5" : "flex flex-col"}
                `}
              >
                <span
                  className={`
                    flex h-11 w-11 shrink-0 items-center justify-center rounded-xl
                    bg-[#eef2fb] text-accent
                    ${isLast ? "" : "mb-4"}
                  `}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d={f.icon}
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <div>
                  <h3 className="text-[0.9rem] font-bold text-navy mb-1.5">{f.label}</h3>
                  <p className="text-[0.82rem] leading-relaxed text-muted">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
