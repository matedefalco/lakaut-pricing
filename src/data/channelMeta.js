// ─── Nombres de canal · fuente única ──────────────────────────────────────────
// Un solo lugar define cómo se nombra cada canal en toda la interfaz (nav,
// títulos, badges, historial, clientes). Modelo comercial: Borrador v5, con los
// canales Web y "Precio de lista con descuento" unificados en Packs: son el mismo
// producto y el mismo cálculo, y el descuento pasó a ser un interruptor de las
// condiciones comerciales (inputs.aplicaDescuento) en lugar de un canal aparte.

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
