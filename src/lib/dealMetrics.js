import { isPacks, isUnit, resolveChannel } from "@/data/channelMeta";
import { dealStatus } from "@/lib/dealStatus";

// ─── Métricas de cotizaciones ─────────────────────────────────────────────────
// Fuente única de verdad para leer números de un deal guardado. Reportes lo usa
// para facturación, volumen de items y, sobre todo, precios por elemento.
//
// Precio por elemento: en Volumen los precios unitarios se guardan limpios
// (precioIDC y el precio de la firma que excede el cupo del bundle). En Web y
// Distribuidores el precio es de bundle (un pack agrupa certs + firmas incluidas en
// un precio de lista), así que el "precio por cert" es implícito (lista ÷ certs) y
// solo las firmas adicionales tienen precio unitario propio (precioFirmaAdic).
//
// Los tres canales se miden separados y nunca se promedian entre sí: Web y
// Distribuidores comparten catálogo pero no política de precios, y mezclarlos
// esconde justamente el dato que se quiere ver (cuánto se descuenta al revender).

function num(x) { return typeof x === "number" && isFinite(x) ? x : 0; }

// Revenue año 1 homogéneo entre canales: neto (+ abono) en packs, revenue anual
// en volumen. Es la misma cifra que muestra cada cotizadora al guardar.
export function dealRevenue(d) {
	const r = d.resumen || {};
	if (isPacks(d.channel)) return r.facturacionAnio1 || r.netoLakaut || r.facturacionLista || 0;
	if (isUnit(d.channel)) return r.revAnual || (r.revMesTotal || 0) * 12 || 0;
	return 0;
}

export function dealItems(d) {
	const r = d.resumen || {};
	return {
		certs: isPacks(d.channel) ? (r.certsComprados || r.certsActivos || 0) : 0,
		idc: isUnit(d.channel) ? (r.idcMensuales || 0) : 0,
		firmas: r.firmasTotal || r.firmasTotales || 0,
	};
}

// Precio unitario cotizado + unidades por elemento, por deal. Devuelve null si el
// canal no participa de la métrica de precios.
export function dealUnitPrice(d) {
	const r = d.resumen || {};
	if (isUnit(d.channel)) {
		// En IDC el precio es de bundle (certificado + cupo de firmas) y las firmas con
		// precio unitario propio son las que exceden el cupo. En Volumen no hay cupo:
		// todas las firmas se facturan por unidad, igual que en las cotizaciones del
		// modelo anterior a la separación de los dos canales.
		const firmasConPrecio = r.firmasExtra != null ? num(r.firmasExtra) : num(r.firmasTotales || r.firmasTotal);
		return {
			channel: resolveChannel(d.channel),
			cert: { units: num(r.idcMensuales), price: num(r.precioIDC), bundle: r.firmasIncluidasPorIDC != null && num(r.firmasIncluidasPorIDC) > 0 },
			firma: { units: firmasConPrecio, price: num(r.precioFirmaExtra || r.precioFirma), bundle: false, additional: r.firmasExtra != null },
		};
	}
	if (isPacks(d.channel)) {
		// `certsComprados` es el volumen de esta cotización; `certsActivos` pasó a ser la
		// base instalada declarada del socio, así que ya no sirve como fallback de
		// unidades vendidas salvo en cotizaciones viejas que no guardaban el primero.
		const certs = num(r.certsComprados) || num(r.certsActivos);
		const lista = num(r.facturacionLista);
		return {
			channel: resolveChannel(d.channel), // "web" | "distribuidores"
			// Precio por cert implícito: lista del pack ÷ certs (incluye las firmas
			// del bundle). Las firmas medibles con precio propio son las adicionales.
			cert: { units: certs, price: certs > 0 ? lista / certs : 0, bundle: true },
			firma: { units: num(r.firmasTotal), price: num(r.precioFirmaAdic), bundle: false, additional: true },
		};
	}
	return null;
}

