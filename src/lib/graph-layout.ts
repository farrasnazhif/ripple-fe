export const nodeWidth = 226;
export const nodeHeight = 178;
export const shotHeight = 195;

export function nodePosition(kind: "brief" | "summary" | "storyboard" | "shot", index = 0) {
  if (kind === "brief") return { x: 60, y: 255 };
  if (kind === "summary") return { x: 370, y: 255 };
  if (kind === "storyboard") return { x: 680, y: 255 };
  return { x: 990, y: 145 + index * 215 };
}
