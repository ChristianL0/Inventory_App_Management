import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Boxes, QrCode } from "lucide-react";
import { fetchProductBySampleId } from "@/lib/api";
import type { ProductWithSuppliers } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Public route — this is exactly the page the printed QR code opens.
 * No authentication required, so it must stand alone (its own header,
 * no navbar/sidebar dependency on a logged-in session).
 */
export function ProductPublic() {
  const { sampleId } = useParams();
  const [product, setProduct] = useState<ProductWithSuppliers | null | undefined>(undefined);

  useEffect(() => {
    if (!sampleId) return;
    fetchProductBySampleId(sampleId).then(setProduct);
  }, [sampleId]);

  if (product === undefined) return <PageSpinner />;

  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      <header className="border-b border-ink/8 dark:border-paper/10 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 font-bold text-ink dark:text-paper">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-signal-500 text-white">
            <Boxes size={16} />
          </span>
          Sample Tracker
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {product === null ? (
          <EmptyState
            icon={<QrCode size={32} />}
            title="Sample not found"
            description={`No record matches "${sampleId}". The label may be damaged, or this sample hasn't been catalogued yet.`}
          />
        ) : (
          <div className="card space-y-5 p-6">
            <div>
              <span className="id-tag">{product.sample_id}</span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink dark:text-paper">
                {product.product_name}
              </h1>
              {product.category && (
                <span className="badge mt-1 bg-tag-50 text-tag-600 dark:bg-tag-500/15 dark:text-tag-300">
                  {product.category}
                </span>
              )}
            </div>

            {product.european_reference && (
              <div>
                <p className="label">European reference</p>
                <p className="text-sm text-ink dark:text-paper">{product.european_reference}</p>
              </div>
            )}

            {product.description && (
              <div>
                <p className="label">Description</p>
                <p className="whitespace-pre-wrap text-sm text-ink/85 dark:text-paper/85">{product.description}</p>
              </div>
            )}

            <div>
              <p className="label">Suppliers</p>
              {product.product_suppliers?.length ? (
                <ul className="space-y-1.5">
                  {product.product_suppliers.map((ps) => (
                    <li key={ps.id} className="text-sm text-ink/85 dark:text-paper/85">
                      {ps.supplier?.company_name}
                      {ps.supplier?.country ? ` — ${ps.supplier.country}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink/45 dark:text-paper/45">No suppliers listed.</p>
              )}
            </div>

            {product.qr_generated_at && (
              <p className="text-xs text-ink/40 dark:text-paper/40">
                QR generated {new Date(product.qr_generated_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
