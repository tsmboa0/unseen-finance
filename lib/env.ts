import { existsSync } from "node:fs";
import { config } from "dotenv";

/**
 * Used by Prisma seed and other Node scripts so `.env.local` matches Next.js.
 * Next.js also prefers `.env.local` over `.env` for overlapping keys.
 */
config({ path: ".env" });
if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
}
