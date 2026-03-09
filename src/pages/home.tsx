import { useState, useMemo, useEffect, useCallback } from "react";
import { Search, MapPin, Coffee, ArrowRight, X, Navigation, Loader2, Send } from "lucide-react";
import { coffeeShops, areas } from "@/lib/coffee-shops";
import { CoffeeCard } from "@/components/coffee-card";
import { Map as PigeonMap, Overlay, ZoomControl } from "pigeon-maps";
import type { CoffeeShop } from "@/lib/coffee-shops";

const warmMapProvider = (x: number, y: number, z: number) =>
  `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}@2x.png`;

// --- Clustering logic ---
type Cluster = { lat: number; lng: number; shops: CoffeeShop[] };

function clusterShops(shops: CoffeeShop[], zoom: number): Cluster[] {
  // Grid cell size in degrees — shrinks as zoom increases so clusters break apart
  const gridSize = 40 / Math.pow(2, zoom);
  const cells = new Map<string, CoffeeShop[]>();
  for (const shop of shops) {
    const key = `${Math.floor(shop.lat / gridSize)},${Math.floor(shop.lng / gridSize)}`;
    const cell = cells.get(key) ?? [];
    cell.push(shop);
    cells.set(key, cell);
  }
  return Array.from(cells.values()).map((group) => ({
    lat: group.reduce((s, s2) => s + s2.lat, 0) / group.length,
    lng: group.reduce((s, s2) => s + s2.lng, 0) / group.length,
    shops: group,
  }));
}

function CoffeeMapPin({ shop, onClick }: { shop: CoffeeShop; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ transform: "translate(-16px, -42px)" }}>
      <div className="relative transition-transform duration-200" style={{ transform: hovered ? "scale(1.25)" : "scale(1)" }}>
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id={`shadow-${shop.id}`} x="-4" y="-2" width="40" height="50">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.3"/>
            </filter>
            <linearGradient id={`grad-${shop.id}`} x1="16" y1="0" x2="16" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#8B5E3C"/>
              <stop offset="100%" stopColor="#5C3A1E"/>
            </linearGradient>
          </defs>
          <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26C32 7.163 24.837 0 16 0z"
            fill={`url(#grad-${shop.id})`} filter={`url(#shadow-${shop.id})`} />
          <circle cx="16" cy="14.5" r="9" fill="#FFF8F0" />
          <g transform="translate(9.5, 8.5)">
            <rect x="2" y="2" width="8" height="7" rx="1" fill="none" stroke="#6F4E37" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M10 3.5C10 3.5 12.5 3.5 12.5 5.5C12.5 7.5 10 7.5 10 7.5" fill="none" stroke="#6F4E37" strokeWidth="1.3" strokeLinecap="round"/>
            <path d="M4 0.5C4 0.5 4.5 1.8 4 2" stroke="#A0826D" strokeWidth="0.8" strokeLinecap="round"/>
            <path d="M6 0C6 0 6.5 1.3 6 1.5" stroke="#A0826D" strokeWidth="0.8" strokeLinecap="round"/>
            <path d="M8 0.5C8 0.5 8.5 1.8 8 2" stroke="#A0826D" strokeWidth="0.8" strokeLinecap="round"/>
          </g>
        </svg>
      </div>
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-amber-100 px-4 py-2.5 whitespace-nowrap">
            <p className="text-sm font-bold text-amber-950">{shop.name}</p>
            <p className="text-xs text-amber-600 mt-0.5">{shop.area} · ★ {shop.rating}</p>
          </div>
          <div className="flex justify-center -mt-1">
            <div className="w-3 h-3 bg-white/95 border-r border-b border-amber-100 rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
}

function ClusterPin({ count, onClick }: { count: number; onClick: () => void }) {
  const size = count > 20 ? 52 : count > 10 ? 46 : 38;
  return (
    <div onClick={onClick} style={{ transform: `translate(-${size / 2}px, -${size / 2}px)`, width: size, height: size }}
      className="cursor-pointer group">
      <div className="w-full h-full rounded-full bg-[#8B5E3C] border-4 border-white shadow-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
        <span className="text-white font-bold text-xs leading-none">{count}</span>
      </div>
    </div>
  );
}

function UserLocationPin() {
  return (
    <div style={{ transform: "translate(-10px, -10px)" }}>
      <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-lg relative">
        <div className="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" />
      </div>
    </div>
  );
}

