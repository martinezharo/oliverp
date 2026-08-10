import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const convexDir = fileURLToPath(new URL("./convex", import.meta.url));

export default defineConfig({
    resolve: {
        alias: {
            "@": srcDir,
            "@convex": convexDir,
        },
    },
    test: {
        include: ["tests/**/*.test.ts"],
        // The database suite needs a live Postgres and runs as its own project;
        // see vitest.rls.config.ts and tests/rls/README.md.
        exclude: ["node_modules/**", "tests/rls/**"],
        environment: "node",
        globals: true,
    },
});
