// ─── Cost defaults (initial state values) ─────────────────────────────────────
export const CAPACIDAD_FIRMAS_ANUAL = 500 * 60 * 60 * 24 * 365; // 500f/s × year = 15,768,000,000

export const FIXED_ITEMS = [
	{ cat: "RRHH", item: "Sueldos IT", v: 96000, tipo: "indirecto" },
	{ cat: "RRHH", item: "Sueldos Administración", v: 20000, tipo: "indirecto" },
	{ cat: "Sop", item: "Licencia HSM", v: 2000, tipo: "directo" },
	{ cat: "Inf", item: "Rack + jaula 2kva", v: 1800, tipo: "directo" },
	{ cat: "Inf", item: "Internet ISP ×2", v: 900, tipo: "directo" },
	{ cat: "Inf", item: "Google Workspace 50c", v: 350, tipo: "indirecto" },
	{ cat: "Sop", item: "Soporte DC", v: 220, tipo: "directo" },
	{ cat: "Inf", item: "Energía + UPS", v: 210, tipo: "directo" },
	{ cat: "SW", item: "Twilio INC", v: 100, tipo: "directo" },
	{ cat: "Ops", item: "Mensajería", v: 100, tipo: "indirecto" },
	{ cat: "SW", item: "ChatGPT ×2", v: 80, tipo: "indirecto" },
	{ cat: "SW", item: "Figma", v: 64, tipo: "indirecto" },
	{ cat: "SW", item: "Mailchimp", v: 50, tipo: "indirecto" },
	{ cat: "SW", item: "GitHub ×2", v: 48, tipo: "directo" },
	{ cat: "SW", item: "Canva", v: 20, tipo: "indirecto" },
];

export const ASSET_ITEMS = [
	{ item: "Notebooks ×9", amort: 2587.5, vida: 36, tipo: "indirecto" },
	{ item: "HSM Hardware ×2", amort: 2586, vida: 60, tipo: "directo" },
	{ item: "Cintas LTO ×60", amort: 575, vida: 12, tipo: "directo" },
	{ item: "Dispositivo cinta LTO", amort: 208.33, vida: 12, tipo: "directo" },
	{ item: "Firewall SW ×3", amort: 833.33, vida: 36, tipo: "directo" },
	{ item: "Servidores contingencia", amort: 1388.89, vida: 36, tipo: "directo" },
];

// CV por certificado emitido (≈ USD 0,375). Estructura validada por el equipo Lakaut.
export const CV_CERT_ITEMS = [
	{ item: "Verificación DNI (RENAPER)", v: 0.04, tipo: "directo" },
	{ item: "Validación de identidad (RENAPER)", v: 0.0507, tipo: "directo" },
	{ item: "Biometría Activa (Veriff)", v: 0.15, tipo: "directo" },
	{ item: "Infra PKI / emisión", v: 0.03, tipo: "directo" },
	{ item: "OTP SMS cert.", v: 0.1034, tipo: "directo" },
	{ item: "OTP Mail cert.", v: 0.0009, tipo: "directo" },
];

export const CV_FIRMA_ITEMS = [
	{ item: "OTP SMS (Twilio)", v: 0.1034, tipo: "directo" },
	{ item: "Infra", v: 0.08, tipo: "directo" },
];

// Sello de competencia: no integra el CV base del certificado. Se aplica como
// feature opcional (ej. firmas del producto Profesional Plus).
export const SELLO_COMPETENCIA = 0.5;

export const SERVICES_DEF = {
	cloudStorage: { label: "Almacenamiento en nube", costType: "firma", cost: 0.05 },
	mailCert: { label: "Mail certificado", costType: "user_mes", cost: 2.0 },
	paywall: { label: "Paywall (pago con tarjeta)", costType: "pct_rev", cost: 0.002 },
};
