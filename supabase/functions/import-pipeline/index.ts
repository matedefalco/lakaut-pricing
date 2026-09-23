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
//   TYPESAFE_API_KEY              (opcional) mejora extracción de razón social / CUIT desde notas
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

// Único lugar donde una fila trae el `channel` completo en cada upsert en lote
// (antes, un `UPDATE` que omitía la columna nunca revalidaba un valor viejo
// guardado en `clients`; el upsert en lote sí, así que un valor legado inválido
// rompe la constraint `clients_channel_check` en cada corrida). Filtrar acá
// evita propagar basura histórica en vez de recalcularla.
const CHANNELS_VALIDOS = new Set(["web", "distribuidores", "b2b2c", "volumen"]);

function mapChannel(pipelineTipo: string): string {
	const t = (pipelineTipo || "").trim().toLowerCase();
	if (t.startsWith("distribu") || t.startsWith("partner")) return "distribuidores";
	return "web";
}

// Canal de cotización explícito desde la columna `canal` del Sheet (autoridad).
// Devuelve el código interno de la cotizadora o null si la celda está vacía/rara
// (en ese caso se cae al mapeo por `tipo`, sin pisar un canal ya seteado).
function channelFromCanal(canalRaw: string): string | null {
	const c = (canalRaw || "").trim().toLowerCase();
	if (!c) return null;
	if (c.startsWith("distribu")) return "distribuidores";
	if (c.startsWith("b2b2c") || c.includes("idc")) return "b2b2c";
	if (c.startsWith("vol")) return "volumen";
	if (c.startsWith("web") || c.startsWith("integ") || c.startsWith("direct")) return "web";
	return null;
}

