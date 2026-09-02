// supabase/functions/smooth-worker/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

const UNLOCK_PASSWORD = Deno.env.get("QR_UNLOCK_PASSWORD");

Deno.serve(async (req) => {
  try {
    const { sample_id, password } = await req.json();

    if (!UNLOCK_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unlock password not configured" }), { status: 500 });
    }
    if (password !== UNLOCK_PASSWORD) {
      return new Response(JSON.stringify({ error: "Incorrect password" }), { status: 401 });
    }
    if (!sample_id) {
      return new Response(JSON.stringify({ error: "sample_id is required" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: product, error } = await supabase
      .from("products")
      .select(`
        id,
        product_suppliers (
          id, supplier_part_number, price_quoted, currency, moq, lead_time_days,
          supplier:suppliers ( company_name, country, contact_person, email, phone )
        )
      `)
      .eq("sample_id", sample_id)
      .single();

    if (error || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
    }

    // Documents live in a private bucket — this function runs as service
    // role, so it can sign URLs for them regardless of who's asking. That
    // trust is placed entirely in the password check above; nothing else
    // gates this.
    const { data: docs, error: docsError } = await supabase
      .from("product_documents")
      .select("id, file_name, storage_path, uploaded_at")
      .eq("product_id", product.id)
      .order("uploaded_at", { ascending: false });

    if (docsError) {
      return new Response(JSON.stringify({ error: docsError.message }), { status: 500 });
    }

    const documents = await Promise.all(
      (docs ?? []).map(async (doc) => {
        const { data: signed, error: signError } = await supabase.storage
          .from("product-documents")
          .createSignedUrl(doc.storage_path, 600); // 10-minute link
        if (signError) throw signError;
        return { id: doc.id, file_name: doc.file_name, signed_url: signed.signedUrl };
      })
    );

    return new Response(
      JSON.stringify({ product_suppliers: product.product_suppliers, documents }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500 }
    );
  }
});