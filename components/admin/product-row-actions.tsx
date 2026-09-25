"use client";

import { useTransition } from "react";
import { deleteProduct, setArchived } from "@/app/admin/products/actions";

export function ProductRowActions({ id, archived }: { id: string; archived: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-3 text-xs font-medium">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => setArchived(id, !archived))}
        className="text-muted hover:text-navy disabled:opacity-50"
      >
        {archived ? "Unarchive" : "Archive"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm("Permanently delete this product? This cannot be undone.")) {
            startTransition(() => deleteProduct(id));
          }
        }}
        className="text-red-600 hover:text-red-700 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
