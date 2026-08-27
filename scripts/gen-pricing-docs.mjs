#!/usr/bin/env node
// ─── Generador de documentación del modelo comercial ──────────────────────────
// Reconstruye las tablas numéricas de docs/modelo-comercial.md a partir de los
// VALORES EFECTIVOS de la cotizadora:
//   1. Lee la config viva desde Supabase (app_config) — la misma que edita la
//      interfaz de Config y la que persiste Claude Code al tocar el código.
//   2. Aplica el mismo normalize/migración que la app (channelConfigNormalize.js),
//      así la doc reproduce exactamente lo que el cotizador usa.
//   3. Reemplaza SOLO los bloques marcados <!-- AUTO:*:start/end -->; la prosa
//      escrita a mano entre bloques no se toca.
// Si Supabase no responde (offline / sin credenciales), cae a los defaults del
// código y lo deja marcado en la doc para que nadie confunda un default con lo vivo.
//
// Uso:  npm run docs:pricing        (regenera en su lugar)
//       node scripts/gen-pricing-docs.mjs --check   (falla si la doc quedó desfasada)

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import { normalizeChannelConfig, DEFAULT_CHANNEL_CONFIG } from "../src/lib/channelConfigNormalize.js";
import { DEFAULT_MODELS } from "../src/data/defaultModels.js";
import { VOLUMEN_BASE } from "../src/data/channels.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DOC_PATH = join(ROOT, "docs", "modelo-comercial.md");
const ENV_PATH = join(ROOT, ".env");
const CHECK = process.argv.includes("--check");

// ── Env ──────────────────────────────────────────────────────────────────────
function loadEnv() {
	const out = {};
	if (!existsSync(ENV_PATH)) return out;
	for (const line of readFileSync(ENV_PATH, "utf8").split("\n")) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
		if (!m) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
		out[m[1]] = v;
	}
	return out;
}

// ── Supabase ───────────────────────────────────────────────────────────────────
async function fetchConfig(sb, key) {
	const { data, error } = await sb.from("app_config").select("value").eq("key", key).single();
	if (error || !data) return null;
	return data.value;
}

