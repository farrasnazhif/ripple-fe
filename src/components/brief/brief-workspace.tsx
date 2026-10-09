"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { projectCanvasNodes } from "@/lib/graph-layout";
import { useAuthToken } from "@/hooks/use-auth-token";
import { NodeCard } from "@/components/workspace/node-card";
import { BriefDetailDialog } from "@/components/brief/brief-detail-dialog";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/ripple";

function ProjectBriefCard({ project, token, onOpen }: {
  project: Project;
  token: string;
  onOpen: () => void;
}) {
  // shortcut: reuse per-project queries; add a batch listing endpoint when the library grows large.
  const brief = useQuery({
    queryKey: ["brief", token, project.brief_id],
    queryFn: () => api.getBrief(project.brief_id, token),
  });
  const attachments = useQuery({
    queryKey: ["attachments", token, project.brief_id],
    queryFn: () => api.attachments(project.brief_id, token),
  });
  const review = useQuery({
    queryKey: ["review", token, project.id],
    queryFn: () => api.review(project.id, token),
  });
  const error = brief.error || attachments.error || review.error;
  if (error) return (
    <div className="grid h-[220px] w-[246px] content-center gap-3 rounded-md border p-3 text-sm">
      <p className="truncate font-semibold" title={project.name}>{project.name}</p>
      <p role="alert" className="text-red-600">{error.message}</p>
      <Button variant="outline" onClick={() => {
        void brief.refetch();
        void attachments.refetch();
        void review.refetch();
      }}>Retry</Button>
    </div>
  );
  if (!brief.data || !attachments.data || !review.data) return (
    <div role="status" className="flex h-[220px] w-[246px] items-center justify-center rounded-md border bg-neutral-50 text-sm text-neutral-500">
      Loading brief…
    </div>
  );
  const source = projectCanvasNodes(
    project.description, brief.data.raw_text, attachments.data.length,
    undefined, [], [], review.data,
  )[0];
  return (
    <NodeCard item={{ ...source, title: project.name }}
      aria-label={`Open brief for ${project.name}`} onClick={onOpen} />
  );
}

export function BriefWorkspace() {
  const token = useAuthToken();
  const [selected, setSelected] = useState<Project | null>(null);
  const projects = useQuery({
    queryKey: ["projects", token],
    queryFn: () => api.projects(token!),
    enabled: !!token,
  });
  return (
    <div className="min-h-[calc(100dvh-58px)] p-6">
      {projects.isPending && <p role="status" className="text-sm text-neutral-500">Loading briefs…</p>}
      {projects.error && (
        <div role="alert" className="text-sm text-red-600">
          {projects.error.message}
          <Button variant="link" onClick={() => void projects.refetch()}>Retry</Button>
        </div>
      )}
      {projects.data?.length === 0 && (
        <div className="grid justify-items-start gap-3 text-sm text-neutral-500">
          <p>No briefs yet. Create a project to add your first brief.</p>
          <Link href="/project" className="text-emerald-700 underline">Go to projects</Link>
        </div>
      )}
      {token && (
        <div className="grid grid-cols-[repeat(auto-fill,246px)] gap-5">
          {projects.data?.map((project) => (
            <ProjectBriefCard key={project.id} project={project} token={token}
              onOpen={() => setSelected(project)} />
          ))}
        </div>
      )}
      {selected && token && (
        <BriefDetailDialog key={selected.id} project={selected} token={token}
          onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
