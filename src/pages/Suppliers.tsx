import { useEffect, useState } from "react";
import { Truck, Mail, Phone, Globe, Pencil, X, Check } from "lucide-react";
import { fetchAllSuppliers, updateSupplier, type SupplierInput } from "@/lib/api";
import type { Supplier } from "@/types";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const editableFields: { key: keyof SupplierInput; label: string }[] = [
  { key: "company_name", label: "Company name" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "contact_person", label: "Contact person" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
];

function toSupplierInput(s: Supplier): SupplierInput {
  return {
    company_name: s.company_name,
    country: s.country ?? "",
    city: s.city ?? "",
    contact_person: s.contact_person ?? "",
    email: s.email ?? "",
    phone: s.phone ?? "",
    website: s.website ?? "",
  };
}

export function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SupplierInput | null>(null);
  const [saving, setSaving] = useState(false);
  const { role } = useAuth();
  const { notify } = useToast();

  useEffect(() => {
    fetchAllSuppliers()
      .then(setSuppliers)
      .catch((err) => notify("error", err instanceof Error ? err.message : "Could not load suppliers."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = suppliers.filter((s) => s.company_name.toLowerCase().includes(search.toLowerCase()));

  function startEdit(supplier: Supplier) {
    setEditingId(supplier.id);
    setDraft(toSupplierInput(supplier));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(id: string) {
    if (!draft) return;
    if (!draft.company_name.trim()) {
      notify("error", "Company name is required.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateSupplier(id, draft);
      setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)));
      notify("success", "Supplier updated.");
      cancelEdit();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Could not update supplier.");
    } finally {
      setSaving(false);
    }
  }

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
          {filtered.map((s) => {
            const isEditing = editingId === s.id;
            return (
              <div key={s.id} className="card p-4">
                {isEditing && draft ? (
                  <div className="space-y-2">
                    {editableFields.map(({ key, label }) => (
                      <input
                        key={key}
                        className="input text-xs"
                        placeholder={label}
                        value={draft[key] ?? ""}
                        onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                      />
                    ))}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(s.id)}
                        disabled={saving}
                        className="btn-primary flex-1 text-xs"
                      >
                        <Check size={13} /> Save
                      </button>
                      <button onClick={cancelEdit} className="btn-secondary flex-1 text-xs">
                        <X size={13} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-ink dark:text-paper">{s.company_name}</p>
                        <p className="text-xs text-ink/50 dark:text-paper/50">
                          {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                        </p>
                      </div>
                      {role === "admin" && (
                        <button
                          onClick={() => startEdit(s)}
                          className="btn-ghost !px-2 shrink-0"
                          aria-label={`Edit ${s.company_name}`}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
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
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}