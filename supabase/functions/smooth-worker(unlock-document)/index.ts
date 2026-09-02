import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle browser CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { sample_id, password } = await req.json();

    const unlockPassword = Deno.env.get("QR_UNLOCK_PASSWORD");

    if (!unlockPassword) {
      throw new Error("QR_UNLOCK_PASSWORD is not configured");
    }

    if (password !== unlockPassword) {
      return new Response(
        JSON.stringify({
          error: "Incorrect password",
        }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!sample_id) {
      return new Response(
        JSON.stringify({
          error: "sample_id is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // New Supabase secret-key model
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const secretKey = Deno.env.get("SECRET_KEY");

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL is not configured");
    }

    if (!secretKey) {
      throw new Error("SECRET_KEY is not configured");
    }

    const supabase = createClient(
      supabaseUrl,
      secretKey
    );

    // Get supplier information
    const { data: product, error: productError } =
      await supabase
        .from("products")
        .select(`
          id,
          product_suppliers (
            id,
            supplier_part_number,
            price_quoted,
            currency,
            moq,
            lead_time_days,
            notes,
            supplier:suppliers (
              company_name,
              country,
              contact_person,
              email,
              phone
            )
          )
        `)
        .eq("sample_id", sample_id)
        .single();

    if (productError) {
      console.error("Product query error:", productError);

      return new Response(
        JSON.stringify({
          error: productError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (!product) {
      return new Response(
        JSON.stringify({
          error: "Product not found",
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Get documents
    const { data: docs, error: docsError } =
      await supabase
        .from("product_documents")
        .select(`
          id,
          file_name,
          storage_path,
          uploaded_at
        `)
        .eq("product_id", product.id)
        .order("uploaded_at", {
          ascending: false,
        });

    if (docsError) {
      console.error("Documents query error:", docsError);

      return new Response(
        JSON.stringify({
          error: docsError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Generate temporary signed URLs
    const documents = await Promise.all(
      (docs ?? []).map(async (doc) => {
        const { data: signed, error: signError } =
          await supabase.storage
            .from("product-documents")
            .createSignedUrl(
              doc.storage_path,
              600
            );

        if (signError) {
          throw signError;
        }

        return {
          id: doc.id,
          file_name: doc.file_name,
          signed_url: signed.signedUrl,
          uploaded_at: doc.uploaded_at,
        };
      })
    );

    return new Response(
      JSON.stringify({
        product_suppliers:
          product.product_suppliers ?? [],
        documents,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    console.error("smooth-worker error:", err);

    return new Response(
      JSON.stringify({
        error:
          err instanceof Error
            ? err.message
            : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});