// src/scripts/cart.ts — localStorage-backed cart

export interface CartItem {
  id: string;
  title: string;
  price: number;
  unit: string;
  image: string | null;
  qty: number;
}

const KEY = 'qm-cart';

export function getCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('qm-cart-updated', { detail: items }));
}

export function addToCart(item: Omit<CartItem, 'qty'>, qty = 1) {
  const cart = getCart();
  const existing = cart.find(c => c.id === item.id);
  if (existing) existing.qty += qty;
  else cart.push({ ...item, qty });
  saveCart(cart);
}

export function updateQty(id: string, qty: number) {
  const cart = getCart();
  const item = cart.find(c => c.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
}

export function removeFromCart(id: string) {
  saveCart(getCart().filter(c => c.id !== id));
}

export function cartCount(): number {
  return getCart().reduce((sum, c) => sum + c.qty, 0);
}

export function cartTotal(): number {
  return getCart().reduce((sum, c) => sum + c.qty * c.price, 0);
}