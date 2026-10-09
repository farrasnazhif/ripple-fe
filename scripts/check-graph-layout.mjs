import assert from "node:assert/strict";
import {
  nodeHeight,
  nodeWidth,
  projectCanvasNodes,
} from "../src/lib/graph-layout.ts";
import { zoomCanvasAt } from "../src/lib/canvas-viewport.ts";

for (const summary of [undefined, "", " \n "]) {
  assert.deepEqual(
    projectCanvasNodes("Project", "Original brief", 2, summary).map(
      (node) => node.id,
    ),
    ["brief"],
  );
}
const nodes = projectCanvasNodes(
  "Project",
  "Original brief",
  2,
  "Confirmed output",
);
assert.deepEqual(
  nodes.map((node) => node.id),
  ["brief", "summary"],
);
assert.equal(nodes[0].summary, "Original brief");
assert.equal(nodes[1].summary, "Confirmed output");

for (const [index, node] of nodes.entries()) {
  const position = node;
  assert(
    position.x >= 0 && position.y >= 0,
    `${node.id} is outside the canvas`,
  );
  for (const earlier of nodes.slice(0, index)) {
    const other = earlier;
    assert(
      position.x + nodeWidth <= other.x ||
        other.x + nodeWidth <= position.x ||
        position.y + nodeHeight <= other.y ||
        other.y + nodeHeight <= position.y,
      `${node.id} overlaps ${earlier.id}`,
    );
  }
}

console.log(
  "Canvas starts with Raw Brief only, adds saved outputs, and has no overlapping nodes.",
);

const viewport = { x: -120, y: 80, zoom: 0.8 };
const point = { x: 360, y: 240 };
for (const requestedZoom of [0.01, 0.5, 1.5, 10]) {
  const next = zoomCanvasAt(viewport, point, requestedZoom);
  assert(next.zoom >= 0.25 && next.zoom <= 2);
  assert.equal(
    (point.x - next.x) / next.zoom,
    (point.x - viewport.x) / viewport.zoom,
  );
  assert.equal(
    (point.y - next.y) / next.zoom,
    (point.y - viewport.y) / viewport.zoom,
  );
}
console.log("Canvas zoom stays within bounds and preserves the cursor anchor.");

const shots = [
  { id: "shot-1", title: "First shot", prompt: "A beach", position: 1 },
];
const job = {
  id: "job-1",
  shot_id: "shot-1",
  kind: "image",
  prompt: "A beach",
  status: "queued",
  outputs: [],
};
assert.deepEqual(
  projectCanvasNodes("", "Brief", 0, "Summary", shots, [job]).map((n) => n.id),
  ["brief", "summary", "storyboard"],
);
for (const status of ["failed", "unknown", "in_progress", "completed"]) {
  assert.equal(
    projectCanvasNodes("", "Brief", 0, "Summary", shots, [{ ...job, status }])
      .length,
    3,
  );
}
const completed = projectCanvasNodes("", "Brief", 0, "Summary", shots, [
  { ...job, status: "completed", outputs: ["https://example.com/image.png"] },
]);
assert.deepEqual(
  completed.map((n) => n.id),
  ["brief", "summary", "storyboard", "shot-1:image"],
);
assert.equal(completed[3].parent, "storyboard");
assert.equal(completed[2].parent, "summary");
console.log(
  "Storyboard follows saved shots; media nodes require a completed output.",
);

