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

// Volumen (B2B2C): segmento por cantidad de IDC. `segments` viene de
// channelConfig.b2b2cSegments.
export function getB2B2CSegment(idcMensuales, segments) {
	if (!segments || segments.length === 0) return null;
	return segments.find(function (s) { return idcMensuales >= s.idcMin && (s.idcMax == null || idcMensuales <= s.idcMax); }) || segments[0];
}
