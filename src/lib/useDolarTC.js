import { useState, useEffect, useCallback } from "react";
import { loadConfig, saveConfig, subscribeConfig } from "./supabase";

// Available rate sources from dolarapi.com/v1/dolares/:casa
export const DOLAR_SOURCES = [
	{ k: "oficial", label: "Oficial" },
	{ k: "blue", label: "Blue" },
	{ k: "bolsa", label: "MEP / Bolsa" },
	{ k: "contadoconliqui", label: "CCL" },
	{ k: "mayorista", label: "Mayorista" },
	{ k: "tarjeta", label: "Tarjeta" },
	{ k: "manual", label: "Manual" },
];

const DEFAULT_SOURCE = "oficial";
const FALLBACK_TC = 1410;

export function useDolarTC() {
	const [source, setSourceState] = useState(DEFAULT_SOURCE);
	const [tc, setTcState] = useState(FALLBACK_TC);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [lastUpdated, setLastUpdated] = useState(null);
	const [ready, setReady] = useState(false);

	// Load TC config from Supabase on mount; subscribe to realtime changes
	useEffect(function () {
		loadConfig("tcConfig").then(function (remote) {
			if (remote) {
				if (remote.source) setSourceState(remote.source);
				if (remote.tc && remote.tc > 0) setTcState(remote.tc);
			}
			setReady(true);
		});
		return subscribeConfig("tcConfig", function (remote) {
			if (remote) {
				if (remote.source) setSourceState(remote.source);
				if (remote.tc && remote.tc > 0) setTcState(remote.tc);
			}
		});
	}, []);

	const fetchRate = useCallback(function (src) {
		setLoading(true);
		setError(null);
		fetch("https://dolarapi.com/v1/dolares/" + src)
			.then(function (r) {
				if (!r.ok) throw new Error("HTTP " + r.status);
				return r.json();
			})
			.then(function (data) {
				const rate = data.venta || data.compra;
				if (rate && rate > 0) {
					const val = Math.round(rate);
					setTcState(val);
					setLastUpdated(data.fechaActualizacion || new Date().toISOString());
					saveConfig("tcConfig", { source: src, tc: val });
				}
				setLoading(false);
			})
			.catch(function (e) {
				setError("No se pudo obtener la cotización. Usando último valor.");
				setLoading(false);
			});
	}, []);

	// When source changes and it's not manual, fetch the rate
	useEffect(function () {
		if (ready && source !== "manual") fetchRate(source);
	}, [source, ready, fetchRate]);

	function setTc(val) {
		setTcState(val);
		saveConfig("tcConfig", { source, tc: val });
	}

	function setSource(src) {
		setSourceState(src);
		if (src === "manual") {
			// Persist source change immediately (tc stays as-is)
			saveConfig("tcConfig", { source: src, tc });
		}
		// Non-manual sources trigger fetchRate via useEffect
	}

	return { tc, setTc, source, setSource, loading, error, lastUpdated, refresh: function () { fetchRate(source); } };
}
