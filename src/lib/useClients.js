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

	// Lista pública: filas + tipo mergeado.
	const clients = useMemo(function () {
		return rows.map(function (c) { return Object.assign({}, c, { tipo: tipos[c.id] || null }); });
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

	return { clients, loading, create, update, remove, setTipo };
}
