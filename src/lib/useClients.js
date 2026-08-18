import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase, loadConfig, saveConfig } from "./supabase";

// El "tipo" de cliente (DIS/DIR/PAR, ver [[cotId]]) no vive en una columna de la
// tabla `clients`: se guarda como un mapa { clientId: tipo } en app_config
// (`client_tipos`). Así no requiere migración de esquema. Cada cliente devuelto
// por el hook trae `.tipo` mergeado desde ese mapa.
const TIPOS_KEY = "client_tipos";

export function useClients() {
	const [rows, setRows] = useState([]);
	const [tipos, setTipos] = useState({});
	const [loading, setLoading] = useState(true);
	const [importing, setImporting] = useState(false);

	const fetchClients = useCallback(function () {
		return supabase.from("clients").select("*").order("name").then(function (res) {
			if (!res.error && res.data) setRows(res.data);
			return res;
		});
	}, []);

	useEffect(function () {
		Promise.all([
			supabase.from("clients").select("*").order("name"),
			loadConfig(TIPOS_KEY),
		]).then(function (res) {
			const clientsRes = res[0];
			const tiposVal = res[1];
			if (!clientsRes.error && clientsRes.data) setRows(clientsRes.data);
			if (tiposVal && typeof tiposVal === "object") setTipos(tiposVal);
			setLoading(false);
		});
	}, []);

	// Lista pública: filas + tipo mergeado. El tipo vive ahora en la columna
	// `clients.tipo` (lo completa la importación del Sheet); para clientes viejos
	// creados a mano cae al mapa de config. La columna manda si está.
	const clients = useMemo(function () {
		return rows.map(function (c) { return Object.assign({}, c, { tipo: c.tipo || tipos[c.id] || null }); });
	}, [rows, tipos]);

	const create = useCallback(async function (name, channel, tipo) {
		const { data, error } = await supabase
			.from("clients")
			.insert({ name: name.trim(), channel, certs_activos: 0 })
			.select()
			.single();
		if (!error && data) {
			setRows(function (prev) {
				return [...prev, data].sort(function (a, b) { return a.name.localeCompare(b.name); });
			});
			if (tipo) {
				setTipos(function (prev) {
					const next = Object.assign({}, prev, { [data.id]: tipo });
					saveConfig(TIPOS_KEY, next);
					return next;
				});
			}
			// Devolvemos el cliente ya con su tipo para que el selector lo tenga al instante.
			return Object.assign({}, data, { tipo: tipo || null });
		}
		console.error("useClients.create error:", error);
		return null;
	}, []);

	const update = useCallback(async function (id, updates) {
		const { data, error } = await supabase
			.from("clients")
			.update(updates)
			.eq("id", id)
			.select()
			.single();
		if (!error && data) {
			setRows(function (prev) { return prev.map(function (c) { return c.id === id ? data : c; }); });
			return Object.assign({}, data, { tipo: tipos[id] || null });
		}
		console.error("useClients.update error:", error);
		return null;
	}, [tipos]);

	// Asigna/cambia el tipo de un cliente (atributo del cliente, heredado por sus
	// cotizaciones al guardarlas).
	const setTipo = useCallback(function (id, tipo) {
		setTipos(function (prev) {
			const next = Object.assign({}, prev, { [id]: tipo });
			saveConfig(TIPOS_KEY, next);
			return next;
		});
	}, []);

	const remove = useCallback(async function (id) {
		const { error } = await supabase.from("clients").delete().eq("id", id);
		if (!error) {
			setRows(function (prev) { return prev.filter(function (c) { return c.id !== id; }); });
			setTipos(function (prev) {
				if (!(id in prev)) return prev;
				const next = Object.assign({}, prev);
				delete next[id];
				saveConfig(TIPOS_KEY, next);
				return next;
			});
		}
	}, []);

	// Dispara la Edge Function que lee el Sheet "DB Empresas" y hace upsert por
	// empresa_id. Al terminar refresca la lista local. Devuelve el resumen
	// { insertados, actualizados, adoptados, omitidos, errores } o un objeto con
	// { error } si algo falló. Ver docs/sync-pipeline-sheet.md.
	const importFromSheet = useCallback(async function () {
		setImporting(true);
		try {
			const { data, error } = await supabase.functions.invoke("import-pipeline");
			if (error) {
				// El body de un error HTTP de la función trae el detalle en context.
				let detail = error.message || "Error al importar";
				try {
					const body = await error.context?.json?.();
					if (body?.error) detail = body.error;
				} catch { /* body no-JSON: nos quedamos con el message */ }
				return { error: detail };
			}
			if (data && data.error) return { error: data.error };
			await fetchClients();
			return data || {};
		} catch (e) {
			return { error: e.message || String(e) };
		} finally {
			setImporting(false);
		}
	}, [fetchClients]);

	return { clients, loading, importing, create, update, remove, setTipo, importFromSheet, refetch: fetchClients };
}
