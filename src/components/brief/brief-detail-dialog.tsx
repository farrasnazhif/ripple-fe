"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { BriefEditor } from "@/components/workspace/brief-editor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Project } from "@/types/ripple";

export function BriefDetailDialog({
  project,
  token,
  onClose,
}: {
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
    await Promise.all(
      [
        ["brief", token, project.brief_id],
        ["attachments", token, project.brief_id],
        ["review", token, project.id],
        ["storyboard", token, project.id],
        ["generations", token, project.id],
      ].map((queryKey) => cache.invalidateQueries({ queryKey }))
    );
  }

  const action = useMutation({
    mutationFn: (fn: () => Promise<void>) => fn(),
    onSuccess: refresh,
    onSettled: () => {
      running.current = false;
    },
  });

  function run(fn: () => Promise<void>) {
    if (running.current) return;
    running.current = true;
    action.reset();
    action.mutate(fn);
  }

  const isLoading = brief.isPending || attachments.isPending || review.isPending;
  const error = action.error || brief.error || attachments.error || review.error;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !action.isPending) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden rounded-md border border-neutral-200/80 p-0 shadow-2xl sm:max-w-4xl">
      <div className="px-6 pt-6 flex items-center gap-2">
        <span className="truncate text-xs font-semibold tracking-wider uppercase text-neutral-900">
          {project.name}
        </span>
      </div>

      {/* Rounded Rectangle Header Container */}
      <div className="px-6 pt-1 pb-0">
        <div className="relative overflow-hidden rounded-md bg-neutral-100 p-6 text-neutral-900">
          
          {/* Dynamic Colorable SVG Mask (Change `bg-neutral-900` to any color e.g., `bg-emerald-600`) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 h-full w-[60%] bg-neutral-400 opacity-10 [mask-image:url('/vectors/headers/spiral.svg')] [mask-position:right_center] [mask-repeat:no-repeat] [mask-size:cover]"
          />

          <DialogHeader className="relative z-10 text-left">
            <DialogTitle className="text-2xl font-extrabold tracking-tight text-neutral-900">
              Project Brief
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-sm text-neutral-600">
              Confirm specifications, manage creative direction, and review attachments in real time.
            </DialogDescription>
          </DialogHeader>
        </div>
      </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div role="status" className="flex h-64 flex-col items-center justify-center gap-3 text-neutral-500">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-sm font-medium">Loading project brief…</p>
            </div>
          )}

          {brief.data && review.data && attachments.data && !brief.isError && !review.isError && !attachments.isError && (
            <BriefEditor
              mode="brief"
              brief={brief.data}
              project={project}
              review={review.data}
              attachments={attachments.data}
              token={token}
              busy={action.isPending}
              run={run}
              refresh={refresh}
              onConfirmed={() => {}}
            />
          )}

          {/* Toast / Notification Banners */}
          {action.isSuccess && (
            <div role="status" className="mt-4 flex items-center gap-2 rounded-md bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800 border border-emerald-200/60">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              Brief successfully updated.
            </div>
          )}

          {error && (
            <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-md bg-red-50 p-3.5 text-sm text-red-800 border border-red-200/60">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error.message}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={action.isPending}
                onClick={() => run(refresh)}
                className="h-8 gap-1.5 border-red-200 bg-white text-xs text-red-700 hover:bg-red-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}