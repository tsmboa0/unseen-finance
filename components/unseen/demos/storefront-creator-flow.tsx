"use client";

import { Plus, ShoppingBag, Store, X } from "lucide-react";
import {
  phaseProgress,
  rangeActive,
  typeByProgress,
} from "@/components/unseen/demo-utils";

export const STOREFRONT_CREATOR_PRODUCTS = [
  {
    src: "/uploads/cmomzv13u0000i9817vllsdnz_1777645265893_1qtt5j.png",
    name: "Essentials Tee",
    price: "24.00 USDC",
  },
  {
    src: "/uploads/cmomzv13u0000i9817vllsdnz_1777645526816_rc635c.png",
    name: "Studio Hoodie",
    price: "52.00 USDC",
  },
  {
    src: "/uploads/cmomzv13u0000i9817vllsdnz_1777645594537_6wl3kl.png",
    name: "Trail Pack",
    price: "38.00 USDC",
  },
  {
    src: "/uploads/cmomzv13u0000i9817vllsdnz_1777645639255_x2rmqy.png",
    name: "City Cap",
    price: "18.00 USDC",
  },
  {
    src: "/uploads/cmomzv13u0000i9817vllsdnz_1777645841601_vk10hl.png",
    name: "Weekend Shorts",
    price: "31.00 USDC",
  },
  {
    src: "/uploads/cmoy2bdpp0000gz817hcf3whe_1778317115386_3cu2oo.png",
    name: "Merch Bundle",
    price: "64.00 USDC",
  },
] as const;

const NAME_FULL = "Urban Youth Co";

/** Timeline normalized to a 5000ms loop; pass loopMs to scale. */
export function computeStorefrontCreatorPhase(t: number, loopMs: number) {
  const k = loopMs / 5000;
  const m = (ms: number) => ms * k;

  const fade =
    t > loopMs - 700
      ? 1 - phaseProgress(t, loopMs - 700, loopMs - 200)
      : 1;

  const dashOpacity =
    t < m(1040) ? 1 : t < m(1140) ? 1 - phaseProgress(t, m(1040), m(1140)) : 0;

  const drawerSlideIn = t < m(1040) ? 0 : phaseProgress(t, m(1040), m(1200));
  const drawerOpacity =
    t < m(1040)
      ? 0
      : t < m(1140)
        ? phaseProgress(t, m(1040), m(1140))
        : t < m(3280)
          ? 1
          : t < m(3400)
            ? 1 - phaseProgress(t, m(3280), m(3400))
            : 0;

  const storeOpacity =
    t < m(3260) ? 0 : t < m(3400) ? phaseProgress(t, m(3260), m(3400)) : 1;

  const newPress = rangeActive(t, m(680), m(880));
  const createPress = rangeActive(t, m(3040), m(3220));

  const nameTyped = typeByProgress(NAME_FULL, phaseProgress(t, m(1180), m(1980)));
  const slugHint = nameTyped.length >= NAME_FULL.length ? "urban-youth-co" : "";
  const descTyped = typeByProgress(
    "Privacy-first checkout for our community drop.",
    phaseProgress(t, m(2050), m(2920)),
  );

  const tStore = m(3400);
  const hoverIdx =
    t >= tStore
      ? Math.floor(((t - tStore) / (900 * k)) % STOREFRONT_CREATOR_PRODUCTS.length)
      : -1;

  return {
    fade,
    dashOpacity,
    drawerSlideIn,
    drawerOpacity,
    storeOpacity,
    newPress,
    createPress,
    nameTyped,
    slugHint,
    descTyped,
    hoverIdx,
  };
}

