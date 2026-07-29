// ─── Identidad de canal · fuente única ────────────────────────────────────────
// Un solo lugar define cómo se nombra Y cómo se ve cada canal en toda la interfaz
// (nav, títulos, badges, historial, clientes, reportes). Modelo comercial:
// Borrador v5, con los canales Web y "Precio de lista con descuento" unificados en
// Packs: son el mismo producto y el mismo cálculo, y el descuento pasó a ser un
// interruptor de las condiciones comerciales (inputs.aplicaDescuento) en lugar de
// un canal aparte.
//
// Packs y Volumen son dos negocios distintos (transaccional a precio de lista vs
// contrato con integración y SLA) y hasta acá se veían idénticos: misma card, mismo
// badge azul. Cada canal tiene ahora color, emoji, icono y gradiente propios, y
// como este archivo ya era la fuente única de nombres, la identidad se propaga sola
// a todas las pantallas que lo consumen.

import { Package, Waypoints } from "lucide-react";

export const CHANNELS = {
	packs: {
		id: "packs",
		// Se nombra por el producto (no por audiencia): el mismo pack se vende
		// directo a precio de lista o con descuento a un distribuidor.
		label: "Packs",
		shortLabel: "Packs",
		full: "Packs de firma digital",
		desc: "Packs de certificados y firmas. A precio de lista para venta directa, o con descuento por nivel y condiciones comerciales.",
		badgeVariant: "default",
		// ── Identidad visual ──
		// Packs se queda con el azul de marca: es el producto core y el precio de lista.
		emoji: "📦",
		Icon: Package,
		color: "#3041d5",
		colorSoft: "#eef0fb",
		colorFg: "#2532a8",
		gradient: "linear-gradient(135deg, #f4f6fe 0%, #e3e7fb 100%)",
		glow: "rgba(48, 65, 213, 0.22)",
	},
	b2b2c: {
		id: "b2b2c",
		// Este canal se nombra por el modelo (Volumen), no por audiencia: es el
		// término que usa el equipo comercial.
		label: "Volumen",
		shortLabel: "Volumen",
		full: "Volumen · Identidades Digitales Certificadas",
		desc: "Empresas que integran los servicios de confianza en sus propios productos. Se cotiza por certificados y firmas.",
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
};

// Canales históricos, ya unificados: las cotizaciones y clientes guardados con
// estos ids se siguen leyendo tal cual y se muestran/editan como Packs. No hay
// migración de datos; el alias se resuelve al leer.
export const CHANNEL_ALIASES = { web: "packs", distribuidores: "packs" };

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

export function isPacks(id) { return resolveChannel(id) === "packs"; }

// ¿Esta cotización de Packs aplica descuentos comerciales (nivel + condiciones +
// abono)? Las nuevas lo guardan explícito en inputs.aplicaDescuento; en las
// viejas lo decía el canal: "distribuidores" con descuento, "web" sin descuento.
export function packsConDescuento(deal) {
	if (!deal) return false;
	const inp = deal.inputs || {};
	if (inp.aplicaDescuento != null) return !!inp.aplicaDescuento;
	return deal.channel === "distribuidores";
}
