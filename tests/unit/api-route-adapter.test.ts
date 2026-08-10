import { describe, expect, it } from "vitest";
import { GET, POST } from "../../src/app/api/[[...path]]/route";

function props(pathname: string) {
    return {
        params: Promise.resolve({
            path: pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean),
        }),
    };
}

describe("Next API route adapter", () => {
    it("maps the legacy sign-in bookmark to the single Convex Auth login", async () => {
        const response = await GET(
            new Request("https://erp.test/api/auth/signin"),
            props("/api/auth/signin"),
        );

        expect(response.status).toBe(302);
        expect(response.headers.get("location")).toBe("/login");
    });

    it("keeps demo status JSON and its cookie contract stable", async () => {
        const response = await GET(
            new Request("https://erp.test/api/demo/status", { headers: { cookie: "erp_demo_mode=1" } }),
            props("/api/demo/status"),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ active: true });
    });

    it("returns a method error instead of invoking the wrong legacy handler", async () => {
        const response = await GET(
            new Request("https://erp.test/api/auth/signin"),
            props("/api/auth/signin"),
        );
        const post = await POST(
            new Request("https://erp.test/api/auth/signin", { method: "POST" }),
            props("/api/auth/signin"),
        );

        expect(response.status).toBe(302);
        expect(post.status).toBe(303);
        expect(post.headers.get("location")).toBe("/login?error=github");
    });

    it("registers project creation as a POST-only endpoint that demo mode refuses", async () => {
        const demo = await POST(
            new Request("https://erp.test/api/projects/create", {
                method: "POST",
                headers: { cookie: "erp_demo_mode=1", "Content-Type": "application/json" },
                body: JSON.stringify({ name: "Demo" }),
            }),
            props("/api/projects/create"),
        );
        const wrongMethod = await GET(
            new Request("https://erp.test/api/projects/create"),
            props("/api/projects/create"),
        );

        expect(demo.status).toBe(403);
        expect(wrongMethod.status).toBe(405);
    });

    it("returns JSON 404 for an unregistered endpoint", async () => {
        const response = await GET(
            new Request("https://erp.test/api/not-registered"),
            props("/api/not-registered"),
        );

        expect(response.status).toBe(404);
        await expect(response.json()).resolves.toEqual({ error: "Not found" });
    });
});