export function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deepLinkedShop, setDeepLinkedShop] = useState<CoffeeShop | null>(null);

  const [submitForm, setSubmitForm] = useState({ shopName: "", address: "", website: "", notes: "" });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [openShopIds, setOpenShopIds] = useState<Set<string>>(new Set());

  // Fetch open/closed status for all shops when Open Now filter is activated
  useEffect(() => {
    if (!openNowFilter) return;
    const fetchAll = async () => {
      const results = await Promise.allSettled(
        coffeeShops.map(async shop => {
          const res = await fetch(`/api/places/hours?name=${encodeURIComponent(shop.name)}&address=${encodeURIComponent(shop.address)}`);
          if (!res.ok) return null;
          const data = await res.json();
          return data.openNow === true ? shop.id : null;
        })
      );
      const ids = new Set<string>();
      results.forEach(r => { if (r.status === "fulfilled" && r.value) ids.add(r.value); });
      setOpenShopIds(ids);
    };
    fetchAll();
  }, [openNowFilter]);

  // Area shop counts
  const areaShopCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const shop of coffeeShops) {
      counts[shop.area] = (counts[shop.area] ?? 0) + 1;
    }
    return counts;
  }, []);
  const [showContact, setShowContact] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "form-name": "contact", ...contactForm }).toString(),
    });
    setContactSuccess(true);
  };

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>([38.6272, -90.2979]);
  const [mapZoom, setMapZoom] = useState(11);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(14);
        setLocating(false);
      },
      () => setLocating(false)
    );
  }, []);

  const clusters = useMemo(() => clusterShops(coffeeShops, mapZoom), [mapZoom]);

  // Deep link: open shop modal if ?shop=id is in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shopId = params.get("shop");
    if (shopId) {
      const found = coffeeShops.find((s) => s.id === shopId);
      if (found) setDeepLinkedShop(found);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSubmitShop = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data as any).toString() });
    setSubmitSuccess(true);
  };

  const suggestions = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return areas.filter(a => a !== "All" && a.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aS = a.toLowerCase().startsWith(searchTerm.toLowerCase());
        const bS = b.toLowerCase().startsWith(searchTerm.toLowerCase());
        if (aS && !bS) return -1; if (!aS && bS) return 1; return a.localeCompare(b);
      }).slice(0, 5);
  }, [searchTerm]);

  const handleSuggestionClick = (area: string) => {
    setSelectedArea(area); setSearchTerm(""); setShowSuggestions(false);
    document.querySelector("main")?.scrollIntoView({ behavior: "smooth" });
  };

  // Featured shops — rotate every hour through high-rated shops
  const topShops = useMemo(() => coffeeShops.filter(s => s.rating >= 4.7).sort((a, b) => b.reviews - a.reviews), []);
  const [featuredOffset, setFeaturedOffset] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFeaturedOffset(o => (o + 3) % topShops.length), 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [topShops.length]);
  const featuredShops = useMemo(() => {
    const result = [];
    for (let i = 0; i < 3; i++) result.push(topShops[(featuredOffset + i) % topShops.length]);
    return result;
  }, [featuredOffset, topShops]);
  const filteredShops = coffeeShops.filter((shop) => {
    const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shop.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = selectedArea === null || selectedArea === "All" || shop.area === selectedArea;
    const matchesOpen = !openNowFilter || openShopIds.has(shop.id);
    return matchesSearch && matchesArea && matchesOpen;
  });

  const isHomeLanding = selectedArea === null && !searchTerm;

  const sortedAreas = [...areas].sort((a, b) => a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b));

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {deepLinkedShop && <CoffeeCard shop={deepLinkedShop} forceOpen onModalClose={() => {
        setDeepLinkedShop(null);
        window.history.replaceState({}, "", window.location.pathname);
      }} />}
      {/* Hero */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Passport button top-left */}
        <a href="#/passport" className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors border border-white/20">
          📖 My Passport
        </a>
        <div className="absolute inset-0 z-0">
          <img src="https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=2000&auto=format&fit=crop"
            alt="Coffee Shop" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/45"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center max-w-3xl">
          <div style={{ animation: "fadeUp 0.8s ease both" }}>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white mb-6 drop-shadow-sm">
              Discover STL's <span className="italic text-amber-100">Finest</span> Brews
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto font-light leading-relaxed">
              Your curated guide to the best coffee shops, roasters, and cafes across the St. Louis metro area.
            </p>
          </div>
          <div className="relative max-w-xl mx-auto" style={{ animation: "fadeUp 0.8s 0.2s ease both" }}>
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-2xl flex items-center">
              <div className="pl-4 text-white/70"><Search className="w-5 h-5" /></div>
              <input type="text" placeholder="Search by name, vibe, or neighborhood..."
                className="flex-1 border-none bg-transparent text-white placeholder:text-white/60 focus:outline-none h-10 text-base px-3"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (suggestions.length > 0) handleSuggestionClick(suggestions[0]);
                    else setShowSuggestions(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="p-1 hover:bg-white/10 rounded-full mr-2 text-white/60 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => {
                if (suggestions.length > 0) handleSuggestionClick(suggestions[0]);
              }} className="rounded-full px-6 py-2 bg-white text-primary hover:bg-white/90 font-bold text-sm transition-colors">
                Find Coffee
              </button>
            </div>
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-border/50 overflow-hidden z-50 py-2">
                <div className="px-4 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Neighborhoods</div>
                {suggestions.map((area) => (
                  <button key={area} onClick={() => handleSuggestionClick(area)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary/50 flex items-center gap-3 transition-colors group">
                    <MapPin className="w-4 h-4 text-primary opacity-50 group-hover:opacity-100" />
                    <span className="text-sm font-medium text-foreground">{area}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="container mx-auto px-4 py-16 -mt-20 relative z-20">
        {/* Mobile area picker - horizontally scrollable pills */}
        <div className="md:hidden mb-6 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => { setSelectedArea(null); setSearchTerm(""); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                selectedArea === null ? "bg-primary border-primary text-primary-foreground" : "bg-white border-border/40 text-muted-foreground"
              }`}>
              🏠 Home
            </button>
            {sortedAreas.filter(a => a !== "All").map(area => (
              <button key={area} onClick={() => setSelectedArea(area)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${
                  selectedArea === area ? "bg-primary border-primary text-primary-foreground" : "bg-white border-border/40 text-muted-foreground"
                }`}>
                {area} <span className="opacity-60">·{areaShopCounts[area] ?? 0}</span>
              </button>
            ))}
          </div>
          {/* Open Now toggle - mobile */}
          <button onClick={() => setOpenNowFilter(o => !o)}
            className={`mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
              openNowFilter ? "bg-green-500 border-green-500 text-white" : "bg-white border-border/40 text-muted-foreground"
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${openNowFilter ? "bg-white" : "bg-green-500"}`} />
            Open Now
          </button>
        </div>

        {/* Desktop filter pills */}
        <div className="hidden md:block mb-12">
          <div className="flex flex-wrap gap-1.5 justify-center max-w-7xl mx-auto mb-3">
            <button onClick={() => { setSelectedArea(null); setSearchTerm(""); }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200 border uppercase tracking-tight whitespace-nowrap ${
                selectedArea === null ? "bg-primary border-primary text-primary-foreground shadow-sm scale-105" : "bg-white/60 backdrop-blur-sm border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-white shadow-sm"
              }`}>
              Home
            </button>
            {sortedAreas.filter(a => a !== "All").map((area) => (
              <button key={area} onClick={() => setSelectedArea(area)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all duration-200 border uppercase tracking-tight whitespace-nowrap ${
                  selectedArea === area ? "bg-primary border-primary text-primary-foreground shadow-sm scale-105" : "bg-white/60 backdrop-blur-sm border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-white shadow-sm"
                }`}>
                {area} <span className="opacity-50 font-normal normal-case tracking-normal">·{areaShopCounts[area] ?? 0}</span>
              </button>
            ))}
          </div>
          {/* Open Now toggle - desktop */}
          <div className="flex justify-center">
            <button onClick={() => setOpenNowFilter(o => !o)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                openNowFilter ? "bg-green-500 border-green-500 text-white shadow-sm" : "bg-white border-border/40 text-muted-foreground hover:border-green-400 hover:text-green-600"
              }`}>
              <span className={`w-2 h-2 rounded-full ${openNowFilter ? "bg-white animate-pulse" : "bg-green-500"}`} />
              {openNowFilter ? "Showing Open Now — click to clear" : "Open Now"}
            </button>
          </div>
        </div>


        {isHomeLanding ? (
          <>
            {/* Featured shops */}
            <div className="mb-20">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-serif font-bold text-foreground">Featured Shops</h2>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Rotating highlights from our top-rated spots
                  </p>
                </div>
                <button onClick={() => { setSelectedArea("All"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
                  View All <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {featuredShops.map((shop) => (
                  <CoffeeCard key={`${shop.id}-${featuredOffset}`} shop={shop} />
                ))}
              </div>
            </div>

            {/* Map section */}
            <section className="bg-card rounded-3xl overflow-hidden shadow-2xl border border-border/50 grid md:grid-cols-2 mb-20 min-h-[500px]">
              <div className="p-8 md:p-12 flex flex-col justify-center bg-gradient-to-br from-card to-muted/30">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-6 w-fit">
                  <MapPin className="w-3 h-3" /> Interactive Explorer
                </div>
                <h2 className="text-3xl md:text-5xl font-serif font-bold text-foreground mb-6 leading-tight">
                  The Coffee <span className="italic text-primary">Landscape</span>
                </h2>
                <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                  We've mapped the finest roasters from the historic soul of the city to the quiet corners of the county. Navigate your next caffeine journey with precision.
                </p>
                <a href="https://www.google.com/maps/search/coffee+shops+st+louis" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 self-start py-3 px-8 bg-primary text-primary-foreground rounded-full font-semibold shadow-lg hover:bg-primary/90 transition-colors">
                  Get Real-time Directions
                </a>
              </div>
              <div className="relative h-[500px] md:h-auto overflow-hidden bg-[#f3f1ed]" style={{ filter: "sepia(0.25) saturate(0.9) brightness(1.05)" }}>
                <PigeonMap
                  center={mapCenter}
                  zoom={mapZoom}
                  onBoundsChanged={({ center, zoom }) => { setMapCenter(center); setMapZoom(zoom); }}
                  metaWheelZoom={true}
                  provider={warmMapProvider}
                  attribution={false}
                >
                  <ZoomControl />
                  {/* User location pin */}
                  {userLocation && (
                    <Overlay anchor={userLocation} offset={[0, 0]}>
                      <UserLocationPin />
                    </Overlay>
                  )}
                  {/* Clustered pins */}
                  {clusters.map((cluster, i) =>
                    cluster.shops.length === 1 ? (
                      <Overlay key={cluster.shops[0].id} anchor={[cluster.lat, cluster.lng]} offset={[0, 0]}>
                        <CoffeeMapPin shop={cluster.shops[0]} onClick={() => {
                          setSearchTerm(cluster.shops[0].name);
                          document.querySelector("main")?.scrollIntoView({ behavior: "smooth" });
                        }} />
                      </Overlay>
                    ) : (
                      <Overlay key={`cluster-${i}`} anchor={[cluster.lat, cluster.lng]} offset={[0, 0]}>
                        <ClusterPin count={cluster.shops.length} onClick={() => {
                          setMapCenter([cluster.lat, cluster.lng]);
                          setMapZoom(mapZoom + 2);
                        }} />
                      </Overlay>
                    )
                  )}
                </PigeonMap>
                {/* Locate Me button */}
                <button
                  onClick={handleLocateMe}
                  disabled={locating}
                  className="absolute bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-lg border border-border text-sm font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all disabled:opacity-60"
                >
                  {locating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Locating...</>
                    : <><Navigation className="w-4 h-4" /> Locate Me</>
                  }
                </button>
              </div>
            </section>
          </>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-20">
            {filteredShops.length > 0 ? filteredShops.map((shop) => (
              <CoffeeCard key={shop.id} shop={shop} />
            )) : (
              <div className="col-span-full text-center py-20 text-muted-foreground">
                <Coffee className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-xl font-serif">No coffee shops found matching your criteria.</p>
                <button onClick={() => { setSearchTerm(""); setSelectedArea(null); }}
                  className="mt-2 text-primary hover:underline text-sm">Clear filters</button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Submit a shop */}
      <section className="max-w-2xl mx-auto text-center px-4 py-16 mb-8">
        <div className="bg-gradient-to-br from-secondary to-muted/40 rounded-3xl p-10 border border-border/50 shadow-sm">
          <div className="text-4xl mb-4">☕</div>
          <h2 className="text-2xl font-serif font-bold text-foreground mb-2">Don't see your favorite spot?</h2>
          <p className="text-muted-foreground mb-6">Submit it here and we'll add it to the directory!</p>
          {!submitSuccess ? (
            <form name="shop-submission" method="POST" data-netlify="true" onSubmit={handleSubmitShop} className="space-y-3 text-left">
              <input type="hidden" name="form-name" value="shop-submission" />
              <input name="shopName" placeholder="Coffee shop name *" required value={submitForm.shopName}
                onChange={e => setSubmitForm(p => ({...p, shopName: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input name="address" placeholder="Address *" required value={submitForm.address}
                onChange={e => setSubmitForm(p => ({...p, address: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input name="website" placeholder="Website or Instagram (optional)" value={submitForm.website}
                onChange={e => setSubmitForm(p => ({...p, website: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <textarea name="notes" placeholder="Anything else we should know? (optional)" value={submitForm.notes}
                onChange={e => setSubmitForm(p => ({...p, notes: e.target.value}))}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={2} />
              <button type="submit"
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
                Submit Shop ✉️
              </button>
            </form>
          ) : (
            <div className="py-8">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-lg font-serif font-bold text-foreground mb-1">Thanks for the tip!</p>
              <p className="text-muted-foreground text-sm">We'll check it out and add it soon.</p>
            </div>
          )}
        </div>
      </section>


      <footer className="bg-primary text-primary-foreground py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
            <Coffee className="w-6 h-6" />
            <span className="font-serif text-xl font-bold">STL Coffee Spot</span>
          </div>
          <p className="opacity-60 text-sm max-w-md mx-auto mb-8">
            Curating the best coffee experiences in St. Louis. Support local roasters and businesses.
          </p>
          <div className="flex justify-center gap-6 text-sm font-medium opacity-80">
            <a href="#" className="hover:opacity-100 transition-opacity">About</a>
            <a href="#" className="hover:opacity-100 transition-opacity">Add a Shop</a>
            <a href="#/passport" className="hover:opacity-100 transition-opacity">☕ Coffee Passport</a>
            <button onClick={() => setShowContact(true)} className="hover:opacity-100 transition-opacity">Contact</button>
          </div>
          <div className="mt-12 pt-8 border-t border-primary-foreground/10 opacity-40 text-xs">
            © {new Date().getFullYear()} STL Coffee Spot.
          </div>
        </div>
      </footer>

      {/* Back to top */}
      {showBackToTop && (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all hover:scale-110"
          aria-label="Back to top">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white border-t border-border/50 shadow-lg">
        <div className="grid grid-cols-4 h-16">
          <button onClick={() => { setSelectedArea(null); setSearchTerm(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${selectedArea === null && !searchTerm ? "text-primary" : "text-muted-foreground"}`}>
            <span className="text-lg">🏠</span> Home
          </button>
          <button onClick={() => { setSelectedArea("All"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${selectedArea === "All" ? "text-primary" : "text-muted-foreground"}`}>
            <span className="text-lg">☕</span> All Shops
          </button>
          <button onClick={() => setOpenNowFilter(o => !o)}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${openNowFilter ? "text-green-600" : "text-muted-foreground"}`}>
            <span className="text-lg">🟢</span> Open Now
          </button>
          <a href="#/passport"
            className="flex flex-col items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground">
            <span className="text-lg">📖</span> Passport
          </a>
        </div>
      </nav>

      {/* Extra padding on mobile to account for bottom nav */}
      <div className="h-16 md:hidden" />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Contact Modal */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowContact(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-border/50" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowContact(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">✉️</div>
              <div>
                <h3 className="font-serif font-bold text-foreground text-lg">Get in Touch</h3>
                <p className="text-xs text-muted-foreground">We'd love to hear from you</p>
              </div>
            </div>
            {!contactSuccess ? (
              <form name="contact" method="POST" data-netlify="true" onSubmit={handleContactSubmit} className="space-y-3">
                <input type="hidden" name="form-name" value="contact" />
                <input required placeholder="Your name *" value={contactForm.name}
                  onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <input required type="email" placeholder="Email address *" value={contactForm.email}
                  onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
                <textarea required placeholder="Message *" value={contactForm.message}
                  onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                  rows={4} className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                <button type="submit" className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                  <Send className="w-4 h-4" /> Send Message
                </button>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🎉</div>
                <p className="font-serif font-bold text-foreground mb-1">Message Sent!</p>
                <p className="text-sm text-muted-foreground">Thanks for reaching out — we'll get back to you soon.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
