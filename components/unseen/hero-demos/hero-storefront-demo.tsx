"use client";

import { useLoopTime } from "@/components/unseen/demo-utils";
import {
  computeStorefrontCreatorPhase,
  StorefrontCreatorFlowUI,
} from "@/components/unseen/demos/storefront-creator-flow";

const LOOP_MS = 5000;

export default function HeroStorefrontDemo({ active = false }: { active?: boolean }) {
  const t = useLoopTime(LOOP_MS, { paused: !active });
  const phase = computeStorefrontCreatorPhase(t, LOOP_MS);
  return <StorefrontCreatorFlowUI phase={phase} />;
}
