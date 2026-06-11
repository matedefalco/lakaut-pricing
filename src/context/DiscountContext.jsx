import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { loadConfig, saveConfig, subscribeConfig } from "../lib/supabase";

const DiscountContext = createContext(null);
const STORAGE_KEY = "lakaut_volume_discounts_v1";

// Tramos pre-pactados por defecto (volumen mínimo de firmas → % de descuento)
export const DEFAULT_TIERS = [
	{ minVol: 1000, discount: 5 },
	{ minVol: 5000, discount: 10 },
	{ minVol: 20000, discount: 15 },
	{ minVol: 100000, discount: 20 },
];

function cloneTiers(tiers) {
	return tiers.map(function (t) { return { minVol: t.minVol, discount: t.discount }; });
}

function load() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			const parsed = JSON.parse(saved);
			return {
				defaultTiers: Array.isArray(parsed.defaultTiers) && parsed.defaultTiers.length > 0
					? parsed.defaultTiers
					: cloneTiers(DEFAULT_TIERS),
				customTiers: Array.isArray(parsed.customTiers) ? parsed.customTiers : cloneTiers(DEFAULT_TIERS),
				mode: parsed.mode === "custom" ? "custom" : "default",
			};
		}
	} catch (e) {}
	return { defaultTiers: cloneTiers(DEFAULT_TIERS), customTiers: cloneTiers(DEFAULT_TIERS), mode: "default" };
}

export function DiscountProvider({ children }) {
	const [state, setState] = useState(load);

	// Load from Supabase on mount; subscribe to remote changes
	useEffect(function () {
		loadConfig("discounts").then(function (remote) {
			if (!remote) return;
			setState(remote);
			try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch (e) {}
		});
		return subscribeConfig("discounts", function (remote) {
			setState(remote);
			try { localStorage.setItem(STORAGE_KEY, JSON.stringify(remote)); } catch (e) {}
		});
	}, []);

	function persist(updater) {
		setState(function (prev) {
			const next = typeof updater === "function" ? updater(prev) : updater;
			try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
			saveConfig("discounts", next);
			return next;
		});
	}

	const setDefaultTiers = useCallback(function (tiers) {
		persist(function (prev) { return Object.assign({}, prev, { defaultTiers: tiers }); });
	}, []);

	const setCustomTiers = useCallback(function (tiers) {
		persist(function (prev) { return Object.assign({}, prev, { customTiers: tiers }); });
	}, []);

	const setMode = useCallback(function (mode) {
		persist(function (prev) { return Object.assign({}, prev, { mode: mode }); });
	}, []);

	const resetDefaultTiers = useCallback(function () {
		persist(function (prev) { return Object.assign({}, prev, { defaultTiers: cloneTiers(DEFAULT_TIERS) }); });
	}, []);

	const activeTiers = state.mode === "custom" ? state.customTiers : state.defaultTiers;

	return (
		<DiscountContext.Provider value={{
			defaultTiers: state.defaultTiers,
			customTiers: state.customTiers,
			mode: state.mode,
			activeTiers: activeTiers,
			setDefaultTiers: setDefaultTiers,
			setCustomTiers: setCustomTiers,
			setMode: setMode,
			resetDefaultTiers: resetDefaultTiers,
		}}>
			{children}
		</DiscountContext.Provider>
	);
}

export function useDiscounts() {
	const ctx = useContext(DiscountContext);
	if (!ctx) throw new Error("useDiscounts must be used within DiscountProvider");
	return ctx;
}

// Helper puro: dado un volumen de firmas y una lista de tramos, devuelve la tasa de descuento (0..1)
export function discountRateFor(firmas, tiers) {
	if (!Array.isArray(tiers)) return 0;
	let rate = 0;
	const sorted = tiers
		.filter(function (t) { return t && isFinite(t.minVol); })
		.slice()
		.sort(function (a, b) { return a.minVol - b.minVol; });
	for (let i = 0; i < sorted.length; i++) {
		if (firmas >= sorted[i].minVol) rate = (Number(sorted[i].discount) || 0) / 100;
	}
	return rate;
}
