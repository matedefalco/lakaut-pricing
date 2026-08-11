// ─── Identidad de canal · fuente única ────────────────────────────────────────
// Un solo lugar define cómo se nombra Y cómo se ve cada canal en toda la interfaz
// (nav, títulos, badges, historial, clientes, reportes).
//
// Modelo comercial: Borrador v5, tres canales de venta. Web y Distribuidores
// estuvieron unificados en "Packs" durante julio de 2026 (mismo producto, mismo
// cálculo, el descuento como interruptor). Se volvieron a separar porque son dos
// negocios con política comercial distinta: en Web el precio es la lista y el
// cliente paga con tarjeta sin intermediación; en Distribuidores el nivel de
// descuento se negocia contra la base instalada y el compromiso anual del socio.
// Comparten el catálogo de packs y el motor de cálculo, no la política.

import { ShoppingCart, Handshake, Waypoints, Layers } from "lucide-react";

export const CHANNELS = {
	web: {
		id: "web",
		label: "Web",
		shortLabel: "Web",
		full: "Web · packs a precio de lista",
		desc: "Venta directa desde el sitio de Lakaut. Personas, profesionales y empresas que abonan con tarjeta, sin intermediación.",
		badgeVariant: "default",
		// ── Identidad visual ──
		// Web se queda con el azul de marca: es el producto core y el precio de lista
		// contra el que se miden los otros dos canales.
		emoji: "🛒",
		Icon: ShoppingCart,
		color: "#3041d5",
		colorSoft: "#eef0fb",
		colorFg: "#2532a8",
		gradient: "linear-gradient(135deg, #f4f6fe 0%, #e3e7fb 100%)",
		glow: "rgba(48, 65, 213, 0.22)",
	},
	distribuidores: {
		id: "distribuidores",
		label: "Distribuidores",
		shortLabel: "Distrib.",
		full: "Distribuidores e integradores",
		desc: "Socios que revenden el acceso a la infraestructura de confianza. Descuento por nivel sobre la lista web, según base instalada y compromiso anual.",
		badgeVariant: "default",
		// ── Identidad visual ──
		// Cyan: se lee como pariente del azul de lista (vende el mismo producto) pero
		// distinto de un vistazo en historial y reportes.
		emoji: "🤝",
		Icon: Handshake,
		color: "#0891b2",
		colorSoft: "#ecfaff",
		colorFg: "#0e7490",
		gradient: "linear-gradient(135deg, #f2fbff 0%, #dff4fd 100%)",
		glow: "rgba(8, 145, 178, 0.22)",
	},
	// El id `b2b2c` es histórico y viaja en cotizaciones ya guardadas, así que no se
	// renombra; el canal se llama IDC en toda la interfaz.
	b2b2c: {
		id: "b2b2c",
		label: "IDC",
		shortLabel: "IDC",
		full: "IDC · Identidades Digitales Certificadas",
		desc: "Empresas y plataformas que integran identidad y firma en sus propios productos. Se cotiza por IDC mensuales, con firmas incluidas en el bundle.",
		badgeVariant: "default",
		// ── Identidad visual ──
		// Violeta para el canal de contrato e integración: se diferencia del azul de
		// lista sin salirse de la familia fría de la marca.
		emoji: "🔗",
		Icon: Waypoints,
		color: "#7c3aed",
		colorSoft: "#f3efff",
		colorFg: "#5b21b6",
		gradient: "linear-gradient(135deg, #f8f5ff 0%, #ebe3fe 100%)",
		glow: "rgba(124, 58, 237, 0.22)",
	},
	// Distribuidores e integradores cotizado por elemento (certificados y firmas
	// sueltos), la modalidad "Volumen" del canal. Comparte la identidad visual de
	// Distribuidores (es el mismo negocio) y convive con el modo packs bajo la misma
	// entrada del nav; se distingue por un id propio para que toda la lógica que
	// decide packs vs unidad siga apoyándose en el id de canal.
	distribuidores_vol: {
		id: "distribuidores_vol",
		label: "Distribuidores",
		shortLabel: "Distrib. Vol",
		full: "Distribuidores e integradores · volumen",
		desc: "Socios que revenden acceso a la infraestructura de confianza, cotizado por certificados y firmas sueltos. El nivel (Azul→Platinum) sale de la base instalada y el compromiso anual del socio, y aplica un descuento sobre el precio por elemento.",
		badgeVariant: "default",
		emoji: "🤝",
		Icon: Handshake,
		color: "#0891b2",
		colorSoft: "#ecfaff",
		colorFg: "#0e7490",
		gradient: "linear-gradient(135deg, #f2fbff 0%, #dff4fd 100%)",
		glow: "rgba(8, 145, 178, 0.22)",
	},
	volumen: {
		id: "volumen",
		label: "Volumen",
		shortLabel: "Volumen",
		full: "Volumen · certificados y firmas",
		desc: "Volumen puro de certificados y firmas como items independientes, con las cantidades cargadas a mano y el ingreso y el costo de cada elemento por separado.",
		badgeVariant: "default",
		// ── Identidad visual ──
		// Ámbar: es el único canal cálido, porque es el que no vende un producto
		// empaquetado sino cantidades sueltas.
		emoji: "📊",
		Icon: Layers,
		color: "#b45309",
		colorSoft: "#fdf3e7",
		colorFg: "#92400e",
		gradient: "linear-gradient(135deg, #fefaf3 0%, #fbeeda 100%)",
		glow: "rgba(180, 83, 9, 0.22)",
	},
};

