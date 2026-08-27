// ─── Normalización de la config de canales (módulo puro, sin React ni Supabase) ──
// La lógica de merge/migración vive acá para que la comparta cualquier consumidor:
//   · la app (ChannelConfigContext) al cargar la config viva desde Supabase, y
//   · el generador de documentación (scripts/gen-pricing-docs.mjs), que necesita
//     reconstruir los MISMOS valores efectivos para que la doc nunca mienta.
// No importar React, hooks ni supabase acá: debe poder correr en Node plano.
import {
	DISTRIBUTOR_TIERS,
	DISTRIBUIDOR_VOL_TIERS,
	WEB_FIRMA_EXTRA_TIERS,
	B2B2C_SEGMENTS,
	B2B2C_FIRMAS_INCLUIDAS,
	B2B2C_MARKUP_MIN,
	B2B2C_API_TIERS,
	VOLUMEN_BASE,
	VOLUMEN_SEGMENTS,
	VOLUMEN_PROYECCION,
	SLA_PLANS,
	COMMERCIAL_LEVERS,
	ABONO_DESCUENTO_PCT,
} from "../data/channels.js";

export const DEFAULT_CHANNEL_CONFIG = {
	distributorTiers: DISTRIBUTOR_TIERS,
	// Niveles del canal Distribuidores en modalidad Volumen (descuento sobre el precio
	// base por elemento, con escala prudente por el piso de margen). Mismos umbrales de
	// asignación que distributorTiers, otra columna de descuentos.
	distribuidorVolTiers: DISTRIBUIDOR_VOL_TIERS,
	// Escala de precios del canal IDC (bundle por IDC mensuales).
	b2b2cSegments: B2B2C_SEGMENTS,
	b2b2cMarkupMin: B2B2C_MARKUP_MIN,
	b2b2cApiTiers: B2B2C_API_TIERS,
	// Escala por volumen del precio de firma adicional del canal Web (ARS). Los
	// canales de packs (Web y Distribuidores) la usan en vez del precio por plan.
	webFirmaExtraTiers: WEB_FIRMA_EXTRA_TIERS,
	// Escala de descuentos del canal Volumen (certificados y firmas sueltos).
	volumenBase: VOLUMEN_BASE,
	volumenSegments: VOLUMEN_SEGMENTS,
	// Escalonado estándar de crecimiento (firmas absolutas → descuento) para Volumen.
	volumenProyeccion: VOLUMEN_PROYECCION,
	slaPlans: SLA_PLANS,
	commercialLevers: COMMERCIAL_LEVERS,
	abonoDescuentoPct: ABONO_DESCUENTO_PCT,
};

// ── Migración del canal Volumen al modelo de IDC (Borrador v5) ────────────────
// Hay tres generaciones de este canal en configs guardadas, y esta función lleva
// cualquiera de ellas al modelo vigente:
//
//   G1 · precio absoluto por segmento + umbral por cantidad de IDC
//        { precioIDC, precioFirma, idcMin, idcMax }
//   G2 · precio base único + % de descuento por segmento, umbral en USD de
//        compromiso: { compromisoMin, compromisoMax, descuento } + b2b2cBase
//   G3 · vigente: escala de precios por IDC con cupo de firmas incluidas
//        { idcMin, idcMax, precioIDC, firmasIncluidas, precioFirmaExtra }
//
// G1 es casi G3 (el modelo volvió a los umbrales por cantidad), así que alcanza con
// renombrar `precioFirma` y completar el cupo. G2 se convierte preservando la
// economía cargada: el precio de cada segmento se reconstruye aplicando su descuento
// al precio base. Sus umbrales en USD no se pueden traducir a cantidades de IDC, así
// que se cae a la escala por defecto del índice correspondiente.
const FALLBACK_FIRMA_EXTRA = 0.5;

function isG2Segment(s) {
	return !!s && s.descuento != null && s.precioIDC == null;
}

// Umbral por cantidad de IDC para un segmento sin uno propio. Se toma el default de
// su índice y, si no existe (segmento agregado a mano), se abre un tramo nuevo arriba
// del anterior para que los rangos no se pisen ni queden inalcanzables.
function resolveIdcRange(def, prev) {
	if (def) return { min: def.idcMin != null ? def.idcMin : 0, max: def.idcMax !== undefined ? def.idcMax : null };
	if (prev) {
		if (prev.idcMax == null) prev.idcMax = Math.max(1, (Number(prev.idcMin) || 0) * 3);
		return { min: Number(prev.idcMax) + 1, max: null };
	}
	return { min: 0, max: null };
}

