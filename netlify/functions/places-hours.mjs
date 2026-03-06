const CACHE_TTL = 60 * 60 * 1000; // 1 hour cache for hours (more dynamic than ratings)
const hoursCache = new Map();

async function fetchPlaceHours(shopName, shopAddress) {
  const cacheKey = `${shopName}|${shopAddress}`;
  const cached = hoursCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.currentOpeningHours,places.regularOpeningHours",
      },
      body: JSON.stringify({ textQuery: `${shopName} ${shopAddress}` }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    const hours = place.currentOpeningHours ?? place.regularOpeningHours ?? null;
    const result = {
      openNow: hours?.openNow ?? null,
      weekdayDescriptions: hours?.weekdayDescriptions ?? [],
      expiresAt: Date.now() + CACHE_TTL,
    };
    hoursCache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

export default async (req) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const address = url.searchParams.get("address");
  if (!name || !address) return new Response(JSON.stringify({ message: "Missing params" }), { status: 400 });

  const hours = await fetchPlaceHours(name, address);
  return new Response(
    JSON.stringify({
      openNow: hours?.openNow ?? null,
      weekdayDescriptions: hours?.weekdayDescriptions ?? [],
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } }
  );
};

export const config = { path: "/api/places/hours" };
