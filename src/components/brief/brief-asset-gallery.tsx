"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BriefAttachmentPreview } from "@/components/brief/brief-attachment-preview";
import { assetPageSize, filterBriefAssets, type AssetFilter } from "@/lib/brief-assets";
import type { Attachment } from "@/types/ripple";

const filters: { value: AssetFilter; label: string }[] = [
  { value: "all", label: "All files" }, { value: "image", label: "Images" },
  { value: "video", label: "Videos" }, { value: "document", label: "Documents & other" },
];
export function BriefAssetGallery({ files, token, busy, onRemove }: {
  files: Attachment[];
  token: string;
  busy: boolean;
  onRemove: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<AssetFilter>("all");
  const [page, setPage] = useState(0);
  const filtered = filterBriefAssets(files, search, type);
  const pages = Math.max(1, Math.ceil(filtered.length / assetPageSize));
  const currentPage = Math.min(page, pages - 1);
  const start = currentPage * assetPageSize;
  return (
    <section className="grid min-w-0 gap-3" aria-label="Uploaded references">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto font-semibold">Uploaded references <span className="text-sm font-normal text-neutral-500">({files.length})</span></h3>
        <Input aria-label="Search asset filenames" placeholder="Search files…" value={search}
          className="w-full sm:w-52" onChange={(event) => { setSearch(event.target.value); setPage(0); }} />
        <Select items={filters} value={type} onValueChange={(value) => {
          const filter = filters.find((item) => item.value === value);
          if (filter) { setType(filter.value); setPage(0); }
        }}>
          <SelectTrigger aria-label="Filter asset type" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>{filters.map((filter) => <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {/* shortcut: paginate metadata locally; add server pagination when metadata itself becomes large. */}
      <div key={`${search}:${type}:${currentPage}`} data-asset-scroll className="max-h-80 overflow-y-auto overscroll-contain rounded-md border bg-neutral-50 p-2">
        {filtered.length ? (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
            {filtered.slice(start, start + assetPageSize).map((file) => (
              <BriefAttachmentPreview key={file.id} file={file} token={token}
                busy={busy} onRemove={() => onRemove(file.id)} />
            ))}
          </ul>
        ) : <p role="status" className="p-4 text-sm text-neutral-500">{files.length ? "No files match your search." : "No uploaded references yet."}</p>}
      </div>
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
          <span aria-live="polite">{start + 1}–{Math.min(start + assetPageSize, filtered.length)} of {filtered.length}</span>
          {pages > 1 && <div className="flex items-center gap-2">
            <Button variant="outline" size="icon-sm" aria-label="Previous asset page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft /></Button>
            <span>Page {currentPage + 1} of {pages}</span>
            <Button variant="outline" size="icon-sm" aria-label="Next asset page" disabled={currentPage === pages - 1} onClick={() => setPage(currentPage + 1)}><ChevronRight /></Button>
          </div>}
        </div>
      )}
    </section>
  );
}
