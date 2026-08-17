# Plugins de OlivERP

Los plugins son extensiones privadas y específicas de cada proyecto que se
instalan desde URLs de repositorios de GitHub. Declaran un pequeño conjunto de
hooks de comportamiento revisados que OlivERP ejecuta dentro de su backend de
confianza.

No hay un marketplace ni un catálogo público. Los plugins no abren otra
aplicación, sustituyen pantallas de OlivERP, inyectan JavaScript, reciben la
sesión del navegador ni ejecutan un servicio remoto. La instalación se guarda
en la cuenta de OlivERP para el proyecto seleccionado.

## Cómo funcionan los plugins

1. Un administrador del proyecto pega la URL de un repositorio privado de
   GitHub.
2. OlivERP lee `oliverp-plugin.json` a través de su GitHub App.
3. OlivERP valida el manifiesto y muestra cada hook de comportamiento solicitado.
4. El administrador revisa y activa el plugin.
5. OlivERP guarda el SHA exacto de la fuente y aplica esos hooks en sus cálculos
   normales del backend para ese proyecto.

Desactivar o eliminar un plugin detiene sus hooks sin borrar los registros
contables. Actualizar un repositorio no modifica silenciosamente una
instalación: vuelve a pegar su URL para revisar e instalar la nueva versión y
el nuevo SHA de la fuente.

## Modelo de seguridad

- Los repositorios deben ser privados y compartirse expresamente con la GitHub
  App de OlivERP usando acceso de solo lectura a sus contenidos.
- Solo los administradores del proyecto pueden instalar, activar, desactivar o
  eliminar un plugin. Los miembros del proyecto pueden utilizar los
  comportamientos activos.
- Cada instalación pertenece exactamente a un proyecto.
- El esquema del manifiesto está cerrado. Los hooks y campos desconocidos se
  rechazan.
- El código fuente del plugin no se ejecuta en el navegador ni se evalúa de
  forma dinámica en el Worker de OlivERP.
- Los plugins no pueden sustituir la interfaz, acceder a las cookies o tokens
  de sesión de Convex ni enviar datos del proyecto a un runtime externo.

OlivERP no guarda los tokens de instalación de GitHub ni el código fuente de
los repositorios.

## Manifiesto del repositorio

Coloca `oliverp-plugin.json` en la raíz del repositorio privado:

```json
{
  "schemaVersion": 1,
  "id": "com.example.my-private-plugin",
  "name": "My private plugin",
  "description": "Applies a private accounting rule.",
  "version": "1.0.0",
  "hooks": [
    {
      "type": "finance.other_transaction.vat_only",
      "concept": "solo_iva"
    }
  ]
}
```

- `id` es un identificador estable en minúsculas y no debe cambiar entre
  versiones.
- `version` sigue el versionado semántico.
- `hooks` contiene únicamente capacidades compatibles y validadas por OlivERP.
- Los valores de los hooks se revisan antes de la activación y se guardan con
  la instalación.

## Hooks compatibles

### `finance.other_transaction.vat_only`

Este hook solo se aplica a transacciones manuales de ingresos y gastos cuyo
concepto coincide exactamente con `concept`. La coincidencia distingue
mayúsculas y minúsculas y no normaliza espacios ni signos de puntuación.

Para una transacción que coincide, OlivERP:

- mantiene su IVA en los totales de IVA soportado o repercutido;
- excluye su importe bruto de ingresos, gastos, balance y URP;
- mantiene la transacción visible y editable en la lista normal; y
- no modifica las ventas, compras, el stock ni ninguna pantalla.

Por ejemplo, un hook con `"concept": "solo_iva"` coincide con `solo_iva`, pero
no con `solo iva`, `Solo_IVA` ni ningún otro concepto.

## Añadir o actualizar un plugin privado

1. Mantén privado el repositorio de GitHub.
2. Da a la GitHub App de OlivERP acceso de solo lectura únicamente a ese
   repositorio.
3. Abre **Plugins** en OlivERP y pega la URL del repositorio.
4. Revisa los hooks de comportamiento.
5. Elige **Añadir y activar**.

El mismo plugin se puede instalar de forma independiente en distintos
proyectos. Sus hooks solo afectan a los proyectos donde esté instalado y
activo.

## Configuración del despliegue de OlivERP

El acceso a repositorios privados utiliza estas variables exclusivas del
servidor:

```env
GITHUB_PLUGINS_APP_ID=
GITHUB_PLUGINS_PRIVATE_KEY=
```

La clave privada puede usar el PEM PKCS#1 generado por GitHub o un PEM PKCS#8.
No la expongas nunca mediante una variable `NEXT_PUBLIC_`. OlivERP firma un JWT
de aplicación de corta duración, lo intercambia por un token de instalación
limitado al repositorio, lee el manifiesto y descarta el token.
