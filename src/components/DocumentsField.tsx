import { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import {
  deleteProductDocument,
  fetchProductDocuments,
  uploadProductDocument,
} from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

type DocumentsFieldProps = {
  productId?: string;
  isAdmin: boolean;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
};

const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024; // 5 MB

export function DocumentsField({
  productId,
  isAdmin,
  pendingFiles = [],
  onPendingFilesChange,
}: DocumentsFieldProps) {
  const [docs, setDocs] = useState<
    Awaited<ReturnType<typeof fetchProductDocuments>>
  >([]);

  const [loading, setLoading] = useState(Boolean(productId));
  const [uploading, setUploading] = useState(false);

  const { notify } = useToast();

  useEffect(() => {
    if (!productId) {
      setDocs([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    fetchProductDocuments(productId)
      .then(setDocs)
      .catch((err) =>
        notify(
          "error",
          err instanceof Error
            ? err.message
            : "Could not load documents."
        )
      )
      .finally(() => setLoading(false));
  }, [productId, notify]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return;

    const files = Array.from(fileList);

    // Check file sizes before adding or uploading.
    const oversizedFiles = files.filter(
      (file) => file.size > MAX_DOCUMENT_SIZE
    );

    if (oversizedFiles.length > 0) {
      const names = oversizedFiles
        .map((file) => `"${file.name}"`)
        .join(", ");

      notify(
        "error",
        `${names} ${
          oversizedFiles.length === 1 ? "is" : "are"
        } too large. Maximum allowed size is 5 MB.`
      );

      return;
    }

    // New product: store files temporarily.
    if (!productId) {
      onPendingFilesChange?.([
        ...pendingFiles,
        ...files,
      ]);

      return;
    }

    // Existing product: upload directly.
    setUploading(true);

    try {
      await Promise.all(
        files.map((file) =>
          uploadProductDocument(productId, file)
        )
      );

      setDocs(await fetchProductDocuments(productId));
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  function removePendingFile(index: number) {
    onPendingFilesChange?.(
      pendingFiles.filter((_, i) => i !== index)
    );
  }

  async function handleDelete(
    doc: (typeof docs)[number]
  ) {
    if (!confirm(`Delete "${doc.file_name}"?`)) {
      return;
    }

    try {
      await deleteProductDocument(doc);

      setDocs((prev) =>
        prev.filter((d) => d.id !== doc.id)
      );
    } catch (err) {
      notify(
        "error",
        err instanceof Error
          ? err.message
          : "Could not delete document."
      );
    }
  }

  if (loading) {
    return (
      <Loader2
        size={16}
        className="animate-spin text-ink/40 dark:text-paper/40"
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Existing documents */}
      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-ink/8 px-3 py-2 dark:border-paper/10"
            >
              <a
                href={doc.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm text-ink hover:underline dark:text-paper"
              >
                <FileText
                  size={15}
                  className="shrink-0 text-ink/50 dark:text-paper/50"
                />

                <span className="truncate">
                  {doc.file_name}
                </span>

                <ExternalLink
                  size={12}
                  className="shrink-0 text-ink/35 dark:text-paper/35"
                />
              </a>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  className="shrink-0 text-ink/40 hover:text-red-500 dark:text-paper/40"
                  aria-label={`Delete ${doc.file_name}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pending documents for a new product */}
      {!productId && pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-ink/8 px-3 py-2 dark:border-paper/10"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileText
                  size={15}
                  className="shrink-0 text-ink/50 dark:text-paper/50"
                />

                <span className="truncate text-sm text-ink dark:text-paper">
                  {file.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  removePendingFile(index)
                }
                className="shrink-0 text-ink/40 hover:text-red-500 dark:text-paper/40"
                aria-label={`Remove ${file.name}`}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {docs.length === 0 &&
        pendingFiles.length === 0 && (
          <p className="text-sm text-ink/45 dark:text-paper/45">
            No documents attached.
          </p>
        )}

      {/* Upload button */}
      {isAdmin && (
        <label className="btn-secondary w-fit cursor-pointer text-xs">
          {uploading ? (
            <Loader2
              size={14}
              className="animate-spin"
            />
          ) : (
            <Upload size={14} />
          )}

          {uploading
            ? "Uploading…"
            : "Add document"}

          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            className="hidden"
            onChange={(e) => {
              void handleUpload(e.target.files);
              e.target.value = "";
            }}
            disabled={uploading}
          />
        </label>
      )}
    </div>
  );
}