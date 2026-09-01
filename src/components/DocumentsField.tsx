import { useEffect, useState } from "react";
import { FileText, Upload, Trash2, Loader2, ExternalLink } from "lucide-react";
import { deleteProductDocument, fetchProductDocuments, uploadProductDocument } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

export function DocumentsField({productId, isAdmin,}: {productId: string; isAdmin: boolean;}) {
  const [docs, setDocs] = useState<Awaited<ReturnType<typeof fetchProductDocuments>>>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { notify } = useToast();

  useEffect(() => {
    fetchProductDocuments(productId)
      .then(setDocs)
      .catch((err) => notify("error", err instanceof Error ? err.message : "Could not load documents."))
      .finally(() => setLoading(false));
  }, [productId]);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList?.length) return;
    setUploading(true);
    try {
      await Promise.all(Array.from(fileList).map((f) => uploadProductDocument(productId, f)));
      setDocs(await fetchProductDocuments(productId));
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(doc: (typeof docs)[number]) {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;
    try {
      await deleteProductDocument(doc);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not delete document.");
    }
  }

  if (loading) return <Loader2 size={16} className="animate-spin text-ink/40 dark:text-paper/40" />;

  return (
    <div className="space-y-2">
      {docs.length === 0 && <p className="text-sm text-ink/45 dark:text-paper/45">No documents attached.</p>}
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between rounded-lg border border-ink/8 dark:border-paper/10 px-3 py-2">
          <a href={doc.signedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-ink dark:text-paper hover:underline">
            <FileText size={15} className="shrink-0 text-ink/50 dark:text-paper/50" />
            <span className="truncate">{doc.file_name}</span>
            <ExternalLink size={12} className="shrink-0 text-ink/35 dark:text-paper/35" />
          </a>
          <button onClick={() => handleDelete(doc)} className="shrink-0 text-ink/40 hover:text-red-500 dark:text-paper/40" aria-label={`Delete ${doc.file_name}`}>
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      <label className="btn-secondary w-fit cursor-pointer text-xs">
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? "Uploading…" : "Upload document"}
        <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} disabled={uploading} />
      </label>
    </div>
  );
}