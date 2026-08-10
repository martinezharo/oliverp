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
        // The Convex suite runs under the edge runtime; see
        // vitest.convex.config.ts and `pnpm test:convex`.
        exclude: ["node_modules/**"],
        environment: "node",
        globals: true,
    },
});