// Canales que comparten el catálogo de packs y el motor de cálculo.
export const PACK_CHANNELS = ["web", "distribuidores"];

// Canales que se cotizan por certificados y firmas (no por packs). Comparten el
// cotizador, parametrizado por canal: IDC vende un bundle con cupo de firmas,
// Volumen y Distribuidores-Volumen venden los elementos sueltos.
export const UNIT_CHANNELS = ["b2b2c", "volumen", "distribuidores_vol"];

// Red de seguridad para el canal unificado de julio: las cotizaciones guardadas
// como "packs" se migraron a web/distribuidores en la DB, pero un registro que
// haya quedado atrás se sigue leyendo y mostrando sin romper nada. Las de este
// canal nunca llevaron descuento, así que resuelven a Web.
export const CHANNEL_ALIASES = { packs: "web" };

export function resolveChannel(id) { return CHANNEL_ALIASES[id] || id; }

export function channelLabel(id) { return (CHANNELS[resolveChannel(id)] || {}).label || id; }
export function channelShort(id) { return (CHANNELS[resolveChannel(id)] || {}).shortLabel || id; }
export function channelFull(id) { return (CHANNELS[resolveChannel(id)] || {}).full || id; }
export function channelBadge(id) { return (CHANNELS[resolveChannel(id)] || {}).badgeVariant || "secondary"; }

// ── Accesos a la identidad visual ──
// Devuelven un fallback neutro para ids desconocidos, así una cotización vieja con
// un canal que ya no existe nunca rompe el render.
const CHANNEL_FALLBACK = {
	emoji: "▪️",
	Icon: null,
	color: "var(--muted-foreground)",
	colorSoft: "var(--muted)",
	colorFg: "var(--muted-foreground)",
	gradient: "linear-gradient(135deg, #f9fafb 0%, #eceef2 100%)",
	glow: "rgba(107, 114, 128, 0.16)",
};

export function channelMeta(id) {
	return CHANNELS[resolveChannel(id)] || CHANNEL_FALLBACK;
}

export function channelEmoji(id) { return channelMeta(id).emoji; }
export function channelIcon(id) { return channelMeta(id).Icon; }
export function channelColor(id) { return channelMeta(id).color; }
export function channelGradient(id) { return channelMeta(id).gradient; }

// ── Predicados de canal ──
// `isPacks` agrupa los dos canales que venden packs del catálogo: es la distinción
// que le importa a casi todo el código de lectura (packs vs volumen), porque define
// qué campos trae el resumen del deal.
export function isPacks(id) { return PACK_CHANNELS.indexOf(resolveChannel(id)) !== -1; }
export function isWeb(id) { return resolveChannel(id) === "web"; }
export function isDistribuidores(id) { return resolveChannel(id) === "distribuidores"; }
// Canales que cotizan por elemento (certificados/IDC y firmas) en lugar de packs.
export function isUnit(id) { return UNIT_CHANNELS.indexOf(resolveChannel(id)) !== -1; }
export function isIDC(id) { return resolveChannel(id) === "b2b2c"; }
export function isVolumen(id) { return resolveChannel(id) === "volumen"; }
// Distribuidores e integradores en modalidad Volumen: canal propio, pero cotiza y se
// lee exactamente igual que Volumen (certs y firmas sueltos), salvo cómo se asigna el
// segmento (nivel del socio) y su escala de descuentos.
export function isDistribVol(id) { return resolveChannel(id) === "distribuidores_vol"; }
// Canales "tipo Volumen": venden certificados y firmas sueltos con un descuento sobre
// el precio base por elemento (Volumen y Distribuidores-Volumen). Es la distinción que
// le importa a la lectura de números y al display: comparten revenue (compra única),
// terminología (SDK) y desglose por elemento. Se diferencian solo en el origen del
// segmento. No incluye IDC, que vende un bundle con cupo y precio por tramo.
export function isVolumenLike(id) { return isVolumen(id) || isDistribVol(id); }

// ¿Esta cotización de packs lleva descuentos comerciales (nivel, condiciones,
// abono)? En Distribuidores es la regla del canal y siempre aplica. En Web el
// precio es la lista, y el descuento existe solo como excepción explícita que el
// vendedor habilita en la cotización (inputs.aplicaDescuento). Las cotizaciones del
// ex canal unificado guardaban ese mismo flag, así que se leen igual.
export function packsConDescuento(deal) {
	if (!deal) return false;
	if (isDistribuidores(deal.channel)) return true;
	return !!(deal.inputs || {}).aplicaDescuento;
}

// ¿Es una venta web fuera de política (lista con descuento por excepción)? Se
// reporta aparte para que el canal directo no se lea como si negociara precios.
export function esExcepcionWeb(deal) {
	return !!deal && isWeb(deal.channel) && !!(deal.inputs || {}).aplicaDescuento;
}
