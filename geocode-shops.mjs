// Run this from your project root:
// GOOGLE_PLACES_API_KEY=your_key node geocode-shops.mjs
//
// It will overwrite src/lib/coffee-shops.ts with correct lat/lng for every shop.

import fs from "fs";

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
if (!API_KEY) {
  console.error("❌ Set GOOGLE_PLACES_API_KEY environment variable first");
  process.exit(1);
}

const filePath = "./src/lib/coffee-shops.ts";
let content = fs.readFileSync(filePath, "utf8");

// Extract all shops
const shopPattern = /\{ id: "([^"]+)".*?address: "([^"]+)".*?lat: ([\d.-]+).*?lng: ([\d.-]+)/gs;
const shops = [...content.matchAll(shopPattern)].map(m => ({
  id: m[1],
  address: m[2],
  lat: parseFloat(m[3]),
  lng: parseFloat(m[4]),
}));

console.log(`Found ${shops.length} shops. Geocoding...`);

async function geocode(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "OK") {
    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  }
  return null;
}

let updated = 0;
let failed = [];

for (const shop of shops) {
  await new Promise(r => setTimeout(r, 100)); // rate limit
  const result = await geocode(shop.address);
  if (result) {
    const lat = parseFloat(result.lat.toFixed(4));
    const lng = parseFloat(result.lng.toFixed(4));

    // Replace lat in this shop's entry
    const latPattern = new RegExp(
      `(id: "${shop.id}"[\\s\\S]*?lat: )${shop.lat.toString().replace('.', '\\.')}`,
    );
    const lngPattern = new RegExp(
      `(id: "${shop.id}"[\\s\\S]*?lng: )${shop.lng.toString().replace('.', '\\.')}`,
    );

    content = content.replace(latPattern, `$1${lat}`);
    content = content.replace(lngPattern, `$1${lng}`);

    console.log(`✓ ${shop.id}: ${lat}, ${lng}`);
    updated++;
  } else {
    console.log(`✗ ${shop.id}: geocoding failed for "${shop.address}"`);
    failed.push(shop.id);
  }
}

fs.writeFileSync(filePath, content);
console.log(`\n✅ Updated ${updated}/${shops.length} shops`);
if (failed.length) console.log(`⚠️  Failed: ${failed.join(", ")}`);
