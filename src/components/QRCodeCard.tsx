import { useState } from "react";
import { Download, ExternalLink, RefreshCw, QrCode } from "lucide-react";
import { generateQrForProduct } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";
import type { Product } from "@/types";

export function QRCodeCard({
  product,
  onRegenerated,
}: {
  product: Product;
  onRegenerated?: (qrImageUrl: string) => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const { notify } = useToast();

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const result = await generateQrForProduct(product.id);
      onRegenerated?.(result.qr_image_url);
      notify("success", "QR code regenerated.");
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "QR generation failed.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <div className="card p-5 flex flex-col items-center text-center gap-3">
      {product.qr_image_url ? (
        <img
          src={product.qr_image_url}
          alt={`QR code for ${product.sample_id}`}
          className="h-40 w-40 rounded-lg border border-ink/10 dark:border-paper/10 bg-white p-2"
        />
      ) : (
        <div className="flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-ink/20 dark:border-paper/20 text-ink/30 dark:text-paper/30">
          <QrCode size={40} />
        </div>
      )}

      <span className="id-tag">{product.sample_id}</span>

      {product.qr_generated_at && (
        <p className="text-xs text-ink/45 dark:text-paper/45">
          Generated {new Date(product.qr_generated_at).toLocaleString()}
        </p>
      )}

      <div className="grid w-full grid-cols-2 gap-2 pt-1">
        <a
          href={product.qr_image_url ?? undefined}
          download={`${product.sample_id}.png`}
          className={`btn-secondary text-xs ${!product.qr_image_url ? "pointer-events-none opacity-40" : ""}`}
        >
          <Download size={14} /> Download
        </a>
        <a
          href={product.qr_target_url ?? `/product/${product.sample_id}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary text-xs"
        >
          <ExternalLink size={14} /> Open page
        </a>
      </div>
      <button onClick={handleRegenerate} disabled={regenerating} className="btn-ghost w-full text-xs">
        <RefreshCw size={14} className={regenerating ? "animate-spin" : ""} />
        {regenerating ? "Regenerating…" : "Regenerate QR code"}
      </button>
    </div>
  );
}
