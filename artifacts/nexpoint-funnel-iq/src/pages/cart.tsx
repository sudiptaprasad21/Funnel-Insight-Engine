import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { isLoggedIn, getStoredCustomerName, clearCustomer } from "@/lib/auth";
import { CartItem, getCart, removeFromCart, updateCartQty, clearCart } from "@/lib/store";
import { PRODUCT_IMAGES, FALLBACK_IMAGE } from "@/lib/product-images";
import { trackFunnelEvent } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft, CheckCircle, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

function HappyMomLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#FEE2E2" />
      <path d="M20 30C20 30 10 23 10 16C10 12.686 12.686 10 16 10C17.862 10 19.525 10.87 20.6 12.23C20.775 12.449 21.225 12.449 21.4 12.23C22.475 10.87 24.138 10 26 10C29.314 10 32 12.686 32 16C32 23 22 30 20 30Z" fill="#DC2626" />
      <path d="M17 19L16 21H18L17 23M20 18L20 23M23 19L24 21H22L23 23" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function makeOrderNumber() {
  return `HM-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}

export default function CartPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const customerName = getStoredCustomerName();

  const [items, setItems] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedOpen, setConfirmedOpen] = useState(false);
  const [orderNumber] = useState(makeOrderNumber);

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.replace("/login");
      return;
    }
    setItems(getCart());

    const handleAbandon = () => {
      const cart = getCart();
      if (cart.length > 0) {
        trackFunnelEvent("cart_abandon");
      }
    };
    window.addEventListener("beforeunload", handleAbandon);
    return () => window.removeEventListener("beforeunload", handleAbandon);
  }, []);

  const handleRemove = (productId: number) => {
    setItems(removeFromCart(productId));
    toast({ title: "Item removed from cart" });
  };

  const handleQty = (productId: number, delta: number) => {
    const item = items.find((i) => i.productId === productId);
    if (!item) return;
    const next = item.quantity + delta;
    if (next < 1) {
      handleRemove(productId);
    } else {
      setItems(updateCartQty(productId, next));
    }
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.onSale && item.salePrice != null ? item.salePrice : item.price;
    return sum + price * item.quantity;
  }, 0);

  const savings = items.reduce((sum, item) => {
    if (item.onSale && item.salePrice != null) {
      return sum + (item.price - item.salePrice) * item.quantity;
    }
    return sum;
  }, 0);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  const handlePlaceOrder = () => {
    trackFunnelEvent("purchase");
    clearCart();
    setItems([]);
    setCheckoutOpen(false);
    setConfirmedOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FFFBF9] font-sans">
      {/* Header */}
      <header className="border-b border-red-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <button
            className="flex items-center gap-2 group"
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
              onClick={() => {
                if (items.length > 0) trackFunnelEvent("cart_abandon");
                navigate("/");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Continue Shopping
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

      <main className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-10">
          <h1 className="text-3xl font-serif font-bold text-slate-900">Your Cart</h1>
          {items.length > 0 && (
            <p className="text-slate-500 mt-1">{totalItems} item{totalItems !== 1 ? "s" : ""}</p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-50 mb-6">
              <ShoppingBag className="h-10 w-10 text-red-300" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-3">Your cart is empty</h2>
            <p className="text-slate-500 mb-8">Looks like you haven't added anything yet.</p>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8"
              onClick={() => navigate("/")}
            >
              Shop the Sale
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const imgSrc = PRODUCT_IMAGES[item.productId] ?? FALLBACK_IMAGE;
                const displayPrice = item.onSale && item.salePrice != null ? item.salePrice : item.price;
                return (
                  <div
                    key={item.productId}
                    className="bg-white rounded-2xl p-5 flex gap-5 items-center shadow-sm border border-slate-100"
                  >
                    <div className="h-24 w-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-50">
                      <img src={imgSrc} alt={item.name} className="h-full w-full object-cover" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">{item.category}</p>
                      <h3 className="font-semibold text-slate-900 leading-tight mb-2">{item.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600">₹{displayPrice.toFixed(2)}</span>
                        {item.onSale && item.salePrice != null && (
                          <span className="text-slate-400 line-through text-sm">₹{item.price.toFixed(2)}</span>
                        )}
                        {item.onSale && (
                          <Badge className="bg-red-100 text-red-700 border-none text-xs rounded-full px-2 py-0">
                            Sale
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                        <button
                          className="h-9 w-9 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                          onClick={() => handleQty(item.productId, -1)}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-sm font-semibold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          className="h-9 w-9 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                          onClick={() => handleQty(item.productId, 1)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-bold text-slate-900 min-w-[64px] text-right">
                        ₹{(displayPrice * item.quantity).toFixed(2)}
                      </span>

                      <button
                        className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        onClick={() => handleRemove(item.productId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl p-7 shadow-sm border border-slate-100 sticky top-24">
                <h2 className="text-lg font-bold text-slate-900 mb-6">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal ({totalItems} item{totalItems !== 1 ? "s" : ""})</span>
                    <span className="font-medium text-slate-900">₹{(subtotal + savings).toFixed(2)}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-700">Sale savings</span>
                      <span className="font-medium text-green-700">−₹{savings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Delivery</span>
                    <span className="font-medium text-green-700">Free</span>
                  </div>
                </div>

                <Separator className="mb-6" />

                <div className="flex justify-between mb-8">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-2xl font-bold text-red-600">₹{subtotal.toFixed(2)}</span>
                </div>

                {savings > 0 && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-6 text-center">
                    <p className="text-green-700 text-sm font-medium">
                      You're saving ₹{savings.toFixed(2)} on this order!
                    </p>
                  </div>
                )}

                <Button
                  size="lg"
                  className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl h-13 text-base"
                  onClick={() => {
                    trackFunnelEvent("checkout_start");
                    setCheckoutOpen(true);
                  }}
                  data-testid="button-checkout"
                >
                  Proceed to Checkout
                </Button>

                <p className="text-center text-xs text-slate-400 mt-4">
                  Secure demo checkout · No real payment processed
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Checkout confirmation dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif font-bold text-slate-900">Confirm Your Order</DialogTitle>
            <DialogDescription className="text-slate-500">
              Review your items before placing the order.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-4 max-h-60 overflow-y-auto">
            {items.map((item) => {
              const displayPrice = item.onSale && item.salePrice != null ? item.salePrice : item.price;
              return (
                <div key={item.productId} className="flex justify-between items-center text-sm">
                  <span className="text-slate-700 flex-1 truncate mr-4">
                    {item.name} <span className="text-slate-400">× {item.quantity}</span>
                  </span>
                  <span className="font-semibold text-slate-900 flex-shrink-0">
                    ₹{(displayPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="flex justify-between items-center py-3">
            <span className="font-bold text-slate-900">Total</span>
            <span className="text-xl font-bold text-red-600">₹{subtotal.toFixed(2)}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setCheckoutOpen(false)}
            >
              Back to Cart
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl"
              onClick={handlePlaceOrder}
              data-testid="button-place-order"
            >
              Place Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order confirmed dialog */}
      <Dialog open={confirmedOpen} onOpenChange={setConfirmedOpen}>
        <DialogContent className="max-w-md rounded-2xl text-center">
          <div className="py-6">
            <div className="flex justify-center mb-5">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-9 w-9 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">Order Confirmed!</h2>
            <p className="text-slate-500 mb-4">
              Thank you for your purchase. Your order has been placed successfully.
            </p>
            <div className="bg-slate-50 rounded-xl px-6 py-4 inline-block mb-6">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">Order Number</p>
              <p className="font-mono font-bold text-lg text-slate-900">{orderNumber}</p>
            </div>
            <div className="flex items-center justify-center gap-2 text-slate-500 text-sm mb-8">
              <Package className="h-4 w-4" />
              <span>Estimated delivery: 3–5 business days</span>
            </div>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-8"
              onClick={() => { setConfirmedOpen(false); navigate("/"); }}
              data-testid="button-continue-shopping"
            >
              Continue Shopping
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
