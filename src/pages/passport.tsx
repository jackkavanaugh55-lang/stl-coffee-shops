\import { useState, useEffect, useMemo } from "react";
import { Coffee, ArrowLeft, Star, MapPin, Plus, X, ChevronDown, ChevronUp, Award, TrendingUp } from "lucide-react";
import { coffeeShops } from "@/lib/coffee-shops";
import type { CoffeeShop } from "@/lib/coffee-shops";

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const handler = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);
  if (!show) return null;
  return (
    <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-amber-800 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-amber-700 transition-all hover:scale-110">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckIn {
  shopId: string;
  date: string; // ISO string
  drink: string;
  notes: string;
  rating: number; // 1-5
}

interface PassportData {
  checkIns: CheckIn[];
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = "stl-coffee-passport";

function loadPassport(): PassportData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { checkIns: [] };
}

function savePassport(data: PassportData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}>
          <Star className={`w-5 h-5 transition-colors ${(hover || value) >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );
}

function CheckInModal({ shop, existing, onSave, onClose }: {
  shop: CoffeeShop;
  existing?: CheckIn;
  onSave: (ci: Omit<CheckIn, "shopId">) => void;
  onClose: () => void;
}) {
  const [drink, setDrink] = useState(existing?.drink ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [date, setDate] = useState(existing?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));

  const handleSave = () => {
    if (!drink.trim()) return;
    onSave({ drink: drink.trim(), notes: notes.trim(), rating, date: new Date(date).toISOString() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-amber-100" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Coffee className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-gray-900 text-lg leading-tight">{shop.name}</h3>
            <p className="text-xs text-amber-600">{shop.area}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">What did you have? *</label>
            <input value={drink} onChange={e => setDrink(e.target.value)}
              placeholder="e.g. Oat milk latte, cold brew, pour over..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Your rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date visited</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Vibes, seating, would you go back?..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!drink.trim()}
            className="flex-1 py-2.5 bg-amber-800 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 disabled:opacity-40 transition-colors">
            {existing ? "Update Visit" : <span className="flex items-center justify-center gap-1.5">Stamp Passport <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg></span>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShopRow({ shop, checkIn, onCheckin, onEdit, onRemove }: {
  shop: CoffeeShop;
  checkIn?: CheckIn;
  onCheckin: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const visited = !!checkIn;
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${visited ? "border-amber-200 bg-amber-50/50" : "border-gray-100 bg-white hover:border-amber-100"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${visited ? "bg-amber-800 shadow-md" : "bg-gray-100"}`}>
        {visited
          ? <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          : <Coffee className="w-5 h-5 text-gray-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm truncate ${visited ? "text-amber-900" : "text-gray-700"}`}>{shop.name}</p>
        <p className="text-xs text-gray-400 truncate">{shop.area}</p>
        {checkIn && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-amber-700 font-medium truncate">"{checkIn.drink}"</p>
            {checkIn.rating > 0 && (
              <div className="flex items-center gap-0.5">
                {Array.from({ length: checkIn.rating }).map((_, i) => (
                  <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {visited ? (
          <>
            <button onClick={onEdit} className="text-xs text-amber-700 hover:text-amber-900 font-medium px-2 py-1 rounded-lg hover:bg-amber-100 transition-colors">Edit</button>
            <button onClick={onRemove} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Remove</button>
          </>
        ) : (
          <button onClick={onCheckin} className="flex items-center gap-1 text-xs bg-amber-800 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors font-medium">
            <Plus className="w-3 h-3" /> Visit
          </button>
        )}
      </div>
    </div>
  );
}

function AreaProgress({ area, total, visited }: { area: string; total: number; visited: number }) {
  const pct = total === 0 ? 0 : Math.round((visited / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 truncate mr-2">{area}</span>
        <span className="text-gray-400 shrink-0 text-xs">{visited}/{total}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Passport Page ───────────────────────────────────────────────────────

export default function Passport() {
  const [passport, setPassport] = useState<PassportData>(loadPassport);
  const [checkInTarget, setCheckInTarget] = useState<CoffeeShop | null>(null);
  const [editTarget, setEditTarget] = useState<CoffeeShop | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "visited" | "unvisited">("all");
  const [expandedArea, setExpandedArea] = useState<string | null>(null);

  // Persist on every change
  useEffect(() => { savePassport(passport); }, [passport]);

  const checkInMap = useMemo(() => {
    const m = new Map<string, CheckIn>();
    for (const ci of passport.checkIns) m.set(ci.shopId, ci);
    return m;
  }, [passport.checkIns]);

  const visitedCount = checkInMap.size;
  const totalCount = coffeeShops.length;
  const pct = Math.round((visitedCount / totalCount) * 100);

  // Area breakdown
  const areaStats = useMemo(() => {
    const stats: Record<string, { total: number; visited: number }> = {};
    for (const shop of coffeeShops) {
      if (!stats[shop.area]) stats[shop.area] = { total: 0, visited: 0 };
      stats[shop.area].total++;
      if (checkInMap.has(shop.id)) stats[shop.area].visited++;
    }
    return Object.entries(stats)
      .sort((a, b) => b[1].visited - a[1].visited || b[1].total - a[1].total);
  }, [checkInMap]);

  const areasCompleted = areaStats.filter(([, s]) => s.visited === s.total && s.total > 0).length;

  // Unique drinks tried
  const uniqueDrinks = useMemo(() => {
    const drinks = new Set(passport.checkIns.map(c => c.drink.toLowerCase().trim()));
    return drinks.size;
  }, [passport.checkIns]);

  // Filtered shop list
  const filteredShops = useMemo(() => {
    let list = coffeeShops;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.area.toLowerCase().includes(q));
    }
    if (filter === "visited") list = list.filter(s => checkInMap.has(s.id));
    if (filter === "unvisited") list = list.filter(s => !checkInMap.has(s.id));
    return list;
  }, [search, filter, checkInMap]);

  // Recent check-ins
  const recentCheckIns = useMemo(() => {
    return [...passport.checkIns]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(ci => ({ ci, shop: coffeeShops.find(s => s.id === ci.shopId) }))
      .filter(x => x.shop);
  }, [passport.checkIns]);

  const handleSave = (shop: CoffeeShop, ci: Omit<CheckIn, "shopId">) => {
    setPassport(prev => {
      const existing = prev.checkIns.findIndex(c => c.shopId === shop.id);
      const newCi = { ...ci, shopId: shop.id };
      if (existing >= 0) {
        const updated = [...prev.checkIns];
        updated[existing] = newCi;
        return { ...prev, checkIns: updated };
      }
      return { ...prev, checkIns: [...prev.checkIns, newCi] };
    });
  };

  const handleRemove = (shopId: string) => {
    setPassport(prev => ({ ...prev, checkIns: prev.checkIns.filter(c => c.shopId !== shopId) }));
  };

  // Milestone badges
  const milestones = [
    { label: "First Sip", desc: "Visit your first shop", emoji: "🌱", earned: visitedCount >= 1 },
    { label: "Regular", desc: "Visit 10 shops", emoji: "☕", earned: visitedCount >= 10 },
    { label: "Explorer", desc: "Visit 25 shops", emoji: "🗺️", earned: visitedCount >= 25 },
    { label: "Connoisseur", desc: "Visit 50 shops", emoji: "🏅", earned: visitedCount >= 50 },
    { label: "Aficionado", desc: "Visit 100 shops", emoji: "⭐", earned: visitedCount >= 100 },
    { label: "STL Legend", desc: "Visit all shops", emoji: "🏆", earned: visitedCount >= totalCount },
  ];

  return (
    <div className="min-h-screen bg-[#faf8f4] font-sans">
      {/* Header */}
      <header className="bg-amber-900 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="#/" className="flex items-center gap-1.5 text-amber-200 hover:text-white transition-colors text-sm font-medium">
              <ArrowLeft className="w-4 h-4" /> Back
            </a>
            <div className="w-px h-5 bg-amber-700" />
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span className="font-serif font-bold text-lg">Coffee Passport</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-amber-200 text-xs">Stamped</p>
            <p className="font-bold text-lg leading-none">{visitedCount} <span className="text-amber-300 text-sm font-normal">/ {totalCount}</span></p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Passport cover card */}
        <div className="bg-gradient-to-br from-amber-800 to-amber-950 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-16 -translate-x-16" />
          <div className="relative">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-amber-300 text-xs font-bold uppercase tracking-widest mb-1">STL Coffee Spot</p>
                <h1 className="font-serif text-4xl font-bold leading-tight">Coffee<br/>Passport</h1>
                <p className="text-amber-200/80 text-sm mt-2 font-light">Track your coffee shop stops across St. Louis</p>
              </div>
              <div className="opacity-70">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>

            {/* Overall progress */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-amber-200 text-sm font-medium">Overall Progress</span>
                <span className="text-white font-bold">{pct}%</span>
              </div>
              <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-300 to-yellow-300 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { label: "Visited", icon: <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>, value: visitedCount },
                { label: "Remaining", icon: <Coffee className="w-5 h-5" />, value: totalCount - visitedCount },
                { label: "Areas Done", icon: <MapPin className="w-5 h-5" />, value: areasCompleted },
                { label: "Drinks Tried", icon: <Star className="w-5 h-5" />, value: uniqueDrinks },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-2xl p-3 text-center backdrop-blur-sm">
                  <div className="flex justify-center mb-1 opacity-80">{s.icon}</div>
                  <div className="text-xl font-bold">{s.value}</div>
                  <div className="text-amber-300 text-[10px] font-medium uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div>
          <h2 className="font-serif text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-700" /> Badges
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {milestones.map(m => (
              <div key={m.label} className={`rounded-2xl p-4 text-center border transition-all ${m.earned ? "bg-amber-50 border-amber-200 shadow-sm" : "bg-gray-50 border-gray-100 opacity-50 grayscale"}`}>
                <div className="text-3xl mb-2">{m.emoji}</div>
                <p className="text-xs font-bold text-gray-700 leading-tight">{m.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent check-ins */}
        {recentCheckIns.length > 0 && (
          <div>
            <h2 className="font-serif text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-700" /> Recent Visits
            </h2>
            <div className="space-y-3">
              {recentCheckIns.map(({ ci, shop }) => shop && (
                <div key={ci.shopId} className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-amber-800 text-white flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{shop.name}</p>
                    <p className="text-xs text-amber-700 truncate">"{ci.drink}"</p>
                  </div>
                  <div className="text-right shrink-0">
                    {ci.rating > 0 && (
                      <div className="flex items-center gap-0.5 justify-end mb-1">
                        {Array.from({ length: ci.rating }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400">{new Date(ci.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Shop list */}
        <div>
          <h2 className="font-serif text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-700" /> All Shops
          </h2>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input value={search} onChange={e => { setSearch(e.target.value); setExpandedArea(null); }}
                placeholder="Search shops or areas..."
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {(["all", "visited", "unvisited"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${filter === f ? "bg-amber-800 text-white" : "bg-white text-gray-600 border border-gray-200 hover:border-amber-200"}`}>
                  {f === "all" ? `All (${coffeeShops.length})` : f === "visited" ? `Visited (${visitedCount})` : `Unvisited (${totalCount - visitedCount})`}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable shop list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {search.trim() ? (
              /* Search results - flat list in scrollable box */
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {filteredShops.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <p className="text-sm">No shops match your search</p>
                  </div>
                ) : filteredShops.map(shop => (
                  <ShopRow key={shop.id} shop={shop} checkIn={checkInMap.get(shop.id)}
                    onCheckin={() => setCheckInTarget(shop)}
                    onEdit={() => setEditTarget(shop)}
                    onRemove={() => handleRemove(shop.id)} />
                ))}
              </div>
            ) : (
              /* Grouped by area - each area is a collapsible row */
              <div className="divide-y divide-gray-50">
                {areaStats
                  .filter(([, stats]) => {
                    if (filter === "visited") return stats.visited > 0;
                    if (filter === "unvisited") return stats.visited < stats.total;
                    return true;
                  })
                  .map(([area, stats]) => {
                    const isOpen = expandedArea === area;
                    const shopsInArea = coffeeShops.filter(s => s.area === area &&
                      (filter === "visited" ? checkInMap.has(s.id) :
                       filter === "unvisited" ? !checkInMap.has(s.id) : true));
                    return (
                      <div key={area}>
                        <button
                          onClick={() => setExpandedArea(isOpen ? null : area)}
                          className="w-full flex items-center gap-4 px-5 py-3 hover:bg-amber-50/50 transition-colors text-left">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-semibold text-sm text-gray-700 truncate mr-2">{area}</span>
                              <span className={`text-xs font-bold shrink-0 ${stats.visited === stats.total ? "text-amber-700" : "text-gray-400"}`}>
                                {stats.visited === stats.total && stats.total > 0 ? <><Award className="w-3.5 h-3.5 text-amber-600 inline mr-0.5" />{stats.visited}/{stats.total}</> : `${stats.visited}/${stats.total}`}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${stats.total === 0 ? 0 : (stats.visited / stats.total) * 100}%` }} />
                            </div>
                          </div>
                          {isOpen
                            ? <ChevronUp className="w-4 h-4 text-gray-300 shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />}
                        </button>
                        {isOpen && (
                          <div className="bg-gray-50/50 border-t border-gray-100 divide-y divide-gray-100">
                            {shopsInArea.map(shop => (
                              <ShopRow key={shop.id} shop={shop} checkIn={checkInMap.get(shop.id)}
                                onCheckin={() => setCheckInTarget(shop)}
                                onEdit={() => setEditTarget(shop)}
                                onRemove={() => handleRemove(shop.id)} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Click an area to expand its shops</p>
        </div>
      </main>

      {/* Back to top */}
      <BackToTop />

      {/* Modals */}
      {checkInTarget && (
        <CheckInModal
          shop={checkInTarget}
          onSave={(ci) => handleSave(checkInTarget, ci)}
          onClose={() => setCheckInTarget(null)}
        />
      )}
      {editTarget && (
        <CheckInModal
          shop={editTarget}
          existing={checkInMap.get(editTarget.id)}
          onSave={(ci) => handleSave(editTarget, ci)}
          onClose={() => setEditTarget(null)}
        />
      )}
    </div>
  );
}
