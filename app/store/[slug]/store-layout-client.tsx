"use client";

import Link from "next/link";
import { ShoppingCart, Shield, Store } from "lucide-react";
import { CartProvider, useCart } from "@/components/store/cart-context";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ReactNode } from "react";
import "./storefront.css";

type StoreInfo = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  currency: string;
  description: string | null;
};

export function StoreLayoutClient({
  children,
  store,
}: {
  children: ReactNode;
  store: StoreInfo;
}) {
  return (
    <CartProvider storeSlug={store.slug}>
      <div className="storefront">
        <StoreHeader store={store} />
        <main className="storefront__main">{children}</main>
        <StoreFooter store={store} />
      </div>
    </CartProvider>
  );
}

function StoreHeader({ store }: { store: StoreInfo }) {
  return (
    <header className="storefront__header">
      <Link href={`/store/${store.slug}`} className="storefront__brand">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logoUrl} alt={store.name} className="storefront__logo-img" />
        ) : (
          <Store size={32} />
        )}
      </Link>

      <div className="storefront__actions">
        <ThemeToggle />
        <CartButton slug={store.slug} />
      </div>
    </header>
  );
}

function CartButton({ slug }: { slug: string }) {
  const { totalItems } = useCart();

  return (
    <Link href={`/store/${slug}/cart`} className="storefront__cart-btn">
      <ShoppingCart size={18} />
      {totalItems > 0 && (
        <span className="storefront__cart-badge">{totalItems}</span>
      )}
    </Link>
  );
}

function StoreFooter({ store }: { store: StoreInfo }) {
  return (
    <footer className="storefront__footer">
      <div className="storefront__footer-inner">
        <span className="storefront__footer-powered">
          <Shield size={12} /> Powered by{" "}
          <a href="https://unseen.finance" target="_blank" rel="noreferrer">
            Unseen Finance
          </a>
        </span>
        <span className="storefront__footer-privacy">
          All payments are private &amp; shielded
        </span>
      </div>
    </footer>
  );
}
