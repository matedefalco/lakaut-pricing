import { engine } from "./engine";

// ─── Break-even chart data: sweep users 0..3x, show EBITDA ────────────────────
export function beCurveData(arch, inp, svc, currentUsers, costs) {
	const maxU = Math.max(currentUsers * 3, 150000);
	const step = Math.max(Math.round(maxU / 40), 500);
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
	const points = [];
	for (let price = minPrice; price <= maxPrice; price += step) {
		const margin = price - c0.cvMes;
		const be = margin > 0 ? Math.ceil(costs.cfDirecto / margin) : null;
		points.push({
			precio: parseFloat(price.toFixed(3)),
			BE_usuarios: be ? Math.min(be, 500000) : null,
		});
	}
	return points;
}
