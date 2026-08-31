import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { deleteProduct, fetchProductById } from "@/lib/api";
import type { ProductWithSuppliers } from "@/types";
import { QRCodeCard } from "@/components/QRCodeCard";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { notify } = useToast();

  const [product, setProduct] =
    useState<ProductWithSuppliers | null>(null);

  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (!id) return;

    fetchProductById(id)
      .then((loadedProduct) => {
        setProduct(loadedProduct);

        if (loadedProduct?.product_images?.length) {
          setSelectedImage(0);
        }
      })
      .catch((err) =>
        notify(
          "error",
          err instanceof Error
            ? err.message
            : "Could not load product."
        )
      )
      .finally(() => setLoading(false));
  }, [id, notify]);

  async function handleDelete() {
    if (
      !product ||
      !confirm(
        `Delete ${product.sample_id}? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeleting(true);

    try {
      await deleteProduct(product.id);

      notify("success", "Product deleted.");
      navigate("/products");
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not delete product."
      );

      setDeleting(false);
    }
  }

  if (loading) return <PageSpinner />;

  if (!product) {
    return (
      <p className="text-ink/55 dark:text-paper/55">
        Product not found.
      </p>
    );
  }

  const images = product.product_images ?? [];
  const currentImage = images[selectedImage];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="btn-ghost !px-2 text-sm"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="card space-y-4 p-6 md:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-paper">
                  {product.product_name}
                </h1>

                {product.category && (
                  <span className="badge bg-tag-50 text-tag-600 dark:bg-tag-500/15 dark:text-tag-300">
                    {product.category}
                  </span>
                )}
              </div>

              <span className="id-tag mt-2">
                {product.sample_id}
              </span>
            </div>

            {role === "admin" && (
              <div className="flex shrink-0 gap-2">
                <Link
                  to={`/products/${product.id}/edit`}
                  className="btn-secondary !px-2.5"
                  aria-label="Edit product"
                >
                  <Pencil size={15} />
                </Link>

                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn-danger !px-2.5"
                  aria-label="Delete product"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
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
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
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
                      onClick={() => setSelectedImage(index)}
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
              <p className="label">
                Location Product
              </p>

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

          <div>
            <p className="label">Suppliers</p>

            {product.product_suppliers?.length ? (
              <ul className="space-y-2">
                {product.product_suppliers.map((ps) => (
                  <li
                    key={ps.id}
                    className="rounded-lg border border-ink/8 p-3 dark:border-paper/10"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-ink dark:text-paper">
                        {ps.supplier?.company_name}
                      </p>

                      <p className="text-xs text-ink/50 dark:text-paper/50">
                        {ps.supplier?.country}
                      </p>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/60 dark:text-paper/60">
                      {ps.supplier_part_number && (
                        <span>
                          Part #: {ps.supplier_part_number}
                        </span>
                      )}

                      {ps.price_quoted != null && (
                        <span>
                          Price: {ps.price_quoted}{" "}
                          {ps.currency}
                        </span>
                      )}

                      {ps.moq != null && (
                        <span>MOQ: {ps.moq}</span>
                      )}

                      {ps.lead_time_days != null && (
                        <span>
                          Lead time: {ps.lead_time_days}d
                        </span>
                      )}

                      {ps.supplier?.email && (
                        <span>{ps.supplier.email}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/45 dark:text-paper/45">
                No suppliers linked yet.
              </p>
            )}
          </div>
        </div>

        <QRCodeCard
          product={product}
          onRegenerated={(qr_image_url) =>
            setProduct((previous) =>
              previous
                ? { ...previous, qr_image_url }
                : previous
            )
          }
        />
      </div>
    </div>
  );
}