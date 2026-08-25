import { Link } from "react-router-dom";
import { QrCode } from "lucide-react";
import type { ProductWithSuppliers } from "@/types";

export function ProductRow({ product }: { product: ProductWithSuppliers }) {
  const suppliers = product.product_suppliers?.map((ps) => ps.supplier?.company_name).filter(Boolean) ?? [];

  return (
    <Link
      to={`/products/${product.id}`}
      className="card flex items-center gap-4 p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-signal-50 text-signal-600 dark:bg-signal-500/15 dark:text-signal-300">
        {product.qr_image_url ? (
          <img src={product.qr_image_url} alt="" className="h-full w-full rounded-lg object-contain p-1" />
        ) : (
          <QrCode size={18} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-ink dark:text-paper">{product.product_name}</p>
          {product.category && <span className="badge bg-tag-50 text-tag-600 dark:bg-tag-500/15 dark:text-tag-300">{product.category}</span>}
        </div>
        <p className="mt-0.5 truncate text-sm text-ink/55 dark:text-paper/55">
          {suppliers.length > 0 ? suppliers.join(", ") : "No suppliers linked"}
        </p>
      </div>

      <span className="id-tag shrink-0">{product.sample_id}</span>
    </Link>
  );
}
