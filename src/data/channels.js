// ─── Modelo de canales Lakaut ─────────────────────────────────────────────────
// Fuente de verdad del modelo comercial multicanal (Borrador v5).
// 3 canales: Web (directo), Distribuidores (descuento sobre lista), B2B2C (IDC).
//
// Convención de moneda:
//   · Canal Web → precios en ARS (source of truth). El USD se deriva con el TC.
//   · Distribuidores → descuento % sobre la lista web (mismo ARS).
//   · B2B2C → precios y costos en USD (unidad IDC).

// ── Canal A · Web Lakaut ──────────────────────────────────────────────────────
// Precios de lista en ARS. firmaExtraARS = precio por firma adicional.
// certs = cantidad de firmantes (certificados) incluidos.
export const WEB_PRODUCTS = [
	{
		id: "smart",
		label: "Smart",
		segment: "persona",
		precioARS: 61700,
		certs: 1,
		firmas: 20,
		ilimitadas: false,
		firmaExtraARS: 3085,
		selloCompetencia: false,
		desc: "Personas que firman contratos o trámites de manera ocasional",
	},
	{
		id: "profesional",
		label: "Profesional",
		segment: "persona",
		precioARS: 250000,
		certs: 3,
		firmas: 100,
		ilimitadas: false,
		firmaExtraARS: 2500,
		selloCompetencia: false,
		desc: "Profesionales que firman documentos con frecuencia",
	},
	{
		id: "profesional_plus",
		label: "Profesional Plus",
		segment: "persona",
		precioARS: 363000,
		certs: 3,
		firmas: null,
		ilimitadas: true,
		firmaExtraARS: null, // firmas ilimitadas; usa sello de competencia
		selloCompetencia: true,
		desc: "Profesionales con alto volumen y necesidad de sello de competencia",
	},
	{
		id: "pyme",
		label: "PyME",
		segment: "empresa",
		precioARS: 180000,
		certs: 5,
		firmas: 100,
		ilimitadas: false,
		firmaExtraARS: 1800,
		selloCompetencia: false,
		desc: "Empresas que comienzan a digitalizar sus procesos de firma",
	},
	{
		id: "empresa",
		label: "Empresa",
		segment: "empresa",
		precioARS: 540000,
		certs: 10,
		firmas: 3000,
		ilimitadas: false,
		firmaExtraARS: 1800,
		selloCompetencia: false,
		desc: "Organizaciones con mayor volumen y múltiples áreas firmantes",
	},
	{
		id: "enterprise",
		label: "Enterprise",
		segment: "empresa",
		precioARS: null, // a consultar
		certs: null,
		firmas: null,
		ilimitadas: true,
		firmaExtraARS: null,
		selloCompetencia: true,
		desc: "Grandes organizaciones con bases de clientes masivas (a medida)",
	},
];

// ── Canal B · Distribuidores e Integradores ────────────────────────────────────
// Descuento sobre la lista web. Nivel = el MAYOR que resulte entre
// (certificados activos) y (compromiso anual de facturación USD).
export const DISTRIBUTOR_TIERS = [
	{ id: "azul", label: "Azul", certsMin: 0, certsMax: 100, descuento: 0.10, compromisoMin: 0, compromisoMax: 10000 },
	{ id: "bronce", label: "Bronce", certsMin: 101, certsMax: 500, descuento: 0.15, compromisoMin: 10001, compromisoMax: 25000 },
	{ id: "plata", label: "Plata", certsMin: 501, certsMax: 2500, descuento: 0.25, compromisoMin: 25001, compromisoMax: 50000 },
	{ id: "oro", label: "Oro", certsMin: 2501, certsMax: 10000, descuento: 0.40, compromisoMin: 50001, compromisoMax: 250000 },
	{ id: "platinum", label: "Platinum", certsMin: 10001, certsMax: null, descuento: 0.50, compromisoMin: 250001, compromisoMax: null },
];

