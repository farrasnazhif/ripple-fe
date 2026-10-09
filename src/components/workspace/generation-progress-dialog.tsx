"use client";
import { Check, Circle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { GenerationOperation } from "@/types/ripple";

const steps = ["Request accepted", "Generating media", "Output ready"];
const labels: Record<GenerationOperation, string> = {
  image: "image",
  video: "clip",
  image_refinement: "refined image",
  video_refinement: "refined video",
};

export function GenerationProgressDialog({
  operation,
  status,
  dismissed,
  onDismiss,
  onClose,
  onReopen,
}: {
  operation: GenerationOperation;
  status: string;
  dismissed: boolean;
  onDismiss: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  const finished = ["completed", "failed", "nsfw", "canceled"].includes(status);
  const uncertain = status === "unknown";
  const activeStep = status === "submitting" ? 0 : status === "queued" ? 1 : status === "in_progress" ? 1 : status === "completed" ? 3 : -1;
  const title = status === "completed" ? "Generation complete" : finished ? "Generation ended" : uncertain ? "Generation status unknown" : `Generating ${labels[operation]}`;
  return <>
    {dismissed && <Button className="absolute top-4 left-4 z-10" variant="outline" onClick={onReopen} aria-live="polite">
      {finished || uncertain ? title : status === "queued" ? "Generation queued · View progress" : status === "in_progress" ? "Generation in progress · View progress" : "Submitting generation · View progress"}
    </Button>}
    <Dialog open={!dismissed} onOpenChange={(open) => { if (!open) onDismiss(); }}>
      <DialogContent className="rounded-md sm:max-w-lg" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {status === "submitting" ? "Submitting your request to Higgsfield…" : status === "queued" ? "Higgsfield accepted the request. Waiting for generation to start…" : status === "in_progress" ? "Higgsfield is generating your output. This can take a while." : status === "completed" ? "The generated output is saved and ready to review." : uncertain ? "The request may have reached the provider, but its status could not be confirmed. Check the saved project history before retrying." : `The provider reported status: ${status.replaceAll("_", " ")}.`}
          </DialogDescription>
        </DialogHeader>
        <ol className="grid gap-2" aria-live="polite">
          {steps.map((step, index) => {
            const complete = status === "completed" || (activeStep > 0 && index < activeStep);
            const active = !finished && !uncertain && index === activeStep;
            const Icon = complete ? Check : active ? LoaderCircle : Circle;
            return <li key={step} className={`flex items-center gap-3 rounded-md border p-3 ${active ? "border-emerald-500 bg-emerald-50" : complete ? "text-emerald-700" : "text-muted-foreground"}`}>
              <Icon className={`size-4 ${active ? "animate-spin" : ""}`} />
              <span className="text-sm">{step}{active && status === "queued" ? " · Waiting in queue" : ""}</span>
            </li>;
          })}
        </ol>
        <div className="flex justify-end">
          {finished || uncertain ? <Button onClick={onClose}>{uncertain ? "Close" : "Done"}</Button> : <Button variant="outline" onClick={onDismiss}>Continue in background</Button>}
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
