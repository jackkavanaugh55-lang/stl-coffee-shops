import { getPlaceData } from "./places-cache.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const address = url.searchParams.get("address");
  if (!name || !address)
    return new Response(JSON.stringify({ message: "Missing params" }), { status: 400 });

  const data = await getPlaceData(name, address);
  return new Response(
    JSON.stringify({ rating: data?.rating ?? null, reviewCount: data?.review_count ?? null }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" } }
  );
};

export const config = { path: "/api/places/rating" };
