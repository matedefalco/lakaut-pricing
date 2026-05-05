// ─── Derive engine `inp` from a commercial model ───────────────────────────────
// Maps model commercial params to the shape the engine expects per arch.

export function modelToInp(model) {
	const { arch, priceUSD, firmas, vigencia, billingPeriod, extraFirmaPrice } = model;

	switch (arch) {
		case "sub":
			return {
				precio: priceUSD,
				firmas: firmas || 0,
				periodo: billingPeriod || 1,
				extraFirma: extraFirmaPrice || 1.0,
			};
		case "anual":
			return {
				precio: priceUSD,
				firmas: firmas || 0,
				periodo: billingPeriod || 12,
			};
		case "ppu":
			return {
				precioCert: priceUSD,
				precioFirma: extraFirmaPrice || 1.5,
				firmasAsumidas: firmas || 5,
				periodo: 1,
			};
		case "free":
			return {
				precio: 0,
				firmas: firmas || 1,
				periodo: vigencia || 24,
			};
		case "hibrido":
			return {
				precioCert: priceUSD * 0.4,
				precio: priceUSD * 0.6,
				firmas: firmas || 0,
				periodo: vigencia || 24,
				extraFirma: extraFirmaPrice || 1.0,
			};
		default: // bolsa
			return {
				precio: priceUSD,
				firmas: firmas || 0,
				periodo: vigencia || 24,
			};
	}
}
