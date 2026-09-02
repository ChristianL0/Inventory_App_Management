import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  createProduct,
  fetchAllCategories,
  fetchAllSuppliers,
  fetchProductById,
  generateQrForProduct,
  updateProduct,
  uploadProductImage,
  uploadProductDocument,
  type SupplierLinkInput,
} from "@/lib/api";
import type { Category, Supplier } from "@/types";
import { SupplierPicker } from "@/components/SupplierPicker";
import { DocumentsField } from "@/components/DocumentsField";
import { CategoryPicker } from "@/components/CategoryPicker";
import { ProductImageManager } from "@/components/ProductImageManager";
import { PageSpinner } from "@/components/ui/Spinner";
import { useToast } from "@/contexts/ToastContext";
import {ProductDetail} from "@/pages/ProductDetail";

const emptyForm = {
  product_name: "",
  category: "",
  category_id: null as string | null,
  architect_name: "",
  description: "",
};

export function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const navigate = useNavigate();
  const { notify } = useToast();

  const [form, setForm] = useState(emptyForm);

  const [links, setLinks] = useState<SupplierLinkInput[]>([]);

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<File[]>([]);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

 

  useEffect(() => {
    Promise.all([
      fetchAllSuppliers(),
      fetchAllCategories(),
    ])
      .then(([suppliers, loadedCategories]) => {
        setAllSuppliers(suppliers);
        setCategories(loadedCategories);
      })
      .catch((err) =>
        notify(
          "error",
          err instanceof Error
            ? err.message
            : "Could not load form data."
        )
      );
  }, [notify]);

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
          category_id: product.category_id ?? null,
          architect_name: product.architect_name ?? "",
          description: product.description ?? "",
        });

        setLinks(
          (product.product_suppliers ?? []).map((ps) => ({
            supplier_id: ps.supplier_id,
            supplier_part_number:
              ps.supplier_part_number ?? undefined,
            price_quoted: ps.price_quoted,
            currency: ps.currency ?? undefined,
            moq: ps.moq,
            lead_time_days: ps.lead_time_days,
            notes: ps.notes ?? undefined,
          }))
        );
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
  }, [id, navigate, notify]);

  function handleCategoryChange(category: Category | null) {
    setForm((previous) => ({
      ...previous,

      category_id: category?.id ?? null,

      // Keep the legacy field synchronized.
      category: category?.name ?? "",
    }));
  }

  async function uploadImagesForNewProduct(productId: string) {
    if (pendingImages.length === 0) return;

    for (let index = 0; index < pendingImages.length; index++) {
      await uploadProductImage(
        productId,
        pendingImages[index],
        index
      );
    }

    setPendingImages([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!form.product_name.trim()) {
      notify("error", "Product name is required.");
      return;
    }

    setSaving(true);

    try {
      const productInput = {
        product_name: form.product_name.trim(),
        category: form.category.trim(),
        category_id: form.category_id,
        architect_name: form.architect_name.trim(),
        description: form.description.trim(),
      };

      if (isEdit && id) {
        await updateProduct(id, productInput, links);

        if (pendingImages.length > 0) {
          await uploadImagesForNewProduct(id);
        }

        notify("success", "Product updated.");
        navigate(`/products/${id}`);
      } else {
        const product = await createProduct(
          productInput,
          links
        );

        notify(
          "success",
          `Product ${product.sample_id} created.`
        );
        
        if (pendingDocuments.length > 0) {
  try {
    await Promise.all(
      pendingDocuments.map((file) =>
        uploadProductDocument(product.id, file)
      )
    );

    setPendingDocuments([]);
  } catch {
    notify(
      "error",
      "Product was created, but one or more documents could not be uploaded."
    );
  }
}

        if (pendingImages.length > 0) {
          try {
            await uploadImagesForNewProduct(product.id);
          } catch {
            notify(
              "error",
              "Product was created, but one or more pictures could not be uploaded."
            );
          }
        }

        notify(
          "success",
          "Generating QR code…"
        );

        try {
          await generateQrForProduct(product.id);
        } catch {
          notify(
            "error",
            "Product saved, but QR generation failed — you can retry from the product page."
          );
        }

        navigate(`/products/${product.id}`);
      }
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not save product."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSpinner />;

  const selectedCategory =
    categories.find(
      (category) => category.id === form.category_id
    ) ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <button
        onClick={() => navigate(-1)}
        className="btn-ghost !px-2 text-sm"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-paper">
          {isEdit ? "Edit product" : "Add product"}
        </h1>

        {!isEdit && (
          <p className="text-sm text-ink/55 dark:text-paper/55">
            A sample ID and QR code will be generated automatically once you
            save.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card space-y-4 p-5">
          <div>
            <label
              className="label"
              htmlFor="product_name"
            >
              Product name *
            </label>

            <input
              id="product_name"
              className="input"
              required
              value={form.product_name}
              onChange={(e) =>
                setForm({
                  ...form,
                  product_name: e.target.value,
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">
                Category
              </label>

              <CategoryPicker
                categories={categories}
                value={selectedCategory?.id ?? null}
                onChange={handleCategoryChange}
                onCategoryCreated={(category) =>
                  setCategories((previous) =>
                    [...previous, category].sort((a, b) =>
                      a.name.localeCompare(b.name)
                    )
                  )
                }
                onCategoryDeleted={(categoryId) =>
                   setCategories((previous) =>
                      previous.filter(
                      (category) => category.id !== categoryId
                     )
                    )
                   }
              />
            </div>

            <div>
              <label
                className="label"
                htmlFor="architect_name"
              >
                Location Product
              </label>

              <input
                id="architect_name"
                className="input"
                value={form.architect_name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    architect_name: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <label
              className="label"
              htmlFor="description"
            >
              Description
            </label>

            <textarea
              id="description"
              rows={4}
              className="input"
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
            />
          </div>
        </div>

        <div className="card p-5">
          <ProductImageManager
            productId={id}
            pendingFiles={pendingImages}
            onPendingFilesChange={setPendingImages}
          />
        </div>
<div className="card space-y-3 p-5">
  <div>
    <h2 className="text-sm font-semibold text-ink dark:text-paper">
      Documents
    </h2>

    <p className="text-xs text-ink/45 dark:text-paper/45">
      Add technical sheets, certificates, quotations, or other
      documents associated with this sample.
    </p>
  </div>

  <DocumentsField
    productId={id}
    isAdmin={true}
    pendingFiles={pendingDocuments}
    onPendingFilesChange={setPendingDocuments}
  />
</div>

        <div className="card space-y-3 p-5">
          <label className="label !mb-0">
            Suppliers
          </label>

          <SupplierPicker
            allSuppliers={allSuppliers}
            links={links}
            onChange={setLinks}
            onSupplierCreated={(supplier) =>
              setAllSuppliers((previous) => [
                ...previous,
                supplier,
              ])
            }
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving
              ? "Saving…"
              : isEdit
              ? "Save changes"
              : "Create product"}
          </button>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}