function migrateB2B2C(segments, base) {
	const list = Array.isArray(segments) ? segments : [];
	if (list.length === 0) return B2B2C_SEGMENTS;

	const baseCert = base && base.cert != null ? Number(base.cert) || 0 : 0;
	const baseFirma = base && base.firma != null ? Number(base.firma) || 0 : 0;

	const out = [];
	list.forEach(function (s, i) {
		const def = B2B2C_SEGMENTS[i];
		const prev = out[out.length - 1];

		if (isG2Segment(s)) {
			// G2 → G3: el descuento del segmento se resuelve contra el precio base para
			// recuperar el precio absoluto que el equipo tenía efectivamente cargado.
			const desc = Math.min(1, Math.max(0, Number(s.descuento) || 0));
			const range = resolveIdcRange(def, prev);
			out.push({
				id: s.id,
				label: s.label,
				idcMin: range.min,
				idcMax: range.max,
				precioIDC: Math.round((baseCert || (def ? def.precioIDC : 0)) * (1 - desc) * 10000) / 10000,
				// El modelo G2 cobraba las firmas por unidad (cupo cero). Se adopta el cupo
				// del Borrador v5 igual, porque es el modelo elegido: si el precio no cierra
				// contra el costo del bundle, la pantalla de Config lo va a marcar.
				firmasIncluidas: def && def.firmasIncluidas != null ? def.firmasIncluidas : B2B2C_FIRMAS_INCLUIDAS,
				precioFirmaExtra: Math.round((baseFirma || FALLBACK_FIRMA_EXTRA) * (1 - desc) * 10000) / 10000,
			});
			return;
		}

		// G1 y G3: mismo esqueleto. Se completan los campos que falten sin tocar los
		// valores ya cargados.
		const range = s.idcMin != null ? { min: Number(s.idcMin) || 0, max: s.idcMax != null ? Number(s.idcMax) : null } : resolveIdcRange(def, prev);
		const firmaExtra = s.precioFirmaExtra != null ? s.precioFirmaExtra
			: (s.precioFirma != null ? s.precioFirma
				: (def && def.precioFirmaExtra != null ? def.precioFirmaExtra : FALLBACK_FIRMA_EXTRA));
		out.push({
			id: s.id,
			label: s.label,
			idcMin: range.min,
			idcMax: range.max,
			precioIDC: Number(s.precioIDC) || (def ? def.precioIDC : 0),
			firmasIncluidas: s.firmasIncluidas != null ? Math.max(0, Math.round(Number(s.firmasIncluidas) || 0))
				: (def && def.firmasIncluidas != null ? def.firmasIncluidas : B2B2C_FIRMAS_INCLUIDAS),
			precioFirmaExtra: Number(firmaExtra) || 0,
		});
	});

	return out;
}

