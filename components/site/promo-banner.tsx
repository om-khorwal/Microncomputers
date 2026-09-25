import { whatsappGeneralLink } from "@/lib/whatsapp";

export function PromoBanner() {
  const whatsappLink = whatsappGeneralLink();

  return (
    <section className="mx-auto max-w-7xl px-6">
      <div className="flex flex-col items-center justify-between gap-6 rounded-2xl bg-navy px-8 py-10 text-white sm:flex-row">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-accent">
            Wholesale Deals
          </span>
          <h3 className="mt-2 text-2xl font-bold sm:text-3xl">
            Bulk pricing on current stock
          </h3>
          <p className="mt-2 max-w-md text-sm text-white/70">
            Buying in quantity? Message us directly for the latest wholesale rates on any
            model in stock.
          </p>
        </div>
        <a
          href={whatsappLink ?? "/products"}
          target={whatsappLink ? "_blank" : undefined}
          rel={whatsappLink ? "noopener noreferrer" : undefined}
          className="shrink-0 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          Enquire for Bulk Pricing →
        </a>
      </div>
    </section>
  );
}
