import { getPlaceData } from "./_places-cache.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const address = url.searchParams.get("address");
  if (!name || !address)
    return new Response(JSON.stringify({ message: "Missing params" }), { status: 400 });

  const data = await getPlaceData(name, address);
  if (!data) return new Response(JSON.stringify(null), { status: 200, headers: { "Content-Type": "application/json" } });

  const photoUrls = (data.photo_urls ?? []).map((_, i) =>
    `/api/places/photo?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}&index=${i}`
  );

  return new Response(
    JSON.stringify({
      rating: data.rating ?? null,
      reviewCount: data.review_count ?? null,
      openNow: data.open_now ?? null,
      weekdayDescriptions: data.weekday_descriptions ?? [],
      photoUrls,
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } }
  );
};

export const config = { path: "/api/places/details" };
