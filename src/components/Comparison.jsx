import { useMemo } from "react";
import { BLUE, BLUEL, BORD, GRAY, BLACK, WHITE, OK, OKBG, WN, WNBG, ER, ERBG, os, mont } from "../theme/tokens";
import { PLANS } from "../data/plans";
import { makeMoney } from "../utils/useMoney";
import { fP, fK } from "../utils/formatters";

function planMetrics(plan, costs) {
	const { cvCertBase, cvFirmaBase, cfDirecto } = costs;
	const periodo = plan.inp.periodo || 24;
	const precio  = plan.inp.precio;
	const firmas  = plan.inp.firmas || 0;
	const certs   = typeof plan.certs === "number" ? plan.certs : 4;

	const revMes    = precio / periodo;
	const certsMes  = certs / periodo;
	const firmasMes = firmas / periodo;
	const cvMes     = certsMes * cvCertBase + firmasMes * cvFirmaBase;
	const margenUnit = revMes - cvMes;
	const margenPct  = revMes > 0 ? (margenUnit / revMes) * 100 : -Infinity;
	const be         = margenUnit > 0 ? Math.ceil(cfDirecto / margenUnit) : Infinity;

	const threshold = plan.ilimitadas
		? (function () {
			const avail = revMes - (1 / periodo) * cvCertBase;
			return avail > 0 ? Math.floor(avail / cvFirmaBase) : 0;
		})()
		: null;

	const revenuePerFirma = firmas > 0 ? precio / firmas : null;

	return { revMes, cvMes, margenUnit, margenPct, be, threshold, revenuePerFirma };
}

