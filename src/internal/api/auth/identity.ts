import { getAuthSession } from "../../../lib/auth";
import type { ServerContext } from "../../../lib/server-context";

export const GET = async (context: ServerContext) => {
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
