import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trackFunnelEvent } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ShoppingBag, ShoppingCart, Star, Clock } from "lucide-react";
import swaddleImg from "@/assets/images/swaddle.png";
import pillowImg from "@/assets/images/pillow.png";
import braImg from "@/assets/images/bra.png";
import nappiesImg from "@/assets/images/nappies.png";
import { useListProducts, getListProductsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function LandingPage() {
  const [timeLeft, setTimeLeft] = useState(
    new Date("2026-05-10").getTime() - new Date().getTime()
  );

  useEffect(() => {
    trackFunnelEvent("page_view");

    const timer = setInterval(() => {
      setTimeLeft(new Date("2026-05-10").getTime() - new Date().getTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const { data: products, isLoading } = useListProducts(undefined, {
    query: { queryKey: getListProductsQueryKey() }
  });

  const handleBannerClick = () => {
    trackFunnelEvent("banner_click");
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleProductView = (productId: number, isSale: boolean) => {
    trackFunnelEvent(isSale ? "sale_item_view" : "browse_only", undefined, productId);
  };

  const handleAddToCart = (productId: number) => {
    trackFunnelEvent("add_to_cart", undefined, productId);
  };

  const handleAddToWishlist = (productId: number) => {
    trackFunnelEvent("add_to_wishlist", undefined, productId);
  };

  const handleCheckout = () => {
    trackFunnelEvent("checkout_start");
  };

  const handleSubscribe = () => {
    trackFunnelEvent("nappy_subscription_click");
  };

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  return (
    <div className="min-h-screen bg-[#FFFBF9] font-sans">
      {/* Demo overlay */}
      <div className="bg-slate-900 text-white p-3 text-center text-sm font-medium flex items-center justify-center gap-4">
        <span>This is the Happy Mom demo store. Every interaction is tracked.</span>
        <Button asChild variant="secondary" size="sm" className="h-8">
          <Link href="/dashboard" data-testid="link-view-analytics">
            View Campaign Analytics
          </Link>
        </Button>
      </div>

      {/* Header */}
      <header className="border-b border-red-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-2xl font-serif text-red-900 font-bold tracking-tight">
            Happy Mom
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" size="icon" onClick={() => trackFunnelEvent("browse_only")} data-testid="button-header-wishlist">
              <Heart className="h-5 w-5 text-red-800" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCheckout} data-testid="button-header-cart">
              <ShoppingCart className="h-5 w-5 text-red-800" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mother's Day Hero Banner */}
      <section 
        className="bg-red-50 py-20 px-4 cursor-pointer relative overflow-hidden"
        onClick={handleBannerClick}
        data-testid="banner-mothers-day"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-red-100/50 to-transparent pointer-events-none" />
        <div className="container mx-auto text-center relative z-10 max-w-2xl">
          <Badge className="bg-red-200 text-red-900 hover:bg-red-200 mb-6 px-4 py-1 text-sm rounded-full">
            Special Campaign
          </Badge>
          <h1 className="text-5xl font-serif font-bold text-red-950 mb-6 leading-tight">
            Celebrate Motherhood
          </h1>
          <p className="text-lg text-red-800/80 mb-10 leading-relaxed">
            Mother's Day is May 10th. Treat yourself or a special mom in your life to our premium organic collection.
          </p>
          
          <div className="inline-flex items-center gap-6 bg-white/60 backdrop-blur px-8 py-4 rounded-2xl shadow-sm border border-red-100 mb-10">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-red-600">{days}</span>
              <span className="text-xs font-medium text-red-900 uppercase tracking-wider">Days</span>
            </div>
            <div className="text-2xl text-red-300">:</div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-red-600">{hours}</span>
              <span className="text-xs font-medium text-red-900 uppercase tracking-wider">Hours</span>
            </div>
          </div>
          
          <div>
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white rounded-full px-8 h-14 text-lg">
              Shop the Sale
            </Button>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24 container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-4">Curated for Comfort</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">Discover our best-selling essentials, made with love and organic materials.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ))
          ) : (
            products?.map((product) => {
              // Mapping real backend products to our generated images based on name keywords
              let imgSrc = product.imageUrl || swaddleImg;
              if (product.name.toLowerCase().includes('pillow')) imgSrc = pillowImg;
              else if (product.name.toLowerCase().includes('bra')) imgSrc = braImg;
              else if (product.name.toLowerCase().includes('napp')) imgSrc = nappiesImg;

              return (
                <Card 
                  key={product.id} 
                  className="group overflow-hidden border-none shadow-sm hover:shadow-md transition-all bg-white rounded-2xl"
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
                    <div className="text-sm text-slate-500 mb-2 font-medium tracking-wide uppercase">{product.category}</div>
                    <h3 className="font-bold text-lg text-slate-900 mb-2 leading-tight">{product.name}</h3>
                    <div className="flex items-center gap-3 mb-6">
                      {product.onSale && product.salePrice ? (
                        <>
                          <span className="font-bold text-xl text-red-600">${product.salePrice.toFixed(2)}</span>
                          <span className="text-slate-400 line-through text-sm">${product.price.toFixed(2)}</span>
                        </>
                      ) : (
                        <span className="font-bold text-xl text-slate-900">${product.price.toFixed(2)}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product.id);
                        }}
                        data-testid={`button-add-cart-${product.id}`}
                      >
                        Add to Cart
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="rounded-xl border-slate-200 text-slate-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToWishlist(product.id);
                        }}
                        data-testid={`button-wishlist-${product.id}`}
                      >
                        <Heart className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </section>

      {/* Subscription Section */}
      <section className="py-24 bg-red-50/50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-red-100 flex flex-col md:flex-row">
            <div className="md:w-1/2 relative bg-slate-50">
              <img src={nappiesImg} alt="Eco Nappy Subscription" className="object-cover h-full w-full absolute inset-0" />
            </div>
            <div className="md:w-1/2 p-12 md:p-16 flex flex-col justify-center">
              <Badge className="w-fit bg-red-100 text-red-800 hover:bg-red-100 mb-6 border-none rounded-full px-4 py-1">Subscription</Badge>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-6">Never run out of nappies again.</h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                Premium eco-friendly nappies delivered to your door exactly when you need them. Save 15% and skip the late-night store runs.
              </p>
              <ul className="space-y-4 mb-10">
                {['100% biodegradable bamboo', 'Hypoallergenic & chemical-free', 'Flexible delivery schedule', 'Cancel anytime'].map((feature, i) => (
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
        <div className="text-2xl font-serif text-white font-bold tracking-tight mb-6">
          Happy Mom
        </div>
        <p className="max-w-md mx-auto mb-8 leading-relaxed">
          Supporting mothers with premium, sustainable products for every stage of the journey.
        </p>
        <div className="pt-8 border-t border-slate-800 text-sm flex flex-col items-center gap-4">
          <p>© 2025 Happy Mom Demo Store. All rights reserved.</p>
          <Button asChild variant="link" className="text-slate-300 hover:text-white">
            <Link href="/dashboard" data-testid="link-footer-analytics">
              Growth Manager Login →
            </Link>
          </Button>
        </div>
      </footer>
    </div>
  );
}
