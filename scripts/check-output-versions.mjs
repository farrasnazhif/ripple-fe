import assert from "node:assert/strict";
import { outputHistory } from "../src/lib/output-versions.ts";
const versions = [1, 2, 3, 4].map(id => ({ id: String(id), created_at: `2026-10-10T00:00:0${id}Z` }));
assert.deepEqual(outputHistory(versions).map(v => v.id), ["4", "3"]);
assert.deepEqual(outputHistory([...versions].reverse()).map(v => v.id), ["4", "3"]);
assert.deepEqual(outputHistory([]), []);
assert.equal(outputHistory([versions[0]]).length, 1);
assert.equal(versions.length, 4);
console.log("Output history shows only Current and previous version without removing saved records.");
