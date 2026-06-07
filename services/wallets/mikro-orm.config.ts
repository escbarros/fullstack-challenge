import { defineConfig } from "@mikro-orm/postgresql";

export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: ["dist/**/domain/*.entity.js"],
  entitiesTs: ["src/**/domain/*.entity.ts"],
  migrations: {
    path: "./src/migrations",
    glob: "!(*.d).{js,ts}",
  },
  debug: process.env.NODE_ENV !== "production",
});
