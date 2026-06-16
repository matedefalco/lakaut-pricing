// ─── Volume-based B2B pricing tiers ───────────────────────────────────────────
// Methodology: cost-plus with fixed-cost absorption via setup fee.
// Unit = 1 certificado físico activo/año + firmasIncluidas firmas.
// Setup fee covers CF directo; unit price covers CV + margen de contribución.

export const DEFAULT_VOLUME_TIERS = [
	{
		id: "starter",
		label: "Starter",
		certsMin: 1,
		certsMax: 2500,
		precioCertFisica: 22,
		firmasIncluidas: 10,
		precioFirmaExtra: 0.5,
		setupFee: 500,
	},
	{
		id: "scale",
		label: "Scale",
		certsMin: 2501,
		certsMax: 10000,
		precioCertFisica: 14.5,
		firmasIncluidas: 20,
		precioFirmaExtra: 0.3,
		setupFee: 1200,
	},
	{
		id: "growth",
		label: "Growth",
		certsMin: 10001,
		certsMax: 50000,
		precioCertFisica: 11,
		firmasIncluidas: 25,
		precioFirmaExtra: 0.25,
		setupFee: 2000,
	},
	{
		id: "enterprise",
		label: "Enterprise",
		certsMin: 50001,
		certsMax: null, // sin límite
		precioCertFisica: null, // a negociar
		firmasIncluidas: null, // ilimitadas
		precioFirmaExtra: null,
		setupFee: null,
	},
];

export const PRECIO_CERT_JURIDICA = 70; // Fixed across all tiers

export function getTierForCerts(certs, tiers) {
	return (
		tiers.find(function (t) {
			return certs >= t.certsMin && (t.certsMax === null || certs <= t.certsMax);
		}) || null
	);
}

// Annual revenue projection for a B2B deal
export function calcVolumenDeal({ certsAnuales, certsJuridicas, modalidad, firmasPorCert, precioCertFisica, precioCertJuridica, firmasIncluidas, precioFirmaExtra, setupFee, cvCert, cvFirma }) {
	const cvCertAnual = cvCert / 2; // cert vigencia 2 años → amortizado
	const certsTotal = certsAnuales + certsJuridicas;
	const firmasExtra = modalidad === "bundle"
		? Math.max(0, firmasPorCert - firmasIncluidas) * certsTotal
		: 0;
	const firmasTotales = firmasPorCert * certsTotal;

	const revCertsFisicas = certsAnuales * precioCertFisica;
	const revCertsJuridicas = certsJuridicas * precioCertJuridica;
	const revFirmasExtra = modalidad === "bundle"
		? firmasExtra * precioFirmaExtra
		: firmasTotales * precioFirmaExtra; // à la demanda: todas las firmas se cobran separado
	const revSetup = (setupFee || 0) * 12;
	const revTotal = revCertsFisicas + revCertsJuridicas + revFirmasExtra + revSetup;

	const cvTotal = certsAnuales * cvCertAnual + firmasTotales * cvFirma + certsJuridicas * cvCertAnual;
	const margenBruto = revCertsFisicas + revCertsJuridicas + revFirmasExtra - cvTotal;
	const margenPct = (revCertsFisicas + revCertsJuridicas + revFirmasExtra) > 0
		? margenBruto / (revCertsFisicas + revCertsJuridicas + revFirmasExtra)
		: 0;

	return {
		revCertsFisicas,
		revCertsJuridicas,
		revFirmasExtra,
		revSetup,
		revTotal,
		cvTotal,
		firmasTotales,
		firmasExtra,
		margenBruto,
		margenPct,
	};
}
