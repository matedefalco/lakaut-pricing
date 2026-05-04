// ─── makeMoney factory ────────────────────────────────────────────────────────
// Returns { fMoney, fMoney2 } bound to the given currency + exchange rate.
export function makeMoney(currency, tc) {
	const fMoney = function (n, d) {
		if (!isFinite(n)) return "—";
		if (currency === "ARS") return "$ " + Math.round(n * tc).toLocaleString("es-AR");
		const dec = d !== undefined ? d : 0;
		const a = Math.abs(n);
		const s = a >= 1000 ? a.toLocaleString("es-AR", { maximumFractionDigits: 0 }) : a.toFixed(dec);
		return (n < 0 ? "−" : "") + "USD " + s;
	};
	const fMoney2 = function (n) {
		if (!isFinite(n)) return "—";
		if (currency === "ARS") return "$ " + Math.round(n * tc).toLocaleString("es-AR");
		return "USD " + n.toFixed(2);
	};
	return { fMoney, fMoney2 };
}
