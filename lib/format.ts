const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(price: number): string {
  return currencyFormatter.format(price);
}

/** A short, ordered list of the specs worth showing on a card. Full list shows on the details page. */
const HEADLINE_SPEC_KEYS = ["processor", "ram", "storage", "display", "graphics"];

export function headlineSpecs(specifications: Record<string, string> | null, limit = 3): string[] {
  if (!specifications) return [];
  const entries = Object.entries(specifications);
  entries.sort((a, b) => {
    const ai = HEADLINE_SPEC_KEYS.indexOf(a[0].toLowerCase());
    const bi = HEADLINE_SPEC_KEYS.indexOf(b[0].toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  return entries.slice(0, limit).map(([, value]) => value);
}
