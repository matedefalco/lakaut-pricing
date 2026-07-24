// ─── Convención de IDs de cotización ────────────────────────────────────────
// Formato: COT-[TIPO]-[NNNN]-v[N]
//   COT   → prefijo fijo.
//   TIPO  → código del tipo de cliente (atributo del cliente): DIS / DIR / PAR.
//   NNNN  → correlativo global de 4 dígitos, único por cotización, compartido
//           entre versiones. Se asigna al crear y no se reutiliza.
//   v[N]  → número de versión; arranca en v1 y sube con cada revisión.
// La versión vigente es siempre la de v más alto; las anteriores quedan como
// historial. Ver también [[modelo-canales-borrador-v5]].

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
export function formatCotId(cot, fallbackTipo) {
	if (!cot || cot.number == null) return null;
	const tipo = cot.tipo || fallbackTipo || DEFAULT_TIPO;
	return "COT-" + tipo + "-" + padCotNumber(cot.number) + "-v" + (cot.version || 1);
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
