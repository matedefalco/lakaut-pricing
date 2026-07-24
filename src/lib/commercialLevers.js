// ─── Palancas de descuento comercial ─────────────────────────────────────────
// Lógica pura para las 3 palancas (time-to-cash, duración de vinculación,
// velocidad de cierre) que se suman con tope sobre el subtotal de servicio.
// El volumen NO entra acá: ya vive en el precio (segmento/tabla o nivel).
// Config en channelConfig.commercialLevers. Ver [[modelo-canales-borrador-v5]].

// Orden y etiquetas de las palancas (para la UI y el desglose del PDF).
export const LEVER_META = [
	{ key: "timeToCash", label: "Time to cash", short: "Pago" },
	{ key: "duracion", label: "Duración de la vinculación", short: "Duración" },
	{ key: "velocidad", label: "Velocidad de cierre", short: "Cierre" },
];

// % (puntos) de la opción seleccionada de una palanca.
function optionDiscount(options, id) {
	const o = (options || []).find(function (x) { return x.id === id; });
	return o ? (Number(o.discount) || 0) : 0;
}

function optionLabel(options, id) {
	const o = (options || []).find(function (x) { return x.id === id; });
	return o ? o.label : null;
}

// Selección por defecto: la opción de 0% de cada palanca (precio base). Si ninguna
// es 0, cae a la primera. Devuelve { timeToCash, duracion, velocidad } (ids).
export function defaultLeverSelection(levers) {
	function pick(options) {
		const zero = (options || []).find(function (o) { return (Number(o.discount) || 0) === 0; });
		return (zero || (options || [])[0] || {}).id || null;
	}
	return {
		timeToCash: pick(levers && levers.timeToCash),
		duracion: pick(levers && levers.duracion),
		velocidad: pick(levers && levers.velocidad),
	};
}

// Resuelve la selección contra la config: devuelve el descuento crudo, el aplicado
// (con tope) y el desglose por palanca (solo las que aportan > 0), como snapshot
// estable que se guarda en el deal (no se recalcula si después cambian los tramos).
//   pct = tasa aplicada (0..1) · rawPct = suma sin tope · cap = tope en puntos %
//   items = [{ key, label, optionId, optionLabel, discount }]  (discount en puntos %)
export function resolveLevers(levers, selection) {
	const sel = selection || {};
	const cap = levers && isFinite(levers.cap) ? Number(levers.cap) : Infinity;
	let raw = 0;
	const items = [];
	LEVER_META.forEach(function (m) {
		const options = levers && levers[m.key];
		const id = sel[m.key];
		const d = optionDiscount(options, id);
		raw += d;
		if (d > 0) {
			items.push({ key: m.key, label: m.label, optionId: id, optionLabel: optionLabel(options, id), discount: d });
		}
	});
	const cappedPts = Math.min(raw, cap);
	return {
		rawPct: raw,
		cappedPts: cappedPts,
		cap: isFinite(cap) ? cap : null,
		capped: raw > cap,
		pct: cappedPts / 100,
		items: items,
	};
}

// Opciones para el <SelectField> de una palanca (value/label), con el % en el label.
export function leverOptions(options) {
	return (options || []).map(function (o) {
		const d = Number(o.discount) || 0;
		return { value: o.id, label: o.label + (d > 0 ? " · −" + d + "%" : "") };
	});
}
