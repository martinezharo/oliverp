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
  proyecto_id?: number;
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
  status: string;
};
