import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { ApiError } from "./api/errors";
import { getEnv } from "./api/env";
import type { ServerLocals } from "./server-context";

export type BackendActor =
    | { kind: "session"; userId: string }
    | { kind: "api_key"; projectLegacyId?: number; apiKeyId?: string };

export interface SaleItemInput {
    productId: number;
    units: number;
    unitPrice: number;
    vatRate: number;
}

export type PurchaseItemInput = SaleItemInput;

export interface BackendConfig {
    convexUrl: string;
    bridgeSecret: string;
}

type ConvexReference = unknown;

/**
 * Server-side gateway to Convex.
 *
 * The Next app is deliberately the only caller of this class. The bridge
 * secret never reaches the browser; the actor is attached to every operation
 * so Convex can apply the same project boundary for UI sessions and API keys.
 */
export class BackendClient {
    private readonly client: ConvexHttpClient;

    constructor(
        private readonly config: BackendConfig,
        private readonly actor: BackendActor,
        authToken?: string,
    ) {
        this.client = new ConvexHttpClient(config.convexUrl, { logger: false });
        if (authToken) this.client.setAuth(authToken);
    }

    private args(values: Record<string, unknown> = {}): Record<string, unknown> {
        return {
            bridgeSecret: this.config.bridgeSecret,
            actor: this.actor,
            ...values,
        };
    }

    private query<T>(reference: ConvexReference, values: Record<string, unknown>): Promise<T> {
        return this.client.query(reference as never, values as never) as Promise<T>;
    }

    private mutation<T>(reference: ConvexReference, values: Record<string, unknown>): Promise<T> {
        return this.client.mutation(reference as never, values as never) as Promise<T>;
    }

    listProjects(): Promise<Array<{ id: number; nombre: string; activo: boolean }>> {
        return this.query(api.domain.listProjects, this.args());
    }

    createProject(name: string): Promise<{ id: number; nombre: string; activo: boolean }> {
        return this.mutation(api.domain.createProject, this.args({ name }));
    }

    /**
     * Both deletions are budgeted server-side and report whether more work is
     * left, so the caller loops until `done`.
     */
    deleteProject(projectId: number): Promise<{ done: boolean; deleted: number }> {
        return this.mutation(
            api.account.deleteProject,
            this.args({ projectLegacyId: projectId }),
        );
    }

    deleteAccount(): Promise<{ done: boolean }> {
        return this.mutation(api.account.deleteAccount, this.args());
    }

    listProducts(values: {
        projectId: number;
        page?: number;
        pageSize?: number;
        search?: string;
    }): Promise<{ data: Array<Record<string, unknown>>; count: number }> {
        return this.query(
            api.domain.listProducts,
            this.args({
                projectLegacyId: values.projectId,
                page: values.page ?? 1,
                pageSize: values.pageSize ?? 100,
                ...(values.search ? { search: values.search } : {}),
            }),
        );
    }

    createProduct(
        projectId: number,
        name: string,
        wallapopTitle?: string,
        vintedTitle?: string,
    ) {
        return this.mutation<{
            id: number;
            proyecto_id: number;
            nombre: string;
            titulo_wallapop: string | null;
            titulo_vinted: string | null;
        }>(
            api.domain.createProduct,
            this.args({
                projectLegacyId: projectId,
                name,
                ...(wallapopTitle ? { wallapopTitle } : {}),
                ...(vintedTitle ? { vintedTitle } : {}),
            }),
        );
    }

    updateProductWallapopTitle(projectId: number, productId: number, wallapopTitle: string) {
        return this.mutation<{
            id: number;
            proyecto_id: number;
            nombre: string;
            titulo_wallapop: string;
            titulo_vinted: string | null;
        }>(
            api.domain.updateProductWallapopTitle,
            this.args({
                projectLegacyId: projectId,
                productLegacyId: productId,
                wallapopTitle,
            }),
        );
    }

    updateProductVintedTitle(projectId: number, productId: number, vintedTitle: string) {
        return this.mutation<{
            id: number;
            proyecto_id: number;
            nombre: string;
            titulo_wallapop: string | null;
            titulo_vinted: string;
        }>(
            api.domain.updateProductVintedTitle,
            this.args({
                projectLegacyId: projectId,
                productLegacyId: productId,
                vintedTitle,
            }),
        );
    }

    getProduct(projectId: number, productId: number) {
        return this.query<{
            id: number;
            proyecto_id: number;
            nombre: string;
            titulo_wallapop: string | null;
            titulo_vinted: string | null;
        }>(
            api.domain.getProduct,
            this.args({ projectLegacyId: projectId, productLegacyId: productId }),
        );
    }

