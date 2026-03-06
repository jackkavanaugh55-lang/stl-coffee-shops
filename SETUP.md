# STL Coffee Spot — Free Hosting Setup Guide

## What This Is
Your full coffee shop site, rebuilt to run 100% free using:
- **Netlify** (free hosting + serverless functions — replaces Replit server)
- **Supabase** (free PostgreSQL — replaces Replit database, for reviews)
- **Your Google Places API key** (same one you used on Replit)

---

## Step 1: Get Your Google Places API Key from Replit

1. Go to your Replit project
2. Click the **padlock icon (Secrets)** in the left sidebar
3. Find `GOOGLE_PLACES_API_KEY` and copy the value

---

## Step 2: Set Up Supabase (Free Reviews Database)

1. Go to **https://supabase.com** and sign up free
2. Create a new project (any name, any region)
3. Go to **SQL Editor** and run this to create the reviews table:

```sql
create table reviews (
  id serial primary key,
  shop_id text not null,
  user_name text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null,
  created_at timestamptz default now() not null
);

-- Allow anyone to read and write reviews (public)
alter table reviews enable row level security;
create policy "Anyone can read reviews" on reviews for select using (true);
create policy "Anyone can insert reviews" on reviews for insert with check (true);
```

4. Go to **Settings > API** and copy:
   - **Project URL** → this is your `SUPABASE_URL`
   - **anon/public key** → this is your `SUPABASE_ANON_KEY`

---

## Step 3: Deploy to Netlify

### Option A: Drag & Drop (Easiest)
1. Run `npm install && npm run build` locally
2. Go to **https://netlify.com** and sign up free
3. Drag the `dist/` folder onto the Netlify dashboard
4. Go to **Site Settings > Environment Variables** and add:
   - `GOOGLE_PLACES_API_KEY` = your key from Replit
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON_KEY` = your Supabase anon key
5. Redeploy (Deploys tab > Trigger deploy)

### Option B: Connect GitHub (Best for updates)
1. Push this project to a GitHub repo
2. Go to **https://netlify.com**, click "Add new site" > "Import from Git"
3. Connect your GitHub repo
4. Build settings are auto-detected from `netlify.toml`
5. Add the environment variables above in Site Settings
6. Deploy!

---

## Running Locally

```bash
npm install
npm install -g netlify-cli   # one time
cp .env.example .env         # fill in your keys
netlify dev                  # starts site + functions at localhost:8888
```

---

## Cost Comparison

| Service    | Old (Replit)     | New (Free)            |
|------------|------------------|-----------------------|
| Hosting    | ~$25/month       | $0 (Netlify free)     |
| Database   | ~$0 (included)   | $0 (Supabase free)    |
| Functions  | ~$0 (included)   | $0 (125k calls/month) |
| Google API | You pay per use  | Same — you pay per use|
| **Total**  | **~$25/month**   | **$0/month**          |

---

## Notes
- Netlify free tier: 125,000 function invocations/month — more than enough
- Supabase free tier: 500MB storage, 2GB bandwidth/month — more than enough
- Google Places API has a $200/month free credit — enough for moderate traffic
