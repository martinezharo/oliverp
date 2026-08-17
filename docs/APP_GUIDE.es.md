# Usar OlivERP

OlivERP está pensado para ayudarte a registrar la actividad diaria del negocio
sin tener que pensar en términos contables. Empieza con un proyecto, añade sus
productos y registra lo que compras y vendes. El stock, el IVA y los resúmenes
financieros se actualizan a partir de esas operaciones.

## Primeros pasos

1. Inicia sesión con la cuenta de GitHub autorizada para tu despliegue de OlivERP.
2. Crea o selecciona un proyecto en **Ajustes**. Los proyectos mantienen
   separados sus productos, operaciones, existencias e integraciones.
3. Añade tus productos desde **Stock**. Incluye el coste de compra, el precio de
   venta y las unidades disponibles al crear cada producto.
4. Registra las compras cuando los productos entren en el inventario y las
   ventas cuando salgan de él.
5. Usa **Dashboard**, **Transacciones** e **Historial** para revisar el resultado.

La demo pública se puede abrir sin una cuenta. Usa datos de ejemplo y es de
solo lectura, así que sirve para explorar la interfaz, pero no representa los
datos de tu negocio.

## Secciones principales

### Dashboard

El dashboard ofrece una vista rápida del proyecto seleccionado:

- ingresos, gastos, balance y saldo de IVA;
- cifras mensuales y trimestrales;
- una proyección del periodo actual; y
- accesos directos para registrar una venta, una compra u otro ingreso/gasto.

### Stock

Stock muestra los productos y la información necesaria para tomar decisiones
sobre el inventario:

- unidades actuales y valor del inventario;
- valores de compra y de venta;
- estimaciones del beneficio por unidad y reciente; y
- días estimados de cobertura de stock.

Abre el historial de un producto para revisar sus movimientos o registrar un
ajuste manual. Usa los ajustes manuales para correcciones como un recuento,
una rotura o una donación; usa una compra o una venta para una operación real
del negocio.

### Transacciones

Las transacciones se pueden consultar como un resumen financiero diario o como
una lista con búsqueda. La lista se puede filtrar por concepto, producto, tipo,
canal, fecha e importe.

- Una **venta** registra un ingreso y reduce el stock.
- Una **compra** registra un gasto y aumenta el stock.
- Un **ingreso** o un **gasto** registra un movimiento financiero que no es una
  venta ni una compra.

El IVA se mantiene separado en los totales financieros: las compras aportan IVA
soportado y las ventas aportan IVA repercutido. Los precios de la aplicación
incluyen el IVA.

### Historial

El historial agrupa la actividad financiera del proyecto por mes, trimestre,
año o por todo el periodo. Úsalo para comparar ingresos, gastos, balance, saldo
de IVA y URP a lo largo del tiempo.

### Ajustes

En Ajustes gestionas tus proyectos y tu cuenta. Los administradores del proyecto
también pueden crear, revisar y revocar claves de API para integraciones. Una
clave pertenece a un proyecto y puede ser de solo lectura o de lectura y
escritura; el secreto se muestra una sola vez.

La opción de instalación de Ajustes puede añadir OlivERP a un navegador o
dispositivo compatible como una aplicación instalable.

### Plugins

Los plugins son extensiones privadas y específicas de cada proyecto. Un
administrador puede pegar el repositorio privado de GitHub, revisar el
comportamiento declarado por su manifiesto y activarlo para ese proyecto.
OlivERP valida los hooks compatibles y no ejecuta código arbitrario del
repositorio en el navegador.

Consulta la [documentación de plugins](https://github.com/martinezharo/oliverp/blob/main/docs/PLUGINS.es.md)
para conocer el formato del manifiesto y los hooks disponibles.

## Trabajar con integraciones

La API está pensada para scripts, n8n, Make, agentes de IA y otras herramientas
de automatización. Crea una clave de API asociada a un proyecto en Ajustes y
usa el contrato público de OpenAPI para descubrir las operaciones disponibles.

Consulta la [referencia de la API](https://github.com/martinezharo/oliverp/blob/main/docs/API.es.md)
para la autenticación, los permisos, los ejemplos de peticiones, los reintentos
seguros y los detalles de los endpoints.

## Reglas importantes

- Elige el proyecto correcto antes de registrar o revisar datos.
- Registra las compras y las ventas cuando ocurran para que el stock y los
  totales financieros se mantengan alineados.
- Usa un ajuste manual de stock solo para corregir el inventario, no para
  representar una venta o una compra.
- Mantén las claves de API en privado. Revoca una clave inmediatamente si puede
  haberse expuesto.
- La demo es deliberadamente de solo lectura; los cambios que hagas en ella no
  son registros reales.
