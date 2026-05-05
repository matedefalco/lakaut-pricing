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
