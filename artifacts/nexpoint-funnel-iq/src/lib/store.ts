import { getStoredCustomerId } from "./auth";

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  salePrice: number | null;
  onSale: boolean;
  quantity: number;
  category: string;
}

export interface WishlistItem {
  productId: number;
  name: string;
  price: number;
  salePrice: number | null;
  onSale: boolean;
  category: string;
}

function cartKey(): string {
  const id = getStoredCustomerId();
  return id != null ? `hm_cart_${id}` : "hm_cart_anon";
}

function wishlistKey(): string {
  const id = getStoredCustomerId();
  return id != null ? `hm_wishlist_${id}` : "hm_wishlist_anon";
}

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(cartKey()) ?? "[]");
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(cartKey(), JSON.stringify(cart));
}

export function addToCart(item: Omit<CartItem, "quantity">): CartItem[] {
  const cart = getCart();
  const existing = cart.find((c) => c.productId === item.productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }
  saveCart(cart);
  return cart;
}

export function removeFromCart(productId: number): CartItem[] {
  const cart = getCart().filter((c) => c.productId !== productId);
  saveCart(cart);
  return cart;
}

export function updateCartQty(productId: number, quantity: number): CartItem[] {
  const cart = getCart();
  const item = cart.find((c) => c.productId === productId);
  if (item) item.quantity = Math.max(1, quantity);
  saveCart(cart);
  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(cartKey());
}

export function getCartCount(): number {
  return getCart().reduce((sum, c) => sum + c.quantity, 0);
}

export function getWishlist(): WishlistItem[] {
  try {
    return JSON.parse(localStorage.getItem(wishlistKey()) ?? "[]");
  } catch {
    return [];
  }
}

export function saveWishlist(items: WishlistItem[]): void {
  localStorage.setItem(wishlistKey(), JSON.stringify(items));
}

export function addToWishlist(item: WishlistItem): WishlistItem[] {
  const wishlist = getWishlist();
  if (!wishlist.find((w) => w.productId === item.productId)) {
    wishlist.push(item);
  }
  saveWishlist(wishlist);
  return wishlist;
}

export function removeFromWishlist(productId: number): WishlistItem[] {
  const wishlist = getWishlist().filter((w) => w.productId !== productId);
  saveWishlist(wishlist);
  return wishlist;
}

export function isInWishlist(productId: number): boolean {
  return getWishlist().some((w) => w.productId === productId);
}

export function getWishlistIds(): Set<number> {
  return new Set(getWishlist().map((w) => w.productId));
}

export function getWishlistCount(): number {
  return getWishlist().length;
}

export function moveWishlistItemsToCart(productIds: number[]): void {
  const wishlist = getWishlist();
  for (const id of productIds) {
    const item = wishlist.find((w) => w.productId === id);
    if (item) {
      addToCart(item);
    }
  }
  const remaining = getWishlist().filter((w) => !productIds.includes(w.productId));
  saveWishlist(remaining);
}
