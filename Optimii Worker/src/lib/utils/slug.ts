import type { Phase } from "@/lib/db/schema";

const DEFAULT_PHASE_SLUGS: Record<string, string> = {
  design: "Design",
  build: "Build",
  certification: "Certification",
};

export function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function createPhaseSlug(phase: Pick<Phase, "id" | "name">) {
  const safeName = toSlug(phase.name);
  return `${safeName}--${phase.id}`;
}

export function resolvePhaseFromSlug(phases: Phase[], slug: string) {
  const [maybeSlug, maybeId] = slug.split("--");
  const phaseFromId = phases.find((phase) => phase.id === maybeId);
  if (phaseFromId) return phaseFromId;

  const normalizedSlug = maybeId ? maybeSlug : slug;
  const matchBySlug = phases.find(
    (phase) => toSlug(phase.name) === normalizedSlug
  );
  if (matchBySlug) return matchBySlug;

  const fallbackName = DEFAULT_PHASE_SLUGS[normalizedSlug];
  return phases.find((phase) => phase.name === fallbackName);
}
