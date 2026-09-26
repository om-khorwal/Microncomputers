import type { EnrichmentStatus } from "@/lib/types";

// A small colored label for a variant's enrichment status.
export function EnrichmentBadge({ status }: { status: EnrichmentStatus | null }) {
  if (status === "enriched") {
    return <span className="rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">Enriched</span>;
  }

  if (status === "needs_review") {
    return <span className="rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Needs review</span>;
  }

  if (status === "retry_later") {
    return <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-muted">Retry later</span>;
  }

  return <span className="text-xs text-muted">—</span>;
}
