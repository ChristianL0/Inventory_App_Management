import { useMemo, useState } from "react";
import { Plus, X, Search } from "lucide-react";
import type { Supplier } from "@/types";
import type { SupplierLinkInput } from "@/lib/api";
import { createSupplier } from "@/lib/api";
import { useToast } from "@/contexts/ToastContext";

interface Props {
  allSuppliers: Supplier[];
  links: SupplierLinkInput[];
  onChange: (links: SupplierLinkInput[]) => void;
  onSupplierCreated: (supplier: Supplier) => void;
}

/**
 * Typeahead picker for linking existing suppliers to a product, with an
 * inline "create new supplier" flow so the admin never has to leave the
 * product form to register a supplier they haven't used before.
 */
export function SupplierPicker({ allSuppliers, links, onChange, onSupplierCreated }: Props) {
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ company_name: "", country: "", email: "" });
  const [creating, setCreating] = useState(false);
  const { notify } = useToast();

  const linkedIds = new Set(links.map((l) => l.supplier_id));

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const term = query.toLowerCase();
    return allSuppliers
      .filter((s) => !linkedIds.has(s.id) && s.company_name.toLowerCase().includes(term))
      .slice(0, 6);
  }, [query, allSuppliers, links]);

  function addSupplier(supplier: Supplier) {
    onChange([...links, { supplier_id: supplier.id }]);
    setQuery("");
  }

  function removeSupplier(supplierId: string) {
    onChange(links.filter((l) => l.supplier_id !== supplierId));
  }

  function updateLink(supplierId: string, patch: Partial<SupplierLinkInput>) {
    onChange(links.map((l) => (l.supplier_id === supplierId ? { ...l, ...patch } : l)));
  }

  async function handleCreateSupplier() {
    if (!newSupplier.company_name.trim()) {
      notify("error", "Supplier company name is required.");
      return;
    }
    setCreating(true);
    try {
      const supplier = await createSupplier(newSupplier);
      onSupplierCreated(supplier);
      addSupplier(supplier);
      setNewSupplier({ company_name: "", country: "", email: "" });
      setShowCreate(false);
      notify("success", `Supplier "${supplier.company_name}" created and linked.`);
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not create supplier.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-paper/35" />
        <input
          className="input pl-9"
          placeholder="Search suppliers by company name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {results.length > 0 && (
          <div className="card absolute z-10 mt-1 w-full overflow-hidden py-1">
            {results.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => addSupplier(s)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink/5 dark:hover:bg-paper/5"
              >
                <span>{s.company_name}</span>
                <span className="text-xs text-ink/40 dark:text-paper/40">{s.country}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!showCreate ? (
        <button type="button" onClick={() => setShowCreate(true)} className="btn-ghost text-xs !px-2">
          <Plus size={14} /> New supplier
        </button>
      ) : (
        <div className="card space-y-2 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <input
              className="input"
              placeholder="Company name *"
              value={newSupplier.company_name}
              onChange={(e) => setNewSupplier({ ...newSupplier, company_name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Country"
              value={newSupplier.country}
              onChange={(e) => setNewSupplier({ ...newSupplier, country: e.target.value })}
            />
            <input
              className="input"
              placeholder="Email"
              value={newSupplier.email}
              onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleCreateSupplier} disabled={creating} className="btn-primary text-xs">
              {creating ? "Creating…" : "Create & link"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}

      {links.length > 0 && (
        <ul className="space-y-2">
          {links.map((link) => {
            const supplier = allSuppliers.find((s) => s.id === link.supplier_id);
            return (
              <li key={link.supplier_id} className="card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink dark:text-paper">
                    {supplier?.company_name ?? "Unknown supplier"}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSupplier(link.supplier_id)}
                    className="text-ink/40 hover:text-red-500 dark:text-paper/40"
                    aria-label={`Remove ${supplier?.company_name}`}
                  >
                    <X size={15} />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input
                    className="input text-xs"
                    placeholder="Part number"
                    value={link.supplier_part_number ?? ""}
                    onChange={(e) => updateLink(link.supplier_id, { supplier_part_number: e.target.value })}
                  />
<input
  className="input text-xs"
  placeholder="Price"
  type="number"
  min="0"
  step="0.01"
  value={link.price_quoted ?? ""}
  onChange={(e) =>
    updateLink(link.supplier_id, {
      price_quoted: e.target.value
        ? Number(e.target.value)
        : null,
    })
  }
/>
                  
                  <input
                    className="input text-xs"
                    placeholder="MOQ"
                    type="number"
                    min="0"
                    step="1"
                    value={link.moq ?? ""}
                    onChange={(e) => updateLink(link.supplier_id, { moq: e.target.value ? Number(e.target.value) : null })}
                  />
                  <input
                    className="input text-xs"
                    placeholder="Lead time (days)"
                    type="number"
                    min="0"
                    step="1"
                    value={link.lead_time_days ?? ""}
                    onChange={(e) =>
                      updateLink(link.supplier_id, { lead_time_days: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
