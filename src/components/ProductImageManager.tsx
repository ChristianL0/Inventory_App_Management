import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import type { ProductImage } from "@/types";
import {
  deleteProductImage,
  fetchProductImages,
  updateProductImageOrder,
  uploadProductImage,
} from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface Props {
  productId?: string;
  pendingFiles: File[];
  onPendingFilesChange: (files: File[]) => void;
}

export function ProductImageManager({
  productId,
  pendingFiles,
  onPendingFilesChange,
}: Props) {
  const { notify } = useToast();

  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(Boolean(productId));
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!productId) {
      setImages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchProductImages(productId)
      .then(setImages)
      .catch((err) =>
        notify(
          "error",
          err instanceof Error
            ? err.message
            : "Could not load product images."
        )
      )
      .finally(() => setLoading(false));
  }, [productId, notify]);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;

    const incoming = Array.from(fileList);

    const valid = incoming.filter((file) => {
      if (!file.type.startsWith("image/")) {
        notify("error", `${file.name} is not an image.`);
        return false;
      }

      if (file.size > 10 * 1024 * 1024) {
        notify("error", `${file.name} is larger than 10 MB.`);
        return false;
      }

      return true;
    });

    onPendingFilesChange([...pendingFiles, ...valid]);
  }

  function removePending(index: number) {
    onPendingFilesChange(
      pendingFiles.filter((_, fileIndex) => fileIndex !== index)
    );
  }

  async function uploadPendingFiles() {
    if (!productId || pendingFiles.length === 0) return;

    setUploading(true);

    try {
      const uploaded: ProductImage[] = [];

      for (let index = 0; index < pendingFiles.length; index++) {
        const image = await uploadProductImage(
          productId,
          pendingFiles[index],
          images.length + uploaded.length
        );

        uploaded.push(image);
      }

      setImages((previous) => [...previous, ...uploaded]);
      onPendingFilesChange([]);

      notify(
        "success",
        `${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded.`
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not upload images."
      );
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(image: ProductImage) {
    if (
      !confirm(
        `Delete "${image.file_name ?? "this image"}"?`
      )
    ) {
      return;
    }

    try {
      await deleteProductImage(image);

      const remaining = images.filter(
        (item) => item.id !== image.id
      );

      await Promise.all(
        remaining.map((item, index) =>
          updateProductImageOrder(item.id, index)
        )
      );

      setImages(
        remaining.map((item, index) => ({
          ...item,
          sort_order: index,
        }))
      );

      notify("success", "Image deleted.");
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not delete image."
      );
    }
  }

  async function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;

    if (target < 0 || target >= images.length) return;

    const reordered = [...images];

    [reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ];

    try {
      await Promise.all(
        reordered.map((image, newIndex) =>
          updateProductImageOrder(image.id, newIndex)
        )
      );

      setImages(
        reordered.map((image, newIndex) => ({
          ...image,
          sort_order: newIndex,
        }))
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not reorder images."
      );
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="label !mb-1">Product pictures</p>
        <p className="text-xs text-ink/50 dark:text-paper/50">
          Upload product photos from your PC. They will be visible on the
          public QR-code page.
        </p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink/15 px-5 py-8 text-center transition hover:border-signal-500/50 hover:bg-ink/3 dark:border-paper/15 dark:hover:bg-paper/5">
        <ImagePlus
          size={28}
          className="mb-2 text-ink/40 dark:text-paper/40"
        />

        <span className="text-sm font-medium text-ink dark:text-paper">
          Choose pictures
        </span>

        <span className="mt-1 text-xs text-ink/45 dark:text-paper/45">
          JPG, PNG, WEBP — maximum 10 MB each
        </span>

        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.currentTarget.value = "";
          }}
        />
      </label>

      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-ink dark:text-paper">
            Waiting to upload
          </p>

          {pendingFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center gap-3 rounded-lg border border-ink/8 p-2 dark:border-paper/10"
            >
              <img
                src={URL.createObjectURL(file)}
                alt={file.name}
                className="h-14 w-14 rounded-md object-cover"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink dark:text-paper">
                  {file.name}
                </p>

                <p className="text-xs text-ink/45 dark:text-paper/45">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              <button
                type="button"
                onClick={() => removePending(index)}
                className="text-ink/40 hover:text-red-500 dark:text-paper/40"
                aria-label={`Remove ${file.name}`}
              >
                <X size={16} />
              </button>
            </div>
          ))}

          {!productId && (
            <p className="text-xs text-ink/45 dark:text-paper/45">
              The pictures will be uploaded automatically after the product
              is created.
            </p>
          )}

          {productId && (
            <button
              type="button"
              onClick={uploadPendingFiles}
              disabled={uploading}
              className="btn-primary text-xs"
            >
              {uploading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <ImagePlus size={14} />
                  Upload pictures
                </>
              )}
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink/50 dark:text-paper/50">
          <Loader2 size={15} className="animate-spin" />
          Loading pictures…
        </div>
      ) : images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-xl border border-ink/8 dark:border-paper/10"
            >
              {image.public_url ? (
                <img
                  src={image.public_url}
                  alt={image.file_name ?? "Product"}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center text-xs text-ink/40 dark:text-paper/40">
                  Image unavailable
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/65 px-2 py-2 text-white">
                <span className="text-xs">
                  {index + 1}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveImage(index, -1)}
                    className="rounded p-1 hover:bg-white/15 disabled:opacity-30"
                    aria-label="Move image left"
                  >
                    <ArrowUp size={13} />
                  </button>

                  <button
                    type="button"
                    disabled={index === images.length - 1}
                    onClick={() => moveImage(index, 1)}
                    className="rounded p-1 hover:bg-white/15 disabled:opacity-30"
                    aria-label="Move image right"
                  >
                    <ArrowDown size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => removeImage(image)}
                    className="rounded p-1 hover:bg-red-500/50"
                    aria-label="Delete image"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink/40 dark:text-paper/40">
          No pictures uploaded yet.
        </p>
      )}
    </div>
  );
}