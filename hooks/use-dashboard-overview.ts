"use client";

import { useCallback, useEffect, useState } from "react";
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

  const load = useCallback(async () => {
    setLoading(true);
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
      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }
      if (!res.ok) throw new Error(`Overview HTTP ${res.status}`);
      const json = (await res.json()) as OverviewResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      void load();
    };
    window.addEventListener("dashboard:refresh", onRefresh as EventListener);
    return () => {
      window.removeEventListener("dashboard:refresh", onRefresh as EventListener);
    };
  }, [load]);

  return { data, loading, error, refresh: load };
}