// Descuento efectivo sobre el precio de lista (fracción 0..1). Puede ser negativo
// si se cotizó por encima de lista.
//
// Volumen: el precio de lista es el del SEGMENTO alcanzado, no un precio base único
// (el modelo del Borrador v5 es una escala de precios por volumen de IDC). Así el
// número mide lo que efectivamente se negoció (condiciones y overrides manuales) y
// no el descuento estructural de caer en un tramo alto, que no es una concesión
// comercial. `precioIDCLista` viaja en el deal; si falta, se cae al snapshot del
// modelo anterior (segmentoDescuento + descCond).
// Packs: usa el descuento total ya guardado (0 = precio de lista).
export function dealDiscountPct(d) {
	const r = d.resumen || {};
	if (isUnit(d.channel)) {
		const listaIDC = num(r.precioIDCLista);
		if (listaIDC > 0) {
			const idc = num(r.idcMensuales);
			const firmas = r.firmasExtra != null ? num(r.firmasExtra) : num(r.firmasTotales || r.firmasTotal);
			const listaFirma = num(r.precioFirmaExtraLista) || num(r.precioFirmaExtra);
			const listRev = idc * listaIDC + firmas * listaFirma;
			const cond = num(r.descCondPct);
			const realRev = (idc * num(r.precioIDC) + firmas * num(r.precioFirmaExtra || r.precioFirma)) * (1 - cond);
			return listRev > 0 ? 1 - realRev / listRev : 0;
		}
		const seg = num(r.segmentoDescuento), cond = num(r.descCondPct);
		return 1 - (1 - seg) * (1 - cond);
	}
	if (isPacks(d.channel)) return num(r.descTotal); // 0 = precio de lista, sin descuento
	return 0;
}

// Valor de lista (pre-descuento) para ponderar el descuento promedio.
function dealListValue(d) {
	const r = d.resumen || {};
	if (isUnit(d.channel)) {
		const listaIDC = num(r.precioIDCLista);
		if (listaIDC > 0) {
			const firmas = r.firmasExtra != null ? num(r.firmasExtra) : num(r.firmasTotales || r.firmasTotal);
			const listaFirma = num(r.precioFirmaExtraLista) || num(r.precioFirmaExtra);
			return num(r.idcMensuales) * listaIDC + firmas * listaFirma;
		}
		return num(r.revServicioBruto) || num(r.revMesTotal) * 12 || dealRevenue(d);
	}
	if (isPacks(d.channel)) return num(r.facturacionLista) || dealRevenue(d);
	return dealRevenue(d);
}

// Agrega una lista de { units, price, revenue } en las estadísticas de un elemento.
function aggregateElement(entries) {
	const withPrice = entries.filter(function (e) { return e.units > 0 && e.price > 0; });
	const n = withPrice.length;
	let sumUnits = 0, sumPriceUnits = 0, sumSimple = 0, min = Infinity, max = -Infinity;
	let sumRev = 0, sumRevUnits = 0, sumRevPerUnit = 0, nRev = 0;
	withPrice.forEach(function (e) {
		sumUnits += e.units;
		sumPriceUnits += e.price * e.units;
		sumSimple += e.price;
		if (e.price < min) min = e.price;
		if (e.price > max) max = e.price;
		if (e.revenue > 0) { sumRev += e.revenue; sumRevUnits += e.units; sumRevPerUnit += e.revenue / e.units; nRev++; }
	});
	return {
		n: n,
		units: sumUnits,
		weighted: sumUnits > 0 ? sumPriceUnits / sumUnits : null,
		simple: n > 0 ? sumSimple / n : null,
		min: n > 0 ? min : null,
		max: n > 0 ? max : null,
		revPerUnitWeighted: sumRevUnits > 0 ? sumRev / sumRevUnits : null,
		revPerUnitSimple: nRev > 0 ? sumRevPerUnit / nRev : null,
	};
}

