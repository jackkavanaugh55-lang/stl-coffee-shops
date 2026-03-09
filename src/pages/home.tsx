import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, MapPin, Coffee, ArrowRight, X, Navigation, Loader2, Send } from "lucide-react";
import { coffeeShops, areas } from "@/lib/coffee-shops";
import { CoffeeCard } from "@/components/coffee-card";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import type { CoffeeShop } from "@/lib/coffee-shops";

// Fix leaflet default icon paths
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

// Custom coffee pin icon
function makeCoffeeIcon(label?: string) {
  const svg = `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="sh" x="-4" y="-2" width="40" height="50">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.3"/>
      </filter>
      <linearGradient id="gr" x1="16" y1="0" x2="16" y2="42" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#8B5E3C"/>
        <stop offset="100%" stop-color="#5C3A1E"/>
      </linearGradient>
    </defs>
    <path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26C32 7.163 24.837 0 16 0z" fill="url(#gr)" filter="url(#sh)"/>
    <circle cx="16" cy="14.5" r="9" fill="#FFF8F0"/>
    <g transform="translate(9.5,8.5)">
      <rect x="2" y="2" width="8" height="7" rx="1" fill="none" stroke="#6F4E37" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M10 3.5C10 3.5 12.5 3.5 12.5 5.5C12.5 7.5 10 7.5 10 7.5" fill="none" stroke="#6F4E37" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M4 0.5C4 0.5 4.5 1.8 4 2" stroke="#A0826D" stroke-width="0.8" stroke-linecap="round"/>
      <path d="M6 0C6 0 6.5 1.3 6 1.5" stroke="#A0826D" stroke-width="0.8" stroke-linecap="round"/>
      <path d="M8 0.5C8 0.5 8.5 1.8 8 2" stroke="#A0826D" stroke-width="0.8" stroke-linecap="round"/>
    </g>
  </svg>`;

  const labelHtml = label
    ? `<div style="position:absolute;bottom:44px;left:50%;transform:translateX(-50%);background:rgba(255,255,255,0.95);border:1px solid #f5e6d3;border-radius:8px;padding:3px 8px;white-space:nowrap;font-size:11px;font-weight:700;color:#3b1f0a;box-shadow:0 2px 8px rgba(0,0,0,0.15)">${label}</div>`
    : "";

  return L.divIcon({
    html: `<div style="position:relative">${labelHtml}<div style="width:32px;height:42px">${svg}</div></div>`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -44],
    className: "",
  });
}

function makeClusterIcon(count: number) {
  const size = count > 20 ? 52 : count > 10 ? 46 : 38;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:#8B5E3C;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
      <span style="color:white;font-weight:700;font-size:${count > 99 ? 10 : 13}px">${count}</span>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    className: "",
  });
}

