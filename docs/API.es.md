# API de OlivERP v1

Una API diseñada para que agentes de IA y herramientas de automatización (n8n,
Make, Zapier, Custom GPTs) operen el ERP sin usar la interfaz web.

El contrato completo y siempre actualizado está disponible en:

```
GET /api/v1/openapi.json
```

Este endpoint es público intencionadamente: un cliente debe poder leer el
contrato antes de tener credenciales. No expone ningún dato.

---

## Primeros pasos

### 1. Configura el puente de Convex

Las peticiones autenticadas con una clave de API del ERP las resuelve el Worker
de Next.js y las autoriza Convex. Configura el mismo valor aleatorio en Convex
y en el despliegue del Worker:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_BRIDGE_SECRET=long-random-server-secret
```

`CONVEX_BRIDGE_SECRET` es exclusivo del servidor. No le pongas el prefijo
`PUBLIC_` ni lo incluyas en un bundle del navegador. Las sesiones del navegador
las emite Convex Auth y se presentan ante Convex como un JWT verificado.

### 2. Crea una clave de API

Desde la aplicación, en **Ajustes → tu proyecto → Gestionar claves de API**:
pon nombre a la clave, elige si puede escribir, establece opcionalmente una
fecha de caducidad y copia el secreto de la confirmación: se muestra una sola
vez y nunca vuelve a aparecer. La misma pantalla lista todas las claves del
proyecto y permite revocarlas. Solo los administradores del proyecto pueden
acceder a ella.

Para configuraciones desatendidas existe una CLI equivalente, que se autentica
con `CONVEX_BRIDGE_SECRET` en lugar de una sesión de usuario:

```bash
pnpm api:key --nombre "n8n stock" --proyecto 1 --scopes read,write
```

Opciones:

| Opción       | Descripción                                                        |
| :----------- | :----------------------------------------------------------------- |
| `--nombre`   | Obligatoria. Sirve para identificar la clave más adelante.        |
| `--proyecto` | **Obligatoria.** ID del proyecto al que queda vinculada la clave. |
| `--scopes`   | `read`, `write` o `read,write`. Por defecto, `read`.              |
| `--expira`   | Fecha de caducidad (`YYYY-MM-DD`). Por defecto no caduca.         |

La clave se muestra **una sola vez**, por cualquiera de las dos vías: en
Convex solo se guarda su hash SHA-256. Una clave perdida no se puede recuperar;
solo se puede revocar y sustituir.

---

## Autenticación

```bash
curl -H "Authorization: Bearer erp_sk_..." https://your-erp/api/v1/proyectos
```

También se acepta `X-API-Key: erp_sk_...`, que es la cabecera predeterminada
que envían varias herramientas de automatización.

La interfaz web utiliza la sesión de cookies de Convex Auth almacenada en
Convex; los mismos endpoints admiten tanto sesiones de navegador como claves
de API.

Una sesión de navegador se prolonga en cada visita y termina después de 30 días
sin uso, con un límite máximo de 90 días antes de que haya que volver a iniciar
sesión con GitHub. Los tres relojes —inactividad, límite máximo y duración de
la cookie— se configuran en
[`convex/lib/session.ts`](https://github.com/martinezharo/oliverp/blob/main/convex/lib/session.ts).

### Permisos

- `read` → métodos `GET`.
- `write` → métodos `POST`, `PATCH` y `DELETE`.

### Cada clave está vinculada a un proyecto

Una clave siempre está fijada a un único proyecto y no puede leer ni escribir
datos de ningún otro, incluidos los proyectos de otros usuarios. `proyecto_id`
es opcional en las peticiones; si se proporciona y no coincide, la petición se
rechaza en lugar de reescribirse silenciosamente.

Antes la vinculación era opcional y una clave sin proyecto funcionaba como un
comodín sobre todos los proyectos del despliegue. Con el registro abierto eso
habría significado todos los proyectos de todos los usuarios, así que ahora
una clave sin proyecto se rechaza directamente.

### Los IDs son únicos dentro de cada proyecto

Los valores de `id` de ventas, compras, productos y transacciones son únicos
**dentro de un proyecto**, no en todo el despliegue. Las rutas `/{id}` resuelven
el ID dentro del proyecto de la clave que llama, de modo que dos proyectos
pueden tener una venta con `id: 1` y ninguno puede acceder a la del otro.

Una sesión de navegador, que no está vinculada a un proyecto, debe enviar
`?proyecto_id=` en esas rutas.

---

## Endpoints

| Método   | Ruta                                 | Descripción                                      |
| :------- | :----------------------------------- | :----------------------------------------------- |
| `GET`    | `/api/v1/proyectos`                  | Proyectos accesibles. Empieza aquí.              |
| `GET`    | `/api/v1/productos`                  | Catálogo de productos. Admite el filtro `buscar`. |
| `POST`   | `/api/v1/productos`                  | Crea un producto.                                 |
| `PATCH`  | `/api/v1/productos/{id}`             | Asigna a un producto el título de un anuncio.    |
| `GET`    | `/api/v1/clientes`                   | Clientes conocidos de un proyecto.               |
| `GET`    | `/api/v1/ventas`                     | Ventas. Admite filtros de fecha, estado y canal. |
| `POST`   | `/api/v1/ventas`                     | Registra una venta de forma transaccional.       |
| `GET`    | `/api/v1/ventas/{id}`                 | Devuelve los detalles de una venta.              |
| `PATCH`  | `/api/v1/ventas/{id}`                 | Actualiza la cabecera o las líneas.              |
| `GET`    | `/api/v1/compras`                    | Compras.                                         |
| `POST`   | `/api/v1/compras`                    | Registra una compra de forma transaccional.      |
| `GET`    | `/api/v1/compras/{id}`                | Devuelve los detalles de una compra.             |
| `PATCH`  | `/api/v1/compras/{id}`                | Actualiza la cabecera o las líneas.              |
| `GET`    | `/api/v1/transacciones`              | Otros ingresos y gastos.                         |
| `POST`   | `/api/v1/transacciones`              | Registra un ingreso o un gasto.                  |
| `GET`    | `/api/v1/transacciones/{id}`          | Devuelve los detalles de una transacción.        |
| `PATCH`  | `/api/v1/transacciones/{id}`          | Actualiza una transacción.                       |
| `DELETE` | `/api/v1/transacciones/{id}`          | Elimina una transacción.                         |
| `GET`    | `/api/v1/stock`                      | Stock y días de cobertura del inventario.        |
| `POST`   | `/api/v1/stock/ajustes`              | Aplica un ajuste manual de stock.                |
| `GET`    | `/api/v1/finanzas`                   | Ingresos, gastos, beneficio y saldo de IVA.      |
| `POST`   | `/api/v1/importaciones/marketplace`  | Importa desde Gmail una venta confirmada de Wallapop o Vinted. |
| `POST`   | `/api/v1/importaciones/wallapop`     | Importa desde Gmail una venta confirmada de Wallapop.         |

Los endpoints de lista siempre devuelven el mismo envoltorio:

```json
{
  "data": [ ... ],
  "pagination": { "page": 1, "page_size": 20, "total": 132, "total_pages": 7, "has_more": true }
}
```

---

## Convenciones importantes

**Los precios incluyen el IVA.** Así es como los guarda el esquema. Las
respuestas separan `total_base`, `total_iva` y `total`, para que los clientes
no tengan que calcularlos.

**Cada operación cuenta.** Una venta registrada es un ingreso y una compra
registrada es un gasto desde el momento en que se escriben; no hay estados de
flujo de trabajo que dejen una operación fuera de los libros. Para deshacer una
se usa `DELETE`.

**El stock se mueve automáticamente.** Las mutaciones del dominio de Convex
generan movimientos para ventas y compras. `POST /api/v1/stock/ajustes` solo
sirve para correcciones manuales (roturas, recuentos y donaciones).

**Los títulos de marketplace son mapeos exactos.** El flujo de Gmail envía el
título completo del anuncio y el canal. Primero hay que asignarlo al producto
correspondiente mediante `PATCH /api/v1/productos/{id}` usando
`titulo_wallapop` o `titulo_vinted`; un título desconocido se rechaza en lugar
de asociarse silenciosamente al producto equivocado.

**Las fechas aceptan `YYYY-MM-DD` o ISO 8601.** Una fecha sin hora se interpreta
como medianoche.

**`importe` siempre es positivo** en las transacciones; `tipo` determina su
signo.

---

## Reintentos seguros (`Idempotency-Key`)

Cuando una petición agota el tiempo de espera, quien llama no sabe si la venta
se registró. Repetirla a ciegas podría duplicarla. Para evitarlo, envía una
clave única para cada operación:

```bash
curl -X POST https://your-erp/api/v1/ventas \
  -H "Authorization: Bearer erp_sk_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: venta-shopify-10432" \
  -d '{
    "fecha": "2026-01-31",
    "canal": "Web",
    "items": [{ "producto_id": 1, "unidades": 2, "precio_unitario": 24.99 }]
  }'
