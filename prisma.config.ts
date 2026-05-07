import { config } from "dotenv";
// Carga .env.local primero (Next.js convention), luego .env como fallback
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Conexión directa (sin pooler) para migraciones
    url: process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});
