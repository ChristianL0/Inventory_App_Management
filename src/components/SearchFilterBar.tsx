import { Search } from "lucide-react";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  categories: string[];
  supplierId: string;
  onSupplierChange: (v: string) => void;
  suppliers: { id: string; company_name: string }[];
}

export function SearchFilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories,
  supplierId,
  onSupplierChange,
  suppliers,
}: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-paper/35" />
        <input
          className="input pl-9"
          placeholder="Search by product name, sample ID, EU reference, or supplier…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <select className="input sm:w-44" value={category} onChange={(e) => onCategoryChange(e.target.value)}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select className="input sm:w-48" value={supplierId} onChange={(e) => onSupplierChange(e.target.value)}>
        <option value="">All suppliers</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.company_name}
          </option>
        ))}
      </select>
    </div>
  );
}
