import { createContext, useContext, useState, useCallback } from "react";
import { DEFAULT_MODELS } from "../data/defaultModels";

const ModelsContext = createContext(null);
const STORAGE_KEY = "lakaut_models_v2";

export function ModelsProvider({ children }) {
	const [models, setModels] = useState(function () {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) return parsed;
			}
		} catch (e) {}
		return DEFAULT_MODELS;
	});

	function persist(updater) {
		setModels(function (prev) {
			const next = typeof updater === "function" ? updater(prev) : updater;
			try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
			return next;
		});
	}

	const upsert = useCallback(function (model) {
		persist(function (prev) {
			const idx = prev.findIndex(function (m) { return m.id === model.id; });
			if (idx >= 0) {
				const next = [...prev];
				next[idx] = model;
				return next;
			}
			return [...prev, model];
		});
	}, []);

	const remove = useCallback(function (id) {
		persist(function (prev) { return prev.filter(function (m) { return m.id !== id; }); });
	}, []);

	const duplicate = useCallback(function (id) {
		persist(function (prev) {
			const src = prev.find(function (m) { return m.id === id; });
			if (!src) return prev;
			const clone = Object.assign({}, src, {
				id: "model_" + Date.now(),
				label: src.label + " (copia)",
				recommended: false,
			});
			return [...prev, clone];
		});
	}, []);

	const resetToDefaults = useCallback(function () {
		persist(DEFAULT_MODELS);
	}, []);

	// Export models as JSON string
	const exportJSON = useCallback(function () {
		return JSON.stringify(models, null, 2);
	}, [models]);

	// Import models from JSON string, returns error string or null
	const importJSON = useCallback(function (jsonStr) {
		try {
			const parsed = JSON.parse(jsonStr);
			if (!Array.isArray(parsed)) return "El archivo debe contener un array de modelos.";
			if (parsed.length === 0) return "El archivo está vacío.";
			const valid = parsed.every(function (m) {
				return m.id && m.label && typeof m.priceUSD === "number";
			});
			if (!valid) return "Algunos modelos no tienen los campos requeridos (id, label, priceUSD).";
			persist(parsed);
			return null;
		} catch (e) {
			return "JSON inválido: " + e.message;
		}
	}, []);

	return (
		<ModelsContext.Provider value={{ models, upsert, remove, duplicate, resetToDefaults, exportJSON, importJSON }}>
			{children}
		</ModelsContext.Provider>
	);
}

export function useModels() {
	const ctx = useContext(ModelsContext);
	if (!ctx) throw new Error("useModels must be used within ModelsProvider");
	return ctx;
}
