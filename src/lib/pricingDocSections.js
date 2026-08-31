// ─── Builders de las secciones de la doc del modelo comercial (módulo puro) ────
// Toman la config EFECTIVA (ya normalizada) + el catálogo de models + el TC, y
// devuelven el markdown de cada bloque AUTO de docs/modelo-comercial.md.
//
// Lo comparten dos consumidores, para que la doc del repo y la doc in-app salgan
// idénticas de una sola fuente:
//   · scripts/gen-pricing-docs.mjs → escribe el .md desde la config viva de Supabase.
//   · src/components/tabs/TabDocumentacion.jsx → renderiza en vivo desde el context,
//     así un cambio hecho en la interfaz se ve al instante sin regenerar.
// No importar Node (fs/path) ni React acá: debe correr en ambos.
import { VOLUMEN_BASE } from "../data/channels.js";

// ── Formato ────────────────────────────────────────────────────────────────────
const nfInt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
export function num(n) { return nfInt.format(Number(n) || 0); }
export function usd(n, min = 2, max = 4) {
	return new Intl.NumberFormat("es-AR", { minimumFractionDigits: min, maximumFractionDigits: max }).format(Number(n) || 0);
}
export function pct(fraction) {
	const v = Number(fraction) || 0;
	const p = v <= 1 ? v * 100 : v;
	return `${nfInt.format(Math.round(p * 100) / 100)}%`;
}
function rangeCant(min, max, unidad = "") {
	const u = unidad ? ` ${unidad}` : "";
	if (min == null && max == null) return "—";
	if (max == null) return `${num(min)}+${u}`;
	if (Number(min) <= 0) return `hasta ${num(max)}${u}`;
	return `${num(min)} – ${num(max)}${u}`;
}
function rangeUSD(min, max) {
	if (max == null) return `+USD ${num(min)}`;
	if (Number(min) <= 0) return `hasta USD ${num(max)}`;
	return `USD ${num(min)} – ${num(max)}`;
}

// ── Secciones ────────────────────────────────────────────────────────────────
function secWeb(models, tc) {
	const rows = models.map((m) => {
		const firmas = m.ilimitadas ? "ilimitadas" : num(m.firmas);
		const certs = m.certs != null ? num(m.certs) : "—";
		// priceUSD 0/null: puede ser un plan gratis (Cero) o "a consultar" (Enterprise/API).
		// Se distingue por el priceNote: si menciona "gratis", es gratis; si no, a consultar.
		const tienePrecio = m.priceUSD != null && Number(m.priceUSD) > 0;
		const esGratis = !tienePrecio && /gratis/i.test(m.priceNote || "");
		const precioUSD = tienePrecio ? `USD ${usd(m.priceUSD, 0, 2)}` : (esGratis ? "gratis" : "a consultar");
		const precioARS = tienePrecio && tc ? `$${num(m.priceUSD * tc)}` : (esGratis ? "$0" : "—");
		const seg = m.segment === "empresa" ? "Empresa" : "Persona";
		return `| ${m.label} | ${seg} | ${firmas} | ${certs} | ${precioUSD} | ${precioARS} |`;
	});
	const tcNote = tc ? `TC de referencia usado para derivar ARS: **$${num(tc)}** por USD.` : "_Sin TC cargado: la columna ARS queda vacía._";
	return [
		"| Pack | Segmento | Firmas | Certificados | Precio (USD) | Precio (ARS aprox.) |",
		"|---|---|---|---|---|---|",
		...rows,
		"",
		tcNote,
	].join("\n");
}

function secDistribuidoresVol(tiers, base) {
	const rows = tiers.map((t) =>
		`| ${t.label} | ${pct(t.descuento)} | ${rangeCant(t.firmasMin, t.firmasMax, "firmas")} | ${rangeUSD(t.facturacionMin, t.facturacionMax)} |`
	);
	return [
		`Certificados y firmas sueltos (base cert USD ${usd(base.cert)} / firma USD ${usd(base.firma)}): el único modo en que cotizan los distribuidores. El nivel es el **mayor** entre dos ejes de la cotización: el **volumen real de firmas** y la **facturación a lista** de la ventana contemplada. La modalidad de la cotización (Consumo único / Anual) define si la facturación se mide sobre un período o se anualiza (× meses de vinculación). La escala de descuentos es conservadora porque pega sobre el precio por elemento, que está cerca del costo.`,
		"",
		"| Nivel | Descuento sobre base | Rango de firmas | Facturación de la ventana |",
		"|---|---|---|---|",
		...rows,
	].join("\n");
}

function secIDC(segments, markupMin) {
	const rows = segments.map((s) =>
		`| ${s.label} | ${rangeCant(s.idcMin, s.idcMax, "IDC")} | ${rangeUSD(s.facturacionMin, s.facturacionMax)} | USD ${usd(s.precioIDC)} | ${num(s.firmasIncluidas)} | USD ${usd(s.precioFirmaExtra)} |`
	);
	return [
		"Unidad de venta = **IDC** (Identidad Digital Certificada): bundle con biometría, emisión, custodia y firmas de activación. Es una **escala de precios**, no de descuentos: cada segmento tiene su propio precio por IDC. El segmento es el **mayor** entre dos ejes: la cantidad de IDC mensuales y la **facturación** de la ventana medida a precio de referencia Start Up (evita la circularidad precio↔segmento), windoweada por la modalidad Consumo único / Anual.",
		"",
		"| Segmento | Rango (IDC/mes) | Facturación de la ventana | Precio IDC/mes | Firmas incluidas | Firma extra |",
		"|---|---|---|---|---|---|",
		...rows,
		"",
		`Guardarraíl de rentabilidad: markup mínimo **${usd(markupMin, 2, 2)}x** sobre el costo variable del bundle. Bajo ese piso el cotizador bloquea guardar y exportar.`,
	].join("\n");
}

