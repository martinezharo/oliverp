import type { APIRoute } from "astro";
import { getAuthSession } from "../../../lib/auth";

export const GET: APIRoute = async (context) => {
    const session = await getAuthSession(context);
    if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(session.user), {
        headers: { "Content-Type": "application/json" },
    });
};
