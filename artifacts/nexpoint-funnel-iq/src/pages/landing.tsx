import { useEffect, useState } from "react";
import { trackFunnelEvent } from "@/lib/tracking";
import { getStoredCustomerName, clearCustomer, isLoggedIn } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Heart, ShoppingCart, Star, Check } from "lucide-react";
import nursingBraImg from "@/assets/images/nursing-bra.png";
import bambooNappiesImg from "@/assets/images/bamboo-nappies.png";
import bellyButterImg from "@/assets/images/belly-butter.png";
import swaddleBlanketsImg from "@/assets/images/swaddle-blankets.png";
import sleepGroBagImg from "@/assets/images/sleep-gro-bag.png";
import breastPumpImg from "@/assets/images/breast-pump.png";
import pyjamaSetImg from "@/assets/images/pyjama-set.png";
import recoveryKitImg from "@/assets/images/recovery-kit.png";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

const PRODUCT_IMAGES: Record<number, string> = {
  1: nursingBraImg,
  2: bambooNappiesImg,
  3: bellyButterImg,
  4: swaddleBlanketsImg,
  5: sleepGroBagImg,
  6: breastPumpImg,
  7: pyjamaSetImg,
  8: recoveryKitImg,
};

const SALE_END = new Date("2026-05-31T23:59:59");

function HappyMomLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#FEE2E2" />
      <path d="M20 30C20 30 10 23 10 16C10 12.686 12.686 10 16 10C17.862 10 19.525 10.87 20.6 12.23C20.775 12.449 21.225 12.449 21.4 12.23C22.475 10.87 24.138 10 26 10C29.314 10 32 12.686 32 16C32 23 22 30 20 30Z" fill="#DC2626" />
      <path d="M17 19L16 21H18L17 23M20 18L20 23M23 19L24 21H22L23 23" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingPage() {
  const { toast } = useToast();
  const customerName = getStoredCustomerName();

  const [timeLeft, setTimeLeft] = useState(SALE_END.getTime() - Date.now());
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());
  const [cartFlash, setCartFlash] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.replace("/login");
      return;
    }
    trackFunnelEvent("page_view");
    const timer = setInterval(() => {
      setTimeLeft(SALE_END.getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: products, isLoading } = useListProducts(undefined, {
    query: { queryKey: getListProductsQueryKey() },
  });

  const days    = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60 * 24)));
  const hours   = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutes = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));

  const handleBannerClick = () => {
    trackFunnelEvent("banner_click");
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleProductView = (productId: number, isSale: boolean) => {
    trackFunnelEvent(isSale ? "sale_item_view" : "browse_only", undefined, productId);
  };

  const handleAddToCart = (productId: number, productName: string) => {
    trackFunnelEvent("add_to_cart", undefined, productId);
    setCartCount((c) => c + 1);
    setCartFlash(true);
    setTimeout(() => setCartFlash(false), 500);
    toast({
      title: "Added to cart!",
      description: `${productName} has been added to your cart.`,
    });
  };

  const handleAddToWishlist = (productId: number, productName: string) => {
    trackFunnelEvent("add_to_wishlist", undefined, productId);
    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
        toast({ title: "Removed from wishlist", description: productName });
      } else {
        next.add(productId);
        toast({ title: "Saved to wishlist!", description: `${productName} added to your wishlist.` });
      }
      return next;
    });
  };

  const handleCheckout = () => {
    trackFunnelEvent("checkout_start");
    if (cartCount === 0) {
      toast({ title: "Your cart is empty", description: "Add some products before checking out." });
      return;
    }
    toast({ title: "Proceeding to checkout…", description: `${cartCount} item${cartCount > 1 ? "s" : ""} in cart.` });
  };

  const handleSubscribe = () => {
    trackFunnelEvent("nappy_subscription_click");
    toast({ title: "Subscription started!", description: "You'll receive your first delivery within 3–5 days." });
  };

  const handleShopSale = () => {
    trackFunnelEvent("banner_click");
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#FFFBF9] font-sans">
      {/* Demo overlay */}
      <div className="bg-slate-900 text-white p-3 text-center text-sm font-medium flex items-center justify-center gap-4">
        <span>Happy Mom demo store — every interaction is tracked in real time.</span>
        <Button asChild variant="secondary" size="sm" className="h-8">
          <a href="/funnel-iq/dashboard" data-testid="link-view-analytics">
            View Campaign Analytics
          </a>
        </Button>
      </div>

      {/* Header */}
      <header className="border-b border-red-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HappyMomLogo className="h-9 w-9" />
            <span className="text-2xl font-serif text-red-900 font-bold tracking-tight">Happy Mom</span>
          </div>

          {customerName && (
            <p className="hidden md:block text-sm text-slate-500">
              Welcome back, <span className="font-semibold text-red-700">{customerName.split(" ")[0]}</span> 👋
            </p>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => trackFunnelEvent("browse_only")}
              data-testid="button-header-wishlist"
              className="relative"
            >
              <Heart className="h-5 w-5 text-red-800" />
              {wishlistIds.size > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {wishlistIds.size}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCheckout}
              data-testid="button-header-cart"
              className={`relative transition-transform ${cartFlash ? "scale-125" : ""}`}
            >
              <ShoppingCart className="h-5 w-5 text-red-800" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </Button>
            {customerName && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-slate-600"
                onClick={() => { clearCustomer(); window.location.href = "/login"; }}
              >
                Sign out
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section
        className="bg-red-50 py-20 px-4 cursor-pointer relative overflow-hidden"
        onClick={handleBannerClick}
        data-testid="banner-mothers-day"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-100/50 to-transparent pointer-events-none" />
        <div className="container mx-auto text-center relative z-10 max-w-2xl">
          <Badge className="bg-red-200 text-red-900 hover:bg-red-200 mb-6 px-4 py-1 text-sm rounded-full">
            May Sale — All Month Long
          </Badge>
          <h1 className="text-5xl font-serif font-bold text-red-950 mb-6 leading-tight">
            Celebrate Motherhood
          </h1>
          <p className="text-lg text-red-800/80 mb-10 leading-relaxed">
            Our biggest Mother's Day sale runs all of May. Treat yourself or a special mom with our premium organic collection.
          </p>

          <div className="inline-flex items-center gap-4 bg-white/60 backdrop-blur px-8 py-4 rounded-2xl shadow-sm border border-red-100 mb-10">
            <CountBox value={days} label="Days" />
            <span className="text-2xl text-red-300 font-light">:</span>
            <CountBox value={hours} label="Hours" />
            <span className="text-2xl text-red-300 font-light">:</span>
            <CountBox value={minutes} label="Mins" />
          </div>

          <div>
            <Button
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 h-14 text-lg"
              onClick={(e) => { e.stopPropagation(); handleShopSale(); }}
            >
              Shop the Sale
            </Button>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Curated for Comfort</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Discover our best-selling essentials, made with love and organic materials.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-square rounded-2xl" />
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              ))
            : products?.map((product) => {
                const imgSrc = PRODUCT_IMAGES[product.id] ?? nursingBraImg;

                const inWishlist = wishlistIds.has(product.id);

                return (
                  <Card
                    key={product.id}
                    className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white rounded-2xl cursor-pointer"
                    onClick={() => handleProductView(product.id, product.onSale)}
                    data-testid={`card-product-${product.id}`}
                  >
                    <div className="aspect-square relative overflow-hidden bg-slate-50">
                      {product.onSale && (
                        <Badge className="absolute top-4 left-4 z-10 bg-red-500 text-white border-none rounded-full px-3 py-1">
                          Sale
                        </Badge>
                      )}
                      <img
                        src={imgSrc}
                        alt={product.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </div>
                    <CardContent className="p-6">
                      <div className="text-sm text-slate-500 mb-2 font-medium tracking-wide uppercase">
                        {product.category}
                      </div>
                      <h3 className="font-bold text-lg text-slate-900 mb-2 leading-tight">{product.name}</h3>
                      <div className="flex items-center gap-3 mb-6">
                        {product.onSale && product.salePrice ? (
                          <>
                            <span className="font-bold text-xl text-red-600">
                              ₹{Number(product.salePrice).toFixed(2)}
                            </span>
                            <span className="text-slate-400 line-through text-sm">
                              ₹{Number(product.price).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-xl text-slate-900">
                            ₹{Number(product.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product.id, product.name);
                          }}
                          data-testid={`button-add-cart-${product.id}`}
                        >
                          Add to Cart
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className={`rounded-xl border-slate-200 transition-colors ${
                            inWishlist
                              ? "bg-red-50 border-red-200 text-red-500"
                              : "text-slate-600 hover:border-red-200 hover:text-red-500"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToWishlist(product.id, product.name);
                          }}
                          data-testid={`button-wishlist-${product.id}`}
                        >
                          {inWishlist ? (
                            <Heart className="h-4 w-4 fill-current" />
                          ) : (
                            <Heart className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      </section>

      {/* Subscription Section */}
      <section className="py-24 bg-red-50/50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-red-100 flex flex-col md:flex-row">
            <div className="md:w-1/2 relative bg-slate-50 min-h-[300px]">
              <img
                src={bambooNappiesImg}
                alt="Eco Nappy Subscription"
                className="object-cover h-full w-full absolute inset-0"
              />
            </div>
            <div className="md:w-1/2 p-12 md:p-16 flex flex-col justify-center">
              <Badge className="w-fit bg-red-100 text-red-800 hover:bg-red-100 mb-6 border-none rounded-full px-4 py-1">
                Subscription
              </Badge>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-6">
                Never run out of nappies again.
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Premium eco-friendly nappies delivered to your door exactly when you need them. Save 15% and skip the late-night store runs.
              </p>
              <ul className="space-y-4 mb-10">
                {[
                  "100% biodegradable bamboo",
                  "Hypoallergenic & chemical-free",
                  "Flexible delivery schedule",
                  "Cancel anytime",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Star className="h-3 w-3 text-red-600 fill-current" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl h-14 text-lg w-full sm:w-auto"
                onClick={handleSubscribe}
                data-testid="button-subscribe-nappies"
              >
                Subscribe Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <HappyMomLogo className="h-8 w-8" />
          <span className="text-2xl font-serif text-white font-bold tracking-tight">Happy Mom</span>
        </div>
        <p className="max-w-md mx-auto mb-8 leading-relaxed">
          Supporting mothers with premium, sustainable products for every stage of the journey.
        </p>
        <div className="pt-8 border-t border-slate-800 text-sm flex flex-col items-center gap-4">
          <p>© 2026 Happy Mom Demo Store. All rights reserved.</p>
          <Button asChild variant="link" className="text-slate-300 hover:text-white">
            <a href="/funnel-iq/dashboard" data-testid="link-footer-analytics">
              Growth Manager Login →
            </a>
          </Button>
        </div>
      </footer>
    </div>
  );
}

function CountBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[52px]">
      <span className="text-3xl font-bold text-red-600 tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-xs font-medium text-red-900 uppercase tracking-wider">{label}</span>
    </div>
  );
}
