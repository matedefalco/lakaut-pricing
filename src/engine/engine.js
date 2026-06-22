import { SERVICES_DEF } from "../data/costs";
import { fD2 } from "../utils/formatters";

// ─── Engine ────────────────────────────────────────────────────────────────────
export function engine({ arch, inp, svc, users, costs, projConfig }) {
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

	// Extra firma revenue: total fixed amount per month (bolsa only)
	// cantFirmasExtra = total firmas extra sold (not per-user)
	let extraRevMes = 0,
		extraFirmasMes = 0;

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
		// bolsa — extras son TOTAL vendido, no per-user
		const p = inp.periodo || 24;
		extraFirmasMes = (inp.cantFirmasExtra || 0) / p;
		extraRevMes = (inp.extraFirmaPrice || 0) * extraFirmasMes;
		revMes = (inp.precio || 0) / p;           // solo packs, per-user
		firmasMesUsr = (inp.firmas || 0) / p;     // solo firmas del pack, per-user
		certsMesUsr = 1 / p;
		displayPrice = fD2(inp.precio || 0);
		displayPriceSuffix = "/ pack (" + p + " meses)";
	}

	const cvFirmaUnit = cvFirmaBase + infraPorFirma + svcFirma;
	const cvCertUnit = cvCertBase + svcCert;

	// CV de extras: costo total mensual fijo (igual que extraRevMes, no per-user)
	const cvExtras = extraFirmasMes * cvFirmaUnit;

	const paywallCost = revMes * svcPctRev;
	const cvMes =
		certsMesUsr * cvCertUnit + firmasMesUsr * cvFirmaUnit + svcUserMes + paywallCost;
	const margenUnit = revMes - cvMes;
	const margenPct = revMes > 0 ? (margenUnit / revMes) * 100 : -100;

	// BE: extras compensan parte del CF fijo → reducen usuarios necesarios
	const cfNeto = cfDirecto + cvExtras - extraRevMes;
	const beUsuarios =
		margenUnit > 0 ? Math.max(0, Math.ceil(cfNeto / margenUnit)) : Infinity;

	const revPackTotal = revMes * users;
	const revTotal = revPackTotal + extraRevMes;
	const cvTotal = cvMes * users + cvExtras;
	const ebitda = revTotal - cvTotal - cfDirecto;
	const ebitdaPct =
		revTotal > 0 ? (ebitda / revTotal) * 100 : ebitda > 0 ? 100 : -100;
	const capFirmasMes = capacidadFirmasAnual / 12;
	const priceSug = cvMes + (firmasMesUsr > 0 && capFirmasMes > 0
		? cfDirecto * firmasMesUsr / capFirmasMes
		: 0);

	const { usersM1 = null, growthRate = 15, churnRate = 0, cac = 0 } = projConfig || {};
	const pU1 = usersM1 !== null ? usersM1 : Math.max(Math.round(users * 0.05), 10);
	const netRate = (growthRate - (arch === "sub" ? churnRate : 0)) / 100;

	let acum = 0;
	let prevU = 0;
	const proj = Array.from({ length: 24 }, function (_, i) {
		const uM = Math.max(0, Math.round(pU1 * Math.pow(1 + netRate, i)));
		const newUsers = Math.max(0, uM - prevU);
		prevU = uM;
		const cacCost = Math.round((cac || 0) * newUsers);
		const rPack = Math.round(revMes * uM);
		const rExtras = Math.round(extraRevMes);
		const rM = rPack + rExtras;
		const cM = Math.round(cvMes * uM + cfDirecto + cvExtras) + cacCost;
		const eM = rM - cM;
		acum += eM;
		return {
			mes: "M" + (i + 1),
			Revenue: rM,
			"Rev Pack": rPack,
			"Rev Extras": rExtras,
			Costo: cM,
			CAC: cacCost,
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
		cvExtras,
		revMes,
		extraRevMes,
		revPackTotal,
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
