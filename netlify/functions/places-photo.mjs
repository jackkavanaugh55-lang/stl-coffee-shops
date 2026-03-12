import { getPlaceData } from "./_places-cache.mjs";

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
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=604800" },
    });
  } catch {
    return new Response(JSON.stringify({ message: "Photo proxy error" }), { status: 502 });
  }
};

export const config = { path: "/api/places/photo" };