// ── Formato ────────────────────────────────────────────────────────────────────
const nfInt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
function num(n) { return nfInt.format(Number(n) || 0); }
function usd(n, min = 2, max = 4) {
	return new Intl.NumberFormat("es-AR", { minimumFractionDigits: min, maximumFractionDigits: max }).format(Number(n) || 0);
}
function pct(fraction) {
	// fraction = 0.05 → "5%"; puntos ya en % (>1) se dejan como están.
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

// ── Secciones auto-generadas ────────────────────────────────────────────────────
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

function secDistribuidores(tiers) {
	const rows = tiers.map((t) =>
		`| ${t.label} | ${pct(t.descuento)} | ${rangeCant(t.certsMin, t.certsMax)} | ${rangeUSD(t.compromisoMin, t.compromisoMax)} |`
	);
	return [
		"El nivel se asigna por el **mayor** que resulte entre dos variables declaradas del socio: certificados activos que Lakaut le administra, y compromiso anual de facturación en USD. El descuento aplica sobre la **lista web** (packs).",
		"",
		"| Nivel | Descuento sobre lista | Certificados activos | Compromiso anual |",
		"|---|---|---|---|",
		...rows,
	].join("\n");
}

function secDistribuidoresVol(tiers, base) {
	const rows = tiers.map((t) =>
		`| ${t.label} | ${pct(t.descuento)} | ${rangeCant(t.firmasMin, t.firmasMax, "firmas")} |`
	);
	return [
		`Misma mecánica de elementos sueltos que el canal Volumen (base cert USD ${usd(base.cert)} / firma USD ${usd(base.firma)}), pero el nivel lo asigna el **volumen real de firmas** de la cotización. Escala más conservadora que la de packs porque el descuento pega sobre el precio por elemento, que está cerca del costo.`,
		"",
		"| Nivel | Descuento sobre base | Rango de firmas |",
		"|---|---|---|",
		...rows,
	].join("\n");
}

function secIDC(segments, markupMin) {
	const rows = segments.map((s) =>
		`| ${s.label} | ${rangeCant(s.idcMin, s.idcMax, "IDC")} | USD ${usd(s.precioIDC)} | ${num(s.firmasIncluidas)} | USD ${usd(s.precioFirmaExtra)} |`
	);
	return [
		"Unidad de venta = **IDC** (Identidad Digital Certificada): bundle con biometría, emisión, custodia y firmas de activación. Es una **escala de precios**, no de descuentos: cada segmento tiene su propio precio por IDC. El segmento sale de la cantidad de IDC mensuales.",
		"",
		"| Segmento | Rango (IDC/mes) | Precio IDC/mes | Firmas incluidas | Firma extra |",
		"|---|---|---|---|---|",
		...rows,
		"",
		`Guardarraíl de rentabilidad: markup mínimo **${usd(markupMin, 2, 2)}x** sobre el costo variable del bundle. Bajo ese piso el cotizador bloquea guardar y exportar.`,
	].join("\n");
}

function secVolumen(base, segments) {
	const rows = segments.map((s) =>
		`| ${s.label} | ${rangeUSD(s.compromisoMin, s.compromisoMax)} | ${pct(s.descuento)} |`
	);
	return [
		`Certificados y firmas como items independientes, sin bundle. Precio base: **cert USD ${usd(base.cert)} / firma USD ${usd(base.firma)}**. El segmento lo define el **compromiso total del contrato en USD** (a precio de lista), y aplica el mismo descuento sobre cert y firma.`,
		"",
		"| Segmento | Compromiso anual (USD) | Descuento |",
		"|---|---|---|",
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
	function lever(name, list) {
		return list.map((o) => `${o.value === 0 ? "contado" : o.value} → ${pct(o.discount)}`).join(" · ");
	}
	return [
		`Descuentos adicionales (aditivos) sobre el subtotal de servicio, aplicables en Volumen y Distribuidores. Tope de la suma de las tres: **${pct(levers.cap)}**.`,
		"",
		"| Palanca | Opciones (valor → descuento) |",
		"|---|---|",
		`| Time-to-cash (días de pago) | ${lever("ttc", levers.timeToCash)} |`,
		`| Duración del contrato (meses) | ${lever("dur", levers.duracion)} |`,
		`| Velocidad de cierre (días) | ${lever("vel", levers.velocidad)} |`,
		"",
		`Descuento del abono mensual (reposición de bolsa de firmas): **${pct(abono)}**. Se mantiene bajo a propósito: el beneficio principal lo da el volumen, no la recurrencia.`,
	].join("\n");
}

// ── Ensamblado ───────────────────────────────────────────────────────────────
function replaceBlock(doc, id, content) {
	const start = `<!-- AUTO:${id}:start -->`;
	const end = `<!-- AUTO:${id}:end -->`;
	const re = new RegExp(`${start}[\\s\\S]*?${end}`);
	const block = `${start}\n${content}\n${end}`;
	if (!re.test(doc)) {
		console.warn(`⚠️  Bloque AUTO:${id} no encontrado en la doc; se omite.`);
		return doc;
	}
	return doc.replace(re, block);
}

function gitShort() {
	try { return execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim(); }
	catch { return "sin-git"; }
}

async function main() {
	const env = loadEnv();
	const url = env.VITE_SUPABASE_URL;
	const key = env.VITE_SUPABASE_ANON_KEY;

	let source = "código (defaults)";
	let channelRaw = null;
	let models = DEFAULT_MODELS;
	let tc = null;

	if (url && key) {
		try {
			const sb = createClient(url, key);
			const [ch, md, tcCfg] = await Promise.all([
				fetchConfig(sb, "channelConfig"),
				fetchConfig(sb, "models"),
				fetchConfig(sb, "tcConfig"),
			]);
			if (ch || md) source = "Supabase (config viva)";
			channelRaw = ch;
			if (Array.isArray(md) && md.length > 0) models = md;
			if (tcCfg && tcCfg.tc) tc = Number(tcCfg.tc);
		} catch (e) {
			console.warn("⚠️  No se pudo leer Supabase, uso defaults del código:", e.message);
		}
	} else {
		console.warn("⚠️  Sin VITE_SUPABASE_URL/ANON_KEY en .env; uso defaults del código.");
	}

	const cfg = channelRaw ? normalizeChannelConfig(channelRaw) : DEFAULT_CHANNEL_CONFIG;
	const base = cfg.volumenBase || VOLUMEN_BASE;

	const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
	const meta = [
		`> **Última actualización:** ${stamp} · **Fuente:** ${source} · **Commit:** \`${gitShort()}\``,
		">",
		"> Esta sección se genera automáticamente con `npm run docs:pricing`. No editar a mano las tablas dentro de los bloques `AUTO:*`; sí se puede editar la prosa entre bloques.",
	].join("\n");

	if (!existsSync(DOC_PATH)) {
		console.error(`✖ No existe ${DOC_PATH}. Creá el archivo con los marcadores AUTO primero.`);
		process.exit(1);
	}

	let doc = readFileSync(DOC_PATH, "utf8");
	const before = doc;
	doc = replaceBlock(doc, "meta", meta);
	doc = replaceBlock(doc, "web", secWeb(models, tc));
	doc = replaceBlock(doc, "distribuidores", secDistribuidores(cfg.distributorTiers));
	doc = replaceBlock(doc, "distribuidores-vol", secDistribuidoresVol(cfg.distribuidorVolTiers, base));
	doc = replaceBlock(doc, "idc", secIDC(cfg.b2b2cSegments, cfg.b2b2cMarkupMin));
	doc = replaceBlock(doc, "volumen", secVolumen(base, cfg.volumenSegments));
	doc = replaceBlock(doc, "proyeccion", secProyeccion(cfg.volumenProyeccion, base));
	doc = replaceBlock(doc, "fees", secFees(cfg.b2b2cApiTiers));
	doc = replaceBlock(doc, "sla", secSLA(cfg.slaPlans));
	doc = replaceBlock(doc, "palancas", secPalancas(cfg.commercialLevers, cfg.abonoDescuentoPct));

	if (CHECK) {
		// En --check ignoramos el timestamp (siempre cambia) comparando el resto.
		const strip = (s) => s.replace(/<!-- AUTO:meta:start -->[\s\S]*?<!-- AUTO:meta:end -->/, "");
		if (strip(before) !== strip(doc)) {
			console.error("✖ docs/modelo-comercial.md está desactualizada. Corré: npm run docs:pricing");
			process.exit(1);
		}
		console.log("✓ Documentación al día.");
		return;
	}

	writeFileSync(DOC_PATH, doc);
	console.log(`✓ docs/modelo-comercial.md regenerada · fuente: ${source}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
