import { whatsappGeneralLink } from "@/lib/whatsapp";

export function PromoBanner() {
  const whatsappLink = whatsappGeneralLink();

  return (
    <section className="w-[80%] mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-[#e4e7ec] bg-[#f5f7ff] px-8 py-10 sm:px-12">

        {/* Decorative accent circle */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/8" />
        <div className="pointer-events-none absolute -bottom-10 right-24 h-40 w-40 rounded-full bg-accent/5" />

        <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Wholesale Deals
            </span>
            <h3 className="mt-3 text-2xl font-black tracking-tight text-navy sm:text-3xl">
              Bulk pricing on current stock
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Buying in quantity? Message us directly for the latest wholesale
              rates on any model in stock — we'll sort it out fast.
            </p>
          </div>

          <a
            href={whatsappLink ?? "/products"}
            target={whatsappLink ? "_blank" : undefined}
            rel={whatsappLink ? "noopener noreferrer" : undefined}
            className="shrink-0 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-dark hover:shadow-md"
          >
            Enquire for Bulk Pricing →
          </a>
        </div>
      </div>
    </section>
  );
}
