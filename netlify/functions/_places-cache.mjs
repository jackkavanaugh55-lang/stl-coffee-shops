const CACHE_TTL_HOURS = 24;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

export async function getCached(shopKey) {
  const sb = getSupabaseConfig();
  if (!sb) return null;
  try {
    const res = await fetch(
      `${sb.url}/rest/v1/places_cache?shop_key=eq.${encodeURIComponent(shopKey)}&select=*`,
      { headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` } }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    const row = rows[0];
    const ageHours = (Date.now() - new Date(row.cached_at).getTime()) / 3600000;
    if (ageHours > CACHE_TTL_HOURS) return null;
    return row;
  } catch (e) {
    console.error("getCached error:", e);
    return null;
  }
}

export async function setCache(shopKey, data) {
  const sb = getSupabaseConfig();
  if (!sb) return;
  try {
    const res = await fetch(`${sb.url}/rest/v1/places_cache`, {
      method: "POST",
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({ shop_key: shopKey, ...data, cached_at: new Date().toISOString() }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error("setCache error:", err);
    }
  } catch (e) {
    console.error("setCache exception:", e);
  }
}

export async function fetchFromGoogle(shopName, shopAddress) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) { console.error("No GOOGLE_PLACES_API_KEY"); return null; }
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
    if (!res.ok) {
      console.error("Google API error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) { console.error("No place found for:", shopName); return null; }

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
  } catch (e) {
    console.error("fetchFromGoogle exception:", e);
    return null;
  }
}

export async function getPlaceData(shopName, shopAddress) {
  const shopKey = `${shopName}|${shopAddress}`;
  const cached = await getCached(shopKey);
  if (cached) return cached;
  const fresh = await fetchFromGoogle(shopName, shopAddress);
  if (fresh) await setCache(shopKey, fresh);
  return fresh;
}
