// ─── Edge Function · import-pipeline ────────────────────────────────────────
// Lee el Sheet "DB Empresas" (Sales Pipeline V2) con una cuenta de servicio de
// Google (el Sheet queda 100% privado) y hace upsert de las empresas en la tabla
// `clients` de Supabase, usando `empresa_id` (LK-E-2026-XXXX) como clave.
//
// La dispara el botón "Importar del Sheet" de la cotizadora vía
// supabase.functions.invoke("import-pipeline"). El JWT del usuario viaja en el
// header Authorization y `verify_jwt` (default) rechaza llamadas anónimas, así que
// solo un usuario logueado puede importar.
//
// Setup completo (secrets, cuenta de servicio, deploy): docs/sync-pipeline-sheet.md
//
// Secrets que necesita (supabase secrets set …):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL   email de la cuenta de servicio
//   GOOGLE_PRIVATE_KEY             private key PEM de la cuenta de servicio
//   PIPELINE_SHEET_ID             id del Sheet (…/d/<ESTO>/edit)
//   PIPELINE_SHEET_RANGE          rango A1 con nombre de pestaña, ej. "DB Empresas"
// Inyectados por Supabase automáticamente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...CORS, "Content-Type": "application/json" },
	});
}

// ─── Google service account → access token (RS256, sin dependencias) ─────────
function b64url(input: ArrayBuffer | string): string {
	const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToPkcs8(pem: string): ArrayBuffer {
	// Las secrets guardan el PEM con \n literales o reales; normalizamos ambos.
	const normalized = pem.replace(/\\n/g, "\n");
	const body = normalized
		.replace(/-----BEGIN PRIVATE KEY-----/, "")
		.replace(/-----END PRIVATE KEY-----/, "")
		.replace(/\s+/g, "");
	const raw = atob(body);
	const buf = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
	return buf.buffer;
}

async function getGoogleAccessToken(email: string, privateKeyPem: string): Promise<string> {
	const now = Math.floor(Date.now() / 1000);
	const header = { alg: "RS256", typ: "JWT" };
	const claims = {
		iss: email,
		scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
		aud: "https://oauth2.googleapis.com/token",
		iat: now,
		exp: now + 3600,
	};
	const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;

	const key = await crypto.subtle.importKey(
		"pkcs8",
		pemToPkcs8(privateKeyPem),
		{ name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
	const assertion = `${unsigned}.${b64url(sig)}`;

	const res = await fetch("https://oauth2.googleapis.com/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
			assertion,
		}),
	});
	if (!res.ok) {
		const detail = await res.text();
		throw new Error(`Google token error (${res.status}): ${detail}`);
	}
	const data = await res.json();
	return data.access_token as string;
}

async function readSheet(token: string, sheetId: string, range: string): Promise<string[][]> {
	const url =
		`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values/` +
		`${encodeURIComponent(range)}?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE`;
	const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
	if (!res.ok) {
		const detail = await res.text();
		throw new Error(`Sheets API error (${res.status}): ${detail}`);
	}
	const data = await res.json();
	return (data.values || []) as string[][];
}

// ─── Mapeos Sheet → cotizadora ──────────────────────────────────────────────
// El `tipo` del Sheet (Cliente / Distribuidor / Partner / Interno) determina el
// tipo de cliente de la cotizadora (DIR/DIS/PAR) y el canal de pricing por defecto.
function mapTipo(pipelineTipo: string): string {
	const t = (pipelineTipo || "").trim().toLowerCase();
	if (t.startsWith("distribu")) return "DIS";
	if (t.startsWith("partner")) return "PAR";
	return "DIR"; // Cliente, Interno, vacío → cliente directo
}

function mapChannel(pipelineTipo: string): string {
	const t = (pipelineTipo || "").trim().toLowerCase();
	if (t.startsWith("distribu") || t.startsWith("partner")) return "distribuidores";
	return "web";
}

function normalizeName(name: string): string {
	return (name || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "") // saca tildes
		.replace(/[.,()]/g, " ")
		.replace(/\b(s\.?a\.?s?\.?u?\.?|s\.?r\.?l\.?|sau|srl|sas|sa)\b/g, "") // sufijos societarios
		.replace(/\s+/g, " ")
		.trim();
}

// Del texto libre de `notas` extrae razón social y CUIT cuando están embebidos
// con el patrón "Razón social: …" / "CUIT: NN-NNNNNNNN-N".
function parseFromNotas(notas: string): { razonSocial: string | null; cuit: string | null } {
	const out: { razonSocial: string | null; cuit: string | null } = { razonSocial: null, cuit: null };
	if (!notas) return out;
	const rs = notas.match(/raz[oó]n\s+social\s*:\s*(.+)/i);
	if (rs) out.razonSocial = rs[1].split("\n")[0].trim();
	const cuit = notas.match(/cuit\s*:\s*([\d]{2}-?\d{7,8}-?\d)/i);
	if (cuit) out.cuit = cuit[1].trim();
	return out;
}

function toNumber(v: unknown): number | null {
	if (v == null || v === "") return null;
	const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
	return Number.isFinite(n) ? n : null;
}

