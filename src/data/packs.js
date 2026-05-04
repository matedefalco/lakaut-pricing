// ─── Pack definitions ──────────────────────────────────────────────────────────
export const PACKS = {
	A: {
		label: "Bolsa Prepaga",
		desc: "Pago único · vigencia 24 meses",
		arch: "bolsa",
		strategy:
			"El usuario paga una vez y accede a un certificado digital más una bolsa de firmas válida por 24 meses. Sin compromiso mensual ni renovación automática. Apunta a usuarios ocasionales o captura el pago completo por adelantado, mejorando el cash flow inicial de la empresa.",
		defaults: { precio: 19, firmas: 15, periodo: 24 },
	},
	B: {
		label: "Suscripción",
		desc: "Recurrente mensual · MRR predecible",
		arch: "sub",
		strategy:
			"El usuario paga una mensualidad fija y recibe un cupo de firmas incluidas; si lo supera, paga por firma adicional. Genera MRR (Monthly Recurring Revenue) predecible: la métrica más valorada en una valuación o exit. La retención del usuario es el KPI crítico.",
		defaults: { precio: 8, firmas: 10, periodo: 1, extraFirma: 1.0 },
	},
	C: {
		label: "Pay-per-Use",
		desc: "Por consumo · sin mensualidad",
		arch: "ppu",
		strategy:
			"El usuario adquiere el certificado una vez y luego paga exclusivamente por cada firma ejecutada. Maximiza la flexibilidad, pero sacrifica la predictibilidad del ingreso. Recomendado como complemento o para integradores B2B, no como producto masivo B2C.",
		defaults: {
			precioCert: 5,
			precioFirma: 1.5,
			firmasAsumidas: 5,
			periodo: 1,
		},
	},
	D: {
		label: "Anual",
		desc: "Pago anual · descuento incluido",
		arch: "anual",
		strategy:
			"El usuario paga un año completo por adelantado a cambio de un descuento del 16–20% vs la suscripción mensual equivalente. Genera cash flow anticipado y reduce el churn: quien pagó el año tiene bajo incentivo a cancelar. Recomendado como upsell desde Suscripción.",
		defaults: { precio: 80, firmas: 120, periodo: 12 },
	},
	E: {
		label: "Freemium",
		desc: "Gratis · motor de adquisición",
		arch: "free",
		strategy:
			"El usuario accede gratis al certificado y a un número limitado de firmas. No genera revenue directo: cada usuario gratuito tiene un costo que la empresa absorbe. Su único objetivo es bajar la fricción de adquisición y alimentar el funnel de conversión. Viabilidad: tasa de conversión a pago debe superar el 4–5%.",
		defaults: { precio: 0, firmas: 1, periodo: 1 },
	},
	F: {
		label: "Híbrido",
		desc: "Cert + bolsa · modular",
		arch: "hibrido",
		strategy:
			"Separa explícitamente el certificado (alta + 24 meses de vigencia) de la bolsa de firmas. El usuario elige pagar por el componente que necesita. Estrategia modular: permite ventas incrementales y es ideal para usuarios con un único trámite o para integradores que solo necesitan firmas.",
		defaults: {
			precioCert: 5,
			precio: 7,
			firmas: 10,
			periodo: 24,
			extraFirma: 1.0,
		},
	},
};
