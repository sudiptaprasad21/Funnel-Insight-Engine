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

const CART_KEY = "hm_cart";
const WISHLIST_KEY = "hm_wishlist";

export function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
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
  localStorage.removeItem(CART_KEY);
}

export function getCartCount(): number {
  return getCart().reduce((sum, c) => sum + c.quantity, 0);
}

export function getWishlist(): WishlistItem[] {
  try {
    return JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveWishlist(items: WishlistItem[]): void {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
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