```

Repetir esta llamada devuelve la respuesta original con la cabecera
`Idempotency-Replayed: true` sin crear una segunda venta.

- La misma clave con un cuerpo diferente → `422 idempotency_mismatch`.
- La misma clave mientras la primera petición sigue en curso → `409 conflict`.
- Si la petición falla, la clave se libera y se puede reutilizar.

Un buen valor es el ID del pedido del sistema de origen, que es naturalmente
único y estable entre reintentos.

El registro de idempotencia de Convex se puede inspeccionar y limpiar desde el
dashboard de Convex; la migración lo inicia deliberadamente vacío.

---

## Errores

Todos los errores usan la misma estructura:

```json
{
  "error": {
    "code": "validation_error",
    "message": "El cuerpo de la peticion no es valido.",
    "details": [
      {
        "field": "items.0.unidades",
        "message": "Las unidades deben ser un numero entero."
      },
      {
        "field": "canal",
        "message": "Invalid option: expected one of \"Wallapop\"|\"Vinted\"",
        "expected": "\"Wallapop\" | \"Vinted\""
      }
    ],
    "hint": "Revisa los campos listados en 'details'."
  }
}
```

`field` usa notación de puntos, de modo que apunta directamente a la parte
correspondiente del JSON enviado. `expected` enumera los valores aceptados para
un campo restringido, lo que permite a un modelo corregir la llamada en lugar
de repetirla sin cambios.

| Código                 | HTTP | Significado                                           |
| :--------------------- | :--- | :---------------------------------------------------- |
| `validation_error`      | 400  | Cuerpo o consulta inválidos.                         |
| `unauthorized`          | 401  | La clave falta, es inválida, fue revocada o caducó.   |
| `forbidden`             | 403  | Falta permiso o el proyecto no está permitido.       |
| `not_found`             | 404  | El recurso no existe o no es visible.                |
| `conflict`              | 409  | Hay una petición con la misma clave en curso.        |
| `idempotency_mismatch`  | 422  | La clave se reutilizó con un cuerpo diferente.       |
| `demo_mode`             | 403  | El despliegue funciona en modo demo.                 |
| `not_configured`        | 503  | Falta `NEXT_PUBLIC_CONVEX_URL` o `CONVEX_BRIDGE_SECRET`. |
| `internal_error`        | 500  | Fallo del servidor.                                   |

---

## Ejemplos

### Reponer artículos que se agotarán esta semana

```bash
curl -H "Authorization: Bearer erp_sk_..." \
  "https://your-erp/api/v1/stock?max_dias_stock=7"
