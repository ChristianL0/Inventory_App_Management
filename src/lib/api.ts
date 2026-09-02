import { supabase } from "@/lib/supabase";
import { compressProductImage } from "@/lib/imageCompression";

import type {
  Category,
  DashboardStats,
  Product,
  ProductImage,
  ProductWithSuppliers,
  Supplier,
} from "@/types";

const PRODUCT_WITH_SUPPLIERS_SELECT = `
  *,
  product_suppliers (
    id,
    supplier_id,
    supplier_part_number,
    price_quoted,
    currency,
    moq,
    lead_time_days,
    notes,
    created_at,
    supplier:suppliers ( * )
  ),
  product_images (
    id,
    product_id,
    storage_path,
    public_url,
    file_name,
    sort_order,
    created_at
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


/* ============================================================
   PRODUCTS
   ============================================================ */

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
    query = query.eq("category_id", filters.category);
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
      `product_name.ilike.%${term}%,sample_id.ilike.%${term}%,architect_name.ilike.%${term}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  let rows = (data ?? []) as unknown as ProductWithSuppliers[];

  if (filters.supplierId) {
    rows = rows.filter((product) =>
      product.product_suppliers?.some(
        (productSupplier) =>
          productSupplier.supplier_id === filters.supplierId
      )
    );
  }

  if (filters.search) {
    const term = filters.search.trim().toLowerCase();

    const alreadyMatched = new Set(
      rows.map((row) => row.id)
    );

    const { data: bySupplier } = await supabase
      .from("products")
      .select(PRODUCT_WITH_SUPPLIERS_SELECT)
      .order("created_at", { ascending: false });

    (
      bySupplier as unknown as ProductWithSuppliers[] | null
    )?.forEach((product) => {
      const matches = product.product_suppliers?.some(
        (productSupplier) =>
          productSupplier.supplier?.company_name
            ?.toLowerCase()
            .includes(term)
      );

      if (matches && !alreadyMatched.has(product.id)) {
        rows.push(product);
      }
    });
  }

  return {
    data: rows,
    count: count ?? rows.length,
  };
}

export async function fetchProductBySampleId(
  sampleId: string
): Promise<ProductWithSuppliers | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_SUPPLIERS_SELECT)
    .eq("sample_id", sampleId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as ProductWithSuppliers | null;
}

export async function fetchProductById(
  id: string
): Promise<ProductWithSuppliers | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_SUPPLIERS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as unknown as ProductWithSuppliers | null;
}


/* ============================================================
   PRODUCT INPUT
   ============================================================ */

export interface ProductInput {
  product_name: string;

  // Keep this because the existing application/database uses it.
  category: string;

  // Normalized category.
  category_id?: string | null;

  architect_name: string;

  description: string;
}


/* ============================================================
   SUPPLIER LINKS
   ============================================================ */

export interface SupplierLinkInput {
  supplier_id: string;
  supplier_part_number?: string;
  price_quoted?: number | null;
  currency?: string;
  moq?: number | null;
  lead_time_days?: number | null;
  notes?: string;
}


/* ============================================================
   CREATE PRODUCT
   ============================================================ */

export async function createProduct(
  input: ProductInput,
  supplierLinks: SupplierLinkInput[]
): Promise<Product> {
  const { data: product, error } = await supabase
    .from("products")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (supplierLinks.length > 0) {
    const rows = supplierLinks.map((link) => ({
      ...link,
      product_id: product.id,
    }));

    const { error: linkError } = await supabase
      .from("product_suppliers")
      .insert(rows);

    if (linkError) {
      throw linkError;
    }
  }

  return product as Product;
}


/* ============================================================
   UPDATE SUPPLIER
   ============================================================ */

export async function updateSupplier(
  id: string,
  input: SupplierInput
): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Supplier;
}


/* ============================================================
   UPDATE PRODUCT
   ============================================================ */

export async function updateProduct(
  id: string,
  input: ProductInput,
  supplierLinks: SupplierLinkInput[]
): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update(input)
    .eq("id", id);

  if (error) {
    throw error;
  }

  const { error: deleteError } = await supabase
    .from("product_suppliers")
    .delete()
    .eq("product_id", id);

  if (deleteError) {
    throw deleteError;
  }

  if (supplierLinks.length > 0) {
    const rows = supplierLinks.map((link) => ({
      ...link,
      product_id: id,
    }));

    const { error: insertError } = await supabase
      .from("product_suppliers")
      .insert(rows);

    if (insertError) {
      throw insertError;
    }
  }
}


/* ============================================================
   DELETE PRODUCT
   ============================================================ */

