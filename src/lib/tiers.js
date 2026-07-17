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

// Volumen (B2B2C): el segmento es el MAYOR entre el que da la cantidad de unidades
// (certificados + firmas) y el que da la facturación a precio de lista. Reproduce
// la filosofía de Distribuidores (gana el mayor) para premiar el gran caso de
// negocio: pocos certificados con muchas firmas igual sube de segmento vía la
// facturación. `segments` viene de channelConfig.b2b2cSegments.
//   - unidades: certificados + firmas de la cotización.
//   - facturacionRef: facturación a precio de lista (segmento base). Solo cuenta
//     para los segmentos que tengan `facturacionMin` configurado.
export function getB2B2CSegment(unidades, facturacionRef, segments) {
	if (!segments || segments.length === 0) return null;
	function byUnidades(u) {
		return segments.find(function (s) { return u >= (s.idcMin || 0) && (s.idcMax == null || u <= s.idcMax); }) || segments[0];
	}
	function byFacturacion(f) {
		const conRango = segments.filter(function (s) { return s.facturacionMin != null; });
		if (conRango.length === 0) return segments[0];
		return conRango.find(function (s) { return f >= s.facturacionMin && (s.facturacionMax == null || f <= s.facturacionMax); }) || segments[0];
	}
	const a = byUnidades(unidades || 0);
	const b = byFacturacion(facturacionRef || 0);
	return segments.indexOf(a) >= segments.indexOf(b) ? a : b;
}
