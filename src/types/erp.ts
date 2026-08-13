export type FinanceRow = {
  dia: string;
  ingresos: number;
  gastos: number;
  balance: number;
  urp: number;
  iva_soportado?: number;
  iva_repercutido?: number;
  saldo_iva?: number;
  proyecto_id: number;
};

export type StockRow = {
  /**
   * Required: product ids are unique per project, so a stock row cannot be
   * acted on without knowing which project issued its id.
   */
  proyecto_id: number;
  producto_id: number;
  nombre_producto: string;
  stock_actual: number;
  coste_ud: number;
  venta_ud: number;
  beneficio_ud: number;
  beneficio_total_30d: number;
  valor_stock: number;
  dias_stock_restante?: number | null;
  venta_diaria_promedio?: number;
  num_ventas_30d?: number;
};

export type Transaction = {
  id: number;
  type: string;
  date: string;
  concept: string;
  units: number;
  amount: number;
  channel: string;
};

/**
 * An API key as the settings screen sees it. The stored hash is deliberately
 * absent: it is what proves a presented key, and nothing renders it.
 */
export type ApiKeyRow = {
  id: string;
  nombre: string;
  /** First few characters of the secret, enough to recognise it in a list. */
  prefijo: string;
  scopes: Array<"read" | "write">;
  activa: boolean;
  expira_en: string | null;
  ultimo_uso_en: string | null;
  creada_en: string;
};