export function normalizeChannelConfig(raw) {
	const merged = Object.assign({}, DEFAULT_CHANNEL_CONFIG, raw);
	merged.b2b2cSegments = migrateB2B2C(merged.b2b2cSegments, raw && raw.b2b2cBase);
	// El guardarraíl pasó de margen sobre el precio a markup sobre el costo (ver
	// B2B2C_MARKUP_MIN). No se deriva del valor viejo: el 20% del Borrador v5 es
	// markup, así que el default nuevo ya expresa la intención original.
	if (merged.b2b2cMarkupMin == null) merged.b2b2cMarkupMin = B2B2C_MARKUP_MIN;

	// ── Canal Volumen ──
	// Al separarse de IDC (jul 2026) recuperó el modelo de precio base + descuento por
	// segmento. Las configs guardadas antes de la separación tienen esa economía en
	// `b2b2cBase` y en los segmentos G2, así que se hereda de ahí cuando existe: es
	// exactamente el modelo que el equipo tenía cargado para ese cálculo.
	if (!merged.volumenBase) {
		merged.volumenBase = (raw && raw.b2b2cBase && raw.b2b2cBase.cert != null) ? raw.b2b2cBase : VOLUMEN_BASE;
	}
	if (!Array.isArray(merged.volumenSegments) || merged.volumenSegments.length === 0) {
		const legacyG2 = (raw && Array.isArray(raw.b2b2cSegments) ? raw.b2b2cSegments : []).filter(isG2Segment);
		merged.volumenSegments = legacyG2.length > 0
			? legacyG2.map(function (s) {
				return {
					id: s.id,
					label: s.label,
					compromisoMin: Number(s.compromisoMin) || 0,
					compromisoMax: s.compromisoMax != null ? Number(s.compromisoMax) : null,
					descuento: Math.min(1, Math.max(0, Number(s.descuento) || 0)),
				};
			})
			: VOLUMEN_SEGMENTS;
	}

	// Escalonado estándar de Volumen: normaliza a { firmas, descuento } válidos y
	// ordenado por volumen. Si no hay nada cargado, usa el default.
	if (!Array.isArray(merged.volumenProyeccion) || merged.volumenProyeccion.length === 0) {
		merged.volumenProyeccion = VOLUMEN_PROYECCION;
	} else {
		merged.volumenProyeccion = merged.volumenProyeccion
			.map(function (s) {
				return {
					firmas: Math.max(0, Math.round(Number(s.firmas) || 0)),
					descuento: Math.min(100, Math.max(0, Number(s.descuento) || 0)),
				};
			})
			.filter(function (s) { return s.firmas > 0; })
			.sort(function (a, b) { return a.firmas - b.firmas; });
		if (merged.volumenProyeccion.length === 0) merged.volumenProyeccion = VOLUMEN_PROYECCION;
	}

	// Terminología: la integración pasó de "API" a "SDK". Reescribe los labels guardados
	// que todavía digan "API …" para que la config existente muestre SDK sin recargar el
	// default (que borraría precios/fees editados). Solo toca el texto visible; los ids y
	// los fees quedan igual, así las cotizaciones guardadas siguen resolviendo su tier.
	if (Array.isArray(merged.b2b2cApiTiers)) {
		merged.b2b2cApiTiers = merged.b2b2cApiTiers.map(function (t) {
			return t && typeof t.label === "string" && t.label.indexOf("API") !== -1
				? Object.assign({}, t, { label: t.label.replace(/API/g, "SDK") })
				: t;
		});
	}

	// Escala por volumen de la firma adicional del canal Web: normaliza a
	// { firmas, precioARS } válidos y ordenados por volumen. Sin nada cargado → default.
	if (!Array.isArray(merged.webFirmaExtraTiers) || merged.webFirmaExtraTiers.length === 0) {
		merged.webFirmaExtraTiers = WEB_FIRMA_EXTRA_TIERS;
	} else {
		merged.webFirmaExtraTiers = merged.webFirmaExtraTiers
			.map(function (t) {
				return { firmas: Math.max(0, Math.round(Number(t.firmas) || 0)), precioARS: Math.max(0, Number(t.precioARS) || 0) };
			})
			.filter(function (t) { return t.firmas > 0 && t.precioARS > 0; })
			.sort(function (a, b) { return a.firmas - b.firmas; });
		if (merged.webFirmaExtraTiers.length === 0) merged.webFirmaExtraTiers = WEB_FIRMA_EXTRA_TIERS;
	}

	// Niveles de Distribuidores-Volumen: el modelo pasó de asignar por variables
	// declaradas (certificados activos + compromiso anual) a asignar por el VOLUMEN REAL
	// DE FIRMAS de la cotización, con rangos en `firmasMin`/`firmasMax`. Las configs
	// guardadas con el modelo viejo traen tiers sin `firmasMin` (solo certsMin/compromiso)
	// y una columna de descuentos distinta, así que se reemplazan por el default nuevo:
	// los rangos y descuentos cambiaron de significado y no hay traducción 1:1. Sin nada
	// cargado (config anterior a este canal), también se cae al default.
	if (!Array.isArray(merged.distribuidorVolTiers) || merged.distribuidorVolTiers.length === 0
		|| merged.distribuidorVolTiers.some(function (t) { return !t || t.firmasMin == null; })) {
		merged.distribuidorVolTiers = DISTRIBUIDOR_VOL_TIERS;
	}

	// Descuento del abono mensual: el default bajó de 10% a 3% para que el beneficio de
	// la recurrencia quede por debajo del beneficio por volumen. Las configs que todavía
	// tienen el default viejo (10) se llevan al nuevo; un valor customizado distinto se
	// respeta. Sin valor cargado, toma el default vigente.
	if (merged.abonoDescuentoPct == null || merged.abonoDescuentoPct === 10) {
		merged.abonoDescuentoPct = ABONO_DESCUENTO_PCT;
	}

	// Campos del modelo anterior que ya no se leen. Se descartan al normalizar para
	// que no vuelvan a persistirse en el próximo guardado.
	delete merged.b2b2cBase;
	delete merged.b2b2cMargenMin;
	return merged;
}
