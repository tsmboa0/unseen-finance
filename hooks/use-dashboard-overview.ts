"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import type { DashboardOverview } from "@/lib/dashboard-types";

type OverviewResponse = {
  overview: DashboardOverview;
  stores: Array<{
    id: string;
    name: string;
    subdomain: string;
    currency: string;
    privacy: string;
    status: string;
    orders30d: number;
    revenue30d: number;
    createdAt: number;
  }>;
};

export function useDashboardOverview() {
  const { getAccessToken } = usePrivy();
  const router = useRouter();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track whether we've ever completed a successful load so subsequent
  // refreshes can run silently without showing the spinner again.
  const hasLoadedOnce = useRef(false);

  const load = useCallback(async () => {
    // Only show the full loading spinner on the very first fetch.
    // After that, updates happen silently — data stays visible during re-fetch.
    const showSpinner = !hasLoadedOnce.current;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.replace("/");
        return;
      }
      const res = await fetch("/api/dashboard/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const overviewPayload = (await res.json().catch(() => null)) as unknown;

      if (res.status === 401) {
        router.replace("/");
        return;
      }

      if (res.status === 403) {
        const code =
          overviewPayload &&
          typeof overviewPayload === "object" &&
          overviewPayload !== null &&
          "code" in overviewPayload &&
          typeof (overviewPayload as { code?: unknown }).code === "string"
            ? (overviewPayload as { code: string }).code
            : null;
        if (code === "BETA_REQUIRED") {
          setError("Beta access required");
          return;
        }
        router.replace("/");
        return;
      }

      if (!res.ok) throw new Error(`Overview HTTP ${res.status}`);
      const json = overviewPayload as OverviewResponse;
      setData(json);
      hasLoadedOnce.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [getAccessToken, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // Subsequent refreshes triggered by other parts of the app — silent, no spinner
    const onRefresh = () => void load();
    window.addEventListener("dashboard:refresh", onRefresh as EventListener);
    return () => {
      window.removeEventListener("dashboard:refresh", onRefresh as EventListener);
    };
  }, [load]);

  return { data, loading, error, refresh: load };
}