    getProductGlobal(projectId: number, productId: number) {
        return this.query<{
            id: number;
            proyecto_id: number;
            nombre: string;
            titulo_wallapop: string | null;
            titulo_vinted: string | null;
        } | null>(
            api.domain.getProductGlobal,
            this.args({ projectLegacyId: projectId, productLegacyId: productId }),
        );
    }

    listCustomers(values: {
        projectId: number;
        page?: number;
        pageSize?: number;
        search?: string;
    }): Promise<{ data: Array<Record<string, unknown>>; count: number }> {
        return this.query(
            api.domain.listCustomers,
            this.args({
                projectLegacyId: values.projectId,
                page: values.page ?? 1,
                pageSize: values.pageSize ?? 20,
                ...(values.search ? { search: values.search } : {}),
            }),
        );
    }

    listSales(values: {
        projectId: number;
        page?: number;
        pageSize?: number;
        fromDate?: string;
        toDate?: string;
        channel?: string;
    }): Promise<{ data: Array<Record<string, unknown>>; count: number }> {
        return this.query(
            api.domain.listSales,
            this.args({
                projectLegacyId: values.projectId,
                page: values.page ?? 1,
                pageSize: values.pageSize ?? 20,
                ...(values.fromDate ? { fromDate: values.fromDate } : {}),
                ...(values.toDate ? { toDate: values.toDate } : {}),
                ...(values.channel ? { channel: values.channel } : {}),
            }),
        );
    }

    getSale(projectId: number, id: number): Promise<Record<string, unknown> | null> {
        return this.query(api.domain.getSale, this.args({ projectLegacyId: projectId, legacyId: id }));
    }

    createSale(values: {
        projectId: number;
        date: string;
        channel: string;
        items: SaleItemInput[];
    }): Promise<number> {
        return this.mutation(
            api.domain.createSale,
            this.args({
                projectLegacyId: values.projectId,
                date: values.date,
                channel: values.channel,
                items: values.items,
            }),
        );
    }

    importWallapopSale(values: {
        projectId: number;
        originId: string;
        date: string;
        customerName: string;
        wallapopTitle: string;
        totalAmount: number;
        units: number;
        vatRate: number;
    }): Promise<{
        id: number;
        created: boolean;
        customerId?: number;
        productId?: number;
    }> {
        return this.mutation(
            api.domain.importWallapopSale,
            this.args({
                projectLegacyId: values.projectId,
                originId: values.originId,
                date: values.date,
                customerName: values.customerName,
                wallapopTitle: values.wallapopTitle,
                totalAmount: values.totalAmount,
                units: values.units,
                vatRate: values.vatRate,
            }),
        );
    }

    importMarketplaceSale(values: {
        projectId: number;
        originId: string;
        date: string;
        customerName: string;
        marketplaceTitle: string;
        channel: "Wallapop" | "Vinted";
        totalAmount: number;
        units: number;
        vatRate: number;
    }): Promise<{
        id: number;
        created: boolean;
        customerId?: number;
        productId?: number;
    }> {
        return this.mutation(
            api.domain.importMarketplaceSale,
            this.args({
                projectLegacyId: values.projectId,
                originId: values.originId,
                date: values.date,
                customerName: values.customerName,
                marketplaceTitle: values.marketplaceTitle,
                channel: values.channel,
                totalAmount: values.totalAmount,
                units: values.units,
                vatRate: values.vatRate,
            }),
        );
    }

    updateSale(
        projectId: number,
        id: number,
        values: {
            date?: string;
            channel?: string;
            items?: SaleItemInput[];
        },
    ): Promise<number> {
        return this.mutation(
            api.domain.updateSale,
            this.args({ projectLegacyId: projectId, legacyId: id, ...values }),
        );
    }

    deleteSale(projectId: number, id: number): Promise<boolean> {
        return this.mutation(api.domain.deleteSale, this.args({ projectLegacyId: projectId, legacyId: id }));
    }

    listPurchases(values: {
        projectId: number;
        page?: number;
        pageSize?: number;
        fromDate?: string;
        toDate?: string;
    }): Promise<{ data: Array<Record<string, unknown>>; count: number }> {
        return this.query(
            api.domain.listPurchases,
            this.args({
                projectLegacyId: values.projectId,
                page: values.page ?? 1,
                pageSize: values.pageSize ?? 20,
                ...(values.fromDate ? { fromDate: values.fromDate } : {}),
                ...(values.toDate ? { toDate: values.toDate } : {}),
            }),
        );
    }

