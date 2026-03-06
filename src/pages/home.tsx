import { useState, useMemo } from "react";
import { Search, MapPin, Coffee, ArrowRight, X } from "lucide-react";
import { coffeeShops, areas } from "@/lib/coffee-shops";
import { CoffeeCard } from "@/components/coffee-card";
import { Map, Marker, Overlay, ZoomControl } from "pigeon-maps";
import type { CoffeeShop } from "@/lib/coffee-shops";

const warmMapProvider = (x: number, y: number, z: number) =>
  `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}@2x.png`;

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

export default function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const featuredShops = coffeeShops.slice(0, 3);
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
      {/* Hero */}
      <section className="relative h-[60vh] md:h-[70vh] flex items-center justify-center overflow-hidden">
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
        {/* Area filter pills */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-1 md:gap-2 justify-center max-w-7xl mx-auto">
            <button onClick={() => { setSelectedArea(null); setSearchTerm(""); }}
              className={`px-3 py-1.5 rounded-md text-[10px] md:text-[11px] font-bold transition-all duration-200 border uppercase tracking-tight whitespace-nowrap ${
                selectedArea === null ? "bg-primary border-primary text-primary-foreground shadow-sm scale-105" : "bg-white/60 backdrop-blur-sm border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-white shadow-sm"
              }`}>
              Home
            </button>
            {sortedAreas.map((area) => (
              <button key={area} onClick={() => setSelectedArea(area)}
                className={`px-3 py-1.5 rounded-md text-[10px] md:text-[11px] font-bold transition-all duration-200 border uppercase tracking-tight whitespace-nowrap ${
                  selectedArea === area ? "bg-primary border-primary text-primary-foreground shadow-sm scale-105" : "bg-white/60 backdrop-blur-sm border-border/40 text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-white shadow-sm"
                }`}>
                {area}
              </button>
            ))}
          </div>
        </div>

        {isHomeLanding ? (
          <>
            {/* Featured shops */}
            <div className="mb-20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-serif font-bold text-foreground">Featured Shops</h2>
                <button onClick={() => { setSelectedArea("All"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="flex items-center gap-2 text-primary hover:text-primary/80 font-semibold text-sm transition-colors">
                  View All <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {featuredShops.map((shop) => (
                  <CoffeeCard key={shop.id} shop={shop} />
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
                <Map defaultCenter={[38.6272, -90.2979]} defaultZoom={11} metaWheelZoom={true} provider={warmMapProvider} attribution={false}>
                  <ZoomControl />
                  {coffeeShops.map(shop => (
                    <Overlay key={shop.id} anchor={[shop.lat, shop.lng]} offset={[0, 0]}>
                      <CoffeeMapPin shop={shop} onClick={() => {
                        setSearchTerm(shop.name); setSelectedArea("All");
                        document.querySelector("main")?.scrollIntoView({ behavior: "smooth" });
                      }} />
                    </Overlay>
                  ))}
                </Map>
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

      {/* Footer */}
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
            <a href="#" className="hover:opacity-100 transition-opacity">Contact</a>
          </div>
          <div className="mt-12 pt-8 border-t border-primary-foreground/10 opacity-40 text-xs">
            © {new Date().getFullYear()} STL Coffee Spot.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
