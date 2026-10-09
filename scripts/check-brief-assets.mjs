import assert from "node:assert/strict";
import { assetPageSize, filterBriefAssets } from "../src/lib/brief-assets.ts";
const files = [
  { id: "1", file_name: "Brand HERO.PNG", content_type: "image/png" },
  { id: "2", file_name: "Brand video.mp4", content_type: "video/mp4" },
  { id: "3", file_name: "Brand guide.pdf", content_type: "application/pdf" },
  { id: "4", file_name: "Notes.txt", content_type: "text/plain" },
];
assert.deepEqual(filterBriefAssets(files, "  HERO  ", "all").map(f => f.id), ["1"]);
assert.deepEqual(filterBriefAssets(files, "brand", "video").map(f => f.id), ["2"]);
assert.deepEqual(filterBriefAssets(files, "", "document").map(f => f.id), ["3", "4"]);
assert.deepEqual(filterBriefAssets(files, "notes", "image"), []);
assert.deepEqual(filterBriefAssets([], "", "all"), []);
assert.equal(filterBriefAssets(files, "", "all").length, 4);
const many = Array.from({ length: 57 }, (_, id) => ({ ...files[0], id: String(id) }));
const matches = filterBriefAssets(many, "", "all");
const pages = Array.from({ length: Math.ceil(matches.length / assetPageSize) }, (_, page) => matches.slice(page * assetPageSize, (page + 1) * assetPageSize));
assert.deepEqual(pages.map(page => page.length), [24, 24, 9]);
assert.equal(new Set(pages.flat().map(file => file.id)).size, many.length);
console.log("Asset search, type filters, empty results, and 24-item pages passed.");
