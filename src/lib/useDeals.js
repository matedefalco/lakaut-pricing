import { useState, useEffect, useCallback } from "react";
import { supabase, loadConfig, saveConfig } from "./supabase";
import { maxCotNumber, maxCotVersion } from "./cotId";
import { isVolumen } from "@/data/channelMeta";

const COT_COUNTER_KEY = "cot_last_number";

// Próximo correlativo global. Se lee en vivo desde la DB (no del estado local,
// para evitar valores stale y carreras) combinando el high-water de app_config
// con el mayor número ya usado en deals; el que sea mayor, +1. Persiste el nuevo
// high-water. Ver [[cotId]].
async function nextCotNumber() {
	const hw = Number(await loadConfig(COT_COUNTER_KEY)) || 0;
	const { data } = await supabase.from("deals").select("inputs");
	const maxExisting = maxCotNumber(data || []);
	const next = Math.max(hw, maxExisting) + 1;
	await saveConfig(COT_COUNTER_KEY, next);
	return next;
}

// Resuelve el bloque `cot` (correlativo + versión + tipo) al guardar: preserva
// el existente (del deal entrante o del registro previo) y solo asigna un
// correlativo nuevo cuando la cotización todavía no tiene. El tipo se refresca
// desde el cliente (`clientTipo`) si viene.
async function resolveCot(deal, existing, clientTipo) {
	const prevCot = (deal.inputs && deal.inputs.cot) || (existing && existing.inputs && existing.inputs.cot) || null;
	// Volumen fuerza el código "SDK" (integra por SDK), sin importar el tipo del cliente.
	const volTipo = isVolumen(deal.channel) ? "SDK" : null;
	if (prevCot && prevCot.number != null) {
		return { number: prevCot.number, version: prevCot.version || 1, tipo: volTipo || clientTipo || prevCot.tipo || null };
	}
	const number = await nextCotNumber();
	return { number: number, version: 1, tipo: volTipo || clientTipo || null };
}

function normalize(deal) {
	return Object.assign({}, deal, {
		clientName: deal.clients ? deal.clients.name : "(sin nombre)",
		status: (deal.resumen && deal.resumen.status) || "pendiente",
	});
}

