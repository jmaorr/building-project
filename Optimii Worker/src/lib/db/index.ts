import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Type for the D1 database binding from Cloudflare
export type D1Database = {
  prepare: (query: string) => D1PreparedStatement;
  exec: (query: string) => Promise<D1ExecResult>;
  batch: <T = unknown>(
    statements: D1PreparedStatement[]
  ) => Promise<D1Result<T>[]>;
  dump: () => Promise<ArrayBuffer>;
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = unknown>(colName?: string) => Promise<T | null>;
  run: () => Promise<D1Result>;
  all: <T = unknown>() => Promise<D1Result<T>>;
  raw: <T = unknown>() => Promise<T[]>;
};

type D1Result<T = unknown> = {
  results?: T[];
  success: boolean;
  error?: string;
  meta?: Record<string, unknown>;
};

type D1ExecResult = {
  count: number;
  duration: number;
};

/**
 * Create a Drizzle database instance from a D1 binding
 * Use this in API routes and server components
 *
 * @example
 * ```ts
 * // In an API route or server action
 * const db = createDb(context.env.DB);
 * const users = await db.select().from(schema.users);
 * ```
 */
export function createDb(d1: D1Database) {
  return drizzle(d1 as unknown as Parameters<typeof drizzle>[0], { schema });
}

export { schema };

// Re-export commonly used tables for convenience
export { files, users } from "./schema";





