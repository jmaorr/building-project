import type { Project, Phase } from "@/lib/db/schema";

/**
 * Calculate the overall progress of a project based on its phases
 */
export function calculateProjectProgress(project: Project, phases: Phase[]): number {
  if (phases.length === 0) return 0;
  
  const completedPhases = phases.filter(p => p.status === "completed").length;
  const inProgressPhases = phases.filter(p => p.status === "in_progress").length;
  
  // Each completed phase = 100%, in_progress = 50%
  const progress = (completedPhases * 100 + inProgressPhases * 50) / phases.length;
  return Math.round(progress);
}

/**
 * Format a currency amount in AUD
 */
export function formatCurrency(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date in Australian format
 */
export function formatDate(date: Date | null, options?: Intl.DateTimeFormatOptions): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-AU", options || {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

/**
 * Get initials from a name
 */
export function getInitials(name: string): string {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}




