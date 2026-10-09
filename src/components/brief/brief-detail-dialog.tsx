"use client";
import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BriefEditor } from "@/components/workspace/brief-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { Project } from "@/types/ripple";

export function BriefDetailDialog({ project, token, onClose }: {
  project: Project;
  token: string;
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const running = useRef(false);
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
    refetchInterval: 4 * 60 * 1000,
  });
  async function refresh() {
    await Promise.all([
      ["brief", token, project.brief_id],
      ["attachments", token, project.brief_id],
      ["review", token, project.id],
      ["storyboard", token, project.id],
      ["generations", token, project.id],
    ].map((queryKey) => cache.invalidateQueries({ queryKey })));
  }
  const action = useMutation({
    mutationFn: (fn: () => Promise<void>) => fn(),
    onSuccess: refresh,
    onSettled: () => { running.current = false; },
  });
  function run(fn: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    action.reset();
    action.mutate(fn);
  }
  const error = action.error || brief.error || attachments.error || review.error;
  return (
    <Dialog open onOpenChange={(open) => {
      if (!open && !action.isPending) onClose();
    }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-md p-6 sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Brief</DialogTitle>
          <DialogDescription>
            Confirm your brief, track changes, and preserve the work that still fits.
          </DialogDescription>
        </DialogHeader>
        {(brief.isPending || attachments.isPending || review.isPending) && (
          <p role="status">Loading brief…</p>
        )}
        {brief.data && review.data && attachments.data &&
          !brief.isError && !review.isError && !attachments.isError && (
            <BriefEditor mode="brief" brief={brief.data} project={project}
              review={review.data} attachments={attachments.data} token={token}
              busy={action.isPending} run={run} refresh={refresh} onConfirmed={() => {}} />
        )}
        {action.isSuccess && <p role="status" className="text-sm text-emerald-700">Brief updated.</p>}
        {error && (
          <div role="alert" className="text-sm text-red-600">
            {error.message}
            <Button variant="link" disabled={action.isPending} onClick={() => run(refresh)}>Reload</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
