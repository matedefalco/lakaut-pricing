import { engine } from "./engine";

// ─── Break-even chart data: sweep users 0..focused range, show EBITDA ────────
export function beCurveData(arch, inp, svc, currentUsers, costs) {
	const c0 = engine({ arch, inp, svc, users: currentUsers, costs });
	const beU = isFinite(c0.beUsuarios) ? c0.beUsuarios : null;
	// Focus the range around the BE point; include currentUsers in view
	const maxU = beU
		? Math.max(Math.ceil(beU * 2.5), currentUsers, 2000)
		: Math.max(currentUsers * 2, 5000);
	const step = Math.max(Math.round(maxU / 40), 100);
	const points = [];
	for (let u = 0; u <= maxU; u += step) {
		const c = engine({ arch, inp, svc, users: u, costs });
		points.push({
			users: u,
			EBITDA: Math.round(c.ebitda),
			Revenue: Math.round(c.revTotal),
			Costo: Math.round(c.cvTotal + costs.cfDirecto),
		});
	}
	return points;
}

// ─── Price sensitivity: sweep price, show BE users ────────────────────────────
export function priceSensData(arch, inp, svc, users, costs) {
	const c0 = engine({ arch, inp, svc, users, costs });
	const minPrice = c0.cvMes * 0.5;
	const maxPrice = c0.cvMes * 5 || 10;
	const step = (maxPrice - minPrice) / 40;
	// Cap y-axis: 5× current BE so the curve is readable near the current price
	const beNow = isFinite(c0.beUsuarios) ? c0.beUsuarios : null;
	const yMax = beNow ? Math.max(beNow * 5, 5000) : 50000;
	const points = [];
	for (let price = minPrice; price <= maxPrice; price += step) {
		const margin = price - c0.cvMes;
		const be = margin > 0 ? Math.ceil(costs.cfDirecto / margin) : null;
		points.push({
			precio: parseFloat(price.toFixed(3)),
			BE_usuarios: be ? Math.min(be, yMax) : null,
		});
	}
	return points;
}
