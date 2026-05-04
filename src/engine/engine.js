import { SERVICES_DEF } from "../data/costs";
import { fD2 } from "../utils/formatters";

// ─── Engine ────────────────────────────────────────────────────────────────────
export function engine({ arch, inp, svc, users, costs }) {
	const { activosTotal, cfTotal, cfDirecto, cvCertBase, cvFirmaBase, capacidadFirmasAnual } = costs;
	const infraPorFirma = capacidadFirmasAnual > 0 ? activosTotal / (capacidadFirmasAnual / 12) : 0;
	let svcFirma = 0,
		svcCert = 0,
		svcUserMes = 0,
		svcPctRev = 0;
	Object.keys(svc).forEach(function (k) {
		if (!svc[k]) return;
		const d = SERVICES_DEF[k];
		if (!d) return;
		if (d.costType === "firma") svcFirma += d.cost;
		if (d.costType === "cert") svcCert += d.cost;
		if (d.costType === "user_mes") svcUserMes += d.cost;
		if (d.costType === "pct_rev") svcPctRev += d.cost;
	});

	// Parse arch/inp first to get firmasMesUsr before computing infraPorFirma
	let revMes = 0,
		firmasMesUsr = 0,
		certsMesUsr = 0;
	// displayPrice: what the customer actually sees/pays (not amortized)
	let displayPrice = "",
		displayPriceSuffix = "";

	if (arch === "ppu") {
		const fa = inp.firmasAsumidas || 5;
		revMes = (inp.precioCert || 0) / 24 + fa * (inp.precioFirma || 0);
		firmasMesUsr = fa;
		certsMesUsr = 1 / 24;
		displayPrice =
			"Cert " +
			fD2(inp.precioCert || 0) +
			" + " +
			fD2(inp.precioFirma || 0) +
			"/firma";
		displayPriceSuffix = "(" + fa + " firmas/mes asumidas)";
	} else if (arch === "sub") {
		revMes = inp.precio || 0;
		firmasMesUsr = inp.firmas || 0;
		certsMesUsr = 1 / 24;
		displayPrice = fD2(inp.precio || 0);
		displayPriceSuffix = "/mes";
	} else if (arch === "anual") {
		revMes = (inp.precio || 0) / 12;
		firmasMesUsr = (inp.firmas || 0) / 12;
		certsMesUsr = 1 / 12;
		displayPrice = fD2(inp.precio || 0);
		displayPriceSuffix = "/año (" + fD2((inp.precio || 0) / 12) + "/mes)";
	} else if (arch === "free") {
		revMes = 0;
		firmasMesUsr = inp.firmas || 1;
		certsMesUsr = 1 / 24;
		displayPrice = "USD 0";
		displayPriceSuffix = "(gratuito)";
	} else if (arch === "hibrido") {
		const p = inp.periodo || 24;
		revMes = ((inp.precioCert || 0) + (inp.precio || 0)) / p;
		firmasMesUsr = (inp.firmas || 0) / p;
		certsMesUsr = 1 / p;
		displayPrice =
			"Cert " + fD2(inp.precioCert || 0) + " + Bolsa " + fD2(inp.precio || 0);
		displayPriceSuffix = "/ pack (" + p + "m)";
	} else {
		// bolsa
		const p = inp.periodo || 24;
		revMes = (inp.precio || 0) / p;
		firmasMesUsr = (inp.firmas || 0) / p;
		certsMesUsr = 1 / p;
		displayPrice = fD2(inp.precio || 0);
		displayPriceSuffix = "/ pack (" + p + " meses)";
	}

	const cvFirmaUnit = cvFirmaBase + infraPorFirma + svcFirma;
	const cvCertUnit = cvCertBase + svcCert;

	const paywallCost = revMes * svcPctRev;
	const cvMes =
		certsMesUsr * cvCertUnit + firmasMesUsr * cvFirmaUnit + svcUserMes + paywallCost;
	const margenUnit = revMes - cvMes;
	const margenPct = revMes > 0 ? (margenUnit / revMes) * 100 : -100;
	const beUsuarios =
		margenUnit > 0 ? Math.ceil(cfDirecto / margenUnit) : Infinity;
	const revTotal = revMes * users,
		cvTotal = cvMes * users;
	const ebitda = revTotal - cvTotal - cfDirecto;
	const ebitdaPct =
		revTotal > 0 ? (ebitda / revTotal) * 100 : ebitda > 0 ? 100 : -100;
	const capFirmasMes = capacidadFirmasAnual / 12;
	const priceSug = cvMes + (firmasMesUsr > 0 && capFirmasMes > 0
		? cfDirecto * firmasMesUsr / capFirmasMes
		: 0);

	let acum = 0;
	const proj = Array.from({ length: 24 }, function (_, i) {
		const ramp = Math.min(1, 0.25 + i * 0.1);
		const uM = Math.round(users * ramp);
		const rM = revMes * uM,
			cM = cvMes * uM + cfDirecto,
			eM = rM - cM;
		acum += eM;
		return {
			mes: "M" + (i + 1),
			Revenue: Math.round(rM),
			Costo: Math.round(cM),
			EBITDA: Math.round(eM),
			Acumulado: Math.round(acum),
		};
	});
	const beIdx = proj.findIndex(function (p) {
		return p.Acumulado >= 0;
	});
	const beMes = beIdx >= 0 ? beIdx + 1 : null;

	return {
		infraPorFirma,
		firmasMesUsr,
		cvFirmaUnit,
		cvCertUnit,
		cvMes,
		revMes,
		margenUnit,
		margenPct,
		beUsuarios,
		revTotal,
		cvTotal,
		ebitda,
		ebitdaPct,
		priceSug,
		proj,
		beMes,
		svcUserMes,
		displayPrice,
		displayPriceSuffix,
	};
}
