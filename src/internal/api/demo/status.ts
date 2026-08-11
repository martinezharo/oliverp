import type { APIRoute } from "@/lib/server-context";
import { DEMO_MODE_COOKIE } from "../../../lib/runtime";

export const GET: APIRoute = (context) => {
  const cookieValue = context.cookies.get(DEMO_MODE_COOKIE)?.value === "1";
  return new Response(JSON.stringify({ active: cookieValue }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
};
