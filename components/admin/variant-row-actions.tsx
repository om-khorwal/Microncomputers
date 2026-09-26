"use client";

import Link from "next/link";
import { useTransition } from "react";
import { deleteVariant } from "@/app/admin/products/variant-actions";

// Edit / Delete links for one variant row on the admin product page.
export function VariantRowActions({ productId, variantId }: { productId: string; variantId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3 text-xs font-medium">
      <Link href={`/admin/products/${productId}/variants/${variantId}`} className="text-accent hover:text-accent-dark">
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Permanently delete this variant? This cannot be undone.")) {
            startTransition(() => deleteVariant(productId, variantId));
          }
        }}
        className="text-red-600 hover:text-red-700 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
