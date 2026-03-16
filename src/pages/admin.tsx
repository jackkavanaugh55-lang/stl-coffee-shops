import { useState } from "react";
import { coffeeShops } from "@/lib/coffee-shops";
import { Check, ChevronLeft, Loader2, Lock } from "lucide-react";

const SHOPS = coffeeShops;

function PasswordGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-serif font-bold">Admin Access</h1>
        </div>
        <input
          type="password"
          placeholder="Enter admin password"
          value={pw}
          onChange={e => { setPw(e.target.value); setError(false); }}
          onKeyDown={e => e.key === "Enter" && onAuth(pw)}
          className="w-full px-4 py-3 border border-border rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {error && <p className="text-red-500 text-sm mb-3">Incorrect password</p>}
        <button onClick={() => onAuth(pw)}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors">
          Enter
        </button>
      </div>
    </div>
  );
}

interface PhotoData {
  url: string;
  saved: boolean;
  saving: boolean;
  savedUrl?: string;
}

function ShopPhotoEditor({ shop, password, onBack }: { shop: typeof SHOPS[0]; password: string; onBack: () => void }) {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function loadPhotos() {
    setLoading(true);
    try {
      const res = await fetch(`/api/places/details?name=${encodeURIComponent(shop.name)}&address=${encodeURIComponent(shop.address)}`);
      const data = await res.json();
      const urls: string[] = data?.photoUrls ?? [];
      setPhotos(urls.map(url => ({ url, saved: url.includes("supabase"), saving: false })));
      setLoaded(true);
    } catch {
      alert("Failed to load photos");
    }
    setLoading(false);
  }

  function toggleSelect(i: number) {
    if (selected.includes(i)) {
      setSelected(selected.filter(x => x !== i));
    } else if (selected.length < 3) {
      setSelected([...selected, i]);
    }
  }

  async function saveSelected() {
    if (selected.length === 0) return;
    setSaving(true);
    for (let slot = 0; slot < selected.length; slot++) {
      const photoIndex = selected[slot];
      const photo = photos[photoIndex];
      if (photo.saved) continue;
      try {
        const res = await fetch("/api/admin/save-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password,
            shopId: shop.id,
            shopName: shop.name,
            photoUrl: photo.url,
            index: slot,
          }),
        });
        const result = await res.json();
        if (result.url) {
          setPhotos(prev => prev.map((p, i) => i === photoIndex ? { ...p, saved: true, savedUrl: result.url } : p));
        } else {
          alert(`Failed to save photo ${slot + 1}: ${result.error}`);
        }
      } catch {
        alert(`Error saving photo ${slot + 1}`);
      }
    }
    setSaving(false);
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to shops
        </button>
        <h1 className="text-2xl font-serif font-bold mb-1">{shop.name}</h1>
        <p className="text-sm text-muted-foreground mb-6">{shop.address}</p>

        {!loaded ? (
          <button onClick={loadPhotos} disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading photos...</> : "Load Google Photos"}
          </button>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Select up to 3 photos ({selected.length}/3 selected)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {photos.map((photo, i) => (
                <div key={i} onClick={() => toggleSelect(i)}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer border-4 transition-all ${
                    selected.includes(i) ? "border-primary shadow-lg scale-[1.02]" : "border-transparent hover:border-primary/30"
                  } ${photo.saved ? "ring-2 ring-green-500" : ""}`}>
                  <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  {selected.includes(i) && (
                    <div className="absolute top-2 right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                  {selected.includes(i) && (
                    <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {selected.indexOf(i) + 1}
                    </div>
                  )}
                  {photo.saved && (
                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                      Saved
                    </div>
                  )}
                </div>
              ))}
            </div>
            {done ? (
              <div className="flex items-center gap-2 text-green-600 font-semibold">
                <Check className="w-5 h-5" /> Photos saved to Supabase!
              </div>
            ) : (
              <button onClick={saveSelected} disabled={selected.length === 0 || saving}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : `Save ${selected.length} Photo${selected.length !== 1 ? "s" : ""}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [selectedShop, setSelectedShop] = useState<typeof SHOPS[0] | null>(null);
  const [search, setSearch] = useState("");

  async function handleAuth(pw: string) {
    const res = await fetch("/api/admin/save-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw, shopId: "test", shopName: "test", photoUrl: "test", index: 0 }),
    });
    if (res.status !== 401) {
      setPassword(pw);
      setAuthed(true);
    } else {
      setAuthed(false);
    }
  }

  if (!authed) return <PasswordGate onAuth={handleAuth} />;
  if (selectedShop) return <ShopPhotoEditor shop={selectedShop} password={password} onBack={() => setSelectedShop(null)} />;

  const filtered = SHOPS.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.area.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-serif font-bold mb-2">Photo Admin</h1>
        <p className="text-muted-foreground mb-6">Select photos for each shop to store permanently in Supabase.</p>
        <input
          placeholder="Search shops..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-border rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(shop => (
            <button key={shop.id} onClick={() => setSelectedShop(shop)}
              className="flex items-center gap-4 p-4 bg-white rounded-xl border border-border hover:border-primary/40 hover:shadow-md transition-all text-left">
              <img src={shop.image} alt={shop.name} className="w-14 h-14 rounded-lg object-cover shrink-0" />
              <div>
                <p className="font-semibold text-foreground">{shop.name}</p>
                <p className="text-xs text-muted-foreground">{shop.area}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
