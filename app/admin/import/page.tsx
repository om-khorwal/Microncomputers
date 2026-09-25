import { ImportUploader } from "@/components/admin/import-uploader";

export const metadata = { title: "Import Sheet | Micron Admin" };

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-navy">Import Price Sheet</h1>
      <p className="mt-1 text-sm text-muted">
        Upload the latest stock sheet. Existing products (matched by model number) get their
        quantity and price updated; new model numbers are added as new products.
      </p>
      <div className="mt-6">
        <ImportUploader />
      </div>
    </div>
  );
}
