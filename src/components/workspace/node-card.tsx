"use client";
import type { ComponentProps } from "react";
import Image from "next/image";
import { FileText, History, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasItem } from "@/lib/graph-layout";

export function NodeCard({ item, className, ...props }:
  ComponentProps<"button"> & { item: CanvasItem }
) {
  return (
    <button
      type="button"
      className={cn("flex h-[220px] w-[246px] flex-col gap-2 rounded-md border border-neutral-200 bg-white p-3 text-left shadow-sm focus-visible:outline-emerald-500", className)}
      {...props}
    >
      <span className="flex min-w-0 shrink-0 items-center gap-2 text-[13px] font-semibold">
        {item.video ? <Video size={17} className="shrink-0" /> : <FileText size={17} className="shrink-0" />}
        <span className="truncate" title={item.title}>{item.title}</span>
      </span>
      {item.preview ? (
        <span className="relative min-h-0 flex-1 overflow-hidden rounded-md border bg-neutral-100">
          {item.video ? (
            <video
              src={item.preview}
              muted
              preload="metadata"
              className="h-full w-full object-cover"
            />
          ) : (
            <Image
              src={item.preview}
              alt={item.summary}
              fill
              unoptimized
              className="object-cover"
            />
          )}
        </span>
      ) : (
        <span className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md bg-neutral-100 p-3 text-[11px] leading-4">
          <small className="mb-1 shrink-0 text-[10px] leading-4 text-neutral-500">
            {item.kind === "source" ? "Source" : "Summary"}
          </small>
          <span className="line-clamp-4 max-h-16 shrink-0 overflow-hidden leading-4 [overflow-wrap:anywhere]" title={item.summary}>{item.summary}</span>
        </span>
      )}
      <span
        className={`flex min-w-0 shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-[11px] ${item.review || item.kind === "source" ? "bg-yellow-100 text-yellow-900" : "bg-neutral-100 text-neutral-600"}`}
      >
        <History size={14} className="shrink-0" />
        <span className="truncate" title={item.status}>{item.status}</span>
      </span>
    </button>
  );
}
