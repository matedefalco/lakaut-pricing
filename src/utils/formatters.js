// ─── Formatters ───────────────────────────────────────────────────────────────
export function fD(n, d) {
	if (!isFinite(n)) return "—";
	const dec = d === undefined ? 0 : d;
	const a = Math.abs(n);
	const s =
		a >= 1000
			? a.toLocaleString("es-AR", { maximumFractionDigits: 0 })
			: a.toFixed(dec);
	return (n < 0 ? "−" : "") + "USD " + s;
}

export function fD2(n) {
	return isFinite(n) ? "USD " + n.toFixed(2) : "—";
}

export function fP(n) {
	return isFinite(n) ? n.toFixed(1) + "%" : "—";
}

export function fK(n) {
	if (!isFinite(n)) return "∞";
	if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
	if (n >= 1000) return Math.round(n / 1000) + "k";
	return String(Math.round(n));
}
