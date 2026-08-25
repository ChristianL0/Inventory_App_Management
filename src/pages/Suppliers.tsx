import { useEffect, useState } from "react";
import { Truck, Mail, Phone, Globe } from "lucide-react";
import { fetchAllSuppliers } from "@/lib/api";
import type { Supplier } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/contexts/ToastContext";

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { notify } = useToast();

  useEffect(() => {
    fetchAllSuppliers()
      .then(setSuppliers)
      .catch((err) => notify("error", err instanceof Error ? err.message : "Could not load suppliers."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter((s) => s.company_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <PageSpinner />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-paper">Suppliers</h1>
        <p className="text-sm text-ink/55 dark:text-paper/55">
          {suppliers.length} supplier{suppliers.length === 1 ? "" : "s"} on file. New suppliers are added from the
          product form.
        </p>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Search suppliers…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filtered.length === 0 ? (
        <EmptyState icon={<Truck size={32} />} title="No suppliers found" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className="card p-4">
              <p className="font-semibold text-ink dark:text-paper">{s.company_name}</p>
              <p className="text-xs text-ink/50 dark:text-paper/50">
                {[s.city, s.country].filter(Boolean).join(", ") || "—"}
              </p>
              <div className="mt-3 space-y-1.5 text-xs text-ink/70 dark:text-paper/70">
                {s.contact_person && <p>{s.contact_person}</p>}
                {s.email && (
                  <p className="flex items-center gap-1.5">
                    <Mail size={12} /> {s.email}
                  </p>
                )}
                {s.phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone size={12} /> {s.phone}
                  </p>
                )}
                {s.website && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Globe size={12} /> {s.website}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
