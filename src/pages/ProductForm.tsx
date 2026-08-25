import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  createProduct,
  fetchAllSuppliers,
  fetchProductById,
  generateQrForProduct,
  updateProduct,
  type SupplierLinkInput,
} from "@/lib/api";
import type { Supplier } from "@/types";
import { SupplierPicker } from "@/components/SupplierPicker";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/contexts/ToastContext";

const emptyForm = { product_name: "", category: "", european_reference: "", description: "" };

export function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { notify } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [links, setLinks] = useState<SupplierLinkInput[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAllSuppliers().then(setAllSuppliers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetchProductById(id)
      .then((product) => {
        if (!product) {
          notify("error", "Product not found.");
          navigate("/products");
          return;
        }
        setForm({
          product_name: product.product_name,
          category: product.category ?? "",
          european_reference: product.european_reference ?? "",
          description: product.description ?? "",
        });
        setLinks(
          (product.product_suppliers ?? []).map((ps) => ({
            supplier_id: ps.supplier_id,
            supplier_part_number: ps.supplier_part_number ?? undefined,
            price_quoted: ps.price_quoted,
            currency: ps.currency ?? undefined,
            moq: ps.moq,
            lead_time_days: ps.lead_time_days,
            notes: ps.notes ?? undefined,
          }))
        );
      })
      .catch((err) => notify("error", err instanceof Error ? err.message : "Could not load product."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.product_name.trim()) {
      notify("error", "Product name is required.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await updateProduct(id, form, links);
        notify("success", "Product updated.");
        navigate(`/products/${id}`);
      } else {
        const product = await createProduct(form, links);
        notify("success", `Product ${product.sample_id} created. Generating QR code…`);
        try {
          await generateQrForProduct(product.id);
        } catch {
          notify("error", "Product saved, but QR generation failed — you can retry from the product page.");
        }
        navigate(`/products/${product.id}`);
      }
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button onClick={() => navigate(-1)} className="btn-ghost !px-2 text-sm">
        <ArrowLeft size={15} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-paper">
          {isEdit ? "Edit product" : "Add product"}
        </h1>
        {!isEdit && (
          <p className="text-sm text-ink/55 dark:text-paper/55">
            A sample ID and QR code will be generated automatically once you save.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="product_name">Product name *</label>
            <input
              id="product_name"
              className="input"
              required
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="category">Category</label>
              <input
                id="category"
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="european_reference">European reference</label>
              <input
                id="european_reference"
                className="input"
                value={form.european_reference}
                onChange={(e) => setForm({ ...form, european_reference: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={4}
              className="input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>

        <div className="card space-y-3 p-5">
          <label className="label !mb-0">Suppliers</label>
          <SupplierPicker
            allSuppliers={allSuppliers}
            links={links}
            onChange={setLinks}
            onSupplierCreated={(s) => setAllSuppliers((prev) => [...prev, s])}
          />
        </div>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create product"}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
