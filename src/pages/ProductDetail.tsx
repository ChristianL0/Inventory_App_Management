import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { deleteProduct, fetchProductById } from "@/lib/api";
import type { ProductWithSuppliers } from "@/types";
import { QRCodeCard } from "@/components/QRCodeCard";
import { PageSpinner } from "@/components/ui/Spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

/** Authenticated admin/user detail view — includes QR management and edit/delete. */
export function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { notify } = useToast();

  const [product, setProduct] = useState<ProductWithSuppliers | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchProductById(id)
      .then(setProduct)
      .catch((err) => notify("error", err instanceof Error ? err.message : "Could not load product."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    if (!product || !confirm(`Delete ${product.sample_id}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      notify("success", "Product deleted.");
      navigate("/products");
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not delete product.");
      setDeleting(false);
    }
  }

  if (loading) return <PageSpinner />;
  if (!product) return <p className="text-ink/55 dark:text-paper/55">Product not found.</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <button onClick={() => navigate(-1)} className="btn-ghost !px-2 text-sm">
        <ArrowLeft size={15} /> Back
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
              <span className="id-tag mt-2">{product.sample_id}</span>
            </div>
            {role === "admin" && (
              <div className="flex shrink-0 gap-2">
                <Link to={`/products/${product.id}/edit`} className="btn-secondary !px-2.5" aria-label="Edit product">
                  <Pencil size={15} />
                </Link>
                <button onClick={handleDelete} disabled={deleting} className="btn-danger !px-2.5" aria-label="Delete product">
                  <Trash2 size={15} />
                </button>
              </div>
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
              <ul className="space-y-2">
                {product.product_suppliers.map((ps) => (
                  <li key={ps.id} className="rounded-lg border border-ink/8 dark:border-paper/10 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-ink dark:text-paper">{ps.supplier?.company_name}</p>
                      <p className="text-xs text-ink/50 dark:text-paper/50">{ps.supplier?.country}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/60 dark:text-paper/60">
                      {ps.supplier_part_number && <span>Part #: {ps.supplier_part_number}</span>}
                      {ps.price_quoted != null && <span>Price: {ps.price_quoted} {ps.currency}</span>}
                      {ps.moq != null && <span>MOQ: {ps.moq}</span>}
                      {ps.lead_time_days != null && <span>Lead time: {ps.lead_time_days}d</span>}
                      {ps.supplier?.email && <span>{ps.supplier.email}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink/45 dark:text-paper/45">No suppliers linked yet.</p>
            )}
          </div>
        </div>

        <QRCodeCard
          product={product}
          onRegenerated={(qr_image_url) => setProduct((p) => (p ? { ...p, qr_image_url } : p))}
        />
      </div>
    </div>
  );
}
