#!/usr/bin/env node
// One-off: publica DEFAULT_MODELS en la config viva de Supabase (app_config key "models").
// Antes de sobrescribir, hace backup del valor actual en scripts/_backup-models-<ts>.json.
// Uso: node scripts/push-models.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_MODELS } from "../src/data/defaultModels.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ENV_PATH = join(ROOT, ".env");

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

async function main() {
	const env = loadEnv();
	const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

	const { data: current } = await sb.from("app_config").select("value").eq("key", "models").single();
	if (current && current.value) {
		const backup = join(__dirname, `_backup-models-${Date.now()}.json`);
		writeFileSync(backup, JSON.stringify(current.value, null, 2));
		console.log(`↳ backup del catálogo actual en ${backup} (${Array.isArray(current.value) ? current.value.length : "?"} planes)`);
	} else {
		console.log("↳ no había catálogo previo en Supabase (o vacío).");
	}

	const { error } = await sb.from("app_config").upsert(
		{ key: "models", value: DEFAULT_MODELS, updated_at: new Date().toISOString() },
		{ onConflict: "key" }
	);
	if (error) { console.error("✖ upsert falló:", error.message); process.exit(1); }
	console.log(`✓ catálogo publicado en Supabase: ${DEFAULT_MODELS.length} planes → ${DEFAULT_MODELS.map((m) => m.label).join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
