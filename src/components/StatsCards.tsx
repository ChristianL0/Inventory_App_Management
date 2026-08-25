import { Package, Layers, Truck, QrCode } from "lucide-react";
import type { DashboardStats } from "@/types";

export function StatsCards({ stats }: { stats: DashboardStats }) {
  const items = [
    { label: "Total products", value: stats.totalProducts, icon: Package },
    { label: "Categories", value: stats.categoriesCount, icon: Layers },
    { label: "Suppliers", value: stats.suppliersCount, icon: Truck },
    { label: "QR codes generated", value: stats.qrGeneratedCount, icon: QrCode },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <div key={label} className="card p-4">
          <div className="flex items-center gap-2 text-ink/50 dark:text-paper/50">
            <Icon size={15} />
            <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-ink dark:text-paper">{value}</p>
        </div>
      ))}
    </div>
  );
}
