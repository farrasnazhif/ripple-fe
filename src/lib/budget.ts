import type { GenerationOperation } from "@/types/ripple";

export const operationLabels: Record<GenerationOperation, string> = {
  image: "Image generation",
  video: "Clip generation / regeneration",
  image_refinement: "Final image refinement",
  video_refinement: "Final video refinement",
};
export function usd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
export function parseBudget(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents <= 100000000 ? cents : null;
}
