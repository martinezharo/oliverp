import type { APIRoute } from "@/lib/server-context";
import { salesInitData } from "../../../lib/demo/domain";
import { demoDataset } from "../../../lib/demo/store";
import { backendError, jsonResponse, parsePositiveInteger, sessionBackend, unauthorizedResponse } from "../../../lib/legacy-api";
import { isDemoMode } from "../../../lib/runtime";
import { DEFAULT_SALE_CHANNELS } from "../../../lib/transactions";

export const GET: APIRoute = async (context) => {
    // A request carrying the demo cookie is answered from the sample business,
    // the same records the browser works against — it only ever gets here when
    // something outside the application asks, since the app answers its own
    // demo requests without a round-trip.
    if (isDemoMode(context.locals)) {
        const projectId = parsePositiveInteger(context.url.searchParams.get("projectId"));
        return jsonResponse(salesInitData(demoDataset(), projectId ?? 0));
    }

    const session = await sessionBackend(context);
    if (!session) return unauthorizedResponse();
    try {
        // Without the project the form would offer products from every project
        // the user belongs to.
        const projectId = parsePositiveInteger(context.url.searchParams.get("projectId"));
        const data = await session.backend.salesInitData(projectId ?? undefined);
        const channels = Array.from(new Set([...data.channels, ...DEFAULT_SALE_CHANNELS])).sort();
        return jsonResponse({ ...data, channels });
    } catch (error) {
        return backendError(error);
    }
};