// Clustering logic
type Cluster = { lat: number; lng: number; shops: CoffeeShop[] };
function clusterShops(shops: CoffeeShop[], zoom: number): Cluster[] {
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

// Component that syncs external center/zoom state with Leaflet map
function MapController({ center, zoom, onBoundsChanged }: {
  center: [number, number];
  zoom: number;
  onBoundsChanged: (center: [number, number], zoom: number) => void;
}) {
  const map = useMap();
  const lastCenter = useRef(center);
  const lastZoom = useRef(zoom);

  useEffect(() => {
    if (
      Math.abs(lastCenter.current[0] - center[0]) > 0.0001 ||
      Math.abs(lastCenter.current[1] - center[1]) > 0.0001 ||
      lastZoom.current !== zoom
    ) {
      map.setView(center, zoom, { animate: true });
      lastCenter.current = center;
      lastZoom.current = zoom;
    }
  }, [center, zoom, map]);

  useMapEvents({
    moveend: () => {
      const c = map.getCenter();
      const z = map.getZoom();
      lastCenter.current = [c.lat, c.lng];
      lastZoom.current = z;
      onBoundsChanged([c.lat, c.lng], z);
    },
    zoomend: () => {
      const c = map.getCenter();
      const z = map.getZoom();
      lastCenter.current = [c.lat, c.lng];
      lastZoom.current = z;
      onBoundsChanged([c.lat, c.lng], z);
    },
  });
  return null;
}

// The actual map rendered inside MapContainer
function LeafletMapInner({ mapCenter, mapZoom, userLocation, clusters, onBoundsChanged, onShopClick, onClusterClick }: {
  mapCenter: [number, number];
  mapZoom: number;
  userLocation: [number, number] | null;
  clusters: Cluster[];
  onBoundsChanged: (c: [number, number], z: number) => void;
  onShopClick: (shop: CoffeeShop) => void;
  onClusterClick: (lat: number, lng: number) => void;
}) {
  const userIcon = L.divIcon({
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    className: "",
  });

  return (
    <>
      <MapController center={mapCenter} zoom={mapZoom} onBoundsChanged={onBoundsChanged} />
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
      {userLocation && <Marker position={userLocation} icon={userIcon} />}
      {clusters.map((cluster, i) =>
        cluster.shops.length === 1 ? (
          <Marker
            key={cluster.shops[0].id}
            position={[cluster.lat, cluster.lng]}
            icon={makeCoffeeIcon(mapZoom >= 14 ? cluster.shops[0].name : undefined)}
            eventHandlers={{ click: () => onShopClick(cluster.shops[0]) }}
          />
        ) : (
          <Marker
            key={`cluster-${i}`}
            position={[cluster.lat, cluster.lng]}
            icon={makeClusterIcon(cluster.shops.length)}
            eventHandlers={{ click: () => onClusterClick(cluster.lat, cluster.lng) }}
          />
        )
      )}
    </>
  );
}

export function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deepLinkedShop, setDeepLinkedShop] = useState<CoffeeShop | null>(null);
  const [mapSelectedShop, setMapSelectedShop] = useState<CoffeeShop | null>(null);

  const openShopModal = (shop: CoffeeShop) => {
    setMapSelectedShop(shop);
    window.history.pushState({ shopModal: shop.id }, "");
  };

  const closeShopModal = () => {
    setMapSelectedShop(null);
  };

  const [fullscreenMap, setFullscreenMap] = useState(false);

  // Handle browser back button closing the modal
  useEffect(() => {
    const onPop = () => setMapSelectedShop(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const [submitForm, setSubmitForm] = useState({ shopName: "", address: "", website: "", notes: "" });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

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
    return matchesSearch && matchesArea;
  });

  const isHomeLanding = selectedArea === null && !searchTerm;

  const sortedAreas = [...areas].sort((a, b) => a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b));

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {deepLinkedShop && <CoffeeCard shop={deepLinkedShop} forceOpen onModalClose={() => {
        setDeepLinkedShop(null);
        window.history.replaceState({}, "", window.location.pathname);
      }} />}
      {mapSelectedShop && <CoffeeCard shop={mapSelectedShop} forceOpen onModalClose={closeShopModal} />}
      {/* Hero */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Passport button top-left */}
        <a href="#/passport" className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors border border-white/20">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          My Passport
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
        {/* Mobile area dropdown */}
        <div className="md:hidden mb-6">
          <select
            value={selectedArea ?? "home"}
            onChange={e => {
              const v = e.target.value;
              if (v === "home") { setSelectedArea(null); setSearchTerm(""); }
              else setSelectedArea(v);
            }}
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm appearance-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
          >
            <option value="home">Home</option>
            {sortedAreas.filter(a => a !== "All").map(area => (
              <option key={area} value={area}>{area} · {areaShopCounts[area] ?? 0} shops</option>
            ))}
          </select>
        </div>

        {/* Desktop filter pills */}
        <div className="hidden md:block mb-12">
          <div className="flex flex-wrap gap-1.5 justify-center max-w-7xl mx-auto">
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
            <section className="bg-card rounded-3xl shadow-2xl border border-border/50 grid md:grid-cols-2 mb-20 min-h-[500px]" style={{ overflow: "hidden" }}>
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
              <div className="relative h-[500px] md:h-auto bg-[#e8eaf0]">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ width: "100%", height: "100%", minHeight: 500 }}
                  zoomControl={true}
                  scrollWheelZoom={false}
                >
                  <LeafletMapInner
                    mapCenter={mapCenter}
                    mapZoom={mapZoom}
                    userLocation={userLocation}
                    clusters={clusters}
                    onBoundsChanged={(c, z) => { setMapCenter(c); setMapZoom(z); }}
                    onShopClick={openShopModal}
                    onClusterClick={(lat, lng) => { setMapCenter([lat, lng]); setMapZoom(mapZoom + 2); }}
                  />
                </MapContainer>
                {/* Locate Me button */}
                <button onClick={handleLocateMe} disabled={locating}
                  className="absolute bottom-4 right-4 z-[500] flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-lg border border-border text-sm font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all disabled:opacity-60">
                  {locating ? <><Loader2 className="w-4 h-4 animate-spin" /> Locating...</> : <><Navigation className="w-4 h-4" /> Locate Me</>}
                </button>
                {/* Fullscreen map button — mobile only */}
                <button onClick={() => setFullscreenMap(true)}
                  className="absolute bottom-4 left-4 z-[500] md:hidden flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg text-sm font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Full Map
                </button>
              </div>
            </section>

            {/* Fullscreen map overlay — mobile */}
            {fullscreenMap && (
              <div className="fixed inset-0 z-[1000] md:hidden">
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  style={{ width: "100%", height: "100%" }}
                  zoomControl={true}
                >
                  <LeafletMapInner
                    mapCenter={mapCenter}
                    mapZoom={mapZoom}
                    userLocation={userLocation}
                    clusters={clusters}
                    onBoundsChanged={(c, z) => { setMapCenter(c); setMapZoom(z); }}
                    onShopClick={(shop) => { setFullscreenMap(false); openShopModal(shop); }}
                    onClusterClick={(lat, lng) => { setMapCenter([lat, lng]); setMapZoom(mapZoom + 2); }}
                  />
                </MapContainer>
                <button onClick={() => setFullscreenMap(false)}
                  className="absolute top-4 right-4 z-[1001] flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-lg text-sm font-semibold border border-border">
                  <X className="w-4 h-4" /> Close
                </button>
                <button onClick={handleLocateMe} disabled={locating}
                  className="absolute bottom-24 right-4 z-[1001] flex items-center gap-2 px-4 py-2.5 bg-white rounded-full shadow-lg border border-border text-sm font-semibold">
                  {locating ? <><Loader2 className="w-4 h-4 animate-spin" /> Locating...</> : <><Navigation className="w-4 h-4" /> Locate Me</>}
                </button>
              </div>
            )}
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
          <Coffee className="w-10 h-10 mx-auto mb-4 text-primary opacity-60" />
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
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Submit Shop
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
            <a href="#/passport" className="hover:opacity-100 transition-opacity flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Coffee Passport
            </a>
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-border/30 shadow-xl">
        <div className="grid grid-cols-2 h-16">
          <button onClick={() => { setSelectedArea(null); setSearchTerm(""); window.scrollTo({ top: 0, behavior: "smooth" }); window.dispatchEvent(new Event("close-all-modals")); }}
            className={`flex flex-col items-center justify-center gap-1 transition-colors ${selectedArea === null && !searchTerm ? "text-amber-800" : "text-gray-400"}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill={selectedArea === null && !searchTerm ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[11px] font-semibold">Home</span>
          </button>
          <a href="#/passport"
            className="flex flex-col items-center justify-center gap-1 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-[11px] font-semibold">Passport</span>
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
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-primary" />
              </div>
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
