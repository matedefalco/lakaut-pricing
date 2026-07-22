// Proyección de crecimiento (override por propuesta). A partir del volumen y del
// precio ya cotizados, arma escalones crecientes con un descuento progresivo para
// que el cliente proyecte su costo a distintas escalas y perciba la mejora de
// precio a medida que crece. No toca B2B2C_SEGMENTS ni la segmentación global:
// es un override puro, acotado a la propuesta donde se activa.
//
// El motor es puro (sin React) para que el preview en pantalla (TabCanalB2B2C) y
// la propuesta exportada (exportProposal) calculen exactamente lo mismo.

// Qué escala cuando el volumen crece un escalón. El crecimiento casi nunca es
// proporcional: en la mayoría de los casos escala una sola métrica.
export const PROYECCION_DRIVERS = [
	{ id: "packs", label: "Packs · mix fijo", desc: "Crecen certificados y firmas manteniendo la proporción (ej. recibos de sueldo)." },
	{ id: "firmas", label: "Solo firmas", desc: "Los certificados quedan fijos; crece el volumen de firmas." },
	{ id: "certificados", label: "Solo certificados", desc: "Las firmas quedan fijas; crece el volumen de certificados." },
	{ id: "manual", label: "Manual", desc: "Cargás el volumen de cada escalón a mano." },
];

// Escalones por defecto: % de crecimiento de volumen desde el volumen inicial y
// % de descuento sobre el precio de cert y de firma. Editable por propuesta.
export const DEFAULT_PROYECCION_STEPS = [
	{ pct: 5, descuento: 3 },
	{ pct: 10, descuento: 6 },
	{ pct: 25, descuento: 10 },
	{ pct: 50, descuento: 15 },
];

// Escala el volumen del escalón según el driver. `k` es el factor de crecimiento.
// En modo manual, si el escalón no trae un valor cargado, cae al crecimiento
// proporcional (k) para que la fila arranque con un número sensato y editable.
function scaleVolume(driver, idc0, firmas0, pct, step) {
	const k = 1 + (Number(pct) || 0) / 100;
	if (driver === "manual") {
		const mi = step && step.idc != null && step.idc !== "" ? Number(step.idc) : idc0 * k;
		const mf = step && step.firmas != null && step.firmas !== "" ? Number(step.firmas) : firmas0 * k;
		return { idc: Math.max(0, Math.round(mi)), firmas: Math.max(0, Math.round(mf)) };
	}
	if (driver === "firmas") return { idc: idc0, firmas: Math.round(firmas0 * k) };
	if (driver === "certificados") return { idc: Math.round(idc0 * k), firmas: firmas0 };
	// packs (default): mix fijo, ambos escalan igual
	return { idc: Math.round(idc0 * k), firmas: Math.round(firmas0 * k) };
}

function makeRow(step, vol, precioCert0, precioFirma0) {
	const d = Math.min(100, Math.max(0, Number(step.descuento) || 0)) / 100;
	const precioCert = precioCert0 * (1 - d);
	const precioFirma = precioFirma0 * (1 - d);
	const costo = vol.idc * precioCert + vol.firmas * precioFirma;
	const costoAlBase = vol.idc * precioCert0 + vol.firmas * precioFirma0;
	const ahorroMonto = costoAlBase - costo;
	const ahorroPct = costoAlBase > 0 ? ahorroMonto / costoAlBase : 0;
	return {
		pct: Number(step.pct) || 0,
		descuento: Number(step.descuento) || 0,
		idc: vol.idc,
		firmas: vol.firmas,
		unidades: vol.idc + vol.firmas,
		precioCert,
		precioFirma,
		costo,
		costoAlBase,
		ahorroMonto,
		ahorroPct,
	};
}

// Devuelve las filas de la proyección: la primera es el volumen actual (base,
// sin descuento) y luego un escalón por cada `step`.
//   base  = { idc, firmas, precioCert, precioFirma }
//   steps = [{ pct, descuento, idc?, firmas? }]  (idc/firmas solo en modo manual)
export function buildProyeccion(base, driver, steps) {
	const idc0 = Math.max(0, Number(base && base.idc) || 0);
	const firmas0 = Math.max(0, Number(base && base.firmas) || 0);
	const precioCert0 = Math.max(0, Number(base && base.precioCert) || 0);
	const precioFirma0 = Math.max(0, Number(base && base.precioFirma) || 0);
	const d = driver || "packs";

	const baseRow = makeRow({ pct: 0, descuento: 0 }, { idc: idc0, firmas: firmas0 }, precioCert0, precioFirma0);
	const stepRows = (Array.isArray(steps) ? steps : []).map(function (s) {
		const vol = scaleVolume(d, idc0, firmas0, s.pct, s);
		return makeRow(s, vol, precioCert0, precioFirma0);
	});
	return [baseRow].concat(stepRows);
}
