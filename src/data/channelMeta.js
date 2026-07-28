// ─── Nombres de canal · fuente única ──────────────────────────────────────────
// Un solo lugar define cómo se nombra cada canal en toda la interfaz (nav,
// títulos, badges, historial, clientes). Evita que "distribuidores" aparezca
// como "Lista", "Precio de lista con descuento" y "Distribuidores" según la
// pantalla. Modelo comercial: Borrador v5 (web / lista con descuento / volumen).

export const CHANNELS = {
	web: {
		id: "web",
		label: "Web",
		shortLabel: "Web",
		full: "Canal Web",
		desc: "Personas, profesionales y PyMEs que contratan sin intermediación, abonando con tarjeta.",
		badgeVariant: "secondary",
	},
	distribuidores: {
		id: "distribuidores",
		// La navegación y el seguimiento nombran los canales por su audiencia
		// (a quién le vendo); el nombre formal del modelo comercial vive en `full`,
		// que es lo que aparece en el encabezado y en la propuesta exportada.
		label: "Distribuidores",
		shortLabel: "Distrib.",
		full: "Precio de lista con descuento",
		desc: "Distribuidores e integradores que compran volumen a precio de lista con un descuento por nivel.",
		badgeVariant: "default",
	},
	b2b2c: {
		id: "b2b2c",
		// Este canal se nombra por el modelo (Volumen), no por audiencia: es el
		// término que usa el equipo comercial. Web y Distribuidores sí van por
		// audiencia (a quién le vendo).
		label: "Volumen",
		shortLabel: "Volumen",
		full: "Volumen · Identidades Digitales Certificadas",
		desc: "Empresas que integran los servicios de confianza en sus propios productos. Se cotiza por certificados y firmas.",
		badgeVariant: "default",
	},
};

export function channelLabel(id) { return (CHANNELS[id] || {}).label || id; }
export function channelShort(id) { return (CHANNELS[id] || {}).shortLabel || id; }
export function channelFull(id) { return (CHANNELS[id] || {}).full || id; }
