import { useState, useEffect, useCallback } from "react";

// Available rate sources from dolarapi.com/v1/dolares/:casa
export const DOLAR_SOURCES = [
	{ k: "oficial", label: "Oficial" },
	{ k: "blue", label: "Blue" },
	{ k: "bolsa", label: "MEP / Bolsa" },
	{ k: "contadoconliqui", label: "CCL" },
	{ k: "mayorista", label: "Mayorista" },
	{ k: "tarjeta", label: "Tarjeta" },
];

const STORAGE_KEY = "lakaut_tc_source";
const DEFAULT_SOURCE = "oficial";
const FALLBACK_TC = 1410;

export function useDolarTC() {
	const [source, setSourceState] = useState(function () {
		try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_SOURCE; } catch (e) { return DEFAULT_SOURCE; }
	});
	const [tc, setTc] = useState(FALLBACK_TC);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [lastUpdated, setLastUpdated] = useState(null);

	const fetchRate = useCallback(function (src) {
		setLoading(true);
		setError(null);
		fetch("https://dolarapi.com/v1/dolares/" + src)
			.then(function (r) {
				if (!r.ok) throw new Error("HTTP " + r.status);
				return r.json();
			})
			.then(function (data) {
				// Use venta (sell price) as the reference rate
				const rate = data.venta || data.compra;
				if (rate && rate > 0) {
					setTc(Math.round(rate));
					setLastUpdated(data.fechaActualizacion || new Date().toISOString());
				}
				setLoading(false);
			})
			.catch(function (e) {
				setError("No se pudo obtener la cotización. Usando último valor.");
				setLoading(false);
			});
	}, []);

	useEffect(function () {
		fetchRate(source);
	}, [source, fetchRate]);

	function setSource(src) {
		setSourceState(src);
		try { localStorage.setItem(STORAGE_KEY, src); } catch (e) {}
	}

	return { tc, setTc, source, setSource, loading, error, lastUpdated, refresh: function () { fetchRate(source); } };
}