// Descuento promedio (ponderado por valor de lista y simple) para un set de deals.
function aggregateDiscount(deals) {
	let sumW = 0, sumWD = 0, sumD = 0, n = 0, nCon = 0;
	deals.forEach(function (d) {
		const disc = dealDiscountPct(d);
		const w = dealListValue(d);
		sumW += w; sumWD += disc * w; sumD += disc; n++;
		if (disc > 0.005) nCon++;
	});
	return {
		n: n,
		conDescuento: nCon,
		weighted: sumW > 0 ? sumWD / sumW : null,
		simple: n > 0 ? sumD / n : null,
	};
}

function quantile(sortedAsc, q) {
	if (!sortedAsc.length) return null;
	const pos = (sortedAsc.length - 1) * q;
	const base = Math.floor(pos), rest = pos - base;
	const next = sortedAsc[base + 1];
	return next !== undefined ? sortedAsc[base] + rest * (next - sortedAsc[base]) : sortedAsc[base];
}

// Win-rate por rango de precio unitario del certificado. Necesita cotizaciones
// cerradas (confirmadas + rechazadas) para ser significativo.
function conversionByPrice(deals) {
	const closed = deals
		.map(function (d) {
			const up = dealUnitPrice(d);
			const st = dealStatus(d);
			return up && (st === "confirmada" || st === "rechazada")
				? { price: up.cert.price, won: st === "confirmada" }
				: null;
		})
		.filter(function (x) { return x && x.price > 0; });

	if (closed.length < 6) return { sparse: true, n: closed.length, bands: [] };

	const prices = closed.map(function (x) { return x.price; }).sort(function (a, b) { return a - b; });
	const q1 = quantile(prices, 1 / 3), q2 = quantile(prices, 2 / 3);
	if (!(q1 < q2)) return { sparse: true, n: closed.length, bands: [] }; // precios sin dispersión suficiente

	const defs = [
		{ label: "Bajo", test: function (p) { return p <= q1; }, loFrom: prices[0], hiTo: q1 },
		{ label: "Medio", test: function (p) { return p > q1 && p <= q2; }, loFrom: q1, hiTo: q2 },
		{ label: "Alto", test: function (p) { return p > q2; }, loFrom: q2, hiTo: prices[prices.length - 1] },
	];
	const bands = defs.map(function (def) {
		const inBand = closed.filter(function (x) { return def.test(x.price); });
		const won = inBand.filter(function (x) { return x.won; }).length;
		const total = inBand.length;
		return {
			label: def.label,
			from: def.loFrom,
			to: def.hiTo,
			total: total,
			won: won,
			lost: total - won,
			winRate: total > 0 ? won / total : null,
		};
	});
	return { sparse: false, n: closed.length, bands: bands };
}

// Métricas de precio por canal para un set de deals ya filtrado. Un bloque por
// canal: los tres se leen por separado porque su unidad y su política de precios son
// distintas.
export function computePriceMetrics(deals) {
	const byChannel = { web: [], distribuidores: [], b2b2c: [], volumen: [] };
	deals.forEach(function (d) {
		const up = dealUnitPrice(d);
		if (!up || !byChannel[up.channel]) return;
		byChannel[up.channel].push({ deal: d, up: up });
	});

	function channelBlock(rows) {
		return {
			n: rows.length,
			cert: aggregateElement(rows.map(function (x) { return { units: x.up.cert.units, price: x.up.cert.price, revenue: dealRevenue(x.deal) }; })),
			firma: aggregateElement(rows.map(function (x) { return { units: x.up.firma.units, price: x.up.firma.price, revenue: dealRevenue(x.deal) }; })),
			certBundle: rows.length > 0 && rows[0].up.cert.bundle,
			discount: aggregateDiscount(rows.map(function (x) { return x.deal; })),
			conversion: conversionByPrice(rows.map(function (x) { return x.deal; })),
		};
	}

	return {
		web: channelBlock(byChannel.web),
		distribuidores: channelBlock(byChannel.distribuidores),
		b2b2c: channelBlock(byChannel.b2b2c),
		volumen: channelBlock(byChannel.volumen),
	};
}
