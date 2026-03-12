const CACHE_TTL_HOURS = 24;

async function getCached(shopKey) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/places_cache?shop_key=eq.${encodeURIComponent(shopKey)}&select=*`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    const row = rows[0];
    const ageHours = (Date.now() - new Date(row.cached_at).getTime()) / 3600000;
    if (ageHours > CACHE_TTL_HOURS) return null;
    return row;
  } catch { return null; }
}

async function setCache(shopKey, data) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/places_cache`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ shop_key: shopKey, ...data, cached_at: new Date().toISOString() }),
    });
  } catch {}
}

async function fetchFromGoogle(shopName, shopAddress) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.photos,places.rating,places.userRatingCount,places.currentOpeningHours,places.regularOpeningHours",
      },
      body: JSON.stringify({ textQuery: `${shopName} ${shopAddress}` }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;
    const photoUrls = (place.photos ?? []).slice(0, 8).map(
      (p) => `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=800&maxHeightPx=600&key=${apiKey}`
    );
    const hours = place.currentOpeningHours ?? place.regularOpeningHours ?? null;
    return {
      rating: place.rating ?? null,
      review_count: place.userRatingCount ?? null,
      photo_urls: photoUrls,
      open_now: hours?.openNow ?? null,
      weekday_descriptions: hours?.weekdayDescriptions ?? [],
    };
  } catch { return null; }
}

async function getPlaceData(shopName, shopAddress) {
  const shopKey = `${shopName}|${shopAddress}`;
  const cached = await getCached(shopKey);
  if (cached) return cached;
  const fresh = await fetchFromGoogle(shopName, shopAddress);
  if (fresh) await setCache(shopKey, fresh);
  return fresh;
}

export default async (req) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const address = url.searchParams.get("address");
  const index = parseInt(url.searchParams.get("index") ?? "0", 10);
  if (!name || !address)
    return new Response(JSON.stringify({ message: "Missing params" }), { status: 400 });
  const data = await getPlaceData(name, address);
  const photoUrl = data?.photo_urls?.[index] ?? data?.photo_urls?.[0];
  if (!photoUrl)
    return new Response(JSON.stringify({ message: "No photo found" }), { status: 404 });
  try {
    const photoRes = await fetch(photoUrl);
    if (!photoRes.ok)
      return new Response(JSON.stringify({ message: "Failed to fetch photo" }), { status: 502 });
    const contentType = photoRes.headers.get("content-type") || "image/jpeg";
    const buffer = await photoRes.arrayBuffer();
    return new Response(buffer, {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
    });
  } catch {
    return new Response(JSON.stringify({ message: "Photo proxy error" }), { status: 502 });
  }
};

export const config = { path: "/api/places/photo" };
