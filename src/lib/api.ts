import { supabase } from "@/lib/supabase";
import type { DashboardStats, Product, ProductWithSuppliers, Supplier } from "@/types";

const PRODUCT_WITH_SUPPLIERS_SELECT = `
  *,
  product_suppliers (
    id, supplier_id, supplier_part_number, price_quoted, currency, moq, lead_time_days, notes, created_at,
    supplier:suppliers ( * )
  )
`;

export interface ProductFilters {
  search?: string;
  category?: string;
  supplierId?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface PagedResult<T> {
  data: T[];
  count: number;
}

/**
 * Fetches products with pagination, search, and filters.
 * Search matches product_name, sample_id, european_reference, and — via the
 * linked product_suppliers/suppliers join — supplier company name.
 */
export async function fetchProducts(
  filters: ProductFilters,
  page: number,
  pageSize: number
): Promise<PagedResult<ProductWithSuppliers>> {
  let query = supabase
    .from("products")
    .select(PRODUCT_WITH_SUPPLIERS_SELECT, { count: "exact" })
    .order("created_at", { ascending: false });

  if (filters.category) {
    query = query.eq("category", filters.category);
  }
  if (filters.createdFrom) {
    query = query.gte("created_at", filters.createdFrom);
  }
  if (filters.createdTo) {
    query = query.lte("created_at", filters.createdTo);
  }
  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(
      `product_name.ilike.%${term}%,sample_id.ilike.%${term}%,european_reference.ilike.%${term}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  let rows = (data ?? []) as unknown as ProductWithSuppliers[];

  // Supplier-name search and supplier-id filter both require checking the joined
  // relation, which PostgREST's .or() can't reach through a nested relationship —
  // applied client-side here for correctness; for large catalogs this is better
  // moved into a Postgres RPC/view that does the join server-side.
  if (filters.supplierId) {
    rows = rows.filter((p) =>
      p.product_suppliers?.some((ps) => ps.supplier_id === filters.supplierId)
    );
  }
  if (filters.search) {
    const term = filters.search.trim().toLowerCase();
    const alreadyMatched = new Set(rows.map((r) => r.id));
    const { data: bySupplier } = await supabase
      .from("products")
      .select(PRODUCT_WITH_SUPPLIERS_SELECT)
      .order("created_at", { ascending: false });
    (bySupplier as unknown as ProductWithSuppliers[] | null)?.forEach((p) => {
      const matches = p.product_suppliers?.some((ps) =>
        ps.supplier?.company_name?.toLowerCase().includes(term)
      );
      if (matches && !alreadyMatched.has(p.id)) {
        rows.push(p);
      }
    });
  }

  return { data: rows, count: count ?? rows.length };
}

export async function fetchProductBySampleId(sampleId: string): Promise<ProductWithSuppliers | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_SUPPLIERS_SELECT)
    .eq("sample_id", sampleId)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ProductWithSuppliers | null;
}

export async function fetchProductById(id: string): Promise<ProductWithSuppliers | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_SUPPLIERS_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as ProductWithSuppliers | null;
}

export interface ProductInput {
  product_name: string;
  category: string;
  european_reference: string;
  description: string;
}

export interface SupplierLinkInput {
  supplier_id: string;
  supplier_part_number?: string;
  price_quoted?: number | null;
  currency?: string;
  moq?: number | null;
  lead_time_days?: number | null;
  notes?: string;
}

export async function createProduct(
  input: ProductInput,
  supplierLinks: SupplierLinkInput[]
): Promise<Product> {
  const { data: product, error } = await supabase
    .from("products")
    .insert(input)
    .select()
    .single();
  if (error) throw error;

  if (supplierLinks.length > 0) {
    const rows = supplierLinks.map((link) => ({ ...link, product_id: product.id }));
    const { error: linkError } = await supabase.from("product_suppliers").insert(rows);
    if (linkError) throw linkError;
  }

  return product as Product;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  supplierLinks: SupplierLinkInput[]
): Promise<void> {
  const { error } = await supabase.from("products").update(input).eq("id", id);
  if (error) throw error;

  // Simplest correct approach for a moderate number of links per product:
  // replace the full set rather than diffing. Fine at this scale; revisit
  // with an upsert-by-key diff if link counts grow very large.
  const { error: deleteError } = await supabase.from("product_suppliers").delete().eq("product_id", id);
  if (deleteError) throw deleteError;

  if (supplierLinks.length > 0) {
    const rows = supplierLinks.map((link) => ({ ...link, product_id: id }));
    const { error: insertError } = await supabase.from("product_suppliers").insert(rows);
    if (insertError) throw insertError;
  }
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchAllSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase.from("suppliers").select("*").order("company_name");
  if (error) throw error;
  return data as Supplier[];
}

export interface SupplierInput {
  company_name: string;
  country?: string;
  city?: string;
  website?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  category?: string;
}

export async function createSupplier(input: SupplierInput): Promise<Supplier> {
  const { data, error } = await supabase.from("suppliers").insert(input).select().single();
  if (error) throw error;
  return data as Supplier;
}

export async function fetchDistinctCategories(): Promise<string[]> {
  const { data, error } = await supabase.from("products").select("category").not("category", "is", null);
  if (error) throw error;
  const set = new Set((data ?? []).map((r) => r.category as string).filter(Boolean));
  return Array.from(set).sort();
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [{ count: totalProducts }, { count: suppliersCount }, { count: qrGeneratedCount }, categories] =
    await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("suppliers").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }).not("qr_image_url", "is", null),
      fetchDistinctCategories(),
    ]);

  return {
    totalProducts: totalProducts ?? 0,
    categoriesCount: categories.length,
    suppliersCount: suppliersCount ?? 0,
    qrGeneratedCount: qrGeneratedCount ?? 0,
  };
}

export async function fetchRecentProducts(limit = 5): Promise<ProductWithSuppliers[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_SUPPLIERS_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as unknown as ProductWithSuppliers[];
}

/** Calls the generate-qr Edge Function for a given product. */
export async function generateQrForProduct(productId: string): Promise<{ qr_image_url: string }> {
  const { data, error } = await supabase.functions.invoke("generate-qr", {
    body: { product_id: productId },
  });
  if (error) throw error;
  return data as { qr_image_url: string };
}
