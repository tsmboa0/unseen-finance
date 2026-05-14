"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ProductSlug } from "@/components/unseen/site-content";
import { DemoLoading } from "@/components/unseen/product-page/demo-loading";

type DemoProps = { active?: boolean; large?: boolean };

const GatewayDemo = dynamic(() => import("@/components/unseen/demos/gateway-demo"), {
  ssr: false,
  loading: () => <DemoLoading />,
});
const PayrollProductDemo = dynamic(
  () => import("@/components/unseen/product-page/payroll-product-demo"),
  {
    ssr: false,
    loading: () => <DemoLoading />,
  },
);
const X402Demo = dynamic(() => import("@/components/unseen/demos/x402-demo"), {
  ssr: false,
  loading: () => <DemoLoading />,
});
const StorefrontDemo = dynamic(() => import("@/components/unseen/demos/storefront-demo"), {
  ssr: false,
  loading: () => <DemoLoading />,
});
const TiplinkProductDemo = dynamic(
  () => import("@/components/unseen/product-page/tiplink-product-demo"),
  { ssr: false, loading: () => <DemoLoading /> },
);
const InvoiceDemo = dynamic(() => import("@/components/unseen/demos/invoice-demo"), {
  ssr: false,
  loading: () => <DemoLoading />,
});
const ComplianceDemo = dynamic(() => import("@/components/unseen/demos/compliance-demo"), {
  ssr: false,
  loading: () => <DemoLoading />,
});

const DEMOS: Record<ProductSlug, ComponentType<DemoProps>> = {
  gateway: GatewayDemo as ComponentType<DemoProps>,
  payroll: PayrollProductDemo as ComponentType<DemoProps>,
  x402: X402Demo as ComponentType<DemoProps>,
  storefronts: StorefrontDemo as ComponentType<DemoProps>,
  tiplinks: TiplinkProductDemo as ComponentType<DemoProps>,
  invoice: InvoiceDemo as ComponentType<DemoProps>,
  compliance: ComplianceDemo as ComponentType<DemoProps>,
};

export function ProductDemo({ slug }: { slug: ProductSlug }) {
  const C = DEMOS[slug];
  return <C active large />;
}
