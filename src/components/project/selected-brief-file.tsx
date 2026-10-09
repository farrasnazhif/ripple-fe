"use client";

import { useEffect, useRef } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SelectedBriefFile({ file, uploaded, onRemove }: { file: File; uploaded: boolean; onRemove?: () => void }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!image.current || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return <li className="flex min-w-0 flex-col overflow-hidden rounded-md border border-neutral-200">
    <div className="flex aspect-square items-center justify-center bg-neutral-50">
      {file.type.startsWith("image/") ? (
        // Local blob previews use the browser directly rather than image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img ref={image} alt={file.name} className="size-full object-contain" />
      ) : <FileText className="size-10 text-neutral-400" />}
    </div>
    <div className="flex flex-col items-start gap-2 p-3">
      <p className="w-full break-words text-xs font-medium">{file.name}</p>
      <small className="text-xs text-emerald-700">{uploaded ? "Uploaded" : `${(file.size / 1024).toFixed(0)} KB`}</small>
      {onRemove && <Button type="button" variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${file.name}`}><X className="size-4" />Remove</Button>}
    </div>
  </li>;
}
