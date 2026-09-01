import { useEffect, useState } from "react";
import {
  ExternalLink,
  FileText,
  Loader2,
} from "lucide-react";
import {
  fetchProductDocuments,
} from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

export function ProductDocuments({
  productId,
}: {
  productId: string;
}) {
  const [documents, setDocuments] = useState<
    Awaited<ReturnType<typeof fetchProductDocuments>>
  >([]);

  const [loading, setLoading] = useState(true);

  const { notify } = useToast();

  useEffect(() => {
    fetchProductDocuments(productId)
      .then(setDocuments)
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

  if (loading) {
    return (
      <Loader2
        size={16}
        className="animate-spin text-ink/40 dark:text-paper/40"
      />
    );
  }

  return (
    <div className="space-y-2">
      {documents.length === 0 ? (
        <p className="text-sm text-ink/45 dark:text-paper/45">
          No documents attached.
        </p>
      ) : (
        documents.map((document) => (
          <a
            key={document.id}
            href={document.signedUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-lg border border-ink/8 px-3 py-2 text-sm text-ink hover:underline dark:border-paper/10 dark:text-paper"
          >
            <FileText
              size={15}
              className="shrink-0 text-ink/50 dark:text-paper/50"
            />

            <span className="min-w-0 flex-1 truncate">
              {document.file_name}
            </span>

            <ExternalLink
              size={12}
              className="shrink-0 text-ink/35 dark:text-paper/35"
            />
          </a>
        ))
      )}
    </div>
  );
}