// ─── Asignación de nivel / segmento por canal ─────────────────────────────────
// Lógica compartida por la cotizadora de Distribuidores, el Historial y Clientes.
// Antes estaba duplicada (copiada) en tres componentes; acá vive una sola vez.

// Distribuidores: el nivel es el MAYOR entre el que dan los certificados activos
// y el que da el compromiso de facturación (USD a lista). `tiers` viene de la
// config de canales (channelConfig.distributorTiers).
export function getDistributorTier(certsActivos, compromisoAnualUSD, tiers) {
	if (!tiers || tiers.length === 0) return null;
	function byCerts(certs) {
		return tiers.find(function (t) { return certs >= t.certsMin && (t.certsMax == null || certs <= t.certsMax); }) || tiers[0];
	}
	function byCompromiso(usd) {
		return tiers.find(function (t) { return usd >= t.compromisoMin && (t.compromisoMax == null || usd <= t.compromisoMax); }) || tiers[0];
	}
	const a = byCerts(certsActivos || 0);
	const b = byCompromiso(compromisoAnualUSD || 0);
	return tiers.indexOf(a) >= tiers.indexOf(b) ? a : b;
}

// Volumen (B2B2C): UN SOLO segmento por cliente, asignado por el compromiso del
// contrato en USD a precio de lista. Al ser un único número en dólares la métrica
// es conmutativa: 1 certificado con muchas firmas y muchos certificados con 1 firma
// caen en el mismo segmento si representan el mismo negocio. `segments` viene de
// channelConfig.b2b2cSegments y cada uno aporta su `descuento` sobre los precios
// base. Ver [[modelo-canales-borrador-v5]].
export function getB2B2CSegment(compromisoUSD, segments) {
	if (!segments || segments.length === 0) return null;
	const c = Math.max(0, Number(compromisoUSD) || 0);
	return segments.find(function (s) {
		return c >= (Number(s.compromisoMin) || 0) && (s.compromisoMax == null || c <= s.compromisoMax);
	}) || segments[0];
}

// Facturación a precio de LISTA de un volumen de certificados y firmas. Es la base
// del compromiso (nunca usa el precio ya descontado, para no morderse la cola).
export function facturacionAtBase(certs, firmas, base) {
	const bc = base && base.cert != null ? Number(base.cert) || 0 : 0;
	const bf = base && base.firma != null ? Number(base.firma) || 0 : 0;
	return (Math.max(0, Number(certs) || 0) * bc) + (Math.max(0, Number(firmas) || 0) * bf);
}
