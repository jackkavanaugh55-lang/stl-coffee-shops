import { getPlaceData } from "./places-cache.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const address = url.searchParams.get("address");
  if (!name || !address)
    return new Response(JSON.stringify({ message: "Missing params" }), { status: 400 });

  const data = await getPlaceData(name, address);
  const photoUrls = (data?.photo_urls ?? []).map((_, i) =>
    `/api/places/photo?name=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}&index=${i}`
  );

  return new Response(JSON.stringify({ count: photoUrls.length, photoUrls }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
  });
};

export const config = { path: "/api/places/photos" };
