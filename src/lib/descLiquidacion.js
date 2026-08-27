// ─── Formas de liquidación del descuento de nivel ──────────────────────────────
// El descuento de nivel/segmento (canales Volumen y Distribuidores-Volumen) puede
// entregarse de varias formas. El NETO anual de Lakaut es el MISMO en todas (el
// precio con descuento); lo que cambia es el cash flow, el compromiso que se le pide
// al cliente y, en "firmas", el margen (se entregan firmas cuyo costo variable se
// paga igual).
//
//   CON COMPROMISO ANUAL (el cliente se compromete al volumen del año)
//     B1 · anticipado → paga el año completo por adelantado, al valor neto
//     B2 · caucion    → neto con seguro de caución ejecutable que se reduce al pagar
//     A1 · rebate     → precio de lista full todo el año; el descuento se acredita
//                       como nota de crédito al cierre
//     A2 · firmas     → precio de lista full; al cierre se bonifican firmas
//                       equivalentes al descuento (baja el margen)
//   SIN COMPROMISO ANUAL
//     C1 · directo    → el descuento ya viene aplicado y se factura en cada período,
//                       sin pago anticipado ni permanencia anual obligatoria. El
//                       porcentaje de descuento es el mismo (lo fija el nivel).
//
// IDC queda fuera: cada segmento IDC es una escala de PRECIOS, no de descuentos, así
// que no hay un descuento de nivel que liquidar. El selector solo aparece en Volumen
// y Distribuidores-Volumen.
//
// Modelo persistido (deals + export): { forma, sub }. Se mantiene por compatibilidad;
// la UI trabaja con el id plano de la opción (ver DESC_OPCIONES / descOpcionId).

// Lista PLANA de opciones para el selector. Cada opción es auto-explicativa; el grupo
// solo sirve como encabezado visual (con/sin compromiso), no como un segundo nivel de
// selección. `forma`/`sub` son el modelo que se guarda y consume el export.
export const DESC_OPCIONES = [
	{
		id: "B1", forma: "B", sub: "anticipado", grupo: "Con compromiso anual",
		label: "Pago anual anticipado",
		desc: "Se abona el año completo por adelantado, con el descuento ya aplicado.",
	},
	{
		id: "B2", forma: "B", sub: "caucion", grupo: "Con compromiso anual",
		label: "Seguro de caución",
		desc: "Precio neto con seguro de caución ejecutable que se reduce a medida que el cliente paga.",
	},
	{
		id: "A1", forma: "A", sub: "rebate", grupo: "Con compromiso anual",
		label: "Rebate a fin de año",
		desc: "Se factura a precio de lista todo el año; el descuento se acredita como nota de crédito al cierre.",
	},
	{
		id: "A2", forma: "A", sub: "firmas", grupo: "Con compromiso anual",
		label: "Bonificación en firmas",
		desc: "Se factura a precio de lista; al cierre se bonifican firmas equivalentes al descuento (baja el margen).",
	},
	{
		id: "C1", forma: "C", sub: "directo", grupo: "Sin compromiso anual",
		label: "Descuento directo en factura",
		desc: "El descuento por volumen se aplica en cada factura, sin pago anticipado ni compromiso de permanencia anual.",
	},
];

// Grupos en orden, para renderizar la lista con encabezados sin duplicar strings.
export const DESC_GRUPOS = ["Con compromiso anual", "Sin compromiso anual"];

// Opción por defecto: B1 (pago anticipado con descuento aplicado), el comportamiento
// histórico del canal.
export const DESC_OPCION_DEFAULT = "B1";

// Busca la opción por su id plano; cae al default si no existe.
export function descOpcion(id) {
	return DESC_OPCIONES.find(function (o) { return o.id === id; }) || DESC_OPCIONES.find(function (o) { return o.id === DESC_OPCION_DEFAULT; });
}

// Traduce el modelo persistido { forma, sub } al id plano de la opción. Deals viejos
// (o sin el dato) caen al default.
export function descOpcionId(forma, sub) {
	const o = DESC_OPCIONES.find(function (x) { return x.forma === forma && x.sub === sub; });
	return o ? o.id : DESC_OPCION_DEFAULT;
}

// Sub-variante por defecto de cada forma (compat: usado al resolver un { forma } suelto).
export function descSubDefault(forma) {
	if (forma === "A") return "rebate";
	if (forma === "C") return "directo";
	return "anticipado";
}

// ¿La forma factura a precio de lista full durante el año? (Solo Forma A.)
export function descFormaEsFull(forma) {
	return forma === "A";
}

// Etiqueta corta de la opción para badges y resúmenes.
export function descLiquidacionLabel(forma, sub) {
	const o = DESC_OPCIONES.find(function (x) { return x.forma === forma && x.sub === sub; });
	return o ? o.label : "—";
}

// Resuelve la selección contra los números de la cotización. Devuelve las cifras
// derivadas del cash flow + una función `clausula(fmt)` que arma el texto para la
// propuesta con el formateador de moneda que le pase cada consumidor.
//   sel  = { forma: "A"|"B"|"C", sub }
//   nums = { descNivel, neto, precioFirma, cvFirma }
export function resolveDescLiquidacion(sel, nums) {
	const forma = sel && (sel.forma === "A" || sel.forma === "C") ? sel.forma : "B";
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
	const label = descLiquidacionLabel(forma, sub);

	function clausula(fmt) {
		const m = typeof fmt === "function" ? fmt : function (v) { return String(v); };
		if (esA && sub === "rebate") {
			return "Durante la vigencia se factura a precio de lista (" + m(cargoAnioFull) + "). El descuento por volumen de " + m(descNivel) + " se acredita como nota de crédito al cierre del año. Valor neto: " + m(neto) + ".";
		}
		if (esA && sub === "firmas") {
			return "Durante la vigencia se factura a precio de lista (" + m(cargoAnioFull) + "). Al cierre del año se bonifican " + firmasCierre.toLocaleString("es-AR") + " firmas, equivalentes al descuento por volumen de " + m(descNivel) + ". Valor neto: " + m(neto) + ".";
		}
		if (forma === "C") {
			return "El descuento por volumen ya está aplicado en el precio (" + m(neto) + ") y se factura en cada período, sin pago anticipado ni compromiso de permanencia anual.";
		}
		if (forma === "B" && sub === "anticipado") {
			return "Se abona el año completo por adelantado, con el descuento por volumen ya aplicado. Total: " + m(neto) + ".";
		}
		return "El precio incluye el descuento por volumen (" + m(neto) + "), garantizado con un seguro de caución ejecutable cuyo monto se reduce a medida que el cliente cumple con los pagos.";
	}

	return {
		id: descOpcionId(forma, sub), forma: forma, sub: sub, label: label,
		descNivel: descNivel, neto: neto, esFull: esA,
		cargoAnioFull: cargoAnioFull, rebate: rebate,
		firmasCierre: firmasCierre, costoFirmasCierre: costoFirmasCierre,
		clausula: clausula,
	};
}