Deno.serve(async (req: Request) => {
	if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
	if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

	try {
		const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
		const privateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
		const sheetId = Deno.env.get("PIPELINE_SHEET_ID");
		const range = Deno.env.get("PIPELINE_SHEET_RANGE") || "DB Empresas";
		const supabaseUrl = Deno.env.get("SUPABASE_URL");
		const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

		const missing = [
			["GOOGLE_SERVICE_ACCOUNT_EMAIL", email],
			["GOOGLE_PRIVATE_KEY", privateKey],
			["PIPELINE_SHEET_ID", sheetId],
			["SUPABASE_URL", supabaseUrl],
			["SUPABASE_SERVICE_ROLE_KEY", serviceKey],
		].filter(([, v]) => !v).map(([k]) => k);
		if (missing.length) {
			return json({ error: `Faltan secrets: ${missing.join(", ")}. Ver docs/sync-pipeline-sheet.md` }, 500);
		}

		// 1. Leer el Sheet.
		const token = await getGoogleAccessToken(email!, privateKey!);
		const rows = await readSheet(token, sheetId!, range);
		if (rows.length < 2) return json({ error: "El Sheet no tiene filas de datos" }, 422);

		// 2. Mapear encabezados (case-insensitive) a índices de columna.
		const header = rows[0].map((h) => String(h || "").trim().toLowerCase());
		const col = (name: string) => header.indexOf(name);
		const idx = {
			empresaId: col("empresa_id"),
			empresa: col("empresa"),
			etapa: col("etapa"),
			probabilidad: col("probabilidad"),
			industria: col("industria"),
			tipo: col("tipo"),
			dri: col("dri"),
			tag: col("tag"),
			origen: col("origen"),
			notas: col("notas"),
			cuit: col("cuit"),                 // opcional (si algún día agregás la columna)
			razonSocial: col("razon_social"),  // opcional
		};
		if (idx.empresaId < 0 || idx.empresa < 0) {
			return json({ error: "El Sheet debe tener las columnas 'empresa_id' y 'empresa'" }, 422);
		}

		// 3. Estado actual de `clients` para reconciliar (evitar duplicados).
		const supabase = createClient(supabaseUrl!, serviceKey!);
		const { data: existing, error: readErr } = await supabase
			.from("clients")
			.select("id, name, empresa_id");
		if (readErr) return json({ error: `No pude leer clients: ${readErr.message}` }, 500);

		const byEmpresaId = new Map<string, { id: string }>();
		const manualByName = new Map<string, { id: string }>(); // solo clientes sin empresa_id
		for (const c of existing || []) {
			if (c.empresa_id) byEmpresaId.set(String(c.empresa_id), { id: c.id });
			else manualByName.set(normalizeName(c.name), { id: c.id });
		}

		const cell = (row: string[], i: number) => (i >= 0 && i < row.length ? String(row[i] ?? "").trim() : "");
		const nowIso = new Date().toISOString();

		const summary = { total: 0, insertados: 0, actualizados: 0, adoptados: 0, omitidos: 0, errores: [] as string[] };

		for (let r = 1; r < rows.length; r++) {
			const row = rows[r];
			const empresaId = cell(row, idx.empresaId);
			const empresa = cell(row, idx.empresa);
			if (!empresaId || !empresa || empresa === "(Sin empresa)") { summary.omitidos++; continue; }
			summary.total++;

			const pipelineTipo = cell(row, idx.tipo);
			const notas = cell(row, idx.notas);
			const parsed = parseFromNotas(notas);
			const razonSocial = cell(row, idx.razonSocial) || parsed.razonSocial;
			const cuit = cell(row, idx.cuit) || parsed.cuit;

			const record = {
				empresa_id: empresaId,
				name: empresa,
				razon_social: razonSocial || null,
				cuit: cuit || null,
				tipo: mapTipo(pipelineTipo),
				tipo_pipeline: pipelineTipo || null,
				channel: mapChannel(pipelineTipo),
				etapa: cell(row, idx.etapa) || null,
				probabilidad: toNumber(row[idx.probabilidad]),
				industria: cell(row, idx.industria) || null,
				dri: cell(row, idx.dri) || null,
				tag: cell(row, idx.tag) || null,
				origen: cell(row, idx.origen) || null,
				notas: notas || null,
				pipeline_synced_at: nowIso,
			};

			try {
				const existingById = byEmpresaId.get(empresaId);
				const adopted = !existingById ? manualByName.get(normalizeName(empresa)) : null;

				if (existingById) {
					// Ya vinculado: actualizar. No pisamos `channel` para no romper un
					// canal ajustado a mano; el resto de los datos del pipeline sí.
					const { channel: _c, ...upd } = record;
					const { error } = await supabase.from("clients").update(upd).eq("id", existingById.id);
					if (error) throw error;
					summary.actualizados++;
				} else if (adopted) {
					// Cliente manual con el mismo nombre: lo adoptamos (le ponemos el
					// empresa_id y los datos) en vez de crear un duplicado. Conserva sus
					// deals porque mantenemos su `id`.
					const { error } = await supabase.from("clients").update(record).eq("id", adopted.id);
					if (error) throw error;
					manualByName.delete(normalizeName(empresa));
					summary.adoptados++;
				} else {
					const { error } = await supabase
						.from("clients")
						.insert({ certs_activos: 0, ...record });
					if (error) throw error;
					summary.insertados++;
				}
			} catch (e) {
				summary.errores.push(`${empresaId} (${empresa}): ${(e as Error).message}`);
			}
		}

		return json({ ok: true, ...summary });
	} catch (e) {
		return json({ error: (e as Error).message }, 500);
	}
});
