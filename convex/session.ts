import { query } from "./_generated/server";
import { v } from "convex/values";
import { euros, requireProject, type Actor } from "./lib/bridge";
import {
  computeDailyFinances,
  dayOf,
  legacyProject,
  otherTransactionsForProject,
  purchaseRow,
  purchasesForProject,
  saleRow,
  salesForProject,
  stockRowsForProject,
  visibleProjects,
} from "./domain";

/**
 * Read models the browser subscribes to directly.
 *
 * The functions in `domain.ts` are reachable only by the Next gateway, which
 * proves it is the caller with `CONVEX_BRIDGE_SECRET`. That secret can never
 * ship to a browser, so these queries exist as a second entry point into the
 * same helpers, gated instead by Convex's verified JWT: `requireProject`
 * resolves the user from `ctx.auth` and refuses a project the user is not a
 * member of. The authorization is identical; only the proof of identity
 * differs.
 *
 * Reading through them keeps every list reactive and cached in the client, so
 * revisiting a page paints from memory instead of re-running an HTTP fetch.
 */

const sessionActor: Actor = { kind: "session" };

/**
 * Signed-out and mid-refresh clients get a neutral answer rather than an
 * error: throwing here would surface as a broken page during the moment the
 * auth token is being renewed.
 */
async function signedIn(ctx: { auth: { getUserIdentity: () => Promise<unknown> } }): Promise<boolean> {
  return (await ctx.auth.getUserIdentity()) !== null;
}

export const projects = query({
  args: {},
  handler: async (ctx) => {
    if (!(await signedIn(ctx))) return [];
    const visible = await visibleProjects(ctx, sessionActor);
    // Keep the legacy ordering so the first project stays the default one.
    return visible.sort((a, b) => a.legacyId - b.legacyId).map(legacyProject);
  },
});

export const stock = query({
  args: { projectLegacyId: v.number() },
  handler: async (ctx, args) => {
    if (!(await signedIn(ctx))) return [];
    const project = await requireProject(ctx, sessionActor, args.projectLegacyId);
    // The whole inventory in one subscription: the paged REST endpoint made
    // the client walk pages sequentially on every visit.
    return (await stockRowsForProject(ctx, project)).sort(
      (a, b) => a.dias_stock_restante - b.dias_stock_restante,
    );
  },
});

export const dailyFinances = query({
  args: {
    projectLegacyId: v.number(),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await signedIn(ctx))) return [];
    return await computeDailyFinances(ctx, { ...args, actor: sessionActor });
  },
});

export const financeEvolution = query({
  args: { projectLegacyId: v.number(), fromDate: v.string() },
  handler: async (ctx, args) => {
    if (!(await signedIn(ctx))) return [];
    const rows = await computeDailyFinances(ctx, {
      projectLegacyId: args.projectLegacyId,
      fromDate: args.fromDate,
      actor: sessionActor,
    });
    return rows
      .filter((row) => row.dia >= dayOf(args.fromDate))
      .map((row) => ({ dia: row.dia, ingresos: row.ingresos, urp: row.urp }));
  },
});

export const transactionSources = query({
  args: {
    projectLegacyId: v.number(),
    fromDate: v.optional(v.string()),
    toDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!(await signedIn(ctx))) return { sales: [], purchases: [], others: [] };
    const project = await requireProject(ctx, sessionActor, args.projectLegacyId);
    const inRange = (date: string) =>
      (!args.fromDate || date >= args.fromDate) && (!args.toDate || date <= args.toDate);

    const sales = (await salesForProject(ctx, project._id)).filter((sale) => inRange(sale.date));
    const purchases = (await purchasesForProject(ctx, project._id)).filter((purchase) =>
      inRange(purchase.date),
    );
    const others = (await otherTransactionsForProject(ctx, project._id)).filter((row) =>
      inRange(row.date),
    );

    return {
      sales: await Promise.all(sales.map((sale) => saleRow(ctx, sale))),
      purchases: await Promise.all(purchases.map((purchase) => purchaseRow(ctx, purchase))),
      others: others.map((row) => ({
        id: row.legacyId,
        proyecto_id: row.projectLegacyId,
        tipo: row.type,
        concepto: row.concept,
        descripcion: row.description ?? null,
        importe: euros(row.amountCents),
        porcentaje_iva: row.vatRate,
        fecha: row.date,
      })),
    };
  },
});
