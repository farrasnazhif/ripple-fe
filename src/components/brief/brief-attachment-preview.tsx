"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import type { Attachment } from "@/types/ripple";

export function BriefAttachmentPreview({ file, token }: { file: Attachment; token: string }) {
  const download = useQuery({
    queryKey: ["attachment-url", token, file.brief_id, file.id],
    queryFn: () => api.downloadAttachment(file.brief_id, file.id, token),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });

  return (
    <li className="flex min-w-0 flex-col overflow-hidden rounded-md border border-neutral-200 bg-white">
      {file.content_type.startsWith("image/") && download.data && (
        <a href={download.data.download_url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${file.file_name}`}>
          <Image src={download.data.download_url} alt={file.file_name} width={320} height={320} unoptimized className="aspect-square w-full bg-neutral-50 object-contain" />
        </a>
      )}
      {(!file.content_type.startsWith("image/") || !download.data) && <div className="flex aspect-square items-center justify-center bg-neutral-50"><FileText className="size-10 text-neutral-400" /></div>}
      <div className="flex min-w-0 flex-col items-start gap-2 p-3">
        <div className="min-w-0 w-full">
          <p className="break-words text-sm font-medium">{file.file_name}</p>
          <p className="text-xs text-neutral-500">{file.content_type} · {(file.size_bytes / 1024).toFixed(0)} KB</p>
        </div>
        {download.data && <a className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700" href={download.data.download_url} target="_blank" rel="noopener noreferrer">Open <ArrowUpRight className="size-4" /></a>}
        {download.isPending && <span className="text-xs text-neutral-500">Loading…</span>}
      </div>
      {download.isError && <div className="px-3 pb-3 text-xs text-red-700" role="alert"><p>{download.error.message}</p><Button variant="ghost" size="sm" onClick={() => download.refetch()}>Retry</Button></div>}
    </li>
  );
}
