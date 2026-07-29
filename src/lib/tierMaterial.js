// ─── Materiales de nivel y segmento ───────────────────────────────────────────
// Los niveles de Packs ya vienen nombrados como metales (Azul, Bronce, Plata, Oro,
// Platinum) y los segmentos de Volumen como una escalera de ambición (Start Up →
// Plataforma). Hasta acá el negocio definía la semántica y la interfaz la
// renderizaba como texto negro plano: llegar a Oro se veía igual que llegar a
// Bronce. Este módulo le da material a esa escalera, así el nivel se lee como logro
// antes de leerse como dato.
//
// Los niveles se editan en Config → Precios por canal, así que los ids no están
// garantizados. La resolución es en cascada: id exacto → palabra clave del label →
// escalera por posición → neutro. Un nivel inventado a mano nunca queda sin
// material, y si su nombre sugiere un metal lo hereda.

// Cada material define: emoji, gradiente de fondo, color de texto, borde y glow.
// Los colores de texto son los tonos 700-800 de cada familia sobre fondos 50-200,
// para que el contraste aguante en tamaño chico.
const MATERIALS = {
	// ── Metales · niveles de Packs ──
	azul: {
		key: "azul",
		emoji: "🔹",
		fg: "#2532a8",
		border: "rgba(48, 65, 213, 0.28)",
		bg: "linear-gradient(135deg, #f2f4fe 0%, #dfe3fa 100%)",
		glow: "rgba(48, 65, 213, 0.20)",
		solid: "#3041d5",
	},
	bronce: {
		key: "bronce",
		emoji: "🥉",
		fg: "#8a3d12",
		border: "rgba(154, 82, 34, 0.32)",
		bg: "linear-gradient(135deg, #fdf3ea 0%, #f3d7b8 55%, #e9c49c 100%)",
		glow: "rgba(154, 82, 34, 0.22)",
		solid: "#9a5222",
	},
	plata: {
		key: "plata",
		emoji: "🥈",
		fg: "#41506a",
		border: "rgba(100, 116, 139, 0.34)",
		bg: "linear-gradient(135deg, #fbfcfe 0%, #e4e9f1 48%, #cfd7e4 100%)",
		glow: "rgba(100, 116, 139, 0.20)",
		solid: "#64748b",
	},
	oro: {
		key: "oro",
		emoji: "🥇",
		fg: "#8a5205",
		border: "rgba(180, 131, 9, 0.38)",
		bg: "linear-gradient(135deg, #fffaeb 0%, #fbe9ad 50%, #f3d374 100%)",
		glow: "rgba(202, 138, 4, 0.30)",
		solid: "#b48309",
	},
	platinum: {
		key: "platinum",
		emoji: "💎",
		fg: "#4c1d95",
		border: "rgba(124, 58, 237, 0.30)",
		// Iridiscente: el techo de la escalera no es un metal más, cambia de tono.
		bg: "linear-gradient(115deg, #f6f4ff 0%, #e6e2ff 32%, #dff1fa 66%, #f6f4ff 100%)",
		glow: "rgba(124, 58, 237, 0.26)",
		solid: "#7c3aed",
	},

	// ── Escalera de ambición · segmentos de Volumen ──
	startup: {
		key: "startup",
		emoji: "🌱",
		fg: "#046c4e",
		border: "rgba(5, 150, 105, 0.30)",
		bg: "linear-gradient(135deg, #f0fdf7 0%, #d3f4e4 100%)",
		glow: "rgba(5, 150, 105, 0.20)",
		solid: "#059669",
	},
	growth: {
		key: "growth",
		emoji: "📈",
		fg: "#0b6a85",
		border: "rgba(8, 145, 178, 0.30)",
		bg: "linear-gradient(135deg, #f0fbff 0%, #cdeef7 100%)",
		glow: "rgba(8, 145, 178, 0.20)",
		solid: "#0891b2",
	},
	pyme: {
		key: "pyme",
		emoji: "🏢",
		fg: "#2532a8",
		border: "rgba(48, 65, 213, 0.28)",
		bg: "linear-gradient(135deg, #f2f4fe 0%, #dfe3fa 100%)",
		glow: "rgba(48, 65, 213, 0.20)",
		solid: "#3041d5",
	},
	empresa: {
		key: "empresa",
		emoji: "🏛️",
		fg: "#5b21b6",
		border: "rgba(124, 58, 237, 0.28)",
		bg: "linear-gradient(135deg, #f8f5ff 0%, #e6dcfd 100%)",
		glow: "rgba(124, 58, 237, 0.22)",
		solid: "#7c3aed",
	},
	plataforma: {
		key: "plataforma",
		emoji: "🌐",
		fg: "#8a5205",
		border: "rgba(180, 131, 9, 0.36)",
		bg: "linear-gradient(135deg, #fffaeb 0%, #fbe9ad 50%, #f3d374 100%)",
		glow: "rgba(202, 138, 4, 0.28)",
		solid: "#b48309",
	},
	ecosistema: {
		key: "ecosistema",
		emoji: "🪐",
		fg: "#4c1d95",
		border: "rgba(124, 58, 237, 0.30)",
		bg: "linear-gradient(115deg, #f6f4ff 0%, #e6e2ff 32%, #dff1fa 66%, #f6f4ff 100%)",
		glow: "rgba(124, 58, 237, 0.26)",
		solid: "#7c3aed",
	},

	neutral: {
		key: "neutral",
		emoji: "▪️",
		fg: "#4b5563",
		border: "rgba(107, 114, 128, 0.26)",
		bg: "linear-gradient(135deg, #f9fafb 0%, #eceef2 100%)",
		glow: "rgba(107, 114, 128, 0.16)",
		solid: "#6b7280",
	},
};

