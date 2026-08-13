import type { Tone } from "./tones";

/**
 * Everything the landing page says, in one place, so the copy can be revised
 * without going through the layout.
 *
 * The claims are the ones the repository can back: the licence (`LICENSE`),
 * the machine-facing API and its OpenAPI contract (`docs/API.md`), and plugins
 * as private per-project extensions (`docs/PLUGINS.md`).
 */

/** Sets the demo cookie on the Worker and redirects into the app. */
export const DEMO_HREF = "/api/demo/start";

export const GITHUB_HREF = "https://github.com/martinezharo/oliverp";
export const GITHUB_REPO = "martinezharo/oliverp";

/** The production origin configured in `wrangler.jsonc` and the README. */
export const APP_DOMAIN = "oliverp.4oli.com";

export const HERO = {
  eyebrow: "Gratis y de código abierto",
  title: ["El ERP que ", "no", " te pide ser contable"] as const,
  lede: "Apunta lo que vendes y lo que compras, como se lo contarías a alguien. El stock, el IVA y el balance se calculan solos.",
  note: "Demo con datos de ejemplo · sin registro · sin tarjeta",
};

export type Module = {
  title: string;
  description: string;
  tone: Tone;
  /** Badge icon paths, stroked at width 2 on a 24×24 viewBox. */
  icon: React.ReactNode;
};

export const MODULES: Module[] = [
  {
    title: "Ventas y compras",
    description: "Varias líneas de producto, unidades y precio. El IVA repercutido o soportado sale solo y el stock se mueve con la operación.",
    tone: "indigo",
    icon: (
      <>
        <circle cx="8" cy="21" r="1" />
        <circle cx="19" cy="21" r="1" />
        <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
      </>
    ),
  },
  {
    title: "Inventario y stock",
    description: "Existencias por producto, valoración a coste y a venta, beneficio por unidad y los días que te quedan antes de agotarlo.",
    tone: "emerald",
    icon: (
      <>
        <path d="m21 8-9-5-9 5 9 5 9-5Z" />
        <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
  },
  {
    title: "Transacciones",
    description: "Los ingresos y gastos que no son una venta redonda, en modo diario o en lista, con el importe y el IVA separados.",
    tone: "pink",
    icon: (
      <>
        <path d="M12 2v20" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    title: "Dashboard y proyección",
    description: "Balance del mes y del trimestre, saldo de IVA separado entre soportado y repercutido, y una proyección de cómo va a cerrar el mes.",
    tone: "blue",
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </>
    ),
  },
  {
    title: "Historial",
    description: "Todo lo registrado agrupado por meses, trimestres y años, para mirar atrás sin montar una hoja de cálculo.",
    tone: "purple",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
  {
    title: "Tus propios plugins",
    description: "¿Tu negocio tiene una regla rara? Escríbela en un repositorio tuyo, revísala y actívala sobre tu proyecto.",
    tone: "amber",
    icon: (
      <>
        <path d="M12 8V4H8" />
        <rect width="16" height="12" x="4" y="8" rx="2" />
        <path d="M2 14h2M20 14h2M9 13v2M15 13v2" />
      </>
    ),
  },
];

/**
 * The three things worth saying beyond the module list, said once each.
 * `code`, when present, is shown as a mono line inside the card.
 */
export const CLAIMS = [
  {
    tone: "blue" as Tone,
    title: "Se usa sin manual",
    description: "Rellenas el formulario como quien apunta la venta en una libreta. Nadie te pide una cuenta contable ni un asiento.",
  },
  {
    tone: "emerald" as Tone,
    title: "Gratis y de código abierto",
    description: "Sin planes, sin límites y sin tarjeta. El código está publicado y puedes montarlo en tu propio servidor.",
    repo: true,
  },
  {
    tone: "purple" as Tone,
    title: "Tus agentes también lo usan",
    description: "Cada pantalla tiene detrás un endpoint documentado. Dale la URL del contrato a tu GPT, a n8n o a Make y se apaña solo.",
    code: `${APP_DOMAIN}/api/v1/openapi.json`,
  },
];

export const DEMO = {
  eyebrow: "Sin registro",
  title: "Entra y toca todo. Los datos son de mentira.",
  description: "Un negocio de ejemplo con ventas, stock y un trimestre de historial ya cargados.",
  cta: "Abrir la demo",
};

export const NAV_LINKS = [
  { href: "#modulos", label: "Módulos" },
  { href: "#demo", label: "Demo" },
];
