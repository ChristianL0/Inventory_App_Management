import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Package } from "lucide-react";
import { fetchAllSuppliers, fetchDistinctCategories, fetchProducts } from "@/lib/api";
import type { ProductWithSuppliers, Supplier } from "@/types";
import { ProductRow } from "@/components/ProductRow";
import { SearchFilterBar } from "@/components/SearchFilterBar";
import { Pagination } from "@/components/Pagination";
import { PageSpinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

const PAGE_SIZE = 12;

export function ProductList() {
  const [products, setProducts] = useState<ProductWithSuppliers[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [page, setPage] = useState(1);

  const { role } = useAuth();
  const { notify } = useToast();

  useEffect(() => {
    fetchDistinctCategories().then(setCategories).catch(() => {});
    fetchAllSuppliers().then(setSuppliers).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, category, supplierId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const debounce = setTimeout(async () => {
      try {
        const result = await fetchProducts({ search, category, supplierId }, page, PAGE_SIZE);
        if (!active) return;
        setProducts(result.data);
        setTotal(result.count);
      } catch (err) {
        notify("error", err instanceof Error ? err.message : "Could not load products.");
      } finally {
        if (active) setLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(debounce);
    };
  }, [search, category, supplierId, page]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-paper">Products</h1>
          <p className="text-sm text-ink/55 dark:text-paper/55">{total} sample{total === 1 ? "" : "s"} in inventory</p>
        </div>
        {role === "admin" && (
          <Link to="/products/new" className="btn-primary">
            <Plus size={16} /> Add product
          </Link>
        )}
      </div>

      <SearchFilterBar
        search={search}
        onSearchChange={setSearch}
        category={category}
        onCategoryChange={setCategory}
        categories={categories}
        supplierId={supplierId}
        onSupplierChange={setSupplierId}
        suppliers={suppliers}
      />

      {loading ? (
        <PageSpinner />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package size={32} />}
          title="No products found"
          description="Try adjusting your search or filters, or add a new product."
        />
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <ProductRow key={p.id} product={p} />
          ))}
        </div>
      )}

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
    </div>
  );
}
