import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  QrCode,
  Lock,
  Unlock,
  FileText,
  ExternalLink,
  Loader2,
} from "lucide-react";

import {
  fetchProductBySampleId,
  unlockProductDetails,
} from "@/lib/api";

import type { ProductWithSuppliers } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";

type UnlockedDocument = {
  id: string;
  file_name: string;
  signed_url: string;
};

type UnlockedSupplier = {
  id: string;
  supplier_part_number: string | null;
  price_quoted: number | null;
  currency: string | null;
  moq: number | null;
  lead_time_days: number | null;
  supplier:
    | {
        company_name: string;
        country: string | null;
        contact_person: string | null;
        email: string | null;
        phone: string | null;
      }
    | null;
};

export function ProductPublic() {
  const { sampleId } = useParams();
  const { notify } = useToast();

  const [product, setProduct] =
    useState<ProductWithSuppliers | null | undefined>(
      undefined
    );

  const [selectedImage, setSelectedImage] = useState(0);

  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const [documents, setDocuments] = useState<
    UnlockedDocument[]
  >([]);

  const [suppliers, setSuppliers] = useState<
    UnlockedSupplier[]
  >([]);

  useEffect(() => {
    if (!sampleId) return;

    fetchProductBySampleId(sampleId)
      .then(setProduct)
      .catch(() => setProduct(null));
  }, [sampleId]);

  async function handleUnlock() {
    if (!sampleId) return;

    if (!password.trim()) {
      notify("error", "Please enter the access code.");
      return;
    }

    setUnlocking(true);

    try {
      const result = await unlockProductDetails(
        sampleId,
        password
      );

      setDocuments(result.documents ?? []);
      setSuppliers(result.product_suppliers ?? []);
      setUnlocked(true);
      setPassword("");

      notify(
        "success",
        "Protected information unlocked."
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not unlock product details."
      );
    } finally {
      setUnlocking(false);
    }
  }

  if (product === undefined) {
    return <PageSpinner />;
  }

  const images = product?.product_images ?? [];
  const currentImage = images[selectedImage];

  const isAtArchitect = Boolean(
    product?.architect_name
  );

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
          <div className="space-y-5">

            {/* PUBLIC PRODUCT INFORMATION */}
            <div className="card space-y-5 p-6">
              <div>
                <span
                  className={`badge ${
                    isAtArchitect
                      ? "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"
                      : "bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                  }`}
                >
                  {isAtArchitect
                    ? "At the Employee"
                    : "In Deposit"}
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

              {/* IMAGES */}
              {images.length > 0 &&
                currentImage?.public_url && (
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
                                selectedImage ===
                                images.length - 1
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

              {/* LOCATION */}
              {product.architect_name && (
                <div>
                  <p className="label">
                    Employee Name
                  </p>

                  <p className="text-sm text-ink dark:text-paper">
                    {product.architect_name}
                  </p>
                </div>
              )}

              {/* DESCRIPTION */}
              {product.description && (
                <div>
                  <p className="label">
                    Description
                  </p>

                  <p className="whitespace-pre-wrap text-sm text-ink/85 dark:text-paper/85">
                    {product.description}
                  </p>
                </div>
              )}
            </div>

            {/* PROTECTED INFORMATION */}
            <div className="card space-y-4 p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-ink/5 p-2 dark:bg-paper/10">
                  {unlocked ? (
                    <Unlock
                      size={18}
                      className="text-ink dark:text-paper"
                    />
                  ) : (
                    <Lock
                      size={18}
                      className="text-ink dark:text-paper"
                    />
                  )}
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-ink dark:text-paper">
                    Protected information
                  </h2>

                  <p className="mt-1 text-xs text-ink/50 dark:text-paper/50">
                    Enter the special access code to view
                    supplier information and private documents.
                  </p>
                </div>
              </div>

              {!unlocked ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUnlock();
                  }}
                  className="space-y-3"
                >
                  <input
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Enter access code"
                    autoComplete="off"
                    className="input"
                    disabled={unlocking}
                  />

                  <button
                    type="submit"
                    disabled={
                      unlocking || !password.trim()
                    }
                    className="btn-primary w-full"
                  >
                    {unlocking ? (
                      <>
                        <Loader2
                          size={15}
                          className="animate-spin"
                        />
                        Checking…
                      </>
                    ) : (
                      <>
                        <Unlock size={15} />
                        Unlock information
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">

                  {/* SUPPLIERS */}
                  <div>
                    <h3 className="label">
                      Suppliers
                    </h3>

                    {suppliers.length === 0 ? (
                      <p className="text-sm text-ink/45 dark:text-paper/45">
                        No supplier information available.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {suppliers.map((link) => (
                          <div
                            key={link.id}
                            className="rounded-lg border border-ink/8 p-3 dark:border-paper/10"
                          >
                            {link.supplier && (
                              <>
                                <p className="font-medium text-ink dark:text-paper">
                                  {link.supplier.company_name}
                                </p>

                                {link.supplier.country && (
                                  <p className="text-xs text-ink/55 dark:text-paper/55">
                                    {link.supplier.country}
                                  </p>
                                )}

                                {link.supplier.contact_person && (
                                  <p className="mt-2 text-sm text-ink dark:text-paper">
                                    {link.supplier.contact_person}
                                  </p>
                                )}

                                {link.supplier.email && (
                                  <p className="text-sm text-ink/70 dark:text-paper/70">
                                    {link.supplier.email}
                                  </p>
                                )}

                                {link.supplier.phone && (
                                  <p className="text-sm text-ink/70 dark:text-paper/70">
                                    {link.supplier.phone}
                                  </p>
                                )}
                              </>
                            )}

                            {link.supplier_part_number && (
                              <p className="mt-2 text-xs text-ink/60 dark:text-paper/60">
                                Part number:{" "}
                                {link.supplier_part_number}
                              </p>
                            )}

                            {link.price_quoted !== null &&
                              link.price_quoted !== undefined && (
                                <p className="text-xs text-ink/60 dark:text-paper/60">
                                  Price:{" "}
                                  {link.price_quoted}{" "}
                                  {link.currency ?? ""}
                                </p>
                              )}

                            {link.moq !== null &&
                              link.moq !== undefined && (
                                <p className="text-xs text-ink/60 dark:text-paper/60">
                                  MOQ: {link.moq}
                                </p>
                              )}

                            {link.lead_time_days !== null &&
                              link.lead_time_days !== undefined && (
                                <p className="text-xs text-ink/60 dark:text-paper/60">
                                  Lead time:{" "}
                                  {link.lead_time_days} days
                                </p>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DOCUMENTS */}
                  <div>
                    <h3 className="label">
                      Documents
                    </h3>

                    {documents.length === 0 ? (
                      <p className="text-sm text-ink/45 dark:text-paper/45">
                        No documents attached.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.signed_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 rounded-lg border border-ink/8 px-3 py-3 text-sm text-ink hover:bg-ink/5 dark:border-paper/10 dark:text-paper dark:hover:bg-paper/5"
                          >
                            <FileText
                              size={17}
                              className="shrink-0 text-ink/50 dark:text-paper/50"
                            />

                            <span className="min-w-0 flex-1 truncate">
                              {doc.file_name}
                            </span>

                            <ExternalLink
                              size={14}
                              className="shrink-0 text-ink/40 dark:text-paper/40"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-ink/40 dark:text-paper/40">
                    Document links are temporary and expire
                    automatically.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}