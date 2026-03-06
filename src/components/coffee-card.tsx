import { useState, useCallback } from "react";
import { Star, MapPin, ExternalLink, Menu, Map, Info, MessageCircle, Send, User, ChevronLeft, ChevronRight, Camera, X } from "lucide-react";
import type { CoffeeShop } from "@/lib/coffee-shops";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Review {
  id: number;
  shopId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function useGoogleRating(shop: CoffeeShop) {
  const { data } = useQuery({
    queryKey: ["google-rating", shop.id],
    queryFn: async () => {
      const res = await fetch(`/api/places/rating?name=${encodeURIComponent(shop.name)}&address=${encodeURIComponent(shop.address)}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ rating: number | null; reviewCount: number | null }>;
    },
  });
  return {
    rating: data?.rating ?? shop.rating,
    reviewCount: data?.reviewCount ?? shop.reviews,
    isLive: data?.rating != null,
  };
}

function useShopPhotos(shop: CoffeeShop) {
  const { data } = useQuery({
    queryKey: ["shop-photos", shop.id],
    queryFn: async () => {
      const res = await fetch(`/api/places/photos?name=${encodeURIComponent(shop.name)}&address=${encodeURIComponent(shop.address)}`);
      if (!res.ok) return { count: 1, photoUrls: [] as string[] };
      return res.json() as Promise<{ count: number; photoUrls: string[] }>;
    },
  });
  return {
    count: data?.count ?? 1,
    photoUrls: data?.photoUrls?.length ? data.photoUrls : [`/api/places/photo?name=${encodeURIComponent(shop.name)}&address=${encodeURIComponent(shop.address)}`],
  };
}

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

function ShopImage({ shop, className }: { shop: CoffeeShop; className?: string }) {
  const [useFallback, setUseFallback] = useState(false);
  const src = useFallback
    ? shop.image
    : `/api/places/photo?name=${encodeURIComponent(shop.name)}&address=${encodeURIComponent(shop.address)}`;
  return (
    <img src={src} alt={shop.name} className={className}
      onError={() => { if (!useFallback) setUseFallback(true); }} loading="lazy" />
  );
}

function PhotoGallery({ shop }: { shop: CoffeeShop }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedIndexes, setFailedIndexes] = useState<Set<number>>(new Set());
  const { photoUrls } = useShopPhotos(shop);

  const goNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % photoUrls.length);
  }, [photoUrls.length]);

  const goPrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length);
  }, [photoUrls.length]);

  return (
    <div className="relative h-72 w-full shrink-0 overflow-hidden bg-muted group/gallery">
      {photoUrls.map((url, i) => (
        <img key={i}
          src={failedIndexes.has(i) ? shop.image : url}
          alt={`${shop.name} photo ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${i === currentIndex ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onError={() => setFailedIndexes((prev) => new Set(prev).add(i))}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
      {photoUrls.length > 1 && (
        <>
          <button onClick={goPrev} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/gallery:opacity-100 transition-opacity z-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={goNext} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover/gallery:opacity-100 transition-opacity z-30">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-30">
            {photoUrls.map((_, i) => (
              <button key={i} onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
                className={`rounded-full transition-all ${i === currentIndex ? "w-2.5 h-2.5 bg-white" : "w-2 h-2 bg-white/50 hover:bg-white/75"}`} />
            ))}
          </div>
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 z-30">
            <Camera className="w-3 h-3" /> {currentIndex + 1} / {photoUrls.length}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewStars({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button key={star} type="button" disabled={!interactive}
          className={interactive ? "cursor-pointer" : "cursor-default"}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate?.(star)}>
          <Star className={`w-4 h-4 transition-colors ${(hover || rating) >= star ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewSection({ shopId }: { shopId: string }) {
  const queryClient = useQueryClient();
  const [userName, setUserName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const { data: reviews = [], isLoading } = useQuery<Review[]>({
    queryKey: [`reviews-${shopId}`],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/${shopId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: { shopId: string; userName: string; rating: number; comment: string }) => {
      const res = await apiRequest("POST", "/api/reviews", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`reviews-${shopId}`] });
      setUserName(""); setComment(""); setRating(0);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !comment.trim() || rating === 0) return;
    mutation.mutate({ shopId, userName: userName.trim(), rating, comment: comment.trim() });
  };

  return (
    <div className="border-t border-border/50 pt-6 mt-6">
      <h3 className="text-lg font-serif font-bold text-foreground mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        Community Reviews
        {reviews.length > 0 && <span className="text-sm font-normal text-muted-foreground">({reviews.length})</span>}
      </h3>
      <form onSubmit={handleSubmit} className="bg-muted/30 rounded-xl p-4 mb-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <input placeholder="Your name" value={userName} onChange={(e) => setUserName(e.target.value)}
              className="w-full h-9 px-3 text-sm bg-white border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Rating:</span>
            <ReviewStars rating={rating} onRate={setRating} interactive />
          </div>
        </div>
        <textarea placeholder="Share your experience..." value={comment} onChange={(e) => setComment(e.target.value)}
          className="w-full text-sm bg-white border border-border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" rows={2} />
        <div className="flex justify-between items-center">
          {submitted && <p className="text-xs text-green-600 font-medium">Thanks for your review!</p>}
          {mutation.isError && <p className="text-xs text-red-500 font-medium">Something went wrong. Try again.</p>}
          <div className="ml-auto">
            <button type="submit" disabled={!userName.trim() || !comment.trim() || rating === 0 || mutation.isPending}
              className="flex items-center gap-1 text-xs h-8 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              <Send className="w-3 h-3" />
              {mutation.isPending ? "Posting..." : "Post Review"}
            </button>
          </div>
        </div>
      </form>
      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 italic">No reviews yet. Be the first to share your experience!</p>
        ) : reviews.map((review) => (
          <div key={review.id} className="bg-muted/20 rounded-lg p-3 border border-border/30">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{review.userName}</span>
              </div>
              <div className="flex items-center gap-2">
                <ReviewStars rating={review.rating} />
                <span className="text-[10px] text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed pl-8">{review.comment}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Modal component
function ShopModal({ shop, onClose }: { shop: CoffeeShop; onClose: () => void }) {
  const { rating, reviewCount } = useGoogleRating(shop);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[90vh] overflow-hidden border border-border/50"
        onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="overflow-y-auto max-h-[90vh]">
          <div className="relative">
            <PhotoGallery shop={shop} />
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-transparent to-transparent pointer-events-none z-20" />
            <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none z-20">
              <div>
                <span className="inline-block bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full mb-2">{shop.area}</span>
                <h2 className="text-3xl font-serif font-bold text-foreground">{shop.name}</h2>
              </div>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(shop.name + ' ' + shop.address)}`} target="_blank" rel="noopener noreferrer"
                className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm mb-1 hover:bg-white transition-colors">
                <GoogleIcon className="w-4 h-4" />
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-gray-800">{rating}</span>
                <span className="text-xs text-gray-500">({reviewCount} reviews)</span>
              </a>
            </div>
          </div>
          <div className="p-8">
            <p className="text-base text-muted-foreground leading-relaxed mb-6">{shop.description}</p>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Address</p>
                  <a href={shop.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary hover:underline">{shop.address}</a>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                {shop.tags.map((tag) => (
                  <span key={tag} className="inline-block bg-secondary text-secondary-foreground text-xs px-3 py-1 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <a href={shop.menuUrl && shop.menuUrl !== "#" ? shop.menuUrl : `https://www.google.com/search?q=${encodeURIComponent(shop.name + " St Louis menu")}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 border-2 border-border rounded-xl text-sm font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 transition-colors">
                <Menu className="w-4 h-4" /> {shop.menuUrl && shop.menuUrl !== "#" ? "View Menu" : "Find Website"}
              </a>
              <a href={shop.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Map className="w-4 h-4" /> Get Directions
              </a>
            </div>
            <ReviewSection shopId={shop.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CoffeeCard({ shop }: { shop: CoffeeShop }) {
  const [open, setOpen] = useState(false);
  const { rating, reviewCount } = useGoogleRating(shop);

  return (
    <>
      <div onClick={() => setOpen(true)}
        className="overflow-hidden group hover:shadow-lg transition-all duration-300 border border-border/50 bg-card rounded-2xl flex flex-col h-full cursor-pointer hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden">
          <ShopImage shop={shop} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
          <a href={`https://www.google.com/search?q=${encodeURIComponent(shop.name + ' ' + shop.address)}`} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1.5 shadow-sm hover:bg-white transition-colors">
            <GoogleIcon className="w-3 h-3" />
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold text-gray-800">{rating}</span>
            <span className="text-[10px] text-gray-500">({reviewCount})</span>
          </a>
        </div>
        <div className="p-4 pb-2">
          <h3 className="font-serif text-xl font-bold text-foreground leading-tight mb-1">{shop.name}</h3>
          <div className="flex items-center text-muted-foreground text-xs gap-1">
            <MapPin className="w-3 h-3" /> {shop.area}
          </div>
        </div>
        <div className="p-4 py-2 flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed mb-3">{shop.description}</p>
          <a href={shop.googleMapsUrl} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-muted-foreground/70 mb-3 hover:text-primary hover:underline">{shop.address}</a>
          <div className="flex flex-wrap gap-1 mt-auto">
            {shop.tags.map((tag) => (
              <span key={tag} className="inline-block bg-secondary text-secondary-foreground text-[10px] px-2 py-0.5 rounded-full font-normal">{tag}</span>
            ))}
          </div>
        </div>
        <div className="p-4 pt-2 grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-1 py-1.5 px-3 border border-primary/20 rounded-lg text-xs font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
            <Info className="w-3 h-3" /> Details
          </button>
          <a href={shop.googleMapsUrl} target="_blank" rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1 py-1.5 px-3 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors">
            <Map className="w-3 h-3" /> Directions
          </a>
        </div>
      </div>
      {open && <ShopModal shop={shop} onClose={() => setOpen(false)} />}
    </>
  );
}


