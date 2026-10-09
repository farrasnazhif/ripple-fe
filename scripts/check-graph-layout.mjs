import assert from "node:assert/strict";
import { nodeHeight, nodePosition, nodeWidth, shotHeight } from "../src/lib/graph-layout.ts";

const nodes = [
  { id: "brief", kind: "brief", index: 0 },
  { id: "summary", kind: "summary", index: 0 },
  { id: "storyboard", kind: "storyboard", index: 0 },
  ...Array.from({ length: 12 }, (_, index) => ({ id: `shot-${index + 1}`, kind: "shot", index })),
];

for (const [index, node] of nodes.entries()) {
  const position = nodePosition(node.kind, node.index);
  const height = node.kind === "shot" ? shotHeight : nodeHeight;
  assert(position.x >= 0 && position.y >= 0, `${node.id} is outside the canvas`);
  for (const earlier of nodes.slice(0, index)) {
    const other = nodePosition(earlier.kind, earlier.index);
    const otherHeight = earlier.kind === "shot" ? shotHeight : nodeHeight;
    assert(
      position.x + nodeWidth <= other.x || other.x + nodeWidth <= position.x ||
      position.y + height <= other.y || other.y + otherHeight <= position.y,
      `${node.id} overlaps ${earlier.id}`,
    );
  }
}

console.log("Project canvas nodes have unique, non-overlapping positions.");