export function Comparison({ costs, currency, tc }) {
	const { fMoney2 } = makeMoney(currency, tc);
	const plans = Object.values(PLANS);
	const metrics = useMemo(function () {
		return plans.map(function (p) { return planMetrics(p, costs); });
	}, [costs]);

	const ROWS = [
		{
			label: "Precio (USD)",
			render: function (p) { return fMoney2(p.priceUSD); },
			align: "right",
		},
		{
			label: "Firmas incluidas",
			render: function (p) { return p.ilimitadas ? "Ilimitadas ⚠" : (p.firmas || 0).toLocaleString("es-AR"); },
			align: "right",
			highlight: function (p) { return p.ilimitadas ? WN : null; },
		},
		{
			label: "Certificados",
			render: function (p) { return typeof p.certs === "number" ? p.certs : p.certs; },
			align: "right",
		},
		{
			label: "Vigencia",
			render: function (p) { return (p.inp.periodo || 24) + " meses"; },
			align: "right",
		},
		{
			label: "Revenue / mes / cliente",
			renderM: function (m) { return fMoney2(m.revMes); },
			align: "right",
		},
		{
			label: "CV / mes / cliente",
			renderM: function (m) { return fMoney2(m.cvMes); },
			align: "right",
		},
		{
			label: "Margen unitario",
			renderM: function (m) { return fMoney2(m.margenUnit); },
			colorM: function (m) { return m.margenUnit > 0 ? OK : ER; },
			align: "right",
		},
		{
			label: "Margen %",
			renderM: function (m) { return fP(m.margenPct); },
			colorM: function (m) { return m.margenPct > 40 ? OK : m.margenPct > 0 ? WN : ER; },
			align: "right",
		},
		{
			label: "Break-even (clientes)",
			renderM: function (m) { return isFinite(m.be) ? m.be.toLocaleString("es-AR") : "∞"; },
			colorM: function (m) { return isFinite(m.be) && m.be <= 5000 ? OK : m.be <= 20000 ? WN : ER; },
			align: "right",
		},
		{
			label: "Revenue por firma incl.",
			renderM: function (m, p) {
				return p.ilimitadas ? "—" : (m.revenuePerFirma ? "USD " + m.revenuePerFirma.toFixed(2) : "—");
			},
			align: "right",
		},
		{
			label: "Umbral rentabilidad",
			renderM: function (m) {
				return m.threshold !== null ? m.threshold + " firmas/mes" : "Cap incluido";
			},
			colorM: function (m) { return m.threshold !== null ? WN : OK; },
			align: "right",
		},
	];

	const thStyle = Object.assign({}, os(11, 700, WHITE), { padding: "10px 14px", textAlign: "left", whiteSpace: "nowrap" });
	const tdBase  = { padding: "9px 14px", verticalAlign: "middle" };

	return (
		<div>
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
				<div>
					<div style={Object.assign({}, mont(18), { marginBottom: 4 })}>Comparación de planes comerciales</div>
					<div style={os(12, 400, GRAY)}>
						Métricas calculadas con los costos actuales de la configuración. Enterprise asume 4 certificados (rango 3–5).
					</div>
				</div>
			</div>

			<div style={{ overflowX: "auto" }}>
				<table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
					<thead>
						<tr style={{ background: "#1e293b" }}>
							<th style={Object.assign({}, thStyle, { width: 200, borderRight: "1px solid #334155" })}>Métrica</th>
							{plans.map(function (p) {
								return (
									<th
										key={p.id}
										style={Object.assign({}, thStyle, {
											textAlign: "center",
											borderLeft: "2px solid " + p.color,
											borderTop: "3px solid " + p.color,
											background: p.color + "22",
										})}
									>
										<div style={Object.assign({}, mont(14), { color: p.color })}>{p.label}</div>
										<div style={os(10, 400, GRAY)}>{p.segment === "persona" ? "Personas" : "Empresas"}</div>
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{ROWS.map(function (row, ri) {
							const isEven = ri % 2 === 0;
							return (
								<tr key={row.label} style={{ background: isEven ? "#fafafa" : WHITE }}>
									<td style={Object.assign({}, os(12, 700, BLACK), tdBase, { borderRight: "1px solid " + BORD })}>
										{row.label}
									</td>
									{plans.map(function (p, pi) {
										const m = metrics[pi];
										const val = row.renderM
											? row.renderM(m, p)
											: row.render(p);
										const color = row.colorM
											? row.colorM(m, p)
											: (row.highlight ? row.highlight(p) : null);
										return (
											<td
												key={p.id}
												style={Object.assign({}, os(13, color ? 700 : 400, color || BLACK), tdBase, {
													textAlign: "right",
													borderLeft: "1px solid " + BORD,
													fontFamily: "Courier New,monospace",
												})}
											>
												{val}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{/* Risk summary */}
			<div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
				{plans.map(function (p, pi) {
					const m = metrics[pi];
					const isViable = isFinite(m.be) && m.margenUnit > 0;
					const risk = !isViable ? ER : m.margenPct < 30 ? WN : OK;
					const riskBg = !isViable ? ERBG : m.margenPct < 30 ? WNBG : OKBG;
					const riskLabel = !isViable ? "No viable" : m.margenPct < 30 ? "Margen ajustado" : "Viable";
					return (
						<div
							key={p.id}
							style={{
								background: WHITE,
								border: "2px solid " + p.color,
								borderRadius: 12,
								overflow: "hidden",
							}}
						>
							<div style={{ background: p.color, padding: "8px 14px" }}>
								<span style={Object.assign({}, mont(14), { color: WHITE })}>{p.label}</span>
								<span style={Object.assign({}, os(10, 400, WHITE), { opacity: 0.8, marginLeft: 8 })}>
									{p.priceUSD} USD · {p.inp.periodo}m
								</span>
							</div>
							<div style={{ padding: "12px 14px" }}>
								<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
									<span style={os(11, 400, GRAY)}>Margen</span>
									<span style={os(12, 700, m.margenPct > 40 ? OK : m.margenPct > 0 ? WN : ER)}>
										{fP(m.margenPct)}
									</span>
								</div>
								<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
									<span style={os(11, 400, GRAY)}>Break-even</span>
									<span style={os(12, 700, isFinite(m.be) ? OK : ER)}>
										{isFinite(m.be) ? m.be.toLocaleString("es-AR") + " clientes" : "∞"}
									</span>
								</div>
								{m.threshold !== null && (
									<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
										<span style={os(11, 400, GRAY)}>Umbral ilimitadas</span>
										<span style={os(12, 700, WN)}>{m.threshold} firmas/mes</span>
									</div>
								)}
								<div style={{ marginTop: 8, background: riskBg, borderRadius: 6, padding: "4px 10px", display: "inline-block" }}>
									<span style={os(10, 700, risk)}>{riskLabel}</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* CF reference */}
			<div style={{ marginTop: 20, background: BLUEL, border: "1px solid " + BORD, borderRadius: 8, padding: "10px 16px" }}>
				<span style={os(11, 400, GRAY)}>CF directo / mes: </span>
				<span style={os(11, 700, BLUE)}>USD {Math.round(costs.cfDirecto).toLocaleString("es-AR")}</span>
				<span style={Object.assign({}, os(11, 400, GRAY), { marginLeft: 16 })}>CV cert base: </span>
				<span style={os(11, 700, BLUE)}>USD {costs.cvCertBase.toFixed(4)}</span>
				<span style={Object.assign({}, os(11, 400, GRAY), { marginLeft: 16 })}>CV firma base: </span>
				<span style={os(11, 700, BLUE)}>USD {costs.cvFirmaBase.toFixed(4)}</span>
			</div>
		</div>
	);
}
