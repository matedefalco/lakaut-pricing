// ─── Brand tokens ─────────────────────────────────────────────────────────────
export const BLUE  = "#3041d5";
export const BLUEL = "#eaecfb";
export const GRAY  = "#7f828e";
export const BLACK = "#36383a";
export const BG    = "#f4f6fd";
export const WHITE = "#fff";
export const BORD  = "#dde0eb";
export const OK    = "#059669";
export const OKBG  = "#d1fae5";
export const WN    = "#c87a00";
export const WNBG  = "#fef3c7";
export const ER    = "#dc2626";
export const ERBG  = "#fee2e2";

export const PURPLE = "#8b5cf6";

export const CAT_COLOR = { RRHH: BLUE, Sop: WN, Inf: GRAY, SW: PURPLE, Ops: OK };

// ─── Paleta de gráficos · fuente única ────────────────────────────────────────
// Espeja los tokens --chart-1..5 de index.css. Antes cada pantalla con gráficos
// definía su propio array de colores; ahora todas parten de acá. Los recharts no
// resuelven var(--chart-N) de forma confiable en `fill`, así que se usan los hex.
export const CHART_COLORS = [
	"#3041d5", // chart-1 · azul (Packs)
	"#7c3aed", // chart-3 · violeta (Volumen)
	"#0891b2", // chart-2 · cyan
	"#b45309", // chart-4 · ámbar
	"#059669", // chart-5 · verde
	"#dc2626", // extra · rojo
	"#64748b", // extra · pizarra
	"#c026d3", // extra · magenta
];

// Colores semánticos de estado, compartidos por los gráficos que segmentan por
// estado de la cotización (mismos valores que --success / --warning / --destructive).
export const STATUS_COLORS = { confirmada: OK, pendiente: WN, rechazada: ER };

export function mont(sz) {
	return {
		fontFamily: "Montserrat,sans-serif",
		fontWeight: 600,
		fontSize: sz,
		color: BLACK,
	};
}

export function os(sz, w, col) {
	return {
		fontFamily: "'Open Sans',sans-serif",
		fontWeight: w || 400,
		fontSize: sz,
		color: col || BLACK,
	};
}
