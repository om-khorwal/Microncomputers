import { ImportUploader } from "@/components/admin/import-uploader";

export const metadata = { title: "Import Sheet | Micron Admin" };

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-navy">Import Price Sheet</h1>
      <p className="mt-1 text-sm text-muted">
        Upload the latest stock sheet. Each row is one exact model number. Model numbers already in the
        shop get their quantity and price updated (nothing else changes); new model numbers are added as
        new variants of their product.
      </p>
      <div className="mt-6">
        <ImportUploader />
      </div>
    </div>
  );
}