export async function deleteProduct(
  id: string
): Promise<void> {
  // Remove product images from Storage first.
  const { data: images, error: imageError } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id);

  if (imageError) {
    throw imageError;
  }

  const imagePaths = (images ?? [])
    .map((image) => image.storage_path)
    .filter(Boolean);

  if (imagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("product-images")
      .remove(imagePaths);

    if (storageError) {
      throw storageError;
    }
  }

  // Remove product documents from Storage.
  const { data: documents, error: documentError } =
    await supabase
      .from("product_documents")
      .select("storage_path")
      .eq("product_id", id);

  if (documentError) {
    throw documentError;
  }

  const documentPaths = (documents ?? [])
    .map((document) => document.storage_path)
    .filter(Boolean);

  if (documentPaths.length > 0) {
    const { error: documentStorageError } =
      await supabase.storage
        .from("product-documents")
        .remove(documentPaths);

    if (documentStorageError) {
      throw documentStorageError;
    }
  }

  // Delete the product itself.
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}


/* ============================================================
   SUPPLIERS
   ============================================================ */

export async function fetchAllSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("company_name");

  if (error) {
    throw error;
  }

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

export async function createSupplier(
  input: SupplierInput
): Promise<Supplier> {
  const { data, error } = await supabase
    .from("suppliers")
    .insert(input)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Supplier;
}


/* ============================================================
   CATEGORIES
   ============================================================ */

export async function fetchAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) {
    throw error;
  }

  return data as Category[];
}

export async function createCategory(input: {
  name: string;
  description?: string;
}): Promise<Category> {
  const name = input.name.trim();

  if (!name) {
    throw new Error("Category name is required.");
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name,
      description: input.description?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Category;
}

export async function deleteCategory(
  id: string
): Promise<void> {
  const { count, error: checkError } = await supabase
    .from("products")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("category_id", id);

  if (checkError) {
    throw checkError;
  }

  if ((count ?? 0) > 0) {
    throw new Error(
      `This category is currently used by ${count} product${
        count === 1 ? "" : "s"
      } and cannot be deleted.`
    );
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function fetchDistinctCategories(): Promise<
  string[]
> {
  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .eq("status", "active")
    .order("name");

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => row.name)
    .filter(Boolean);
}


/* ============================================================
   PRODUCT IMAGES
   ============================================================ */

export async function fetchProductImages(
  productId: string
): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return data as ProductImage[];
}


/* ============================================================
   UPLOAD PRODUCT IMAGE
   ============================================================ */

export async function uploadProductImage(
  productId: string,
  file: File,
  sortOrder = 0
): Promise<ProductImage> {
  // Compress the image before sending it to Supabase Storage.
  const compressedFile = await compressProductImage(file, {
    maxWidth: 2000,
    maxHeight: 2000,
    maxBytes: 3 * 1024 * 1024, // 3 MB
    quality: 0.82,
  });

  const safeName =
    file.name
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .slice(0, 80) || "image";

  const uniqueName =
    `${Date.now()}-${crypto.randomUUID()}-${safeName}.jpg`;

  const storagePath =
    `${productId}/${uniqueName}`;

  const { error: uploadError } =
    await supabase.storage
      .from("product-images")
      .upload(
        storagePath,
        compressedFile,
        {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        }
      );

  if (uploadError) {
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage
    .from("product-images")
    .getPublicUrl(storagePath);

  const { data, error } = await supabase
    .from("product_images")
    .insert({
      product_id: productId,
      storage_path: storagePath,
      public_url: publicUrl,
      // Keep the original filename visible to the user.
      file_name: file.name,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) {
    // If the database insert fails, remove the uploaded file.
    await supabase.storage
      .from("product-images")
      .remove([storagePath]);

    throw error;
  }

  return data as ProductImage;
}


/* ============================================================
   DELETE PRODUCT IMAGE
   ============================================================ */

export async function deleteProductImage(
  image: ProductImage
): Promise<void> {
  const { error: storageError } =
    await supabase.storage
      .from("product-images")
      .remove([image.storage_path]);

  if (storageError) {
    throw storageError;
  }

  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", image.id);

  if (error) {
    throw error;
  }
}


/* ============================================================
   UPDATE PRODUCT IMAGE ORDER
   ============================================================ */

export async function updateProductImageOrder(
  imageId: string,
  sortOrder: number
): Promise<void> {
  const { error } = await supabase
    .from("product_images")
    .update({
      sort_order: sortOrder,
    })
    .eq("id", imageId);

  if (error) {
    throw error;
  }
}


/* ============================================================
   DASHBOARD
   ============================================================ */

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [
    { count: totalProducts },
    { count: suppliersCount },
    { count: qrGeneratedCount },
    categories,
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("suppliers")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("products")
      .select("*", {
        count: "exact",
        head: true,
      })
      .not("qr_image_url", "is", null),

    fetchDistinctCategories(),
  ]);

  return {
    totalProducts: totalProducts ?? 0,
    categoriesCount: categories.length,
    suppliersCount: suppliersCount ?? 0,
    qrGeneratedCount: qrGeneratedCount ?? 0,
  };
}

export async function fetchRecentProducts(
  limit = 5
): Promise<ProductWithSuppliers[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_WITH_SUPPLIERS_SELECT)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);

  if (error) {
    throw error;
  }

  return data as unknown as ProductWithSuppliers[];
}


