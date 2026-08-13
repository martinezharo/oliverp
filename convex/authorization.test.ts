/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";

import { api } from "./_generated/api";
import schema from "./schema";

/**
 * The project boundary.
 *
 * Until sign-up was opened up, "every project" and "my projects" were the same
 * set and nothing here could be observed. These tests pin down the difference:
 * two users who share a deployment and nothing else, and a delegated API key
 * that must not become a master key.
 */
const modules = import.meta.glob("./**/*.ts");
const SECRET = "authorization-test-secret";

beforeEach(() => {
  process.env.CONVEX_BRIDGE_SECRET = SECRET;
});

type Harness = ReturnType<typeof convexTest>;

/** Two independent tenants: each user owns one project with one product. */
async function seedTwoTenants(t: Harness) {
  return await t.run(async (ctx) => {
    const alice = await ctx.db.insert("users", { name: "Alice" });
    const bob = await ctx.db.insert("users", { name: "Bob" });

    const setup = async (userId: string, legacyId: number, name: string) => {
      const projectId = await ctx.db.insert("projects", { legacyId, name, active: true });
      await ctx.db.insert("projectMembers", {
        projectId,
        userId,
        role: "admin",
        createdAt: new Date(0).toISOString(),
      });
      const productId = await ctx.db.insert("products", {
        legacyId: 1,
        projectId,
        projectLegacyId: legacyId,
        name: `${name} product`,
      });
      // Both projects deliberately use legacy id 1 for their first sale: ids
      // are unique per project, and nothing may resolve one from the other.
      const saleId = await ctx.db.insert("sales", {
        legacyId: 1,
        projectId,
        projectLegacyId: legacyId,
        date: "2026-08-01",
        channel: name,
      });
      await ctx.db.insert("saleLines", {
        legacyId: 1,
        saleId,
        projectId,
        projectLegacyId: legacyId,
        productId,
        productLegacyId: 1,
        units: 1,
        unitPriceCents: 1000,
        vatRate: 21,
      });
      return { projectId, productId, saleId };
    };

    return {
      alice: { userId: alice, ...(await setup(alice, 1, "Alice")) },
      bob: { userId: bob, ...(await setup(bob, 2, "Bob")) },
    };
  });
}

const sessionActor = { kind: "session" as const };

function asUser(t: Harness, userId: string) {
  // Convex Auth subjects are `<userId>|<sessionId>`.
  return t.withIdentity({ subject: `${userId}|session` });
}

describe("project boundary for browser sessions", () => {
  it("hides another user's projects from the project list", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);

    const visible = await asUser(t, alice.userId).query(api.domain.listProjects, {
      bridgeSecret: SECRET,
      actor: sessionActor,
    });

    expect(visible).toEqual([{ id: 1, nombre: "Alice", activo: true }]);
  });

  it("refuses to read a project the user does not belong to", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);

    await expect(
      asUser(t, alice.userId).query(api.domain.listSales, {
        bridgeSecret: SECRET,
        actor: sessionActor,
        projectLegacyId: 2,
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow(/not a member/i);
  });

  it("refuses to write into a project the user does not belong to", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);

    await expect(
      asUser(t, alice.userId).mutation(api.domain.createProduct, {
        bridgeSecret: SECRET,
        actor: sessionActor,
        projectLegacyId: 2,
        name: "Injected",
      }),
    ).rejects.toThrow(/not a member/i);
  });

  it("cannot reach another tenant's sale that shares its legacy id", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);

    const own = await asUser(t, alice.userId).query(api.domain.getSale, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 1,
      legacyId: 1,
    });
    expect(own).toMatchObject({ id: 1, canal: "Alice" });

    await expect(
      asUser(t, alice.userId).query(api.domain.getSale, {
        bridgeSecret: SECRET,
        actor: sessionActor,
        projectLegacyId: 2,
        legacyId: 1,
      }),
    ).rejects.toThrow(/not a member/i);
  });

  it("rejects a forged user id even with a valid session", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await seedTwoTenants(t);

    await expect(
      asUser(t, alice.userId).query(api.domain.listProjects, {
        bridgeSecret: SECRET,
        actor: { kind: "session", userId: bob.userId },
      }),
    ).rejects.toThrow(/does not match/i);
  });

  it("refuses a signed-out caller", async () => {
    const t = convexTest(schema, modules);
    await seedTwoTenants(t);

    await expect(
      t.query(api.domain.listProjects, { bridgeSecret: SECRET, actor: sessionActor }),
    ).rejects.toThrow(/session is required/i);
  });

  it("refuses a wrong bridge secret", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);

    await expect(
      asUser(t, alice.userId).query(api.domain.listProjects, {
        bridgeSecret: "not-the-secret",
        actor: sessionActor,
      }),
    ).rejects.toThrow(/bridge unauthorized/i);
  });
});

