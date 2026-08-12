// ─── Asignación de nivel / segmento por canal ─────────────────────────────────
// Lógica compartida por los cotizadores, el Historial, Clientes y Reportes.
// Antes estaba duplicada (copiada) en tres componentes; acá vive una sola vez.

// ── Distribuidores ──
// El nivel es el MAYOR entre el que dan los certificados activos que Lakaut le
// administra al socio y el que da su compromiso anual de facturación en USD. Las
// dos variables son datos DECLARADOS de la relación comercial, no del volumen de la
// cotización en curso: es lo que permite que un integrador con 200 certificados
// (Bronce) que compromete USD 40.000 anuales entre directamente como Plata.
// `tiers` viene de la config de canales (channelConfig.distributorTiers).
export function getDistributorTier(certsActivos, compromisoAnualUSD, tiers) {
	if (!tiers || tiers.length === 0) return null;
	function byCerts(certs) {
		return tiers.find(function (t) { return certs >= t.certsMin && (t.certsMax == null || certs <= t.certsMax); }) || tiers[0];
	}
	function byCompromiso(usd) {
		return tiers.find(function (t) { return usd >= t.compromisoMin && (t.compromisoMax == null || usd <= t.compromisoMax); }) || tiers[0];
	}
	const a = byCerts(Math.max(0, Number(certsActivos) || 0));
	const b = byCompromiso(Math.max(0, Number(compromisoAnualUSD) || 0));
	return tiers.indexOf(a) >= tiers.indexOf(b) ? a : b;
}

// Cuál de las dos variables definió el nivel. Sirve para explicarlo en la interfaz
// y en la propuesta, que es donde el vendedor negocia.
export function distributorTierDriver(certsActivos, compromisoAnualUSD, tiers) {
	if (!tiers || tiers.length === 0) return null;
	const porCerts = getDistributorTier(certsActivos, 0, tiers);
	const porCompromiso = getDistributorTier(0, compromisoAnualUSD, tiers);
	const iCerts = tiers.indexOf(porCerts);
	const iComp = tiers.indexOf(porCompromiso);
	if (iComp > iCerts) return "compromiso";
	if (iCerts > iComp) return "certificados";
	return "ambos";
}

// ── Volumen (B2B2C) ──
// UN SOLO segmento por cliente, asignado por el volumen de IDC MENSUALES. Cada
// segmento trae su propio precio por IDC (escala de precios del Borrador v5, 0,65 a
// 0,45), su cupo de firmas incluidas y el precio de las firmas que superan ese cupo.
// `segments` viene de channelConfig.b2b2cSegments. Ver [[modelo-canales-borrador-v5]].
export function getB2B2CSegment(idcMensuales, segments) {
	if (!segments || segments.length === 0) return null;
	const n = Math.max(0, Number(idcMensuales) || 0);
	return segments.find(function (s) {
		return n >= (Number(s.idcMin) || 0) && (s.idcMax == null || n <= s.idcMax);
	}) || segments[0];
}

// Precios efectivos de un segmento, con defaults defensivos para segmentos cargados
// a mano en Config a los que les falte un campo.
export function segmentPricing(seg, fallback) {
	const f = fallback || {};
	const s = seg || {};
	function pick(a, b, c) {
		if (a != null && a !== "") return Number(a) || 0;
		if (b != null && b !== "") return Number(b) || 0;
		return c;
	}
	return {
		precioIDC: pick(s.precioIDC, f.precioIDC, 0),
		firmasIncluidas: Math.max(0, Math.round(pick(s.firmasIncluidas, f.firmasIncluidas, 0))),
		precioFirmaExtra: pick(s.precioFirmaExtra, f.precioFirmaExtra, 0),
	};
}

// ── Volumen (certificados y firmas sueltos) ──
// A diferencia de IDC, acá el segmento SÍ es una escala de descuentos: hay un precio
// de lista para el certificado y otro para la firma, y el segmento aplica el mismo
// porcentaje sobre ambos. La métrica que lo asigna es el compromiso del contrato en
// USD medido a precio de lista, que al ser un único número en dólares es conmutativo
// (pocos certificados con muchas firmas y muchos certificados con pocas firmas caen
// en el mismo segmento si representan el mismo negocio).
export function getVolumenSegment(compromisoUSD, segments) {
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

// ── Firma adicional del canal Web · escala por volumen ──
// Precio por firma adicional (en ARS) según la cantidad comprada: devuelve el precio
// del tramo más alto cuyo umbral de firmas no supera la cantidad. Por debajo del
// primer tramo usa el primero (es el precio del bundle más chico del catálogo).
// `tiers` = [{ firmas, precioARS }] ordenado ascendente por firmas. Sin tramos → null.
export function webFirmaExtraUnitARS(qty, tiers) {
	if (!Array.isArray(tiers) || tiers.length === 0) return null;
	const n = Math.max(0, Number(qty) || 0);
	let price = Number(tiers[0].precioARS) || 0;
	tiers.forEach(function (t) {
		if (n >= (Number(t.firmas) || 0)) price = Number(t.precioARS) || price;
	});
	return price;
}

// ── Rentabilidad de los canales por elemento ──
// El guardarraíl del canal se mide como MARKUP (precio ÷ costo), que es la métrica
// de la columna "MARGEN" del Borrador v5: los 74% de Start Up son 0,65 ÷ 0,3741.
// No confundir con el margen sobre el precio, que para ese mismo caso es 42%.

// Costo variable del bundle de una IDC: el certificado más las firmas que entran en
// su cupo. Es el número contra el que se mide si un precio de tabla es viable.
export function idcBundleCost(cvCert, cvFirma, firmasIncluidas) {
	return (Number(cvCert) || 0) + (Number(cvFirma) || 0) * Math.max(0, Number(firmasIncluidas) || 0);
}

// Markup de un ingreso sobre su costo. Devuelve null si no hay costo que medir
// (sin costo, el markup es infinito y no significa nada como número).
export function markupOf(revenue, cost) {
	const c = Number(cost) || 0;
	if (c <= 0) return null;
	return (Number(revenue) || 0) / c;
}

// Precio mínimo que cumple el markup mínimo para un costo dado. Es lo que la
// pantalla de Config muestra al lado de cada segmento cuando el precio no cierra.
export function minPriceForMarkup(cost, markupMin) {
	return (Number(cost) || 0) * (Number(markupMin) || 0);
}

// ¿El precio de este segmento cierra contra su propio costo de bundle? Se usa para
// la fila de viabilidad de Config y para la alerta del cotizador.
export function segmentViability(seg, cvCert, cvFirma, markupMin, fallback) {
	const p = segmentPricing(seg, fallback);
	const cost = idcBundleCost(cvCert, cvFirma, p.firmasIncluidas);
	const markup = markupOf(p.precioIDC, cost);
	const minPrice = minPriceForMarkup(cost, markupMin);
	return {
		cost: cost,
		markup: markup,
		minPrice: minPrice,
		ok: markup == null || markup >= (Number(markupMin) || 0),
	};
}