// Escalera de fallback por posición: un nivel con id inventado igual recibe un
// material que progresa con su lugar en la tabla, así el orden se sigue leyendo.
const LADDER = ["azul", "bronce", "plata", "oro", "platinum"];

// Palabras clave del label, para cuando el id no matchea pero el nombre sí sugiere
// un material ("Oro Plus", "segmento plata", "Bronze").
const KEYWORDS = [
	["platinum", "platinum"], ["platino", "platinum"], ["diamante", "platinum"],
	["oro", "oro"], ["gold", "oro"],
	["plata", "plata"], ["silver", "plata"],
	["bronce", "bronce"], ["bronze", "bronce"],
	["azul", "azul"], ["blue", "azul"],
	["ecosistema", "ecosistema"], ["ecosystem", "ecosistema"],
	["plataforma", "plataforma"], ["platform", "plataforma"],
	["empresa", "empresa"], ["corporate", "empresa"],
	["pyme", "pyme"], ["sme", "pyme"],
	["growth", "growth"], ["escala", "growth"],
	["startup", "startup"], ["start up", "startup"], ["start-up", "startup"],
];

function normalize(s) {
	return String(s || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

// Resuelve el material de un nivel/segmento.
//   idOrTier: string (id) u objeto { id, label }
//   index / total: posición en la escalera, para el fallback por posición
export function tierMaterial(idOrTier, index, total) {
	const isObj = idOrTier && typeof idOrTier === "object";
	const id = normalize(isObj ? idOrTier.id : idOrTier);
	const label = normalize(isObj ? idOrTier.label : "");

	if (id && MATERIALS[id]) return MATERIALS[id];

	const hay = id + " " + label;
	for (let i = 0; i < KEYWORDS.length; i++) {
		if (hay.indexOf(KEYWORDS[i][0]) !== -1) return MATERIALS[KEYWORDS[i][1]];
	}

	// Fallback por posición: se reparte la escalera de metales sobre la cantidad
	// real de niveles, así 3 niveles custom quedan azul / plata / platinum en vez de
	// los tres primeros.
	if (typeof index === "number" && index >= 0) {
		const n = typeof total === "number" && total > 1 ? total : LADDER.length;
		const slot = Math.min(LADDER.length - 1, Math.round((index / (n - 1)) * (LADDER.length - 1)));
		return MATERIALS[LADDER[slot]] || MATERIALS.neutral;
	}

	return MATERIALS.neutral;
}

// Material del nivel dentro de una lista (toma la posición automáticamente).
export function tierMaterialInList(tier, list) {
	const arr = Array.isArray(list) ? list : [];
	const idx = arr.findIndex(function (t) { return t && tier && t.id === tier.id; });
	return tierMaterial(tier, idx, arr.length);
}

export { MATERIALS as TIER_MATERIALS };
