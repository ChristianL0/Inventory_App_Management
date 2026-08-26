// Supabase Edge Function: generate-qr
//
// Deploy:  supabase functions deploy generate-qr
// Invoke from the frontend via: supabase.functions.invoke("generate-qr", { body: { product_id } })
// Can also be wired to a Database Webhook on products INSERT for fully automatic generation.
//
// Uses the service_role key internally (set automatically by Supabase as
// SUPABASE_SERVICE_ROLE_KEY in the function's environment) — this bypasses RLS,
// which is expected: only this trusted server-side function writes QR data,
// end users never call Storage/the table directly with elevated rights.

import QRCode from "npm:qrcode@1.5.3";
import { createClient } from "npm:@supabase/supabase-js@2";

const PUBLIC_APP_URL = Deno.env.get("PUBLIC_APP_URL") ?? "https://inventory-app-management-two.vercel.app";

Deno.serve(async (req) => {
  try {
    const { product_id } = await req.json();
    if (!product_id) {
      return new Response(JSON.stringify({ error: "product_id is required" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: product, error: fetchError } = await supabase
      .from("products")
      .select("id, sample_id")
      .eq("id", product_id)
      .single();

    if (fetchError || !product) {
      return new Response(JSON.stringify({ error: "Product not found" }), { status: 404 });
    }

    const targetUrl = `${PUBLIC_APP_URL}/product/${product.sample_id}`;
    const pngBuffer = await QRCode.toBuffer(targetUrl, { type: "png", width: 600, margin: 2 });

    const storagePath = `${product.id}.png`;
    const { error: uploadError } = await supabase.storage
      .from("qr-codes")
      .upload(storagePath, pngBuffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({ error: uploadError.message }), { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("qr-codes").getPublicUrl(storagePath);

    const { error: updateError } = await supabase
      .from("products")
      .update({
        qr_image_url: publicUrl,
        qr_target_url: targetUrl,
        qr_generated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ qr_image_url: publicUrl, qr_target_url: targetUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
    });
  }
});
