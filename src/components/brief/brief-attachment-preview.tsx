"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { FileText, Video } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDestructiveAction } from "@/components/ui/confirm-destructive-action";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Attachment } from "@/types/ripple";

export function BriefAttachmentPreview({ file, token, busy, onRemove }: {
  file: Attachment;
  token: string;
  busy: boolean;
  onRemove: () => void;
}) {
  const element = useRef<HTMLLIElement>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const image = file.content_type.startsWith("image/");
  const video = file.content_type.startsWith("video/");
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { root: node.closest("[data-asset-scroll]") });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const download = useQuery({
    queryKey: ["attachment-url", token, file.brief_id, file.id],
    queryFn: () => api.downloadAttachment(file.brief_id, file.id, token),
    enabled: (visible && image) || open,
    staleTime: 4 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  });
  const url = download.data?.download_url;
  const size = file.size_bytes >= 1024 * 1024
    ? `${(file.size_bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(file.size_bytes / 1024)} KB`;
  const extension = file.file_name.split(".").at(-1)?.toUpperCase();
  const Icon = video ? Video : FileText;
  return (
    <li ref={element} className="relative flex min-w-0 flex-col gap-1 rounded-md border bg-white p-2">
      <button type="button" aria-label={`Preview ${file.file_name}`} onClick={() => { setOpen(true); void download.refetch(); }}
        className="grid aspect-square w-full place-items-center overflow-hidden rounded-md bg-neutral-100 focus-visible:outline-emerald-500">
        {image && url && !imageError ? (
          <Image src={url} alt={file.file_name} width={96} height={96} unoptimized loading="lazy"
            className="h-full w-full object-cover" onError={() => setImageError(true)} />
        ) : <Icon className="size-6 text-neutral-400" />}
      </button>
      <p className="truncate text-xs font-medium" title={file.file_name}>{file.file_name}</p>
      <p className="truncate text-[10px] text-neutral-500" title={file.content_type}>{extension} · {size}</p>
      <ConfirmDestructiveAction title={`Remove “${file.file_name}”?`}
        description="This reference will be removed from the next saved brief version. Earlier versions retain access to the original file."
        onConfirm={onRemove} trigger={
          <Button variant="destructive" disabled={busy}
            aria-label={`Remove ${file.file_name}`} className="absolute right-2 top-2">Remove</Button>
        } />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-md sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="break-words pr-6">{file.file_name}</DialogTitle>
            <DialogDescription>{file.content_type} · {size}</DialogDescription>
          </DialogHeader>
          {download.isFetching && !url && <p role="status">Loading preview…</p>}
          {download.error && <div role="alert" className="text-sm text-red-600">{download.error.message}<Button variant="link" onClick={() => void download.refetch()}>Retry</Button></div>}
          {open && url && (
            <>
              {image ? (imageError ? (
                <p role="alert">Image preview unavailable. Open the original file below.</p>
              ) : <Image src={url} alt={file.file_name} width={1200} height={900} unoptimized
                className="max-h-[65vh] w-full rounded-md object-contain" onError={() => setImageError(true)} />)
              : video ? <video src={url} controls preload="metadata" className="max-h-[65vh] w-full rounded-md" />
              : file.content_type === "application/pdf" ? <iframe src={url} title={`Preview ${file.file_name}`} sandbox="" className="h-[60vh] w-full rounded-md border" />
              : <p className="text-sm text-neutral-500">Open the original file to view its content.</p>}
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-emerald-700 underline">Open original</a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </li>
  );
}
