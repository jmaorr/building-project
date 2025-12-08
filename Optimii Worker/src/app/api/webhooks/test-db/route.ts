import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const results: Record<string, unknown> = {};
  
  try {
    // Try to get Cloudflare context
    try {
      const ctx = await getCloudflareContext({ async: true });
      results.hasContext = !!ctx;
      results.hasEnv = !!ctx?.env;
      results.envKeys = ctx?.env ? Object.keys(ctx.env) : [];
      results.hasDB = !!(ctx?.env as Record<string, unknown>)?.DB;
      
      // Try a simple query if DB exists
      const db = (ctx?.env as Record<string, unknown>)?.DB;
      if (db) {
        results.dbType = typeof db;
        try {
          const testResult = await (db as D1Database).prepare("SELECT 1 as test").first();
          results.dbTest = testResult;
          results.dbWorks = true;
        } catch (dbErr) {
          results.dbError = String(dbErr);
          results.dbWorks = false;
        }
      }
    } catch (ctxErr) {
      results.contextError = String(ctxErr);
    }
    
  } catch (err) {
    results.error = String(err);
  }
  
  return NextResponse.json(results);
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  first(): Promise<Record<string, unknown> | null>;
}




