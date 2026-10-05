// ─── Normalización de la config de canales (módulo puro, sin React ni Supabase) ──
// La lógica de merge/migración vive acá para que la comparta cualquier consumidor:
//   · la app (ChannelConfigContext) al cargar la config viva desde Supabase, y
//   · el generador de documentación (scripts/gen-pricing-docs.mjs), que necesita
//     reconstruir los MISMOS valores efectivos para que la doc nunca mienta.
// No importar React, hooks ni supabase acá: debe poder correr en Node plano.
import {
	DISTRIBUTOR_TIERS,
	DISTRIBUIDOR_VOL_TIERS,
	DISTRIBUIDOR_VOL_BASE,
	WEB_FIRMA_EXTRA_TIERS,
	B2B2C_SEGMENTS,
	B2B2C_FIRMAS_BIENVENIDA,
	B2B2C_MODELO,
	B2B2C_MARKUP_MIN,
	B2B2C_FACTOR_PUNTUAL,
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
	// Precio base propio del canal Distribuidores-Volumen (cert bonificado = 0, firma
	// USD 1,00). No comparte VOLUMEN_BASE: el descuento del nivel pega sobre la firma.
	distribuidorVolBase: DISTRIBUIDOR_VOL_BASE,
	// Escala de precios del canal IDC (precio por IDC y por firma, por segmento).
	b2b2cSegments: B2B2C_SEGMENTS,
	// Firmas bonificadas de bienvenida por cotización IDC (en total, no por IDC).
	b2b2cFirmasBienvenida: B2B2C_FIRMAS_BIENVENIDA,
	b2b2cModelo: B2B2C_MODELO,
	b2b2cMarkupMin: B2B2C_MARKUP_MIN,
	b2b2cFactorPuntual: B2B2C_FACTOR_PUNTUAL,
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

// ── Migración del canal IDC ───────────────────────────────────────────────────
// Hay cuatro generaciones de este canal en configs guardadas, y esta función lleva
// cualquiera de ellas al modelo vigente:
//
//   G1 · precio absoluto por segmento + umbral por cantidad de IDC
//        { precioIDC, precioFirma (= firma extra), idcMin, idcMax }
//   G2 · precio base único + % de descuento por segmento, umbral en USD de
//        compromiso: { compromisoMin, compromisoMax, descuento } + b2b2cBase
//   G3 · escala de precios por IDC con cupo de firmas incluidas
//        { idcMin, idcMax, precioIDC (bundle), firmasIncluidas, precioFirmaExtra }
//   G4 · vigente (oct 2026): sin cupo. La IDC es solo identidad + certificado y la
//        firma tiene precio propio: { idcMin, idcMax, precioIDC, precioFirma, precioFirmaExtra }
//
// G1 y G2 se llevan primero a G3 (como antes) y G3 a G4 abriendo el bundle. Como G1
// también usa el nombre `precioFirma` (con otro significado), lo que distingue G4 no
// es la forma del segmento sino la marca `b2b2cModelo` de la config.
const FALLBACK_FIRMA_EXTRA = 0.5;
const FALLBACK_CUPO_G3 = 3;
// Costos variables vigentes al abrir el bundle (oct 2026). La migración G3 → G4 reparte
// el precio del bundle en esta proporción, así certificado y firma conservan el markup
// del segmento. Son constantes a propósito: la migración tiene que dar siempre lo mismo,
// aunque después cambien los costos en Config.
const CV_CERT_G4 = 0.375;
const CV_FIRMA_G4 = 0.1334;

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

// G3 → G4: abre el precio del bundle (cert + cupo firmas) en certificado y firma, en
// proporción al costo. El certificado se redondea a centavos y la firma se lleva el
// resto, así cert + cupo × firma reproduce el precio del bundle (± 0,0001).
function splitBundle(precioBundle, cupo, firmaExtra) {
	const p = Number(precioBundle) || 0;
	const n = Math.max(0, Math.round(Number(cupo) || 0));
	if (n === 0) return { precioIDC: p, precioFirma: Number(firmaExtra) || 0 };
	const cert = Math.round(p * CV_CERT_G4 / (CV_CERT_G4 + n * CV_FIRMA_G4) * 100) / 100;
	return { precioIDC: cert, precioFirma: Math.round(Math.max(0, p - cert) / n * 10000) / 10000 };
}

function migrateB2B2C(segments, base, modelo) {
	const list = Array.isArray(segments) ? segments : [];
	if (list.length === 0) return B2B2C_SEGMENTS;

	// Config ya en G4: solo se completan los campos que falten.
	if (modelo === B2B2C_MODELO) {
		return list.map(function (s, i) {
			const def = B2B2C_SEGMENTS[i];
			const range = s.idcMin != null ? { min: Number(s.idcMin) || 0, max: s.idcMax != null ? Number(s.idcMax) : null } : { min: def ? def.idcMin : 0, max: def ? def.idcMax : null };
			const out = Object.assign({}, s, {
				idcMin: range.min,
				idcMax: range.max,
				precioIDC: s.precioIDC != null ? Number(s.precioIDC) || 0 : (def ? def.precioIDC : 0),
				precioFirma: s.precioFirma != null ? Number(s.precioFirma) || 0 : (def ? def.precioFirma : 0),
				precioFirmaExtra: s.precioFirmaExtra != null ? Number(s.precioFirmaExtra) || 0 : (def ? def.precioFirmaExtra : FALLBACK_FIRMA_EXTRA),
			});
			delete out.firmasIncluidas;
			return out;
		});
	}

	const baseCert = base && base.cert != null ? Number(base.cert) || 0 : 0;
	const baseFirma = base && base.firma != null ? Number(base.firma) || 0 : 0;

	const out = [];
	list.forEach(function (s, i) {
		const def = B2B2C_SEGMENTS[i];
		const prev = out[out.length - 1];

		if (isG2Segment(s)) {
			// G2 → G3 → G4: el descuento del segmento se resuelve contra el precio base para
			// recuperar el precio absoluto que el equipo tenía cargado. G2 cobraba las firmas
			// por unidad, así que el precio base es el del certificado y la firma va aparte.
			const desc = Math.min(1, Math.max(0, Number(s.descuento) || 0));
			const range = resolveIdcRange(def, prev);
			const firma = Math.round((baseFirma || FALLBACK_FIRMA_EXTRA) * (1 - desc) * 10000) / 10000;
			out.push({
				id: s.id,
				label: s.label,
				idcMin: range.min,
				idcMax: range.max,
				facturacionMin: s.facturacionMin,
				facturacionMax: s.facturacionMax,
				precioIDC: Math.round((baseCert || (def ? def.precioIDC : 0)) * (1 - desc) * 10000) / 10000,
				precioFirma: firma,
				precioFirmaExtra: firma,
			});
			return;
		}

		// G1 y G3: mismo esqueleto. G1 no tenía cupo (sus firmas se cobraban por unidad
		// a `precioFirma`); G3 lo trae explícito. Las dos se abren con splitBundle.
		const range = s.idcMin != null ? { min: Number(s.idcMin) || 0, max: s.idcMax != null ? Number(s.idcMax) : null } : resolveIdcRange(def, prev);
		const firmaExtra = Number(s.precioFirmaExtra != null ? s.precioFirmaExtra
			: (s.precioFirma != null ? s.precioFirma : FALLBACK_FIRMA_EXTRA)) || 0;
		const cupo = s.firmasIncluidas != null ? s.firmasIncluidas : (s.precioFirma != null ? 0 : FALLBACK_CUPO_G3);
		const precioBundle = Number(s.precioIDC) || (def ? def.precioIDC + FALLBACK_CUPO_G3 * def.precioFirma : 0);
		const split = splitBundle(precioBundle, cupo, firmaExtra);
		out.push({
			id: s.id,
			label: s.label,
			idcMin: range.min,
			idcMax: range.max,
			facturacionMin: s.facturacionMin,
			facturacionMax: s.facturacionMax,
			precioIDC: split.precioIDC,
			precioFirma: split.precioFirma,
			precioFirmaExtra: firmaExtra,
		});
	});

	return out;
}

export function normalizeChannelConfig(raw) {
	const merged = Object.assign({}, DEFAULT_CHANNEL_CONFIG, raw);
	// La marca de modelo se lee del raw: el merge con el default la pondría siempre. Sin
	// segmentos guardados, los del merge son los defaults, que ya están en G4.
	const rawModelo = raw && Array.isArray(raw.b2b2cSegments) && raw.b2b2cSegments.length > 0 ? raw.b2b2cModelo : B2B2C_MODELO;
	merged.b2b2cSegments = migrateB2B2C(merged.b2b2cSegments, raw && raw.b2b2cBase, rawModelo);
	merged.b2b2cModelo = B2B2C_MODELO;
	if (merged.b2b2cFirmasBienvenida == null || !(Number(merged.b2b2cFirmasBienvenida) >= 0)) merged.b2b2cFirmasBienvenida = B2B2C_FIRMAS_BIENVENIDA;
	merged.b2b2cFirmasBienvenida = Math.round(Number(merged.b2b2cFirmasBienvenida));
	// El guardarraíl pasó de margen sobre el precio a markup sobre el costo (ver
	// B2B2C_MARKUP_MIN). No se deriva del valor viejo: el 20% del Borrador v5 es
	// markup, así que el default nuevo ya expresa la intención original.
	if (merged.b2b2cMarkupMin == null) merged.b2b2cMarkupMin = B2B2C_MARKUP_MIN;
	if (merged.b2b2cFactorPuntual == null || !(Number(merged.b2b2cFactorPuntual) > 0)) merged.b2b2cFactorPuntual = B2B2C_FACTOR_PUNTUAL;

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

	// Niveles de Distribuidores-Volumen: el nivel se alcanza por el MAYOR entre la
	// FACTURACIÓN (rangos en `compromisoMin`/`compromisoMax`) y los CERTIFICADOS ACTIVOS
	// (`certsMin`/`certsMax`, que cuentan solo con compromiso anual), con la escala de
	// descuentos de la matriz comercial (10%–50% sobre la firma; el cert va bonificado). Las
	// configs guardadas con el modelo viejo (nivel por firmas + facturación de la cotización,
	// otra columna de descuentos) traen tiers sin `compromisoMin`, así que se reemplazan por
	// el default nuevo: los rangos y descuentos cambiaron de significado y no hay traducción
	// 1:1. Sin nada cargado, también al default.
	if (!Array.isArray(merged.distribuidorVolTiers) || merged.distribuidorVolTiers.length === 0
		|| merged.distribuidorVolTiers.some(function (t) { return !t || t.compromisoMin == null; })) {
		merged.distribuidorVolTiers = DISTRIBUIDOR_VOL_TIERS;
	} else if (merged.distribuidorVolTiers.some(function (t) { return t && t.certsMin == null; })) {
		// El eje de certificados activos volvió a asignar el nivel: las configs guardadas
		// mientras era informativo pueden no traer `certsMin`/`certsMax`. Se backfillean desde
		// el default por posición, sin tocar el resto de la fila.
		merged.distribuidorVolTiers = merged.distribuidorVolTiers.map(function (t, i) {
			if (t && t.certsMin != null) return t;
			const d = DISTRIBUIDOR_VOL_TIERS[i] || DISTRIBUIDOR_VOL_TIERS[DISTRIBUIDOR_VOL_TIERS.length - 1] || {};
			return Object.assign({}, t, { certsMin: d.certsMin != null ? d.certsMin : 0, certsMax: d.certsMax !== undefined ? d.certsMax : null });
		});
	}

	// Precio base propio del canal Distribuidores-Volumen. Si la config no lo trae (era
	// compartido con volumenBase antes de la separación), se cae al default (cert 0 / firma 1).
	if (!merged.distribuidorVolBase || merged.distribuidorVolBase.firma == null) {
		merged.distribuidorVolBase = DISTRIBUIDOR_VOL_BASE;
	}

	// Segundo eje de segmentación (facturación en IDC, firmas en Volumen): las configs
	// guardadas antes de que el segmento fuera el MAYOR entre dos ejes traen solo el eje
	// original. Se backfillea el eje faltante desde el default por posición, sin tocar el
	// resto de la fila. Ver getB2B2CSegment / getVolumenSegment.
	if (Array.isArray(merged.b2b2cSegments) && merged.b2b2cSegments.some(function (s) { return s && s.facturacionMin == null; })) {
		merged.b2b2cSegments = merged.b2b2cSegments.map(function (s, i) {
			if (!s || s.facturacionMin != null) return s;
			const def = B2B2C_SEGMENTS[i] || B2B2C_SEGMENTS[B2B2C_SEGMENTS.length - 1] || {};
			return Object.assign({}, s, { facturacionMin: def.facturacionMin != null ? def.facturacionMin : 0, facturacionMax: def.facturacionMax !== undefined ? def.facturacionMax : null });
		});
	}
	if (Array.isArray(merged.volumenSegments) && merged.volumenSegments.some(function (s) { return s && s.firmasMin == null; })) {
		merged.volumenSegments = merged.volumenSegments.map(function (s, i) {
			if (!s || s.firmasMin != null) return s;
			const def = VOLUMEN_SEGMENTS[i] || VOLUMEN_SEGMENTS[VOLUMEN_SEGMENTS.length - 1] || {};
			return Object.assign({}, s, { firmasMin: def.firmasMin != null ? def.firmasMin : 0, firmasMax: def.firmasMax !== undefined ? def.firmasMax : null });
		});
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
	// Planes SLA: el umbral de facturación que incluye cada plan es nuevo (oct 2026). Las
	// configs guardadas sin él se completan por id desde el default; un plan agregado a
	// mano queda sin umbral (no se incluye solo) hasta que se cargue en Config.
	if (Array.isArray(merged.slaPlans)) {
		merged.slaPlans = merged.slaPlans.map(function (p) {
			if (!p || p.facturacionMin !== undefined) return p;
			const d = SLA_PLANS.find(function (x) { return x.id === p.id; });
			return Object.assign({}, p, { facturacionMin: d ? d.facturacionMin : null });
		});
	}

	return merged;
}
