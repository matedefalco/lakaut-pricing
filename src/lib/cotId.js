// ─── Convención de IDs de cotización ────────────────────────────────────────
// Formato: COT-[NNNN]-[TIPO]-v[N]
//   COT   → prefijo fijo.
//   NNNN  → correlativo global de 4 dígitos, único por cotización, compartido
//           entre versiones. Se asigna al crear y no se reutiliza. Va primero
//           para poder buscar una cotización por su número.
//   TIPO  → código del tipo de cliente (atributo del cliente): DIS / DIR / PAR.
//           Excepción: el canal Volumen usa siempre "SDK" (integra por SDK), sin
//           importar el tipo del cliente.
//   v[N]  → número de versión; arranca en v1 y sube con cada revisión.
// La versión vigente es siempre la de v más alto; las anteriores quedan como
// historial. Ver también [[modelo-canales-borrador-v5]].

import { isVolumen } from "@/data/channelMeta";

// Código de tipo que se muestra en el ID. Volumen manda "SDK" por canal; el resto
// usa el tipo del cliente. Se resuelve por canal para que las cotizaciones ya
// guardadas (con el tipo del cliente en el snapshot) también muestren SDK.
export function cotTipo(channel, storedTipo, fallbackTipo) {
	if (isVolumen(channel)) return "SDK";
	return storedTipo || fallbackTipo || DEFAULT_TIPO;
}

export const TIPOS = [
	{ code: "DIR", label: "Cliente directo / integrador" },
	{ code: "DIS", label: "Distribuidor" },
	{ code: "PAR", label: "Partner" },
];

export const TIPO_LABEL = TIPOS.reduce(function (acc, t) { acc[t.code] = t.label; return acc; }, {});

// Tipo por defecto cuando el cliente todavía no tiene uno asignado (ej. cotización
// rápida sin cliente). "Cliente directo" es el caso neutro.
export const DEFAULT_TIPO = "DIR";

export function padCotNumber(n) {
	return String(Math.max(0, Number(n) || 0)).padStart(4, "0");
}

// Arma el ID visible. `fallbackTipo` (ej. el tipo vivo del cliente) se usa solo
// si el snapshot guardado en el deal no tiene tipo. Devuelve null si no hay
// correlativo asignado todavía (cotización sin guardar).
export function formatCotId(cot, fallbackTipo, channel) {
	if (!cot || cot.number == null) return null;
	const tipo = cotTipo(channel, cot.tipo, fallbackTipo);
	return "COT-" + padCotNumber(cot.number) + "-" + tipo + "-v" + (cot.version || 1);
}

// Mayor correlativo usado entre una lista de deals (cada uno con inputs.cot.number).
export function maxCotNumber(deals) {
	var max = 0;
	(deals || []).forEach(function (d) {
		var n = d && d.inputs && d.inputs.cot && d.inputs.cot.number;
		if (typeof n === "number" && n > max) max = n;
	});
	return max;
}

// Mayor versión existente para un correlativo dado (para calcular la próxima).
export function maxCotVersion(deals, number) {
	var max = 0;
	(deals || []).forEach(function (d) {
		var c = d && d.inputs && d.inputs.cot;
		if (c && c.number === number && (c.version || 1) > max) max = c.version || 1;
	});
	return max;
}
