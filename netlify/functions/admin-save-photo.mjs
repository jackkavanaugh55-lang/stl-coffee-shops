export default async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  const { password, shopId, shopName, photoUrl, index } = await req.json();

  // Check password
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || password !== adminPassword)
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey)
    return new Response(JSON.stringify({ error: "Storage not configured" }), { status: 500 });

  try {
    // Download the photo
    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok)
      return new Response(JSON.stringify({ error: "Failed to fetch photo" }), { status: 502 });

    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const filename = `${shopId}-${index}.jpg`;

    // Upload to Supabase Storage
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/photos/${filename}`, {
      method: "POST",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return new Response(JSON.stringify({ error: `Upload failed: ${err}` }), { status: 500 });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/photos/${filename}`;

    // Update places_cache to use this permanent URL
    const cacheRes = await fetch(
      `${supabaseUrl}/rest/v1/places_cache?shop_key=like.*${encodeURIComponent(shopName)}*&select=shop_key,photo_urls`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const rows = await cacheRes.json();
    if (rows.length > 0) {
      const row = rows[0];
      const photoUrls = row.photo_urls ?? [];
      photoUrls[index] = publicUrl;
      await fetch(`${supabaseUrl}/rest/v1/places_cache?shop_key=eq.${encodeURIComponent(row.shop_key)}`, {
        method: "PATCH",
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ photo_urls: photoUrls }),
      });
    }

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
};

export const config = { path: "/api/admin/save-photo" };
