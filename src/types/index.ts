export type UserRole = "admin" | "user";

export interface Supplier {
  id: string;
  company_name: string;
  country: string | null;
  city: string | null;
  website: string | null;
  alibaba_profile: string | null;
  made_in_china_profile: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  status: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sample_id: string;
  product_name: string;
  category: string | null;
  european_reference: string | null;
  description: string | null;
  qr_image_url: string | null;
  qr_target_url: string | null;
  qr_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductSupplierLink {
  id: string;
  product_id: string;
  supplier_id: string;
  supplier_part_number: string | null;
  price_quoted: number | null;
  currency: string | null;
  moq: number | null;
  lead_time_days: number | null;
  notes: string | null;
  created_at: string;
  supplier?: Supplier;
}

export interface ProductWithSuppliers extends Product {
  product_suppliers: ProductSupplierLink[];
}

export interface DashboardStats {
  totalProducts: number;
  categoriesCount: number;
  suppliersCount: number;
  qrGeneratedCount: number;
}
