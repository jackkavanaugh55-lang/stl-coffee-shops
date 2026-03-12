const CACHE_TTL_HOURS = 24;

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function getCached(shopKey) {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const res = await fetch(
      `${sb.url}/rest/v1/places_cache?shop_key=eq.${encodeURIComponent(shopKey)}&select=*`,
      { headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    return rows[0]; // always return row — we check age separately
  } catch {
    return null;
  }
}

export async function setCache(shopKey, data) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await fetch(`${sb.url}/rest/v1/places_cache`, {
      method: "POST",
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ shop_key: shopKey, ...data, cached_at: new Date().toISOString() }),
    });
  } catch {
    // silently fail
  }
}

async function uploadPhotoToSupabase(sb, photoUrl, filename) {
  try {
    const imgRes = await fetch(photoUrl);
    if (!imgRes.ok) return null;
    const buffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") || "image/jpeg";
    const uploadRes = await fetch(`${sb.url}/storage/v1/object/photos/${filename}`, {
      method: "POST",
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: buffer,
    });
    if (!uploadRes.ok) return null;
    return `${sb.url}/storage/v1/object/public/photos/${filename}`;
  } catch {
    return null;
  }
}

export async function fetchFromGoogle(shopName, shopAddress, existingPhotoUrls) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const sb = getSupabase();
  if (!apiKey) return null;

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "places.photos,places.displayName,places.rating,places.userRatingCount,places.currentOpeningHours,places.regularOpeningHours",
      },
      body: JSON.stringify({ textQuery: `${shopName} ${shopAddress}` }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    const hours = place.currentOpeningHours ?? place.regularOpeningHours ?? null;

    // Reuse existing Supabase photos if already uploaded — never re-download
    let photoUrls = existingPhotoUrls ?? [];
    const alreadyStored = photoUrls.some(u => u.includes("supabase"));

    if (!alreadyStored && sb) {
      const googlePhotoUrls = (place.photos ?? []).slice(0, 8).map(
        (p) => `https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=800&maxHeightPx=600&key=${apiKey}`
      );
      const shopSlug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      const results = await Promise.all(
        googlePhotoUrls.map((url, i) => uploadPhotoToSupabase(sb, url, `${shopSlug}-${i}.jpg`))
      );
      const uploaded = results.filter(Boolean);
      photoUrls = uploaded.length > 0 ? uploaded : googlePhotoUrls;
    }

    return {
      rating: place.rating ?? null,
      review_count: place.userRatingCount ?? null,
      photo_urls: photoUrls,
      open_now: hours?.openNow ?? null,
      weekday_descriptions: hours?.weekdayDescriptions ?? [],
    };
  } catch {
    return null;
  }
}

export async function getPlaceData(shopName, shopAddress) {
  const shopKey = `${shopName}|${shopAddress}`;
  const cached = await getCached(shopKey);

  // Photos are permanent — check if we have them
  const existingPhotoUrls = cached?.photo_urls ?? null;

  // Check if rating/hours need refreshing (24hr TTL)
  const ageHours = cached
    ? (Date.now() - new Date(cached.cached_at).getTime()) / 3600000
    : Infinity;

  if (cached && ageHours < CACHE_TTL_HOURS) return cached;

  // Refresh rating/hours from Google but reuse existing photos
  const fresh = await fetchFromGoogle(shopName, shopAddress, existingPhotoUrls);
  if (fresh) await setCache(shopKey, fresh);
  return fresh ?? cached; // fall back to stale cache if Google fails
}
