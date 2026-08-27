import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { DEFAULT_CHANNEL_CONFIG, normalizeChannelConfig } from "../lib/channelConfigNormalize";
import { loadConfig, saveConfig, subscribeConfig } from "../lib/supabase";

// La config de defaults y la normalización/migración viven en channelConfigNormalize.js
// (módulo puro, sin React) para que el generador de documentación reconstruya los mismos
// valores efectivos. No duplicar esa lógica acá.

const ChannelConfigContext = createContext(null);
const STORAGE_KEY = "lakaut_channelConfig";


export function ChannelConfigProvider({ children }) {
	const [channelConfig, setChannelConfig] = useState(function () {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed && typeof parsed === "object") return normalizeChannelConfig(parsed);
			}
		} catch (e) {}
		return DEFAULT_CHANNEL_CONFIG;
	});

	useEffect(function () {
		loadConfig("channelConfig").then(function (remote) {
			if (remote && typeof remote === "object") {
				const merged = normalizeChannelConfig(remote);
				setChannelConfig(merged);
				try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) {}
			}
		});
		return subscribeConfig("channelConfig", function (remote) {
			if (remote && typeof remote === "object") {
				const merged = normalizeChannelConfig(remote);
				setChannelConfig(merged);
				try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) {}
			}
		});
	}, []);

	const update = useCallback(function (patch) {
		setChannelConfig(function (prev) {
			const next = Object.assign({}, prev, patch);
			try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
			saveConfig("channelConfig", next);
			return next;
		});
	}, []);

	const resetToDefaults = useCallback(function () {
		const next = DEFAULT_CHANNEL_CONFIG;
		setChannelConfig(next);
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (e) {}
		saveConfig("channelConfig", next);
	}, []);

	return (
		<ChannelConfigContext.Provider value={{ channelConfig, update, resetToDefaults }}>
			{children}
		</ChannelConfigContext.Provider>
	);
}

export function useChannelConfig() {
	const ctx = useContext(ChannelConfigContext);
	if (!ctx) throw new Error("useChannelConfig must be used within ChannelConfigProvider");
	return ctx;
}