// Tipo de cliente (DIR/DIS/PAR) derivado del canal + el tipo del pipeline.
// Distribuidores → DIS; el resto respeta Partner si viene, si no queda directo.
// (Volumen igual muestra "SDK" en el ID de cotización por el canal, ver cotId.)
function tipoDesdeCanal(channel: string, pipelineTipo: string): string {
	if (channel === "distribuidores") return "DIS";
	return mapTipo(pipelineTipo) === "PAR" ? "PAR" : "DIR";
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

/**
 * Versión mejorada de parseFromNotas(): cuando el regex estricto no encuentra
 * razón social o CUIT, pre-extrae candidatos permisivos y usa TypeSafe Choice
 * para seleccionar el correcto. No genera texto libre — solo elige entre spans
 * que ya existen en el campo `notas`. Requiere TYPESAFE_API_KEY.
 */
async function extractFromNotas(
	notas: string,
	apiKey: string,
): Promise<{ razonSocial: string | null; cuit: string | null }> {
	const existing = parseFromNotas(notas);
	// Fast path: regex encontró todo, o no hay API key, o texto muy corto.
	if ((existing.razonSocial && existing.cuit) || !apiKey || notas.trim().length < 15) {
		return existing;
	}

	// Pre-extraer candidatos con regex permisivo (sobreencuentra; TypeSafe elige).
	const cuitCandidates = existing.cuit
		? []
		: [...new Set((notas.match(/\d{2}-?\d{7,8}-?\d/g) ?? []))];

	const rsCandidates = existing.razonSocial
		? []
		: [
				...new Set(
					(notas.match(
						/[A-ZÁÉÍÓÚÑ][A-Za-záéíóúñÁÉÍÓÚÑ\s.]{2,50}?\s+(?:S\.?A\.?S?\.?U?\.?|S\.?R\.?L\.?U?\.?|SAU|SAS|SRL|SA)\b/g,
					) ?? []),
				),
			];

	const questions: Record<string, unknown> = {};

	if (cuitCandidates.length > 0) {
		const criteria = Object.fromEntries(cuitCandidates.map((c) => [c, `Tax ID: ${c}`]));
		criteria["__ninguno__"] = "No CUIT / tax ID appears in these notes";
		questions["cuit"] = {
			type: "choice",
			instructions: "Which of these is the CUIT (Argentine tax ID) of the company mentioned in `notes`?",
			criteria,
		};
	}

	if (rsCandidates.length > 0) {
		const criteria = Object.fromEntries(rsCandidates.map((c) => [c, c]));
		criteria["__ninguna__"] = "No legal business name (razón social) appears in these notes";
		questions["razon_social"] = {
			type: "choice",
			instructions: "Which of these is the legal business name (razón social) of the client mentioned in `notes`?",
			criteria,
		};
	}

	if (Object.keys(questions).length === 0) return existing;

	try {
		const resp = await fetch("https://api.typesafe.ai/v1/systemone", {
			method: "POST",
			headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
			body: JSON.stringify({ model: "jev-latest", state: { notes: notas }, questions }),
		});
		if (!resp.ok) return existing;
		const data = await resp.json();
		const a = (data.answers ?? {}) as Record<string, { choice?: string; confidence?: number }>;
		const result = { ...existing };
		if (a.cuit?.choice && a.cuit.choice !== "__ninguno__" && (a.cuit.confidence ?? 0) >= 0.7) {
			result.cuit = a.cuit.choice;
		}
		if (
			a.razon_social?.choice &&
			a.razon_social.choice !== "__ninguna__" &&
			(a.razon_social.confidence ?? 0) >= 0.7
		) {
			result.razonSocial = a.razon_social.choice;
		}
		return result;
	} catch {
		return existing;
	}
}

// Corre `fn` sobre `items` con a lo sumo `limit` llamadas en vuelo a la vez.
async function mapWithConcurrency<T, R>(
	items: T[],
	limit: number,
	fn: (item: T, i: number) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let next = 0;
	async function worker() {
		while (next < items.length) {
			const i = next++;
			results[i] = await fn(items[i], i);
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
	return results;
}

function toNumber(v: unknown): number | null {
	if (v == null || v === "") return null;
	const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
	return Number.isFinite(n) ? n : null;
}

// Traduce el error crudo de Postgres/Supabase a un motivo accionable en español.
// El mensaje técnico igual viaja aparte (motivo_tecnico) para debug.
function motivoLegible(msg: string): string {
	const m = (msg || "").toLowerCase();
	if (m.includes("duplicate key") || m.includes("unique constraint")) {
		return "empresa_id duplicado en el Sheet (dos filas con el mismo LK-E-…)";
	}
	if (m.includes("null value") || m.includes("not-null") || m.includes("not null")) {
		return "Faltan datos obligatorios en la fila";
	}
	if (m.includes("invalid input syntax") || m.includes("invalid text representation")) {
		return "Un valor tiene formato inválido (ej. número o fecha mal cargados)";
	}
	if (m.includes("permission") || m.includes("row-level security") || m.includes("rls")) {
		return "Permisos insuficientes para guardar el registro";
	}
	return "No se pudo guardar el registro";
}

interface ImportError {
	empresa_id: string;
	empresa: string;
	motivo: string;
	motivo_tecnico: string;
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

		const typesafeKey = Deno.env.get("TYPESAFE_API_KEY") ?? "";
		// Instrumentación temporal para aislar dónde se va el tiempo/CPU en 546
		// WORKER_RESOURCE_LIMIT (ver docs/sync-pipeline-sheet.md). Sacar una vez
		// identificada la causa.
		const tStart = Date.now();
		// 1. Leer el Sheet.
		const token = await getGoogleAccessToken(email!, privateKey!);
		console.log(`[import-pipeline] token: ${Date.now() - tStart}ms`);
		const tSheet = Date.now();
		const rows = await readSheet(token, sheetId!, range);
		console.log(`[import-pipeline] sheet read: ${Date.now() - tSheet}ms, filas=${rows.length}`);
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
			canal: col("canal"),               // opcional: canal de cotización (Web/Distribuidores/B2B2C/Volumen)
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

		// 3. Estado actual de `clients` para reconciliar (evitar duplicados) y para
		// no volver a consultar TypeSafe / pisar el canal en empresas ya resueltas.
		const supabase = createClient(supabaseUrl!, serviceKey!);
		const tClients = Date.now();
		// PostgREST corta cualquier select en 1000 filas por default. Con más de 1000
		// clientes ya cargados, traer una sola página dejaba miles fuera de `byEmpresaId`,
		// que se veían como "nuevos" y el INSERT chocaba contra la unique constraint de
		// empresa_id en TODOS los lotes (546 CPU Time exceeded: cada lote fallido caía al
		// fallback fila por fila, y cada fila fallaba también). Hay que paginar con
		// `.range()` hasta traerlos todos.
		const PAGE_SIZE = 1000;
		const existing: { id: string; name: string; empresa_id: string | null; razon_social: string | null; cuit: string | null; channel: string | null }[] = [];
		for (let offset = 0; ; offset += PAGE_SIZE) {
			const { data: pagina, error: readErr } = await supabase
				.from("clients")
				.select("id, name, empresa_id, razon_social, cuit, channel")
				.range(offset, offset + PAGE_SIZE - 1);
			if (readErr) return json({ error: `No pude leer clients: ${readErr.message}` }, 500);
			existing.push(...(pagina || []));
			if (!pagina || pagina.length < PAGE_SIZE) break;
		}
		console.log(`[import-pipeline] clients select: ${Date.now() - tClients}ms, existentes=${existing.length}`);

		type ExistingClient = { id: string; razonSocial: string | null; cuit: string | null; channel: string | null };
		const byEmpresaId = new Map<string, ExistingClient>();
		const manualByName = new Map<string, ExistingClient>(); // solo clientes sin empresa_id
		for (const c of existing || []) {
			const rec: ExistingClient = {
				id: c.id,
				razonSocial: c.razon_social ?? null,
				cuit: c.cuit ?? null,
				channel: c.channel ?? null,
			};
			if (c.empresa_id) byEmpresaId.set(String(c.empresa_id), rec);
			else manualByName.set(normalizeName(c.name), rec);
		}

		const cell = (row: string[], i: number) => (i >= 0 && i < row.length ? String(row[i] ?? "").trim() : "");
		const nowIso = new Date().toISOString();

		// El Sheet trae miles de filas de relleno vacías además de las empresas reales
		// (visto: 9053 filas totales). Filtrarlas ANTES de cualquier trabajo por fila
		// (regex, TypeSafe, escrituras) es necesario para no agotar el presupuesto de
		// CPU del Edge Function con iteraciones que no hacen nada.
		let omitidos = 0;
		const dataRows = rows.slice(1).filter((row) => {
			const empresaId = cell(row, idx.empresaId);
			const empresa = cell(row, idx.empresa);
			const ok = Boolean(empresaId) && Boolean(empresa) && empresa !== "(Sin empresa)";
			if (!ok) omitidos++;
			return ok;
		});
		console.log(`[import-pipeline] filas con datos: ${dataRows.length} de ${rows.length - 1} (omitidas: ${omitidos})`);

		// Llamar a TypeSafe solo para filas que de verdad lo necesitan (Sheet, `clients`
		// y el regex estricto no resolvieron razón social/CUIT). `MAX_TYPESAFE_PER_RUN`
		// pone un tope duro por invocación; lo que quede pendiente se resuelve en la
		// próxima corrida.
		const MAX_TYPESAFE_PER_RUN = 20;
		const extraidos: { razonSocial: string | null; cuit: string | null }[] = new Array(dataRows.length);
		const pendientes: { i: number; notas: string }[] = [];

		dataRows.forEach((row, i) => {
			const notas = cell(row, idx.notas);
			const empresaId = cell(row, idx.empresaId);
			const empresa = cell(row, idx.empresa);
			const existente = byEmpresaId.get(empresaId) || manualByName.get(normalizeName(empresa));
			const porRegex = parseFromNotas(notas);
			const razonSocial = cell(row, idx.razonSocial) || existente?.razonSocial || porRegex.razonSocial || null;
			const cuit = cell(row, idx.cuit) || existente?.cuit || porRegex.cuit || null;

			extraidos[i] = { razonSocial, cuit };
			if (!(razonSocial && cuit) && pendientes.length < MAX_TYPESAFE_PER_RUN) {
				pendientes.push({ i, notas });
			}
		});

		console.log(`[import-pipeline] extracción TypeSafe: ${pendientes.length} filas pendientes de ${dataRows.length} totales`);
		const tExtract = Date.now();
		const resueltos = await mapWithConcurrency(pendientes, 6, (p) => extractFromNotas(p.notas, typesafeKey));
		console.log(`[import-pipeline] extracción TypeSafe: ${Date.now() - tExtract}ms`);
		pendientes.forEach((p, k) => {
			const base = extraidos[p.i];
			extraidos[p.i] = {
				razonSocial: base.razonSocial || resueltos[k].razonSocial,
				cuit: base.cuit || resueltos[k].cuit,
			};
		});

		// 4. Armar los registros y agruparlos para escribir EN LOTES en vez de fila por
		// fila: con miles de filas, un `insert`/`update` por fila (aunque cada uno sea
		// rápido) es lo que agotaba el presupuesto de CPU del Edge Function (546 CPU
		// Time exceeded) mucho antes de terminar de procesar el Sheet.
		type Registro = {
			empresa_id: string;
			name: string;
			razon_social: string | null;
			cuit: string | null;
			tipo: string;
			tipo_pipeline: string | null;
			channel: string;
			etapa: string | null;
			probabilidad: number | null;
			industria: string | null;
			dri: string | null;
			tag: string | null;
			origen: string | null;
			notas: string | null;
			pipeline_synced_at: string;
		};
		const paraInsertar: Registro[] = [];
		const paraActualizar: (Registro & { id: string })[] = [];
		const idsAdoptados = new Set<string>();
		const usadosManual = new Set<string>();
		const empresaIdsAInsertar = new Set<string>();
		const erroresPrevios: ImportError[] = [];

		dataRows.forEach((row, i) => {
			const empresaId = cell(row, idx.empresaId);
			const empresa = cell(row, idx.empresa);
			const pipelineTipo = cell(row, idx.tipo);
			const notas = cell(row, idx.notas);
			const parsed = extraidos[i];
			const razonSocial = cell(row, idx.razonSocial) || parsed.razonSocial;
			const cuit = cell(row, idx.cuit) || parsed.cuit;

			const existingById = byEmpresaId.get(empresaId);
			const nombreNormalizado = normalizeName(empresa);
			const adoptado = !existingById && !usadosManual.has(nombreNormalizado)
				? manualByName.get(nombreNormalizado)
				: undefined;
			const existente = existingById || adoptado;

			// El `canal` del Sheet manda solo cuando está puesto explícitamente; si esa
			// celda está vacía, se conserva el canal ya guardado (puede haberse ajustado
			// a mano) en vez de derivarlo de nuevo del `tipo` del pipeline.
			const canalExplicito = channelFromCanal(cell(row, idx.canal));
			const channelExistente = existente?.channel && CHANNELS_VALIDOS.has(existente.channel) ? existente.channel : null;
			const channel = canalExplicito || channelExistente || mapChannel(pipelineTipo);
			const tipo = canalExplicito ? tipoDesdeCanal(channel, pipelineTipo) : mapTipo(pipelineTipo);

			const record: Registro = {
				empresa_id: empresaId,
				name: empresa,
				razon_social: razonSocial || null,
				cuit: cuit || null,
				tipo,
				tipo_pipeline: pipelineTipo || null,
				channel,
				etapa: cell(row, idx.etapa) || null,
				probabilidad: toNumber(row[idx.probabilidad]),
				industria: cell(row, idx.industria) || null,
				dri: cell(row, idx.dri) || null,
				tag: cell(row, idx.tag) || null,
				origen: cell(row, idx.origen) || null,
				notas: notas || null,
				pipeline_synced_at: nowIso,
			};

			if (existingById) {
				paraActualizar.push({ ...record, id: existingById.id });
			} else if (adoptado) {
				// Cliente manual con el mismo nombre: lo adoptamos (le ponemos el
				// empresa_id y los datos) en vez de crear un duplicado. Conserva sus
				// deals porque mantenemos su `id`.
				usadosManual.add(nombreNormalizado);
				idsAdoptados.add(adoptado.id);
				paraActualizar.push({ ...record, id: adoptado.id });
			} else if (empresaIdsAInsertar.has(empresaId)) {
				// Dos filas del Sheet con el mismo empresa_id nuevo (aún no existe en
				// `clients`): insertar ambas en el mismo lote viola la unique constraint
				// y tira todo el lote entero para atrás, no solo esta fila. Se detecta acá
				// antes de mandarlo, en vez de dejar que rompa el INSERT en bloque.
				erroresPrevios.push({
					empresa_id: empresaId,
					empresa,
					motivo: "empresa_id duplicado en el Sheet (dos filas con el mismo LK-E-…)",
					motivo_tecnico: `empresa_id "${empresaId}" repetido en más de una fila nueva`,
				});
			} else {
				empresaIdsAInsertar.add(empresaId);
				paraInsertar.push(record);
			}
		});

		// Escribe `registros` en lotes de `tamanioLote`. Si un lote falla (ej. un
		// empresa_id duplicado en el Sheet), reintenta ese lote fila por fila para no
		// perder el resto por un solo registro con error, y para poder atribuir el
		// error a la fila puntual.
		async function escribirEnLotes<T extends { empresa_id: string; name: string }>(
			registros: T[],
			ejecutar: (lote: T[]) => Promise<{ error: { message: string } | null }>,
			tamanioLote: number,
		): Promise<{ exitosos: T[]; errores: ImportError[] }> {
			const exitosos: T[] = [];
			const errores: ImportError[] = [];
			for (let i = 0; i < registros.length; i += tamanioLote) {
				const lote = registros.slice(i, i + tamanioLote);
				const tLote = Date.now();
				const { error } = await ejecutar(lote);
				console.log(
					`[import-pipeline] lote ${i}-${i + lote.length}: ${Date.now() - tLote}ms${error ? ` ERROR: ${error.message}` : " ok"}`,
				);
				if (!error) {
					exitosos.push(...lote);
					continue;
				}
				for (const r of lote) {
					const { error: errFila } = await ejecutar([r]);
					if (errFila) {
						errores.push({
							empresa_id: r.empresa_id,
							empresa: r.name,
							motivo: motivoLegible(errFila.message),
							motivo_tecnico: errFila.message,
						});
					} else {
						exitosos.push(r);
					}
				}
			}
			return { exitosos, errores };
		}

		const BATCH_SIZE = 200;
		const tWrite = Date.now();
		console.log(`[import-pipeline] escritura en lotes: ${paraInsertar.length} para insertar, ${paraActualizar.length} para actualizar`);

		const resInsert = await escribirEnLotes(
			paraInsertar,
			(lote) => supabase.from("clients").insert(lote.map((r) => ({ certs_activos: 0, ...r }))),
			BATCH_SIZE,
		);
		const resUpdate = await escribirEnLotes(
			paraActualizar,
			(lote) => supabase.from("clients").upsert(lote, { onConflict: "id" }),
			BATCH_SIZE,
		);
		console.log(`[import-pipeline] escritura en lotes: ${Date.now() - tWrite}ms total`);

		const summary = {
			total: dataRows.length,
			insertados: resInsert.exitosos.length,
			actualizados: resUpdate.exitosos.filter((r) => !idsAdoptados.has(r.id)).length,
			adoptados: resUpdate.exitosos.filter((r) => idsAdoptados.has(r.id)).length,
			omitidos,
			errores: [...erroresPrevios, ...resInsert.errores, ...resUpdate.errores],
		};

		return json({ ok: true, ...summary });
	} catch (e) {
		return json({ error: (e as Error).message }, 500);
	}
});