    getPurchase(projectId: number, id: number): Promise<Record<string, unknown> | null> {
        return this.query(api.domain.getPurchase, this.args({ projectLegacyId: projectId, legacyId: id }));
    }

    createPurchase(values: {
        projectId: number;
        date: string;
        items: PurchaseItemInput[];
    }): Promise<number> {
        return this.mutation(
            api.domain.createPurchase,
            this.args({
                projectLegacyId: values.projectId,
                date: values.date,
                items: values.items,
            }),
        );
    }

    updatePurchase(
        projectId: number,
        id: number,
        values: { date?: string; items?: PurchaseItemInput[] },
    ): Promise<number> {
        return this.mutation(
            api.domain.updatePurchase,
            this.args({ projectLegacyId: projectId, legacyId: id, ...values }),
        );
    }

    deletePurchase(projectId: number, id: number): Promise<boolean> {
        return this.mutation(api.domain.deletePurchase, this.args({ projectLegacyId: projectId, legacyId: id }));
    }

    listTransactions(values: {
        projectId: number;
        page?: number;
        pageSize?: number;
        fromDate?: string;
        toDate?: string;
        type?: string;
    }): Promise<{ data: Array<Record<string, unknown>>; count: number }> {
        return this.query(
            api.domain.listOtherTransactions,
            this.args({
                projectLegacyId: values.projectId,
                page: values.page ?? 1,
                pageSize: values.pageSize ?? 20,
                ...(values.fromDate ? { fromDate: values.fromDate } : {}),
                ...(values.toDate ? { toDate: values.toDate } : {}),
                ...(values.type ? { type: values.type } : {}),
            }),
        );
    }

    getTransaction(projectId: number, id: number): Promise<Record<string, unknown> | null> {
        return this.query(api.domain.getOtherTransaction, this.args({ projectLegacyId: projectId, legacyId: id }));
    }

    createTransaction(values: {
        projectId: number;
        type: string;
        concept: string;
        description?: string;
        amount: number;
        vatRate: number;
        date: string;
    }): Promise<number> {
        return this.mutation(
            api.domain.createOtherTransaction,
            this.args({
                projectLegacyId: values.projectId,
                type: values.type,
                concept: values.concept,
                ...(values.description !== undefined ? { description: values.description } : {}),
                amount: values.amount,
                vatRate: values.vatRate,
                date: values.date,
            }),
        );
    }

    updateTransaction(
        projectId: number,
        id: number,
        values: {
            type?: string;
            concept?: string;
            description?: string;
            amount?: number;
            vatRate?: number;
            date?: string;
        },
    ): Promise<number> {
        return this.mutation(
            api.domain.updateOtherTransaction,
            this.args({ projectLegacyId: projectId, legacyId: id, ...values }),
        );
    }

    deleteTransaction(projectId: number, id: number): Promise<boolean> {
        return this.mutation(api.domain.deleteOtherTransaction, this.args({ projectLegacyId: projectId, legacyId: id }));
    }

    listStock(values: {
        projectId: number;
        page?: number;
        pageSize?: number;
        maxDays?: number;
        maxUnits?: number;
    }): Promise<{ data: Array<Record<string, unknown>>; count: number }> {
        return this.query(
            api.domain.listStock,
            this.args({
                projectLegacyId: values.projectId,
                page: values.page ?? 1,
                pageSize: values.pageSize ?? 20,
                ...(values.maxDays !== undefined ? { maxDays: values.maxDays } : {}),
                ...(values.maxUnits !== undefined ? { maxUnits: values.maxUnits } : {}),
            }),
        );
    }

    getStockForProduct(projectId: number, productId: number) {
        return this.query<Record<string, unknown> | null>(
            api.domain.getStockForProduct,
            this.args({ projectLegacyId: projectId, productLegacyId: productId }),
        );
    }

    listStockMovements(projectId: number, productId: number) {
        return this.query<Array<Record<string, unknown>>>(
            api.domain.listStockMovements,
            this.args({ projectLegacyId: projectId, productLegacyId: productId }),
        );
    }

    adjustStock(values: {
        projectId: number;
        productId: number;
        units: number;
        date: string;
    }): Promise<{
        id: number;
        producto_id: number;
        unidades: number;
        tipo_movimiento: "ajuste manual";
        fecha: string;
    }> {
        return this.mutation(
            api.domain.adjustStock,
            this.args({
                projectLegacyId: values.projectId,
                productLegacyId: values.productId,
                units: values.units,
                date: values.date,
            }),
        );
    }

