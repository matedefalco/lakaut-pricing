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
	// Siempre 2 decimales, con separador de miles. Se usa tanto para precios unitarios
	// chicos (USD 0,65) como para los totales del resumen de cotización, que necesitan
	// los centavos sin perder el punto de miles (USD 3.399,00 y no 3399.00).
	const fMoney2 = function (n) {
		if (!isFinite(n)) return "—";
		if (currency === "ARS") return "$ " + Math.round(n * tc).toLocaleString("es-AR");
		const a = Math.abs(n).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
		return (n < 0 ? "−" : "") + "USD " + a;
	};
	return { fMoney, fMoney2 };
}
