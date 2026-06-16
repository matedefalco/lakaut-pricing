// ─── Historial de cotizaciones por canal (Supabase, compartido por el equipo) ───
// Reemplaza el viejo b2b_quotes. Cada cotización lleva el canal que la generó,
// un resumen para la tabla y el payload de inputs para reabrir/editar.
import { useState, useEffect, useCallback } from "react";
import { loadConfig, saveConfig } from "./supabase";

const QUOTES_KEY = "channel_quotes";

export function useQuotes() {
	const [quotes, setQuotes] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(function () {
		let alive = true;
		loadConfig(QUOTES_KEY).then(function (data) {
			if (!alive) return;
			setQuotes(function (prev) { return prev.length > 0 ? prev : (Array.isArray(data) ? data : []); });
			setLoading(false);
		});
		return function () { alive = false; };
	}, []);

	const save = useCallback(function (quote) {
		setQuotes(function (prev) {
			const exists = prev.some(function (q) { return q.id === quote.id; });
			const next = exists
				? prev.map(function (q) { return q.id === quote.id ? quote : q; })
				: [quote].concat(prev).slice(0, 200);
			saveConfig(QUOTES_KEY, next);
			return next;
		});
	}, []);

	const remove = useCallback(function (id) {
		setQuotes(function (prev) {
			const next = prev.filter(function (q) { return q.id !== id; });
			saveConfig(QUOTES_KEY, next);
			return next;
		});
	}, []);

	return { quotes, loading, save, remove };
}
