# Sample Tracker — Inventory & QR Management

React + TypeScript + Tailwind CSS frontend, backed by Supabase (Postgres, Auth, Storage,
Edge Functions). Open this folder directly in VS Code.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `supabase/schema.sql` — this creates the `products`,
   `suppliers`, and `product_suppliers` tables, RLS policies, the sample-ID generator,
   and the `qr-codes` storage bucket.
3. Create an admin user (Authentication → Users → Add user), then edit that user and
   set **App metadata** to:
   ```json
   { "role": "admin" }
   ```
   Any user without this claim can view but not create/edit/delete (per the RLS policies).
4. Deploy the QR-generation Edge Function:
   ```bash
   supabase functions deploy generate-qr
   supabase secrets set PUBLIC_APP_URL=https://your-deployed-domain.com
   ```
   (For local testing, `PUBLIC_APP_URL` can stay as `http://localhost:5173` — QR codes
   will just point at your local dev server.)

## 2. Set up the frontend

```bash
npm install
cp .env.example .env
# edit .env with your Supabase project URL + anon key
npm run dev
```

Open http://localhost:5173 — sign in with the admin account you created above.

## 3. Project structure

```
src/
  components/     Shared UI (Navbar, ProductRow, SupplierPicker, QRCodeCard, etc.)
  contexts/       Auth, Theme (dark mode), Toast notifications
  lib/
    supabase.ts   Supabase client
    api.ts        All database queries — the only place that talks to Supabase directly
  pages/          One file per route (see App.tsx for the route map)
  types/          Shared TypeScript interfaces matching the database schema
supabase/
  schema.sql              Full DB migration — run this first
  functions/generate-qr/  Edge Function: generates + links a QR code to a product
```

## 4. How the QR flow works

1. Admin creates a product → a `sample_id` (e.g. `INV-2026-000001`) is generated
   server-side by Postgres.
2. The frontend immediately calls the `generate-qr` Edge Function with the new
   product's ID.
3. The function builds a target URL (`{PUBLIC_APP_URL}/product/{sample_id}`), generates
   a QR PNG, uploads it to the `qr-codes` Storage bucket, and writes `qr_image_url` /
   `qr_target_url` / `qr_generated_at` back onto the product row.
4. The QR image is displayed immediately in the UI (no page reload).
5. Scanning the printed QR code opens `/product/:sampleId` — a public route requiring
   no login, showing the product's name, category, description, and linked suppliers.

"Regenerate QR code" (on the product detail page) calls the same Edge Function again.

## 5. Known simplifications worth knowing about

- **Supplier-name search** is done client-side after the main filtered query (see the
  comment in `src/lib/api.ts`), because PostgREST's `.or()` can't reach through the
  `product_suppliers → suppliers` join in one query. Fine at moderate scale; for a very
  large catalog, replace with a Postgres RPC/view that does the join server-side.
- **Editing a product's suppliers** replaces the full set of links rather than diffing
  individual rows — simplest correct approach for a handful of suppliers per product.
- **Roles** are read from `app_metadata.role` on the JWT — set this manually per user for
  now; wire up an admin-invite flow later if you need self-service account creation.

## 6. Suggested next steps (not built yet, schema supports them)

- Inventory quantities / warehouse-location hierarchy
- Barcode support alongside QR
- Stock movement history
- Supplier performance dashboards (the `product_suppliers` junction table already
  carries per-quote price/MOQ/lead-time data to build this from)
