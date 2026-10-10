"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const imageAlternatives = [
  { value: "gpt-image-1", label: "GPT Image 1", disabled: true },
  { value: "flux-1-pro", label: "FLUX.1 Pro", disabled: true },
  { value: "midjourney-v6.1", label: "Midjourney V6.1", disabled: true },
];
const videoAlternatives = [
  { value: "sora-2", label: "Sora 2", disabled: true },
  { value: "veo-3", label: "Veo 3", disabled: true },
  { value: "runway-gen-4", label: "Runway Gen-4", disabled: true },
];
const models = {
  text: [
    { value: "gpt-4o-mini", label: "GPT-4o mini", disabled: false },
    { value: "claude-3.5-sonnet", label: "Claude 3.5 Sonnet", disabled: true },
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", disabled: true },
  ],
  image: [
    { value: "higgsfield-ai/soul/v2/standard", label: "Soul 2.0", disabled: false },
    ...imageAlternatives,
  ],
  image_refinement: [
    { value: "higgsfield-ai/soul/v2/image-to-image", label: "Soul 2.0", disabled: false },
    ...imageAlternatives,
  ],
  video: [
    { value: "bytedance/seedance-2.0/text-to-video", label: "Seedance 2.0", disabled: false },
    ...videoAlternatives,
  ],
  video_refinement: [
    { value: "bytedance/seedance-2.5/video-edit", label: "Seedance 2.5", disabled: false },
    ...videoAlternatives,
  ],
};

export function GenerationModelSelect({ kind, disabled = false }: {
  kind: keyof typeof models;
  disabled?: boolean;
}) {
  const id = useId();
  const options = models[kind];
  return (
    <div className="grid w-32 min-w-0 shrink-0 gap-1.5">
      <Label htmlFor={id} className="text-xs font-normal">AI model</Label>
      <Select items={options} value={options[0].value} disabled={disabled}>
        <SelectTrigger id={id} size="sm" className="w-full min-w-0 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((model) => (
            <SelectItem key={model.value} value={model.value} disabled={model.disabled}>
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
