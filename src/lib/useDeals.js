import { useState, useEffect, useCallback } from "react";
import { supabase, loadConfig } from "./supabase";

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

	const save = useCallback(async function (deal, clientId) {
		const row = {
			id: deal.id,
			client_id: clientId || null,
			channel: deal.channel,
			fecha: deal.fecha,
			updated_at: deal.updatedAt || null,
			inputs: deal.inputs,
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
	}, []);

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

	return { deals, quotes, loading, migrated, save, remove, updateStatus, updateSlideUrl, refetch: fetchDeals };
}
