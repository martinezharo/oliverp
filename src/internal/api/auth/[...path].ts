/** Convex Auth routes live on the Convex `.site` deployment, not the Worker. */
export const ALL = () =>
  new Response(JSON.stringify({ error: "Convex Auth routes live on the Convex deployment." }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
