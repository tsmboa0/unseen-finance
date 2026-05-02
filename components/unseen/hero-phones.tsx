"use client";

import { type ComponentType, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const HeroGatewayDemo = dynamic(
  () => import("@/components/unseen/hero-demos/hero-gateway-demo"),
  { ssr: false },
);
const HeroPayrollDemo = dynamic(
  () => import("@/components/unseen/hero-demos/hero-payroll-demo"),
  { ssr: false },
);
const HeroTiplinkDemo = dynamic(
  () => import("@/components/unseen/hero-demos/hero-tiplink-demo"),
  { ssr: false },
);
const HeroInvoiceDemo = dynamic(
  () => import("@/components/unseen/hero-demos/hero-invoice-demo"),
  { ssr: false },
);
const HeroStorefrontDemo = dynamic(
  () => import("@/components/unseen/hero-demos/hero-storefront-demo"),
  { ssr: false },
);
const HeroX402Demo = dynamic(
  () => import("@/components/unseen/hero-demos/hero-x402-demo"),
  { ssr: false },
);
const HeroComplianceDemo = dynamic(
  () => import("@/components/unseen/hero-demos/hero-compliance-demo"),
  { ssr: false },
);

type DemoProps = { active?: boolean };

const PHONES: { id: string; label: string; Demo: ComponentType<DemoProps> }[] = [
  { id: "gateway", label: "UNSEEN GATEWAY", Demo: HeroGatewayDemo as ComponentType<DemoProps> },
  { id: "payroll", label: "UNSEEN PAYROLL", Demo: HeroPayrollDemo as ComponentType<DemoProps> },
  { id: "tiplinks", label: "TIPLINKS & GIFT CARDS", Demo: HeroTiplinkDemo as ComponentType<DemoProps> },
  { id: "invoice", label: "UNSEEN INVOICE", Demo: HeroInvoiceDemo as ComponentType<DemoProps> },
  { id: "storefronts", label: "UNSEEN STOREFRONTS", Demo: HeroStorefrontDemo as ComponentType<DemoProps> },
  { id: "x402", label: "UNSEEN x402", Demo: HeroX402Demo as ComponentType<DemoProps> },
  { id: "compliance", label: "UNSEEN COMPLIANCE", Demo: HeroComplianceDemo as ComponentType<DemoProps> },
];

const CYCLE_MS = 5000;

function getSlot(
  phoneIndex: number,
  activeIndex: number,
  total: number,
): "left" | "center" | "right" | "hidden" {
  const offset = (phoneIndex - activeIndex + total) % total;
  if (offset === 0) return "center";
  if (offset === 1) return "right";
  if (offset === total - 1) return "left";
  return "hidden";
}

export default function HeroPhones() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % PHONES.length);
      setCycleKey((prev) => prev + 1);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  const total = PHONES.length;

  return (
    <div className="hero-carousel">
      <div className="hero-carousel__stage">
        {PHONES.map((phone, index) => {
          const slot = getSlot(index, activeIndex, total);
          const isActive = slot === "center";

          return (
            <div
              className={`hero-phone hero-phone--${slot}`}
              key={phone.id}
            >
              <div className="hero-phone__frame">
                <span className="hero-phone__notch" aria-hidden="true" />
                <div className="hero-phone__screen">
                  <div className="hero-phone__statusbar" aria-hidden="true">
                    <span>9:41</span>
                    <span className="hero-phone__statusbar-icons">
                      <span className="hero-phone__signal" />
                      <span className="hero-phone__battery" />
                    </span>
                  </div>
                  <div className="hero-phone__content">
                    <phone.Demo
                      active={isActive}
                      key={isActive ? cycleKey : `idle-${phone.id}`}
                    />
                  </div>
                </div>
                <span className="hero-phone__indicator" aria-hidden="true" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Label + dots */}
      <div className="hero-carousel__meta">
        <p className="hero-carousel__label">{PHONES[activeIndex].label}</p>
        <div className="hero-carousel__dots">
          {PHONES.map((phone, index) => (
            <span
              className={`hero-carousel__dot${index === activeIndex ? " is-active" : ""}`}
              key={phone.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
