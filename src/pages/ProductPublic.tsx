import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, QrCode } from "lucide-react";
import { fetchProductBySampleId } from "@/lib/api";
import type { ProductWithSuppliers } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

export function ProductPublic() {
  const { sampleId } = useParams();

  const [product, setProduct] =
    useState<ProductWithSuppliers | null | undefined>(
      undefined
    );

  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!sampleId) return;

    fetchProductBySampleId(sampleId)
      .then(setProduct)
      .catch(() => setProduct(null));
  }, [sampleId]);

  if (product === undefined) {
    return <PageSpinner />;
  }

  const images = product?.product_images ?? [];
  const currentImage = images[selectedImage];

  // architect_name holds the architect's name while the sample is checked
  // out to them; empty/null means it's still in deposit (default state).
  const isAtArchitect = Boolean(product?.architect_name);

  return (
    <div className="min-h-screen bg-paper dark:bg-ink">
      <header className="border-b border-ink/8 py-4 dark:border-paper/10">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 font-bold text-ink dark:text-paper">
          <img
            src="/logo_iulius.png"
            alt="Company logo"
            className="h-7 w-7 rounded-lg object-contain"
          />

          Sample Tracker - Iulius
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
              <span
                className={`badge ${
                  isAtArchitect
                    ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                    : "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                }`}
              >
                {isAtArchitect ? "At the Employee" : "In Deposit"}
              </span>

              <div className="mt-3">
                <span className="id-tag">
                  {product.sample_id}
                </span>

                <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink dark:text-paper">
                  {product.product_name}
                </h1>

                {product.category && (
                  <span className="badge mt-1 bg-tag-50 text-tag-600 dark:bg-tag-500/15 dark:text-tag-300">
                    {product.category}
                  </span>
                )}
              </div>
            </div>

            {images.length > 0 && currentImage?.public_url && (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-ink/8 dark:border-paper/10">
                  <img
                    src={currentImage.public_url}
                    alt={
                      currentImage.file_name ??
                      product.product_name
                    }
                    className="max-h-[500px] w-full object-contain"
                  />

                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImage(
                            selectedImage === 0
                              ? images.length - 1
                              : selectedImage - 1
                          )
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={18} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedImage(
                            selectedImage === images.length - 1
                              ? 0
                              : selectedImage + 1
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white"
                        aria-label="Next image"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() =>
                          setSelectedImage(index)
                        }
                        className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                          selectedImage === index
                            ? "border-signal-500"
                            : "border-transparent"
                        }`}
                      >
                        {image.public_url && (
                          <img
                            src={image.public_url}
                            alt=""
                            className="h-16 w-16 object-cover"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {product.architect_name && (
              <div>
                <p className="label">Employee Name</p>

                <p className="text-sm text-ink dark:text-paper">
                  {product.architect_name}
                </p>
              </div>
            )}

            {product.description && (
              <div>
                <p className="label">Description</p>

                <p className="whitespace-pre-wrap text-sm text-ink/85 dark:text-paper/85">
                  {product.description}
                </p>
              </div>
            )}

            {product.qr_generated_at && (
              <p className="text-xs text-ink/40 dark:text-paper/40">
                QR generated{" "}
                {new Date(
                  product.qr_generated_at
                ).toLocaleDateString()}
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}