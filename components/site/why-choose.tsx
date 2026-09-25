const POINTS = [
  { title: "Always Up to Date", desc: "Stock & pricing reflect the latest sheet — no stale numbers." },
  { title: "Wholesale Pricing", desc: "Straightforward wholesale rates on every listed unit." },
  { title: "Quality Checked", desc: "Refurbished units are inspected before they're listed." },
  { title: "Direct Response", desc: "Enquire on WhatsApp and hear back from us directly." },
];

export function WhyChoose() {
  return (
    <section id="why-us" className="mx-auto max-w-7xl px-6 py-16">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Why Choose Micron Computers</h2>
        <div className="mx-auto mt-3 h-1 w-12 rounded bg-accent" />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POINTS.map((point) => (
          <div key={point.title} className="rounded-lg border border-border p-6 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#eef2fb] text-accent">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h3 className="mt-4 text-sm font-semibold text-navy">{point.title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{point.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
