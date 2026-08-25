import { useEffect, useState } from "react";
import { fetchDashboardStats, fetchRecentProducts } from "@/lib/api";
import type { DashboardStats, ProductWithSuppliers } from "@/types";
import { StatsCards } from "@/components/StatsCards";
import { ProductRow } from "@/components/ProductRow";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Package } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<ProductWithSuppliers[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [statsResult, recentResult] = await Promise.all([fetchDashboardStats(), fetchRecentProducts(6)]);
        if (!active) return;
        setStats(statsResult);
        setRecent(recentResult);
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Could not load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading || !stats) return <PageSpinner />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-paper">Dashboard</h1>
        <p className="text-sm text-ink/55 dark:text-paper/55">Overview of your sample inventory.</p>
      </div>

      <StatsCards stats={stats} />

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/55 dark:text-paper/55">
          Recently added
        </h2>
        {recent.length === 0 ? (
          <EmptyState
            icon={<Package size={32} />}
            title="No products yet"
            description="Add your first product to see it appear here."
          />
        ) : (
          <div className="space-y-2">
            {recent.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
