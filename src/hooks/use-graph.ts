"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useGraph(scenario: string, token: string) {
  const query = useQuery({
    queryKey: ["demo-graph", token, scenario],
    queryFn: () => api.graph(scenario, token),
  });
  return {
    graph: query.data ?? null,
    error: query.error?.message ?? "",
    loading: query.isPending,
  };
}