const review = {
  output_type: "video",
  points: [],
  versions: [{ version: 2 }],
  changes: [
    {
      brief_version: 2,
      impacts: [
        {
          shot_id: "shot-1",
          status: "needs_review",
          reasons: ["Lighting changed"],
        },
      ],
    },
  ],
  decisions: [],
  finals: [],
};
const old = {
  ...job,
  kind: "video",
  brief_version: 1,
  accepted: true,
  status: "completed",
  outputs: ["https://example.com/old.png"],
};
const newer = {
  ...old,
  id: "job-2",
  brief_version: 2,
  accepted: false,
  outputs: ["https://example.com/new.png"],
};
const grouped = projectCanvasNodes(
  "",
  "Brief",
  0,
  "Summary",
  shots,
  [old, newer],
  review,
);
assert.equal(grouped.length, 4);
assert.equal(grouped[3].preview, old.outputs[0]);
assert.equal(grouped[3].review, true);
review.decisions = [
  { shot_id: "shot-1", job_id: "job-1", brief_version: 2, action: "keep" },
];
assert.equal(
  projectCanvasNodes("", "Brief", 0, "Summary", shots, [old, newer], review)[3]
    .review,
  false,
);
review.finals = [
  {
    id: "final-1",
    kind: "video",
    brief_version: 2,
    job_ids: ["job-1"],
    outputs: old.outputs,
  },
];
assert.deepEqual(
  projectCanvasNodes("", "Brief", 0, "Summary", shots, [old, newer], review).at(
    -1,
  ).parents,
  ["shot-1:video"],
);
console.log(
  "Media versions share a node, selective impact is shown, and final outputs connect to their accepted inputs.",
);

const acceptedFinal = { ...review.finals[0], id: "accepted-final", accepted: true, status: "completed" };
for (const status of ["queued", "completed", "failed"]) {
  const candidate = { ...acceptedFinal, id: "candidate", accepted: false, status, outputs: ["https://example.com/refined.png"] };
  const graph = projectCanvasNodes("", "Brief", 0, "Summary", shots, [old, newer], { ...review, finals: [candidate, acceptedFinal] });
  assert.equal(graph.at(-1).preview, acceptedFinal.outputs[0], "An unaccepted refinement replaced the final node");
}
const refinedFinal = { ...acceptedFinal, parent_id: "source", prompt: "Warmer lighting", outputs: ["https://example.com/refined.png"] };
const refinedGraph = projectCanvasNodes("", "Brief", 0, "Summary", shots, [old, newer], { ...review, finals: [refinedFinal, { ...acceptedFinal, accepted: false }] });
assert.equal(refinedGraph.at(-1).preview, refinedFinal.outputs[0]);
assert.equal(refinedGraph.at(-1).summary, "Warmer lighting");
console.log("Final refinement candidates stay off the canvas until accepted; accepted revisions preserve provenance.");

const imageFinal = { id: "direct", kind: "image", brief_version: 2, job_ids: [], outputs: ["https://example.com/direct.png"], accepted: false, status: "completed", prompt: "Confirmed brief" };
for (const legacyShots of [[], shots]) {
  const imageReview = { ...review, output_type: "image", finals: [imageFinal] };
  const imageGraph = projectCanvasNodes("", "Brief", 0, "Summary", legacyShots, [old, newer], imageReview);
  assert.deepEqual(imageGraph.map(node => node.id), ["brief", "summary", "final"]);
  assert.equal(imageGraph[2].parent, "summary");
  assert.equal(imageGraph[2].preview, imageFinal.outputs[0]);
  assert.match(imageGraph[2].status, /Pending approval/);
  for (const status of ["queued", "failed", "completed"]) {
    const pendingGraph = projectCanvasNodes("", "Brief", 0, "Summary", legacyShots, [], { ...imageReview, finals: [{ ...imageFinal, status, outputs: [] }] });
    assert.deepEqual(pendingGraph.map(node => node.id), ["brief", "summary"]);
  }
  const accepted = { ...imageFinal, id: "accepted", accepted: true };
  const candidate = { ...imageFinal, id: "refined", parent_id: accepted.id, outputs: ["https://example.com/refined.png"] };
  const acceptedGraph = projectCanvasNodes("", "Brief", 0, "Summary", legacyShots, [], { ...imageReview, finals: [candidate, accepted] });
  assert.equal(acceptedGraph.at(-1).preview, accepted.outputs[0]);
}
console.log("Images go directly from summary to final output, with no plan or shot nodes; video keeps its storyboard.");
