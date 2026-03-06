// Reviews API using Supabase as a free database
// GET  /api/reviews/:shopId  -> returns reviews for a shop
// POST /api/reviews          -> creates a new review

export default async (req) => {
  const url = new URL(req.url);
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ message: "Database not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = {
    "Content-Type": "application/json",
    "apikey": supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Prefer": "return=representation",
  };

  // GET /api/reviews/:shopId
  if (req.method === "GET") {
    const shopId = url.pathname.split("/api/reviews/")[1];
    if (!shopId) {
      return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
    }
    const res = await fetch(
      `${supabaseUrl}/rest/v1/reviews?shop_id=eq.${encodeURIComponent(shopId)}&order=created_at.desc`,
      { headers }
    );
    const data = await res.json();
    // Map snake_case from DB to camelCase for frontend
    const reviews = (Array.isArray(data) ? data : []).map((r) => ({
      id: r.id,
      shopId: r.shop_id,
      userName: r.user_name,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    }));
    return new Response(JSON.stringify(reviews), { headers: { "Content-Type": "application/json" } });
  }

  // POST /api/reviews
  if (req.method === "POST") {
    const body = await req.json();
    const { shopId, userName, rating, comment } = body;

    if (!shopId || !userName || !rating || !comment) {
      return new Response(JSON.stringify({ message: "Missing fields" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    if (rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ message: "Rating must be 1-5" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/reviews`, {
      method: "POST",
      headers,
      body: JSON.stringify({ shop_id: shopId, user_name: userName, rating, comment }),
    });
    const data = await res.json();
    const review = Array.isArray(data) ? data[0] : data;
    return new Response(JSON.stringify({
      id: review.id,
      shopId: review.shop_id,
      userName: review.user_name,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
    }), { status: 201, headers: { "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ message: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
};

export const config = { path: "/api/reviews/*" };
