import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { DISTRIBUTOR_TIERS, B2B2C_SEGMENTS, B2B2C_API_TIERS, SLA_PLANS, COMMERCIAL_LEVERS, ABONO_DESCUENTO_PCT } from "../data/channels";
import { loadConfig, saveConfig, subscribeConfig } from "../lib/supabase";

const ChannelConfigContext = createContext(null);
const STORAGE_KEY = "lakaut_channelConfig";

const DEFAULT_CHANNEL_CONFIG = {
	distributorTiers: DISTRIBUTOR_TIERS,
	b2b2cSegments: B2B2C_SEGMENTS,
	b2b2cApiTiers: B2B2C_API_TIERS,
	slaPlans: SLA_PLANS,
	commercialLevers: COMMERCIAL_LEVERS,
	abonoDescuentoPct: ABONO_DESCUENTO_PCT,
};

export function ChannelConfigProvider({ children }) {
	const [channelConfig, setChannelConfig] = useState(function () {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (parsed && typeof parsed === "object") return Object.assign({}, DEFAULT_CHANNEL_CONFIG, parsed);
			}
		} catch (e) {}
		return DEFAULT_CHANNEL_CONFIG;
	});

	useEffect(function () {
		loadConfig("channelConfig").then(function (remote) {
			if (remote && typeof remote === "object") {
				const merged = Object.assign({}, DEFAULT_CHANNEL_CONFIG, remote);
				setChannelConfig(merged);
				try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) {}
			}
		});
		return subscribeConfig("channelConfig", function (remote) {
			if (remote && typeof remote === "object") {
				const merged = Object.assign({}, DEFAULT_CHANNEL_CONFIG, remote);
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