describe("API keys are confined to one project", () => {
  const unpinned = { kind: "api_key" as const, apiKeyId: "legacy-wildcard" };
  const pinnedToAlice = {
    kind: "api_key" as const,
    projectLegacyId: 1,
    apiKeyId: "alice-key",
  };

  it("refuses a key with no project instead of showing every project", async () => {
    const t = convexTest(schema, modules);
    await seedTwoTenants(t);

    await expect(
      t.query(api.domain.listProjects, { bridgeSecret: SECRET, actor: unpinned }),
    ).rejects.toThrow(/not bound to a project/i);
  });

  it("refuses a key with no project on a project-scoped read", async () => {
    const t = convexTest(schema, modules);
    await seedTwoTenants(t);

    await expect(
      t.query(api.domain.listSales, {
        bridgeSecret: SECRET,
        actor: unpinned,
        projectLegacyId: 1,
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow(/not bound to a project/i);
  });

  it("refuses a key with no project on the aggregate read model", async () => {
    const t = convexTest(schema, modules);
    await seedTwoTenants(t);

    await expect(
      t.query(api.domain.salesInitData, { bridgeSecret: SECRET, actor: unpinned }),
    ).rejects.toThrow(/not bound to a project/i);
  });

  it("cannot cross from its own project into another", async () => {
    const t = convexTest(schema, modules);
    await seedTwoTenants(t);

    const own = await t.query(api.domain.listSales, {
      bridgeSecret: SECRET,
      actor: pinnedToAlice,
      projectLegacyId: 1,
      page: 1,
      pageSize: 10,
    });
    expect(own.count).toBe(1);

    await expect(
      t.query(api.domain.listSales, {
        bridgeSecret: SECRET,
        actor: pinnedToAlice,
        projectLegacyId: 2,
        page: 1,
        pageSize: 10,
      }),
    ).rejects.toThrow(/cannot access that project/i);
  });

  it("cannot delete a project even within its own scope", async () => {
    const t = convexTest(schema, modules);
    await seedTwoTenants(t);

    await expect(
      t.mutation(api.account.deleteProject, {
        bridgeSecret: SECRET,
        actor: pinnedToAlice,
        projectLegacyId: 1,
      }),
    ).rejects.toThrow(/administrative operations/i);
  });
});

describe("legacy ids are allocated per project", () => {
  it("gives each project its own sequence", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await seedTwoTenants(t);

    const aliceSale = await asUser(t, alice.userId).mutation(api.domain.createSale, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 1,
      date: "2026-08-02",
      channel: "Web",
      items: [{ productId: 1, units: 1, unitPrice: 5, vatRate: 21 }],
    });
    const bobSale = await asUser(t, bob.userId).mutation(api.domain.createSale, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 2,
      date: "2026-08-02",
      channel: "Web",
      items: [{ productId: 1, units: 1, unitPrice: 5, vatRate: 21 }],
    });

    // Both continue their own sequence rather than sharing a global one.
    expect(aliceSale).toBe(bobSale);
  });

  it("does not reuse ids when a sale writes several lines", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);

    const items = [
      { productId: 1, units: 1, unitPrice: 5, vatRate: 21 },
      { productId: 1, units: 2, unitPrice: 6, vatRate: 21 },
    ];
    await asUser(t, alice.userId).mutation(api.domain.createSale, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 1,
      date: "2026-08-02",
      channel: "Web",
      items,
    });
    await asUser(t, alice.userId).mutation(api.domain.createSale, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 1,
      date: "2026-08-03",
      channel: "Web",
      items,
    });

    const lineIds = await t.run(async (ctx) => {
      const lines = await ctx.db
        .query("saleLines")
        .withIndex("by_project", (q) => q.eq("projectId", alice.projectId))
        .collect();
      return lines.map((line) => line.legacyId);
    });

    expect(new Set(lineIds).size).toBe(lineIds.length);
  });
});

describe("erasure", () => {
  it("deletes one project without touching the other tenant", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await seedTwoTenants(t);

    const result = await asUser(t, alice.userId).mutation(api.account.deleteProject, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 1,
    });
    expect(result.done).toBe(true);

    const surviving = await t.run(async (ctx) => ({
      projects: (await ctx.db.query("projects").collect()).map((p) => p.legacyId),
      sales: (await ctx.db.query("sales").collect()).map((s) => s.projectLegacyId),
      lines: await ctx.db.query("saleLines").collect(),
      members: await ctx.db.query("projectMembers").collect(),
    }));

    expect(surviving.projects).toEqual([2]);
    expect(surviving.sales).toEqual([2]);
    expect(surviving.lines).toHaveLength(1);
    expect(surviving.members.map((m) => m.userId)).toEqual([bob.userId]);
  });

  it("refuses to delete a project the user does not administer", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);

    await expect(
      asUser(t, alice.userId).mutation(api.account.deleteProject, {
        bridgeSecret: SECRET,
        actor: sessionActor,
        projectLegacyId: 2,
      }),
    ).rejects.toThrow(/not a member/i);
  });

  it("erases the account and its data but leaves other tenants intact", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await seedTwoTenants(t);

    const result = await asUser(t, alice.userId).mutation(api.account.deleteAccount, {
      bridgeSecret: SECRET,
      actor: sessionActor,
    });
    expect(result.done).toBe(true);

    const after = await t.run(async (ctx) => ({
      users: (await ctx.db.query("users").collect()).map((u) => u._id),
      projects: (await ctx.db.query("projects").collect()).map((p) => p.legacyId),
      sales: await ctx.db.query("sales").collect(),
    }));

    expect(after.users).toEqual([bob.userId]);
    expect(after.projects).toEqual([2]);
    expect(after.sales.map((s) => s.projectLegacyId)).toEqual([2]);
    expect(alice.userId).not.toBe(bob.userId);
  });
});