// Devuelve el tier por certificados activos.
function tierByCerts(certs) {
	return DISTRIBUTOR_TIERS.find(function (t) {
		return certs >= t.certsMin && (t.certsMax === null || certs <= t.certsMax);
	}) || DISTRIBUTOR_TIERS[0];
}

// Devuelve el tier por compromiso anual de facturación (USD).
function tierByCompromiso(usd) {
	return DISTRIBUTOR_TIERS.find(function (t) {
		return usd >= t.compromisoMin && (t.compromisoMax === null || usd <= t.compromisoMax);
	}) || DISTRIBUTOR_TIERS[0];
}

// Asigna el nivel final = el mayor entre certs activos y compromiso anual.
export function getDistributorTier(certsActivos, compromisoAnualUSD) {
	const a = tierByCerts(certsActivos || 0);
	const b = tierByCompromiso(compromisoAnualUSD || 0);
	const ia = DISTRIBUTOR_TIERS.indexOf(a);
	const ib = DISTRIBUTOR_TIERS.indexOf(b);
	return ia >= ib ? a : b;
}

// ── Canal C · B2B2C (Identidades Digitales Certificadas) ────────────────────────
// Unidad = IDC. Precio mensual por IDC según segmento (volumen mensual de IDCs).
// Cada IDC incluye: validación biométrica + emisión + sello de tiempo + custodia
// + firma inicial + 3 firmas de activación + guarda documental.
export const B2B2C_SEGMENTS = [
	{ id: "startup", label: "Start Up", idcMin: 1000, idcMax: 10000, precioIDC: 0.65, margenRef: 0.74 },
	{ id: "growth", label: "Growth", idcMin: 10001, idcMax: 50000, precioIDC: 0.60, margenRef: 0.60 },
	{ id: "pyme", label: "PyME", idcMin: 50001, idcMax: 200000, precioIDC: 0.55, margenRef: 0.47 },
	{ id: "empresa", label: "Empresa", idcMin: 200001, idcMax: 600000, precioIDC: 0.50, margenRef: 0.34 },
	{ id: "plataforma", label: "Plataforma", idcMin: 600001, idcMax: 1200000, precioIDC: 0.45, margenRef: 0.20 },
];

export function getB2B2CSegment(idcMensuales) {
	return B2B2C_SEGMENTS.find(function (s) {
		return idcMensuales >= s.idcMin && (s.idcMax === null || idcMensuales <= s.idcMax);
	}) || B2B2C_SEGMENTS[0];
}

// Fee de implementación (única vez). Default = punto medio del rango, editable.
export const B2B2C_API_TIERS = [
	{ id: "standard", label: "API Standard", feeMin: 1500, feeMax: 5000, feeDefault: 3250 },
	{ id: "professional", label: "API Professional", feeMin: 5000, feeMax: 25000, feeDefault: 15000 },
	{ id: "enterprise", label: "API Enterprise", feeMin: 25000, feeMax: 50000, feeDefault: 37500 },
];

// Costo de referencia por IDC según el documento (cert + 1 firma).
// El CV real se recalcula desde costs.js; este es el piso del Borrador v5.
export const COSTO_IDC_REF = 0.3741;

// ── Servicios premium / SLA ─────────────────────────────────────────────────────
// Precio mensual en USD. Standard incluido en todos los productos.
export const SLA_PLANS = [
	{ id: "standard", label: "Standard", precioMes: 0, sla: null, txMes: null, desc: "Horario comercial · mail y portal · respuesta hasta 8 h hábiles" },
	{ id: "professional", label: "Professional", precioMes: 1000, sla: 0.999, txMes: 1000, desc: "Atención extendida · prioridad media · respuesta hasta 4 h" },
	{ id: "enterprise", label: "Enterprise", precioMes: 3000, sla: 0.999, txMes: 10000, desc: "24x7 · ejecutivo técnico · respuesta <1 h en críticos" },
	{ id: "dedicated", label: "SLA Dedicado", precioMes: null, sla: 0.999, txMes: null, desc: "+10.000 tx/mes · personalizado" },
];
