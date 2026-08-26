// ─── Formas de liquidación del descuento de nivel ──────────────────────────────
// El descuento de nivel/segmento (canales Volumen y Distribuidores-Volumen) puede
// entregarse de dos formas, cada una con dos sub-variantes. El NETO anual de Lakaut
// es el MISMO en las cuatro (el precio con descuento); lo que cambia es el cash flow
// y, en A2, el margen (se entregan firmas cuyo costo variable se paga igual).
//
//   Forma A · Precio de lista full durante el año, beneficio a fin de año
//     A1 · rebate  → el descuento se acredita en dinero al cierre (nota de crédito)
//     A2 · firmas  → se bonifican firmas equivalentes (descuento ÷ precio por firma)
//   Forma B · Pago anticipado, con el descuento ya aplicado
//     B1 · anticipado → se paga el año completo por adelantado (neto)
//     B2 · caucion    → neto con seguro de caución ejecutable que se reduce al pagar
//
// IDC queda fuera: cada segmento IDC es una escala de PRECIOS, no de descuentos, así
// que no hay un descuento de nivel que liquidar. El selector solo aparece en Volumen
// y Distribuidores-Volumen.

// Metadata para el selector de 2 niveles (Forma → sub-variante).
export const DESC_FORMAS = [
	{
		id: "A",
		label: "Precio full · beneficio a fin de año",
		desc: "Se factura a precio de lista durante el año; el descuento se entrega al cierre.",
		subs: [
			{ id: "rebate", label: "Descuento en dinero", desc: "Nota de crédito por el descuento al cierre del año." },
			{ id: "firmas", label: "Bonificación en firmas", desc: "Firmas equivalentes al descuento, entregadas al cierre." },
		],
	},
	{
		id: "B",
		label: "Pago anticipado · descuento aplicado",
		desc: "Se paga con el descuento de nivel ya aplicado.",
		subs: [
			{ id: "anticipado", label: "Pago anual anticipado", desc: "El año completo por adelantado, al valor neto." },
			{ id: "caucion", label: "Seguro de caución ejecutable", desc: "Neto, con caución que se reduce a medida que paga." },
		],
	},
];

// Sub-variante por defecto de cada forma (la primera de cada una).
export function descSubDefault(forma) {
	return forma === "A" ? "rebate" : "anticipado";
}

// ¿La forma factura a precio de lista full durante el año? (Solo Forma A.)
export function descFormaEsFull(forma) {
	return forma === "A";
}

// Etiqueta corta "Forma · sub" para badges y resúmenes.
export function descLiquidacionLabel(forma, sub) {
	const f = DESC_FORMAS.find(function (x) { return x.id === forma; });
	if (!f) return "—";
	const s = f.subs.find(function (x) { return x.id === sub; }) || f.subs[0];
	return f.label + " · " + s.label;
}

// Resuelve la selección contra los números de la cotización. Devuelve las cifras
// derivadas del cash flow + una función `clausula(fmt)` que arma el texto para la
// propuesta con el formateador de moneda que le pase cada consumidor.
//   sel  = { forma: "A"|"B", sub }
//   nums = { descNivel, neto, precioFirma, cvFirma }
export function resolveDescLiquidacion(sel, nums) {
	const forma = sel && sel.forma === "A" ? "A" : "B";
	const sub = sel && sel.sub ? sel.sub : descSubDefault(forma);
	const descNivel = Math.max(0, Number(nums && nums.descNivel) || 0);
	const neto = Math.max(0, Number(nums && nums.neto) || 0);
	const precioFirma = Number(nums && nums.precioFirma) || 0;
	const cvFirma = Number(nums && nums.cvFirma) || 0;
	const esA = forma === "A";
	// Forma A factura a precio de lista full durante el año (neto + descuento) y
	// devuelve el descuento al cierre; el neto final es el mismo.
	const cargoAnioFull = esA ? neto + descNivel : neto;
	const firmasCierre = esA && sub === "firmas" && precioFirma > 0 ? Math.round(descNivel / precioFirma) : 0;
	const costoFirmasCierre = firmasCierre * cvFirma;
	const rebate = esA && sub === "rebate" ? descNivel : 0;
	const numSub = sub === "rebate" || sub === "anticipado" ? "1" : "2";
	const id = forma + numSub;
	const label = descLiquidacionLabel(forma, sub);

	function clausula(fmt) {
		const m = typeof fmt === "function" ? fmt : function (v) { return String(v); };
		if (esA && sub === "rebate") {
			return "Durante la vigencia se factura a precio de lista (" + m(cargoAnioFull) + "). El descuento por volumen de " + m(descNivel) + " se acredita como nota de crédito al cierre del año. Valor neto: " + m(neto) + ".";
		}
		if (esA && sub === "firmas") {
			return "Durante la vigencia se factura a precio de lista (" + m(cargoAnioFull) + "). Al cierre del año se bonifican " + firmasCierre.toLocaleString("es-AR") + " firmas, equivalentes al descuento por volumen de " + m(descNivel) + ". Valor neto: " + m(neto) + ".";
		}
		if (!esA && sub === "anticipado") {
			return "Se abona el año completo por adelantado, con el descuento por volumen ya aplicado. Total: " + m(neto) + ".";
		}
		return "El precio incluye el descuento por volumen (" + m(neto) + "), garantizado con un seguro de caución ejecutable cuyo monto se reduce a medida que el cliente cumple con los pagos.";
	}

	return {
		id: id, forma: forma, sub: sub, label: label,
		descNivel: descNivel, neto: neto, esFull: esA,
		cargoAnioFull: cargoAnioFull, rebate: rebate,
		firmasCierre: firmasCierre, costoFirmasCierre: costoFirmasCierre,
		clausula: clausula,
	};
}
