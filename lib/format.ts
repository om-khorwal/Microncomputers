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

/** Older rows use different names for the same spec. Example: "gpu" means "graphics". */
const SAME_SPEC_NAMES: Record<string, string> = { gpu: "graphics" };

function headlineRank(specName: string): number {
  const lowerName = specName.toLowerCase();
  const standardName = SAME_SPEC_NAMES[lowerName] ?? lowerName;
  const rank = HEADLINE_SPEC_KEYS.indexOf(standardName);
  return rank === -1 ? 99 : rank;
}

export function headlineSpecs(specifications: Record<string, string> | null, limit = 3): string[] {
  if (!specifications) return [];
  const entries = Object.entries(specifications);
  entries.sort((a, b) => {
    const ai = headlineRank(a[0]);
    const bi = headlineRank(b[0]);
    return ai - bi;
  });
  return entries.slice(0, limit).map(([, value]) => value);
}

/** Short spec names that should be written in capitals. */
const UPPERCASE_SPEC_NAMES = ["ram", "gpu", "os", "cpu", "ssd"];

/**
 * Turns a spec name from the database into a label people can read.
 * Examples: "operating_system" → "Operating system", "ram" → "RAM".
 */
export function formatSpecLabel(specName: string): string {
  if (UPPERCASE_SPEC_NAMES.includes(specName.toLowerCase())) {
    return specName.toUpperCase();
  }

  const withSpaces = specName.replace(/_/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

/** Formats a date for display, e.g. "26 Sept 2026". */
export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/** Simplifies text for comparing: lowercase letters and numbers only. "Reliance Digital" → "reliancedigital". */
function simplifyText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Decides what to call an online price.
 *
 * Price sites (like Smartprix) often list other shops' prices. If the link is
 * really on the shop's own website, we show the shop's name. If not, we show
 * the website the price was actually read from, and mention which shop it
 * claims to be for.
 *
 * Examples:
 *   Flipkart, link on flipkart.com  → { label: "Flipkart",       listedFor: null }
 *   Flipkart, link on smartprix.com → { label: "smartprix.com",  listedFor: "Flipkart" }
 */
export function onlinePriceSource(storeName: string, productUrl: string): { label: string; listedFor: string | null } {
  let siteName = productUrl;

  try {
    siteName = new URL(productUrl).hostname.replace(/^www\./, "");
  } catch {
    // Not a valid link: fall back to showing it as it is.
  }

  const linkIsOnStoreWebsite = simplifyText(siteName).includes(simplifyText(storeName));

  if (linkIsOnStoreWebsite) {
    return { label: storeName, listedFor: null };
  }

  return { label: siteName, listedFor: storeName };
}
