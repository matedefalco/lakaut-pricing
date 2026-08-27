#!/usr/bin/env node
// ─── Generador de documentación del modelo comercial ──────────────────────────
// Reconstruye las tablas numéricas de docs/modelo-comercial.md a partir de los
// VALORES EFECTIVOS de la cotizadora:
//   1. Lee la config viva desde Supabase (app_config) — la misma que edita la
//      interfaz de Config y la que persiste Claude Code al tocar el código.
//   2. Aplica el mismo normalize/migración que la app (channelConfigNormalize.js)
//      y arma las tablas con los builders compartidos (pricingDocSections.js), que
//      son EXACTAMENTE los mismos que usa la doc in-app. Así la doc del repo y la
//      de la app salen idénticas de una sola fuente.
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
import { buildDocBlocks, applyDocBlocks } from "../src/lib/pricingDocSections.js";

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

async function fetchConfig(sb, key) {
	const { data, error } = await sb.from("app_config").select("value").eq("key", key).single();
	if (error || !data) return null;
	return data.value;
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

	const channelConfig = channelRaw ? normalizeChannelConfig(channelRaw) : DEFAULT_CHANNEL_CONFIG;

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

	const before = readFileSync(DOC_PATH, "utf8");
	const blocks = Object.assign({ meta }, buildDocBlocks({ channelConfig, models, tc }));
	const doc = applyDocBlocks(before, blocks);

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
