import { isPacks } from "@/data/channelMeta";
import { dealStatus } from "@/lib/dealStatus";

// ─── Métricas de cotizaciones ─────────────────────────────────────────────────
// Fuente única de verdad para leer números de un deal guardado. Reportes lo usa
// para facturación, volumen de items y, sobre todo, precios por elemento.
//
// Precio por elemento (certificados y firmas): en Volumen los precios unitarios
// se guardan limpios (precioIDC, precioFirma). En Packs el precio es de bundle
// (un pack agrupa certs + firmas incluidas en un precio de lista), así que el
// "precio por cert" es implícito (lista ÷ certs) y solo las firmas adicionales
// tienen precio unitario propio (precioFirmaAdic). Por eso todo se mide separado
// por canal y nunca se promedian ambos en un mismo número.

function num(x) { return typeof x === "number" && isFinite(x) ? x : 0; }

// Revenue año 1 homogéneo entre canales: neto (+ abono) en packs, revenue anual
// en volumen. Es la misma cifra que muestra cada cotizadora al guardar.
export function dealRevenue(d) {
	const r = d.resumen || {};
	if (isPacks(d.channel)) return r.facturacionAnio1 || r.netoLakaut || r.facturacionLista || 0;
	if (d.channel === "b2b2c") return r.revAnual || (r.revMesTotal || 0) * 12 || 0;
	return 0;
}

export function dealItems(d) {
	const r = d.resumen || {};
	return {
		certs: isPacks(d.channel) ? (r.certsComprados || r.certsActivos || 0) : 0,
		idc: d.channel === "b2b2c" ? (r.idcMensuales || 0) : 0,
		firmas: r.firmasTotal || r.firmasTotales || 0,
	};
}

// Precio unitario cotizado + unidades por elemento, por deal. Devuelve null si el
// canal no participa de la métrica de precios.
export function dealUnitPrice(d) {
	const r = d.resumen || {};
	if (d.channel === "b2b2c") {
		return {
			channel: "volumen",
			cert: { units: num(r.idcMensuales), price: num(r.precioIDC), bundle: false },
			firma: { units: num(r.firmasTotales || r.firmasTotal), price: num(r.precioFirma), bundle: false },
		};
	}
	if (isPacks(d.channel)) {
		const certs = num(r.certsComprados || r.certsActivos);
		const lista = num(r.facturacionLista);
		return {
			channel: "packs",
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
// Volumen: se deriva del precio realizado vs el precio base de lista (captura
// descuento por segmento, por condiciones y overrides manuales, y funciona con
// deals viejos que no guardaron el snapshot del segmento). Requiere `base`
// ({ cert, firma }); si no se pasa, cae al snapshot segmentoDescuento + descCond.
// Packs: usa el descuento total ya guardado (0 = precio de lista).
export function dealDiscountPct(d, base) {
	const r = d.resumen || {};
	if (d.channel === "b2b2c") {
		if (base && (num(base.cert) > 0 || num(base.firma) > 0)) {
			const idc = num(r.idcMensuales), firmas = num(r.firmasTotales || r.firmasTotal);
			const listRev = idc * num(base.cert) + firmas * num(base.firma);
			const cond = num(r.descCondPct);
			const realRev = (idc * num(r.precioIDC) + firmas * num(r.precioFirma)) * (1 - cond);
			return listRev > 0 ? 1 - realRev / listRev : 0;
		}
		const seg = num(r.segmentoDescuento), cond = num(r.descCondPct);
		return 1 - (1 - seg) * (1 - cond);
	}
	if (isPacks(d.channel)) return num(r.descTotal); // 0 = precio de lista, sin descuento
	return 0;
}

// Valor de lista (pre-descuento) para ponderar el descuento promedio.
function dealListValue(d, base) {
	const r = d.resumen || {};
	if (d.channel === "b2b2c") {
		if (base && (num(base.cert) > 0 || num(base.firma) > 0)) {
			return num(r.idcMensuales) * num(base.cert) + num(r.firmasTotales || r.firmasTotal) * num(base.firma);
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
function aggregateDiscount(deals, base) {
	let sumW = 0, sumWD = 0, sumD = 0, n = 0, nCon = 0;
	deals.forEach(function (d) {
		const disc = dealDiscountPct(d, base);
		const w = dealListValue(d, base);
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

// Métricas de precio por canal (volumen / packs) para un set de deals ya filtrado.
// `volumenBase` ({ cert, firma }) es el precio base de lista de Volumen (config),
// necesario para medir el descuento vs lista de forma robusta.
export function computePriceMetrics(deals, volumenBase) {
	const byChannel = { volumen: [], packs: [] };
	deals.forEach(function (d) {
		const up = dealUnitPrice(d);
		if (!up) return;
		byChannel[up.channel].push({ deal: d, up: up });
	});

	function channelBlock(rows, base) {
		return {
			n: rows.length,
			cert: aggregateElement(rows.map(function (x) { return { units: x.up.cert.units, price: x.up.cert.price, revenue: dealRevenue(x.deal) }; })),
			firma: aggregateElement(rows.map(function (x) { return { units: x.up.firma.units, price: x.up.firma.price, revenue: dealRevenue(x.deal) }; })),
			certBundle: rows.length > 0 && rows[0].up.cert.bundle,
			discount: aggregateDiscount(rows.map(function (x) { return x.deal; }), base),
			conversion: conversionByPrice(rows.map(function (x) { return x.deal; })),
		};
	}

	return {
		volumen: channelBlock(byChannel.volumen, volumenBase),
		packs: channelBlock(byChannel.packs, null),
	};
}