function secVolumen(base, segments) {
	const rows = segments.map((s) =>
		`| ${s.label} | ${rangeCant(s.firmasMin, s.firmasMax, "firmas")} | ${rangeUSD(s.compromisoMin, s.compromisoMax)} | ${pct(s.descuento)} |`
	);
	return [
		`Certificados y firmas como items independientes, sin bundle. Precio base: **cert USD ${usd(base.cert)} / firma USD ${usd(base.firma)}**. El segmento es el **mayor** entre dos ejes de la cotización: el **volumen real de firmas** y el **compromiso** del contrato en USD a precio de lista, windoweado por la modalidad Consumo único / Anual. Aplica el mismo descuento sobre cert y firma.`,
		"",
		"| Segmento | Rango de firmas | Compromiso de la ventana (USD) | Descuento |",
		"|---|---|---|---|",
		...rows,
	].join("\n");
}

function secProyeccion(steps, base) {
	const rows = steps.map((s) => {
		const precio = base.firma * (1 - (s.descuento > 1 ? s.descuento / 100 : s.descuento));
		return `| ${num(s.firmas)}+ firmas | ${pct(s.descuento)} | USD ${usd(precio)} |`;
	});
	return [
		"Escala estándar de referencia por volumen de firmas que se adjunta a las propuestas de Volumen (misma para todas las cotizaciones, para ser justos entre clientes).",
		"",
		"| Tramo | Descuento sobre firma | Precio firma resultante |",
		"|---|---|---|",
		...rows,
	].join("\n");
}

function secFees(tiers) {
	const rows = tiers.map((t) =>
		`| ${t.label} | USD ${num(t.feeMin)} – ${num(t.feeMax)} | USD ${num(t.feeDefault)} |`
	);
	return [
		"Fee de implementación por SDK (pago único, bonificable a discreción comercial).",
		"",
		"| Tier | Rango de fee | Default |",
		"|---|---|---|",
		...rows,
	].join("\n");
}

function secSLA(plans) {
	const rows = plans.map((p) => {
		const precio = p.precioMes == null ? "personalizado" : (p.precioMes === 0 ? "incluido" : `USD ${num(p.precioMes)}/mes`);
		const sla = p.sla ? `${usd(p.sla * 100, 1, 1)}%` : "—";
		const tx = p.txMes ? `${num(p.txMes)} tx/mes` : "—";
		return `| ${p.label} | ${precio} | ${sla} | ${tx} | ${p.desc} |`;
	});
	return [
		"| Plan | Precio | SLA | Volumen | Detalle |",
		"|---|---|---|---|---|",
		...rows,
	].join("\n");
}

function secPalancas(levers, abono) {
	function lever(list) {
		return list.map((o) => `${o.value === 0 ? "contado" : o.value} → ${pct(o.discount)}`).join(" · ");
	}
	return [
		`Descuentos adicionales (aditivos) sobre el subtotal de servicio, aplicables en Volumen y Distribuidores. Tope de la suma de las tres: **${pct(levers.cap)}**.`,
		"",
		"| Palanca | Opciones (valor → descuento) |",
		"|---|---|",
		`| Time-to-cash (días de pago) | ${lever(levers.timeToCash)} |`,
		`| Duración del contrato (meses) | ${lever(levers.duracion)} |`,
		`| Velocidad de cierre (días) | ${lever(levers.velocidad)} |`,
		"",
		`Descuento del abono mensual (reposición de bolsa de firmas): **${pct(abono)}**. Se mantiene bajo a propósito: el beneficio principal lo da el volumen, no la recurrencia.`,
	].join("\n");
}

// ── API pública ──────────────────────────────────────────────────────────────
// Devuelve un objeto { id de bloque → markdown } para todos los bloques de datos.
// `meta` NO se incluye acá: cada consumidor arma su propio meta (el generador con
// timestamp/commit, la app con "datos en vivo").
export function buildDocBlocks({ channelConfig, models, tc }) {
	const cfg = channelConfig || {};
	const base = cfg.volumenBase || VOLUMEN_BASE;
	return {
		web: secWeb(models || [], tc),
		"distribuidores-vol": secDistribuidoresVol(cfg.distribuidorVolTiers || [], base),
		idc: secIDC(cfg.b2b2cSegments || [], cfg.b2b2cMarkupMin),
		volumen: secVolumen(base, cfg.volumenSegments || []),
		proyeccion: secProyeccion(cfg.volumenProyeccion || [], base),
		fees: secFees(cfg.b2b2cApiTiers || []),
		sla: secSLA(cfg.slaPlans || []),
		palancas: secPalancas(cfg.commercialLevers || { cap: 0, timeToCash: [], duracion: [], velocidad: [] }, cfg.abonoDescuentoPct),
	};
}

// Reemplaza cada bloque <!-- AUTO:id:start -->…<!-- AUTO:id:end --> por su contenido.
export function applyDocBlocks(doc, blocks) {
	let out = doc;
	for (const [id, content] of Object.entries(blocks)) {
		const start = `<!-- AUTO:${id}:start -->`;
		const end = `<!-- AUTO:${id}:end -->`;
		const re = new RegExp(`${start}[\\s\\S]*?${end}`);
		if (re.test(out)) out = out.replace(re, `${start}\n${content}\n${end}`);
	}
	return out;
}
