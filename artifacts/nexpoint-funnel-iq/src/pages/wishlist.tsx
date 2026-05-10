import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { isLoggedIn, getStoredCustomerName, clearCustomer } from "@/lib/auth";
import { WishlistItem, getWishlist, removeFromWishlist, moveWishlistItemsToCart } from "@/lib/store";
import { PRODUCT_IMAGES, FALLBACK_IMAGE } from "@/lib/product-images";
import { trackFunnelEvent } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Heart, ArrowLeft, ShoppingCart, Trash2, ShoppingBag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

function HappyMomLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#FEE2E2" />
      <path d="M20 30C20 30 10 23 10 16C10 12.686 12.686 10 16 10C17.862 10 19.525 10.87 20.6 12.23C20.775 12.449 21.225 12.449 21.4 12.23C22.475 10.87 24.138 10 26 10C29.314 10 32 12.686 32 16C32 23 22 30 20 30Z" fill="#DC2626" />
      <path d="M17 19L16 21H18L17 23M20 18L20 23M23 19L24 21H22L23 23" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WishlistPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const customerName = getStoredCustomerName();

  const [items, setItems] = useState<WishlistItem[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.replace("/login");
      return;
    }
    setItems(getWishlist());
  }, []);

  const toggleSelect = (productId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.productId)));
    }
  };

  const handleRemove = (productId: number) => {
    setItems(removeFromWishlist(productId));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
    trackFunnelEvent("remove_from_wishlist", undefined, productId);
    toast({ title: "Removed from wishlist" });
  };

  const handleMoveSelectedToCart = () => {
    if (selected.size === 0) {
      toast({ title: "No items selected", description: "Tick the items you want to move to cart." });
      return;
    }
    const ids = Array.from(selected);
    moveWishlistItemsToCart(ids);
    setItems(getWishlist());
    setSelected(new Set());
    // Fire per-product wishlist_to_cart events so we know exactly which products convert
    ids.forEach((id) => trackFunnelEvent("wishlist_to_cart", undefined, id));
    toast({
      title: `${ids.length} item${ids.length !== 1 ? "s" : ""} moved to cart`,
      description: "Head to your cart to checkout.",
    });
  };

  const handleAddOneToCart = (item: WishlistItem) => {
    moveWishlistItemsToCart([item.productId]);
    setItems(getWishlist());
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(item.productId);
      return next;
    });
    trackFunnelEvent("wishlist_to_cart", undefined, item.productId);
    toast({
      title: "Moved to cart!",
      description: item.name,
    });
  };

  return (
    <div className="min-h-screen bg-[#FFFBF9] font-sans">
      {/* Header */}
      <header className="border-b border-red-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            className="flex items-center gap-2"
            onClick={() => navigate("/")}
          >
            <HappyMomLogo className="h-9 w-9" />
            <span className="text-2xl font-serif text-red-900 font-bold tracking-tight">Happy Mom</span>
          </button>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-slate-600 hover:text-red-700"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-slate-600 hover:text-red-700"
              onClick={() => navigate("/cart")}
            >
              <ShoppingCart className="h-4 w-4" />
              Go to Cart
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

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center justify-between mb-10 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Your Wishlist</h1>
            {items.length > 0 && (
              <p className="text-slate-500 mt-1">{items.length} saved item{items.length !== 1 ? "s" : ""}</p>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 text-slate-600"
                onClick={toggleSelectAll}
              >
                {selected.size === items.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl gap-2"
                onClick={handleMoveSelectedToCart}
                disabled={selected.size === 0}
                data-testid="button-move-to-cart"
              >
                <ShoppingCart className="h-4 w-4" />
                Move {selected.size > 0 ? `(${selected.size}) ` : ""}to Cart
              </Button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-50 mb-6">
              <Heart className="h-10 w-10 text-red-300" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-3">Your wishlist is empty</h2>
            <p className="text-slate-500 mb-8">Save items you love and come back to them later.</p>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8"
              onClick={() => navigate("/")}
            >
              Browse Products
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const imgSrc = PRODUCT_IMAGES[item.productId] ?? FALLBACK_IMAGE;
              const displayPrice = item.onSale && item.salePrice != null ? item.salePrice : item.price;
              const isSelected = selected.has(item.productId);

              return (
                <div
                  key={item.productId}
                  className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all cursor-pointer ${
                    isSelected ? "border-red-400 ring-2 ring-red-100" : "border-slate-100"
                  }`}
                  onClick={() => toggleSelect(item.productId)}
                >
                  <div className="relative aspect-square bg-slate-50">
                    <img
                      src={imgSrc}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(item.productId)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 w-5 border-2 border-white shadow data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                      />
                    </div>
                    {item.onSale && (
                      <Badge className="absolute top-3 right-3 bg-red-500 text-white border-none rounded-full px-3">
                        Sale
                      </Badge>
                    )}
                  </div>

                  <div className="p-5">
                    <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">{item.category}</p>
                    <h3 className="font-semibold text-slate-900 leading-tight mb-3">{item.name}</h3>

                    <div className="flex items-center gap-2 mb-5">
                      <span className="font-bold text-red-600">₹{displayPrice.toFixed(2)}</span>
                      {item.onSale && item.salePrice != null && (
                        <span className="text-slate-400 line-through text-sm">₹{item.price.toFixed(2)}</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 rounded-xl bg-slate-900 text-white hover:bg-slate-800 gap-1.5 text-sm"
                        onClick={(e) => { e.stopPropagation(); handleAddOneToCart(item); }}
                        data-testid={`button-wishlist-to-cart-${item.productId}`}
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Add to Cart
                      </Button>
                      <button
                        className="h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); handleRemove(item.productId); }}
                        data-testid={`button-wishlist-remove-${item.productId}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
