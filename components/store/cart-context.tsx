"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CartItem = {
  productId: string;
  name: string;
  price: string; // BigInt string (raw units)
  imageUrl: string | null;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: bigint;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  storeSlug,
}: {
  children: ReactNode;
  storeSlug: string;
}) {
  const storageKey = `unseen_cart_${storeSlug}`;
  const [items, setItems] = useState<CartItem[]>([]);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  function addItem(item: Omit<CartItem, "qty">) {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }

  function updateQty(productId: string, qty: number) {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, qty } : i))
    );
  }

  function clearCart() {
    setItems([]);
  }

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalAmount = items.reduce(
    (sum, i) => sum + BigInt(i.price) * BigInt(i.qty),
    BigInt(0)
  );

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
