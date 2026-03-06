const CACHE_TTL = 24 * 60 * 60 * 1000;
const detailsCache = new Map();

async function fetchPlaceDetails(shopName, shopAddress) {
  const cacheKey = `${shopName}|${shopAddress}`;
  const cached = detailsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.photos,places.displayName,places.rating,places.userRatingCount",
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
    const details = { rating: place.rating ?? null, reviewCount: place.userRatingCount ?? null, photoUrls, expiresAt: Date.now() + CACHE_TTL };
    detailsCache.set(cacheKey, details);
    return details;
  } catch {
    return null;
  }
}

export default async (req) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const address = url.searchParams.get("address");
  if (!name || !address) return new Response(JSON.stringify({ message: "Missing params" }), { status: 400 });

  const details = await fetchPlaceDetails(name, address);
  return new Response(
    JSON.stringify({ rating: details?.rating ?? null, reviewCount: details?.reviewCount ?? null }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" } }
  );
};

export const config = { path: "/api/places/rating" };