```

### Resumen financiero mensual

```bash
curl -H "Authorization: Bearer erp_sk_..." \
  "https://your-erp/api/v1/finanzas?desde=2026-01-01&hasta=2026-01-31&detalle=resumen"
```

### Corregir el canal de una venta

```bash
curl -X PATCH https://your-erp/api/v1/ventas/42 \
  -H "Authorization: Bearer erp_sk_..." \
  -H "Content-Type: application/json" \
  -d '{"canal": "Vinted"}'
```

### Importar una venta de Wallapop

El flujo de n8n en `automations/n8n/wallapop-gmail-to-erp.json` busca correos de
confirmación, analiza los cuerpos de texto plano y HTML, y llama al endpoint
de importación. Envía el id del mensaje de Gmail como `origen_id` y como
`Idempotency-Key`, por lo que los reintentos de consulta y entrega no crean
ventas duplicadas.

```bash
curl -X POST https://your-erp/api/v1/importaciones/wallapop \
  -H "Authorization: Bearer erp_sk_..." \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: gmail-message-id" \
  -d '{
    "origen_id": "gmail-message-id",
    "fecha": "2026-08-03",
    "comprador_nombre": "Antonio R.",
    "titulo_wallapop": "Mando Xiaomi XMRM-006 a Estrenar",
    "importe_total": 3.49,
    "unidades": 1
  }'
```

La importación crea o reutiliza un cliente por nombre normalizado y registra la
venta como `Wallapop`. El título exacto se compara con el producto antes de
escribir la venta y su movimiento de stock.

### Importar una venta de marketplace

El flujo de n8n también admite correos de confirmación de Vinted mediante
`/api/v1/importaciones/marketplace`. Envía `canal: "Wallapop"` o
`canal: "Vinted"` y el título exacto en `titulo_producto`:

```json
{
  "origen_id": "gmail-message-id",
  "canal": "Vinted",
  "fecha": "2026-08-08",
  "comprador_nombre": "ahmedh831",
  "titulo_producto": "Mando Samsung BN59-01358D a Estrenar",
  "importe_total": 3.50,
  "unidades": 1
}
```

La importación registra el marketplace como canal de la venta y utiliza el
mapeo exacto específico del marketplace antes de escribirla.

### Conectar un Custom GPT o un agente

Dale la URL de la especificación y la clave:

```
https://your-erp/api/v1/openapi.json
```

Así podrá descubrir por sí mismo las operaciones, los campos obligatorios y
los valores enum aceptados; no hace falta describirle la API manualmente.
