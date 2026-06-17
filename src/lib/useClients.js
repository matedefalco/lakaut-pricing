import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

export function useClients() {
	const [clients, setClients] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(function () {
		supabase.from("clients").select("*").order("name").then(function ({ data, error }) {
			if (!error && data) setClients(data);
			setLoading(false);
		});
	}, []);

	const create = useCallback(async function (name, channel) {
		const { data, error } = await supabase
			.from("clients")
			.insert({ name: name.trim(), channel, certs_activos: 0 })
			.select()
			.single();
		if (!error && data) {
			setClients(function (prev) {
				return [...prev, data].sort(function (a, b) { return a.name.localeCompare(b.name); });
			});
			return data;
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
			setClients(function (prev) { return prev.map(function (c) { return c.id === id ? data : c; }); });
			return data;
		}
		console.error("useClients.update error:", error);
		return null;
	}, []);

	const remove = useCallback(async function (id) {
		const { error } = await supabase.from("clients").delete().eq("id", id);
		if (!error) setClients(function (prev) { return prev.filter(function (c) { return c.id !== id; }); });
	}, []);

	return { clients, loading, create, update, remove };
}