export function useDeals() {
	const [deals, setDeals] = useState([]);
	const [loading, setLoading] = useState(true);
	const [migrated, setMigrated] = useState(false);

	async function fetchDeals() {
		const { data, error } = await supabase
			.from("deals")
			.select("*, clients(id, name, channel, certs_activos)")
			.order("fecha", { ascending: false });
		if (!error && data) setDeals(data.map(normalize));
		setLoading(false);
	}

	// Migrate legacy channel_quotes from app_config → deals table (runs once)
	useEffect(function () {
		async function migrate() {
			const { count } = await supabase
				.from("deals")
				.select("*", { count: "exact", head: true });
			// Only migrate if deals table is empty
			if (count > 0) { setMigrated(true); return; }

			const old = await loadConfig("channel_quotes");
			if (!Array.isArray(old) || old.length === 0) { setMigrated(true); return; }

			// Group by clientName+channel → create clients first
			const clientMap = {};
			for (const q of old) {
				if (!q.channel || q.channel === "web") continue;
				const key = (q.clientName || "(sin nombre)") + "|" + q.channel;
				if (!clientMap[key]) {
					const { data } = await supabase
						.from("clients")
						.insert({
							name: q.clientName || "(sin nombre)",
							channel: q.channel,
							certs_activos: q.inputs?.certsActivos || 0,
						})
						.select()
						.single();
					if (data) clientMap[key] = data.id;
				}
				await supabase.from("deals").upsert({
					id: q.id,
					client_id: clientMap[key] || null,
					channel: q.channel,
					fecha: q.fecha,
					updated_at: q.updatedAt || null,
					inputs: q.inputs,
					resumen: q.resumen,
					slide_url: null,
				}, { onConflict: "id" });
			}
			setMigrated(true);
		}

		migrate().then(fetchDeals);
	}, []);

	const save = useCallback(async function (deal, clientId, clientTipo) {
		const existing = deals.find(function (d) { return d.id === deal.id; });
		const cot = await resolveCot(deal, existing, clientTipo);
		const row = {
			id: deal.id,
			client_id: clientId || null,
			channel: deal.channel,
			fecha: deal.fecha,
			updated_at: deal.updatedAt || null,
			inputs: Object.assign({}, deal.inputs, { cot: cot }),
			resumen: deal.resumen,
			slide_url: deal.slideUrl || null,
		};
		const { data, error } = await supabase
			.from("deals")
			.upsert(row, { onConflict: "id" })
			.select("*, clients(id, name, channel, certs_activos)")
			.single();
		if (!error && data) {
			const norm = normalize(data);
			setDeals(function (prev) {
				const exists = prev.some(function (d) { return d.id === deal.id; });
				if (exists) return prev.map(function (d) { return d.id === deal.id ? norm : d; });
				return [norm].concat(prev);
			});
			return norm;
		}
		console.error("useDeals.save error:", error);
		return null;
	}, [deals]);

	// Clona una cotización como versión nueva (mismo correlativo, v+1, id nuevo),
	// dejando la anterior intacta como historial. El estado arranca en pendiente.
	const newVersion = useCallback(async function (deal, clientId, clientTipo) {
		const baseCot = (deal.inputs && deal.inputs.cot) || null;
		const number = baseCot && baseCot.number != null ? baseCot.number : await nextCotNumber();
		const version = maxCotVersion(deals, number) + 1;
		const tipo = isVolumen(deal.channel) ? "SDK" : (clientTipo || (baseCot && baseCot.tipo) || null);
		const newId = Date.now().toString(36);
		const nextResumen = Object.assign({}, deal.resumen);
		delete nextResumen.status;
		const row = {
			id: newId,
			client_id: clientId || null,
			channel: deal.channel,
			fecha: new Date().toISOString(),
			updated_at: null,
			inputs: Object.assign({}, deal.inputs, { cot: { number: number, version: version, tipo: tipo } }),
			resumen: nextResumen,
			slide_url: null,
		};
		const { data, error } = await supabase
			.from("deals")
			.upsert(row, { onConflict: "id" })
			.select("*, clients(id, name, channel, certs_activos)")
			.single();
		if (!error && data) {
			const norm = normalize(data);
			setDeals(function (prev) { return [norm].concat(prev); });
			return norm;
		}
		console.error("useDeals.newVersion error:", error);
		return null;
	}, [deals]);

	const remove = useCallback(async function (id) {
		const { error, count } = await supabase.from("deals").delete({ count: "exact" }).eq("id", id);
		if (error) {
			console.error("useDeals.remove error:", error);
			alert("No se pudo borrar la cotización: " + (error.message || "error desconocido"));
			return;
		}
		if (count === 0) {
			console.warn("useDeals.remove: Supabase no borró ningún registro (RLS o id inválido):", id);
			alert("No se pudo borrar la cotización (sin permisos o registro no encontrado).");
			return;
		}
		setDeals(function (prev) { return prev.filter(function (d) { return d.id !== id; }); });
	}, []);

	// El status no tiene columna propia: vive en resumen.status. Se relee resumen
	// desde la DB antes de mergear para no pisar otros campos con estado stale.
	const updateStatus = useCallback(async function (id, status) {
		const { data: current, error: fetchErr } = await supabase
			.from("deals")
			.select("resumen")
			.eq("id", id)
			.single();
		if (fetchErr) {
			console.error("useDeals.updateStatus fetch error:", fetchErr);
			return null;
		}
		const nextResumen = Object.assign({}, current?.resumen, { status });
		const { data, error } = await supabase
			.from("deals")
			.update({ resumen: nextResumen })
			.eq("id", id)
			.select("*, clients(id, name, channel, certs_activos)")
			.single();
		if (!error && data) {
			const norm = normalize(data);
			setDeals(function (prev) { return prev.map(function (d) { return d.id === id ? norm : d; }); });
			return norm;
		}
		console.error("useDeals.updateStatus error:", error);
		return null;
	}, []);

	const updateSlideUrl = useCallback(async function (id, slideUrl) {
		const { data, error } = await supabase
			.from("deals")
			.update({ slide_url: slideUrl })
			.eq("id", id)
			.select("*, clients(id, name, channel, certs_activos)")
			.single();
		if (!error && data) {
			const norm = normalize(data);
			setDeals(function (prev) { return prev.map(function (d) { return d.id === id ? norm : d; }); });
		}
	}, []);

	// Backwards-compat alias so old refs to quotesApi.quotes still work
	const quotes = deals;

	return { deals, quotes, loading, migrated, save, newVersion, remove, updateStatus, updateSlideUrl, refetch: fetchDeals };
}