describe("API key administration", () => {
  const key = {
    name: "n8n",
    keyHash: "hash-1",
    keyPrefix: "erp_sk_abc123",
    scopes: ["read"] as Array<"read" | "write">,
  };

  it("mints a key for an admin of the project and lists it back", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);
    const caller = asUser(t, alice.userId);

    const created = await caller.mutation(api.apiKeys.create, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 1,
      ...key,
    });
    expect(created).toMatchObject({ nombre: "n8n", proyecto_id: 1 });

    const listed = await caller.query(api.apiKeys.list, { projectLegacyId: 1 });
    expect(listed).toMatchObject([
      { nombre: "n8n", prefijo: "erp_sk_abc123", scopes: ["read"], activa: true },
    ]);
    // The hash is what proves a presented key: it must never come back out.
    expect(JSON.stringify(listed)).not.toContain("hash-1");
  });

  it("refuses to mint a key for a project the user does not administer", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);

    await expect(
      asUser(t, alice.userId).mutation(api.apiKeys.create, {
        bridgeSecret: SECRET,
        actor: sessionActor,
        projectLegacyId: 2,
        ...key,
      }),
    ).rejects.toThrow(/not a member/i);
  });

  it("refuses to mint a key with an API key as the actor", async () => {
    const t = convexTest(schema, modules);
    await seedTwoTenants(t);

    await expect(
      t.mutation(api.apiKeys.create, {
        bridgeSecret: SECRET,
        actor: { kind: "api_key", projectLegacyId: 1, apiKeyId: "alice-key" },
        projectLegacyId: 1,
        ...key,
      }),
    ).rejects.toThrow(/administrative operations/i);
  });

  it("hides another tenant's keys instead of failing loudly", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await seedTwoTenants(t);

    await asUser(t, bob.userId).mutation(api.apiKeys.create, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 2,
      ...key,
    });

    expect(await asUser(t, alice.userId).query(api.apiKeys.list, { projectLegacyId: 2 })).toBeNull();
    expect(await t.query(api.apiKeys.list, { projectLegacyId: 2 })).toBeNull();
  });

  it("refuses to revoke a key belonging to another tenant", async () => {
    const t = convexTest(schema, modules);
    const { alice, bob } = await seedTwoTenants(t);

    const created = await asUser(t, bob.userId).mutation(api.apiKeys.create, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 2,
      ...key,
    });

    await expect(
      asUser(t, alice.userId).mutation(api.apiKeys.revoke, {
        bridgeSecret: SECRET,
        actor: sessionActor,
        keyId: created.id,
      }),
    ).rejects.toThrow(/not a member/i);

    expect(await t.run(async (ctx) => (await ctx.db.query("apiKeys").collect()).length)).toBe(1);
  });

  it("revokes a key so the credential can no longer be resolved", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);
    const caller = asUser(t, alice.userId);

    const created = await caller.mutation(api.apiKeys.create, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      projectLegacyId: 1,
      ...key,
    });

    await caller.mutation(api.apiKeys.revoke, {
      bridgeSecret: SECRET,
      actor: sessionActor,
      keyId: created.id,
    });

    expect(await caller.query(api.apiKeys.list, { projectLegacyId: 1 })).toEqual([]);
    expect(
      await t.query(api.apiKeys.byHash, { bridgeSecret: SECRET, keyHash: "hash-1" }),
    ).toBeNull();
  });
});

describe("write budget", () => {
  it("stops an actor that floods the backend with writes", async () => {
    const t = convexTest(schema, modules);
    const { alice } = await seedTwoTenants(t);
    const caller = asUser(t, alice.userId);

    const create = (n: number) =>
      caller.mutation(api.domain.createProduct, {
        bridgeSecret: SECRET,
        actor: sessionActor,
        projectLegacyId: 1,
        name: `Product ${n}`,
      });

    // The budget is per fixed window, so the run has to exceed it in one go.
    let failure: unknown = null;
    for (let n = 0; n < 260 && failure === null; n += 1) {
      failure = await create(n).then(() => null, (error: unknown) => error);
    }

    expect(String(failure)).toMatch(/too many writes/i);
  });
});
