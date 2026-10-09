"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Workspace } from "@/components/workspace/workspace";
import { api, ApiError } from "@/lib/api";
import { useAuthToken } from "@/hooks/use-auth-token";
import { Button } from "@/components/ui/button";

export function ProjectDetail({ projectId }: { projectId: string }) {
  const token = useAuthToken();
  const project = useQuery({
    queryKey: ["project", token, projectId],
    queryFn: () => api.project(projectId, token!),
    enabled: !!token,
    retry: false,
  });

  if (project.isPending) return <div className="min-h-screen px-6 py-20 text-neutral-500 sm:px-11">Loading project…</div>;
  if (project.isError) {
    return (
      <div className="min-h-screen space-y-4 px-6 py-20 text-neutral-500 sm:px-11">
        <h1 className="text-2xl font-semibold text-neutral-800">{project.error instanceof ApiError && project.error.status === 404 ? "Project not found" : "Could not load project"}</h1>
        <p>{project.error.message}</p>
        <Link className="mr-4 text-emerald-700" href="/project">← Back to projects</Link>
        <Button variant="outline" onClick={() => project.refetch()}>Try again</Button>
      </div>
    );
  }
  return <Workspace project={project.data} token={token!} />;
}
