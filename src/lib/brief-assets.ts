import type { Attachment } from "@/types/ripple";

export type AssetFilter = "all" | "image" | "video" | "document";
export const assetPageSize = 24;
export function filterBriefAssets(files: Attachment[], search: string, type: AssetFilter) {
  const query = search.trim().toLowerCase();
  return files.filter((file) => {
    const category = file.content_type.startsWith("image/") ? "image"
      : file.content_type.startsWith("video/") ? "video" : "document";
    return (type === "all" || category === type) && file.file_name.toLowerCase().includes(query);
  });
}