/* ============================================================
   QR
   ============================================================ */

export async function generateQrForProduct(
  productId: string
): Promise<{ qr_image_url: string }> {
  const { data, error } =
    await supabase.functions.invoke(
      "generate-qr",
      {
        body: {
          product_id: productId,
        },
      }
    );

  if (error) {
    throw error;
  }

  return data as {
    qr_image_url: string;
  };
}


/* ============================================================
   PRODUCT DOCUMENTS
   ============================================================ */

export interface ProductDocument {
  id: string;
  product_id: string;
  file_name: string;
  storage_path: string;
  uploaded_at: string;
}

export interface ProductDocumentWithUrl
  extends ProductDocument {
  signedUrl: string;
}


/* ============================================================
   FETCH PRODUCT DOCUMENTS
   ============================================================ */

export async function fetchProductDocuments(
  productId: string
): Promise<ProductDocumentWithUrl[]> {
  const { data, error } = await supabase
    .from("product_documents")
    .select("*")
    .eq("product_id", productId)
    .order("uploaded_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return Promise.all(
    (data as ProductDocument[]).map(async (doc) => {
      const {
        data: signed,
        error: signError,
      } = await supabase.storage
        .from("product-documents")
        .createSignedUrl(
          doc.storage_path,
          600
        );

      if (signError) {
        throw signError;
      }

      return {
        ...doc,
        signedUrl: signed.signedUrl,
      };
    })
  );
}


/* ============================================================
   UPLOAD PRODUCT DOCUMENT
   ============================================================ */

export async function uploadProductDocument(
  productId: string,
  file: File
): Promise<ProductDocument> {
  // Maximum document size:
  // 5 MiB = 5 * 1024 * 1024 bytes.
  const MAX_DOCUMENT_SIZE =
    5 * 1024 * 1024;

  // IMPORTANT:
  // Check the size BEFORE sending anything to Supabase.
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(
      `File "${file.name}" is too large. Maximum allowed size is 5 MB.`
    );
  }

  const safeName =
    file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(0, 100) || "document";

  const storagePath =
    `${productId}/${crypto.randomUUID()}-${safeName}`;

  const {
    error: uploadError,
  } = await supabase.storage
    .from("product-documents")
    .upload(
      storagePath,
      file,
      {
        cacheControl: "3600",
        upsert: false,
        contentType:
          file.type ||
          "application/octet-stream",
      }
    );

  if (uploadError) {
    throw uploadError;
  }

  const { data, error } =
    await supabase
      .from("product_documents")
      .insert({
        product_id: productId,
        file_name: file.name,
        storage_path: storagePath,
      })
      .select()
      .single();

  if (error) {
    // Remove the uploaded file if the
    // database insert fails.
    await supabase.storage
      .from("product-documents")
      .remove([storagePath]);

    throw error;
  }

  return data as ProductDocument;
}


/* ============================================================
   DELETE PRODUCT DOCUMENT
   ============================================================ */

export async function deleteProductDocument(
  doc: ProductDocument
): Promise<void> {
  const {
    error: storageError,
  } = await supabase.storage
    .from("product-documents")
    .remove([doc.storage_path]);

  if (storageError) {
    throw storageError;
  }

  const { error } = await supabase
    .from("product_documents")
    .delete()
    .eq("id", doc.id);

  if (error) {
    throw error;
  }
}


/* ============================================================
   UNLOCK PRODUCT DETAILS
   ============================================================ */

export async function unlockProductDetails(
  sampleId: string,
  password: string
) {
  const { data, error } =
    await supabase.functions.invoke(
      "smooth-worker",
      {
        body: {
          sample_id: sampleId,
          password,
        },
      }
    );

  if (error) {
    throw error;
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}