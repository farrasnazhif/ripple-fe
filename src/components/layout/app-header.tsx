"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuthToken } from "@/hooks/use-auth-token";
import { api } from "@/lib/api";

export function AppHeader() {
  const pathname = usePathname();
  const token = useAuthToken();
  const projectId = pathname.match(/^\/project\/([^/]+)\/?$/)?.[1];
  const project = useQuery({
    queryKey: ["project", token, projectId],
    queryFn: () => api.project(projectId!, token!),
    enabled: !!projectId && !!token,
    retry: false,
  });
  const title = projectId ? project.data?.name || "Project" : pathname.startsWith("/briefs") ? "Briefs" : "Projects";
  return <header className="flex h-[58px] shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-5 text-base font-bold"><SidebarTrigger /><span className="truncate">{title}</span></header>;
}