export function StorefrontCreatorFlowUI({
  phase,
}: {
  phase: ReturnType<typeof computeStorefrontCreatorPhase>;
}) {
  const {
    fade,
    dashOpacity,
    drawerSlideIn,
    drawerOpacity,
    storeOpacity,
    newPress,
    createPress,
    nameTyped,
    slugHint,
    descTyped,
    hoverIdx,
  } = phase;

  return (
    <div className="hd-sf" style={{ opacity: fade }}>
      <div
        className="hd-sf__screen hd-sf__dash"
        style={{ opacity: dashOpacity, pointerEvents: dashOpacity > 0.05 ? "auto" : "none" }}
      >
        <div className="hd-sf__dash-main">
          <p className="hd-sf__dash-breadcrumb">
            <span>Dashboard</span>
            <span className="hd-sf__dash-bc-sep">/</span>
            <span>Storefronts</span>
          </p>
          <div className="hd-sf__dash-header">
            <div>
              <p className="hd-sf__dash-title">Storefronts</p>
              <p className="hd-sf__dash-sub">Create and publish a shielded shop</p>
            </div>
            <button
              className={`hd-sf__dash-new${newPress ? " is-pressing" : ""}`}
              type="button"
            >
              <Plus aria-hidden="true" size={11} strokeWidth={2.5} />
              New Storefront
            </button>
          </div>
          <div className="hd-sf__dash-empty">
            <Store aria-hidden="true" className="hd-sf__dash-empty-icon" size={22} />
            <p className="hd-sf__dash-empty-title">No storefronts yet</p>
            <p className="hd-sf__dash-empty-copy">Launch a store in a few clicks</p>
          </div>
        </div>
      </div>

      <div
        className="hd-sf__screen hd-sf__drawer-layer"
        style={{
          opacity: drawerOpacity,
          pointerEvents: drawerOpacity > 0.05 ? "auto" : "none",
        }}
      >
        <div className="hd-sf__drawer-scrim" />
        <aside
          className="hd-sf__drawer"
          style={{ transform: `translateX(${(1 - drawerSlideIn) * 108}%)` }}
        >
          <div className="hd-sf__drawer-head">
            <p className="hd-sf__drawer-title">New Storefront</p>
            <button className="hd-sf__drawer-x" type="button" aria-label="Close">
              <X aria-hidden="true" size={13} strokeWidth={2.2} />
            </button>
          </div>

          <div className="hd-sf__drawer-body">
            <p className="hd-sf__field-label">Store logo</p>
            <div className="hd-sf__logo-drop">
              <span className="hd-sf__logo-drop-hint">Drop or browse</span>
            </div>

            <p className="hd-sf__field-label">Store name</p>
            <div className="hd-sf__fake-input">{nameTyped || "\u00a0"}</div>
            {slugHint ? <p className="hd-sf__slug-hint">/{slugHint}</p> : null}

            <p className="hd-sf__field-label">Category</p>
            <div className="hd-sf__fake-select">
              <span>Merch & apparel</span>
              <span className="hd-sf__chev" aria-hidden="true" />
            </div>

            <p className="hd-sf__field-label">Description</p>
            <div className="hd-sf__fake-input hd-sf__fake-input--multi">
              {descTyped || "\u00a0"}
            </div>

            <p className="hd-sf__field-label">Currency</p>
            <div className="hd-sf__fake-select">
              <span>USDC</span>
              <span className="hd-sf__chev" aria-hidden="true" />
            </div>
          </div>

          <div className="hd-sf__drawer-foot">
            <button
              className={`hd-sf__create-btn${createPress ? " is-pressing" : ""}`}
              type="button"
            >
              Create storefront
            </button>
          </div>
        </aside>
      </div>

      <div
        className="hd-sf__screen hd-sf__store"
        style={{
          opacity: storeOpacity,
          pointerEvents: storeOpacity > 0.05 ? "auto" : "none",
        }}
      >
        <div className="hd-sf__store-banner">Live preview</div>
        <div className="hd-store__top">
          <div className="hd-store__logo-mark">U</div>
          <div className="hd-store__brand-wrap">
            <p className="hd-store__brand">Urban Youth Co</p>
            <p className="hd-store__tagline">Merch · Shielded USDC</p>
          </div>
          <div className="hd-store__cart-icon">
            <ShoppingBag aria-hidden="true" size={15} strokeWidth={1.8} />
          </div>
        </div>
        <p className="hd-store__section-label">Catalog</p>
        <div className="hd-store__product-grid hd-sf__store-grid">
          {STOREFRONT_CREATOR_PRODUCTS.map((p, i) => (
            <div
              className={`hd-store__grid-item hd-store__grid-item--img${i === hoverIdx ? " is-hovered" : ""}`}
              key={p.src}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="hd-sf__grid-img" src={p.src} />
              <p className="hd-store__grid-name">{p.name}</p>
              <p className="hd-store__grid-price">{p.price}</p>
              {i === hoverIdx ? (
                <div className="hd-store__grid-hover-btn">Add to cart</div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="hd-store__footer-bar">
          <span className="hd-store__footer-powered">Unseen</span>
        </div>
      </div>
    </div>
  );
}
