// Load order: base `.env` then override with `.env.local` (matches Next.js precedence).
import { existsSync } from "fs";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

loadEnv({ path: ".env" });
if (existsSync(".env.local")) {
  loadEnv({ path: ".env.local", override: true });
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
