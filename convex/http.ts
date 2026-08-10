import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Convex Auth owns the complete OAuth flow, including the GitHub callback.
// The callback is stable on the deployment's `.convex.site` origin.
auth.addHttpRoutes(http);

export default http;
