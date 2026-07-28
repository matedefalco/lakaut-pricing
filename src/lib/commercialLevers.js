// ─── Palancas de descuento comercial ─────────────────────────────────────────
// Lógica pura para las 3 palancas (time-to-cash, duración de vinculación,
// velocidad de cierre) que se suman con tope sobre el subtotal de servicio.
// El volumen NO entra acá: ya vive en el precio (segmento/tabla o nivel).
// Config en channelConfig.commercialLevers. Ver [[modelo-canales-borrador-v5]].
//
// Cada opción es { id, value (número), discount (puntos %) }. El texto visible se
// deriva del número: la opción de mayor valor se muestra como "N o más".

// Orden, etiquetas y metadatos de cada palanca (unidad + encabezado de columna
// para el editor de config).
export const LEVER_META = [
	{ key: "timeToCash", label: "Time to cash", short: "Pago", col: "Días de plazo de pago" },
	{ key: "duracion", label: "Duración de la vinculación", short: "Duración", col: "Meses de vinculación" },
	{ key: "velocidad", label: "Velocidad de cierre", short: "Cierre", col: "Días para confirmar" },
];

// Valor numérico de una opción, tolerante al formato viejo {label} (extrae el
// primer número del texto) para no romper configs guardadas antes del cambio.
function optionValueOf(opt) {
	if (opt == null) return 0;
	if (opt.value != null) return Number(opt.value) || 0;
	const m = String(opt.label || "").match(/\d+/);
	return m ? Number(m[0]) : 0;
}

// Texto visible derivado del número, por palanca. `isMax` agrega "o más" a la
// opción de mayor valor (tramo abierto).
export function leverLabel(leverKey, value, isMax) {
	const suf = isMax ? " o más" : "";
	if (leverKey === "timeToCash") return value === 0 ? "Pago contado" : "Pago a " + value + " días" + suf;
	if (leverKey === "duracion") return value + " meses" + suf;
	if (leverKey === "velocidad") return "Confirma en " + value + " días" + suf;
	return String(value) + suf;
}

function maxValueOf(options) {
	const vals = (options || []).map(optionValueOf);
	return vals.length ? Math.max.apply(null, vals) : 0;
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
		const options = (levers && levers[m.key]) || [];
		const id = sel[m.key];
		const opt = options.find(function (o) { return o.id === id; });
		const d = opt ? (Number(opt.discount) || 0) : 0;
		raw += d;
		if (d > 0) {
			const v = optionValueOf(opt);
			items.push({ key: m.key, label: m.label, optionId: id, optionLabel: leverLabel(m.key, v, v === maxValueOf(options)), discount: d });
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

// Valor numérico de la opción elegida en una palanca, sin importar su descuento.
// `resolveLevers` solo devuelve las palancas que aportan > 0, así que para leer los
// meses de vinculación (cuya opción base es 0%) hace falta este acceso directo.
// Lo usa Volumen para sugerir el compromiso del contrato (volumen × meses).
export function leverValue(levers, selection, key) {
	const options = (levers && levers[key]) || [];
	const id = (selection || {})[key];
	const opt = options.find(function (o) { return o.id === id; });
	return opt ? optionValueOf(opt) : 0;
}

// Opciones para el <SelectField> de una palanca (value/label), con el texto
// derivado + el % en el label.
export function leverOptions(options, leverKey) {
	const maxV = maxValueOf(options);
	return (options || []).map(function (o) {
		const v = optionValueOf(o);
		const d = Number(o.discount) || 0;
		return { value: o.id, label: leverLabel(leverKey, v, v === maxV) + (d > 0 ? " · −" + d + "%" : "") };
	});
}
