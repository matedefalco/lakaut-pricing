import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { DISTRIBUTOR_TIERS, B2B2C_SEGMENTS, B2B2C_BASE, B2B2C_MARGEN_MIN, B2B2C_API_TIERS, SLA_PLANS, COMMERCIAL_LEVERS, ABONO_DESCUENTO_PCT } from "../data/channels";
import { loadConfig, saveConfig, subscribeConfig } from "../lib/supabase";

const ChannelConfigContext = createContext(null);
const STORAGE_KEY = "lakaut_channelConfig";

const DEFAULT_CHANNEL_CONFIG = {
	distributorTiers: DISTRIBUTOR_TIERS,
	b2b2cSegments: B2B2C_SEGMENTS,
	b2b2cBase: B2B2C_BASE,
	b2b2cMargenMin: B2B2C_MARGEN_MIN,
	b2b2cApiTiers: B2B2C_API_TIERS,
	slaPlans: SLA_PLANS,
	commercialLevers: COMMERCIAL_LEVERS,
	abonoDescuentoPct: ABONO_DESCUENTO_PCT,
};

// ── Migración del canal Volumen al modelo de base + descuento ─────────────────
// Los segmentos guardados con el modelo viejo traen un precio absoluto por segmento
// (`precioIDC` / `precioFirma`) y rangos por cantidad (`idcMin` / `idcMax`). El
// modelo nuevo es un precio base único más un % de descuento por segmento, con el
// umbral en USD de compromiso. Se convierte al leer, preservando la economía que ya
// tenía cargada: el precio base sale del primer segmento y el descuento de cada uno
// se deriva de su precio. Los umbrales salen de `facturacionMin/Max`, que ya estaban
// en USD; donde falten se cae a la escala por defecto de ese índice.
function isLegacySegment(s) {
	return s && s.descuento == null && (s.precioIDC != null || s.idcMin != null);
}

function migrateB2B2C(segments, base) {
	const list = Array.isArray(segments) ? segments : [];
	if (!list.some(isLegacySegment)) return { segments: list, base: base || B2B2C_BASE };

	const first = list[0] || {};
	const baseCert = base && base.cert != null ? Number(base.cert) : (first.precioIDC != null ? Number(first.precioIDC) : B2B2C_BASE.cert);
	const baseFirma = base && base.firma != null ? Number(base.firma) : (first.precioFirma != null ? Number(first.precioFirma) : B2B2C_BASE.firma);

	// Se recorre en orden para garantizar una escala monótona, sin solapes y con el
	// último tramo abierto: un segmento agregado a mano (sin default de referencia en
	// su índice) se encadena después del anterior en vez de arrancar de cero, que lo
	// dejaría solapando al primero y por lo tanto inalcanzable.
	const migrated = [];
	list.forEach(function (s, i) {
		if (!isLegacySegment(s)) { migrated.push(s); return; }
		const def = B2B2C_SEGMENTS[i];
		const prev = migrated[migrated.length - 1];
		const tieneUmbral = s.facturacionMin != null;
		const desc = baseCert > 0 && s.precioIDC != null
			? Math.min(1, Math.max(0, 1 - Number(s.precioIDC) / baseCert))
			: (def && def.descuento != null ? def.descuento : 0);

		let min, max;
		if (tieneUmbral) {
			min = Number(s.facturacionMin);
			max = s.facturacionMax != null ? Number(s.facturacionMax) : null;
		} else if (def) {
			min = def.compromisoMin != null ? def.compromisoMin : 0;
			max = def.compromisoMax !== undefined ? def.compromisoMax : null;
		} else if (prev) {
			// Sin default: se abre un tramo nuevo arriba del anterior, cerrándolo si
			// estaba abierto para que los rangos no se pisen.
			if (prev.compromisoMax == null) prev.compromisoMax = Math.max(1, (Number(prev.compromisoMin) || 0) * 3);
			min = Number(prev.compromisoMax) + 1;
			max = null;
		} else {
			min = 0;
			max = null;
		}

		migrated.push({
			id: s.id,
			label: s.label,
			compromisoMin: min,
			compromisoMax: max,
			descuento: Math.round(desc * 10000) / 10000,
		});
	});

	return { segments: migrated, base: { cert: baseCert, firma: baseFirma } };
}

function normalizeChannelConfig(raw) {
	const merged = Object.assign({}, DEFAULT_CHANNEL_CONFIG, raw);
	const mig = migrateB2B2C(merged.b2b2cSegments, raw && raw.b2b2cBase);
	merged.b2b2cSegments = mig.segments;
	merged.b2b2cBase = mig.base;
	if (merged.b2b2cMargenMin == null) merged.b2b2cMargenMin = B2B2C_MARGEN_MIN;
	return merged;
}

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