    listDailyFinances(values: {
        projectId: number;
        fromDate?: string;
        toDate?: string;
    }): Promise<Array<Record<string, unknown>>> {
        return this.query(
            api.domain.listDailyFinances,
            this.args({
                projectLegacyId: values.projectId,
                ...(values.fromDate ? { fromDate: values.fromDate } : {}),
                ...(values.toDate ? { toDate: values.toDate } : {}),
            }),
        );
    }

    financeEvolution(projectId: number, fromDate: string) {
        return this.query<Array<Record<string, unknown>>>(
            api.domain.financeEvolution,
            this.args({ projectLegacyId: projectId, fromDate }),
        );
    }

    salesInitData(projectId?: number) {
        return this.query<{
            products: Array<Record<string, unknown>>;
            channels: string[];
        }>(
            api.domain.salesInitData,
            this.args(projectId !== undefined ? { projectLegacyId: projectId } : {}),
        );
    }

    transactionSources(values: { projectId: number; fromDate?: string; toDate?: string }) {
        return this.query<{
            sales: Array<Record<string, unknown>>;
            purchases: Array<Record<string, unknown>>;
            others: Array<Record<string, unknown>>;
        }>(
            api.domain.transactionSources,
            this.args({
                projectLegacyId: values.projectId,
                ...(values.fromDate ? { fromDate: values.fromDate } : {}),
                ...(values.toDate ? { toDate: values.toDate } : {}),
            }),
        );
    }

    apiKeyByHash(keyHash: string) {
        return this.query<{
            id: string;
            proyecto_id: number;
            scopes: Array<"read" | "write">;
            activa: boolean;
            expira_en: string | null;
            ultimo_uso_en: string | null;
        } | null>(api.domain.apiKeyByHash, {
            bridgeSecret: this.config.bridgeSecret,
            keyHash,
        });
    }

    touchApiKey(keyId: string, lastUsedAt: string) {
        return this.mutation(api.domain.touchApiKey, {
            bridgeSecret: this.config.bridgeSecret,
            keyId,
            lastUsedAt,
        });
    }

    createApiKey(values: {
        name: string;
        projectId: number;
        keyHash: string;
        keyPrefix: string;
        scopes: Array<"read" | "write">;
        expiresAt?: string;
    }) {
        return this.mutation(api.domain.createApiKey, {
            bridgeSecret: this.config.bridgeSecret,
            name: values.name,
            projectLegacyId: values.projectId,
            keyHash: values.keyHash,
            keyPrefix: values.keyPrefix,
            scopes: values.scopes,
            ...(values.expiresAt ? { expiresAt: values.expiresAt } : {}),
        });
    }

    reserveIdempotency(key: string, endpoint: string, requestHash: string) {
        return this.mutation<
            | { status: "reserved" }
            | { status: "mismatch" }
            | { status: "in_flight" }
            | { status: "replay"; responseStatus: number; responseBody: unknown }
        >(api.domain.reserveIdempotency, this.args({ key, endpoint, requestHash }));
    }

    completeIdempotency(
        key: string,
        endpoint: string,
        responseStatus: number,
        responseBody: unknown,
    ) {
        return this.mutation(
            api.domain.completeIdempotency,
            this.args({ key, endpoint, responseStatus, responseBody }),
        );
    }

    releaseIdempotency(key: string, endpoint: string) {
        return this.mutation(api.domain.releaseIdempotency, this.args({ key, endpoint }));
    }
}

function convexConfig(locals?: ServerLocals): BackendConfig {
    const convexUrl = getEnv(locals, "NEXT_PUBLIC_CONVEX_URL");
    const bridgeSecret = getEnv(locals, "CONVEX_BRIDGE_SECRET");

    if (!convexUrl || !bridgeSecret) {
        throw new ApiError(
            "not_configured",
            "Convex no esta configurado en este despliegue.",
            {
                hint: "Define NEXT_PUBLIC_CONVEX_URL y CONVEX_BRIDGE_SECRET como variables del servidor.",
            },
        );
    }

    return { convexUrl, bridgeSecret };
}

export function createBackend(
    locals: ServerLocals | undefined,
    actor: BackendActor,
    authToken?: string,
): BackendClient {
    return new BackendClient(convexConfig(locals), actor, authToken ?? locals?.authToken);
}
