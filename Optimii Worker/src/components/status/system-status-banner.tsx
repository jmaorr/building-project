import { AlertTriangle, Database, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SystemStatus } from "@/lib/status/system-status";

interface SystemStatusBannerProps {
  status: SystemStatus;
  className?: string;
}

export function SystemStatusBanner({ status, className }: SystemStatusBannerProps) {
  const { hasDatabase, hasClerk, warnings } = status;
  const shouldRender = !hasDatabase || !hasClerk || warnings.length > 0;

  if (!shouldRender) return null;

  const messages: string[] = [];
  if (!hasDatabase) {
    messages.push(
      "Cloudflare D1 is not configured. Add the DB binding to wrangler.toml and OpenNext to persist data."
    );
  }
  if (!hasClerk) {
    messages.push(
      "Clerk API keys are missing. Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY to enable authentication."
    );
  }
  messages.push(...warnings.filter(Boolean));

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg border border-amber-300/70 bg-amber-50/60 px-4 py-3 text-amber-900 shadow-sm",
        "dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-100",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mt-0.5 text-amber-700 dark:text-amber-200">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="space-y-2 text-sm leading-relaxed">
        <div className="font-medium">Environment check</div>
        <div className="flex flex-wrap gap-3 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-200">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 dark:bg-amber-900/50">
            <Database className="h-3.5 w-3.5" />
            {hasDatabase ? "D1 connected" : "D1 missing"}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 dark:bg-amber-900/50">
            <ShieldAlert className="h-3.5 w-3.5" />
            {hasClerk ? "Clerk configured" : "Clerk keys missing"}
          </span>
        </div>
        <ul className="list-disc space-y-1 pl-4">
          {messages.map((message, index) => (
            <li key={index} className="text-amber-800/90 dark:text-amber-100/90">
              {message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
