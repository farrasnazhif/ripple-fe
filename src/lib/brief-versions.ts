import type { ProjectReview } from "@/types/ripple";

type BriefVersion = ProjectReview["versions"][number];

export function briefHistory(versions: BriefVersion[], currentVersion: number) {
  const states: BriefVersion[] = [];
  const signature = (version: BriefVersion) => JSON.stringify([
    version.raw_text,
    version.summary,
    version.points.map(point => [point.key, point.value, point.scope]).sort((a, b) => a[0].localeCompare(b[0])),
    [...version.attachments].sort(),
  ]);
  for (const version of [...versions].filter(v => v.version <= currentVersion).sort((a, b) => a.version - b.version)) {
    if (!states.length || signature(states[states.length - 1]) !== signature(version)) states.push(version);
  }
  const current = versions.find(version => version.version === currentVersion);
  if (current && states.length && signature(states[states.length - 1]) === signature(current)) states.pop();
  return states.map((version, index) => ({ ...version, archiveNumber: index + 1 })).reverse();
}
