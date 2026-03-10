import { getPlaceData } from "./places-cache.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const name = url.searchParams.get("name");
  const address = url.searchParams.get("address");
  if (!name || !address)
    return new Response(JSON.stringify({ message: "Missing params" }), { status: 400 });

  const data = await getPlaceData(name, address);
  return new Response(
    JSON.stringify({
      openNow: data?.open_now ?? null,
      weekdayDescriptions: data?.weekday_descriptions ?? [],
    }),
    { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" } }
  );
};

export const config = { path: "/api/places/hours" };
