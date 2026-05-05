import { useState, useMemo } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, WN, WNBG, ER, os, mont } from "../../theme/tokens";
import { engine } from "../../engine/engine";
import { makeMoney } from "../../utils/useMoney";
import { NumInput } from "../ui/NumInput";
import { fP, fK } from "../../utils/formatters";

const VARIANTS = [
	{ k: "mensual", label: "Mensual", periodo: 1, badge: null },
	{ k: "anual", label: "Anual", periodo: 12, badge: "Más popular" },
	{ k: "bianual", label: "Bianuall (2 años)", periodo: 24, badge: "Mejor valor" },
];

function MetricRow({ label, values, format, highlightBest, lowerIsBetter }) {
	const nums = values.map(function (v) { return typeof v === "number" ? v : null; });
	const validNums = nums.filter(function (v) { return v !== null && isFinite(v); });
	const best = validNums.length > 0
		? (lowerIsBetter ? Math.min(...validNums) : Math.max(...validNums))
		: null;

	return (
		<tr>
			<td style={{ padding: "8px 12px", borderBottom: "1px solid " + BORD }}>
				<span style={os(12, 400, GRAY)}>{label}</span>
			</td>
			{values.map(function (v, i) {
				const isBest = highlightBest && v === best;
				return (
					<td
						key={i}
						style={{
							padding: "8px 12px",
							borderBottom: "1px solid " + BORD,
							textAlign: "right",
							background: isBest ? "#d1fae5" : "transparent",
						}}
					>
						<span style={os(12, isBest ? 700 : 400, isBest ? OK : BLACK)}>
							{v === null || !isFinite(v) ? "—" : format(v)}
						</span>
					</td>
				);
			})}
		</tr>
	);
}

export function TabSuscripcion({ costs, currency, tc, users }) {
	const { fMoney, fMoney2 } = makeMoney(currency, tc);

	// Base configuration
	const [basePrice, setBasePrice] = useState(8);
	const [firmasMes, setFirmasMes] = useState(10);
	const [extraFirma, setExtraFirma] = useState(1.0);
	const [discountAnual, setDiscountAnual] = useState(16);
	const [discountBianual, setDiscountBianual] = useState(25);
	const [refUsers, setRefUsers] = useState(users || 1000);

	const variants = useMemo(function () {
		return VARIANTS.map(function (v) {
			let precio, firmas, arch, inp;

			if (v.k === "mensual") {
				precio = basePrice;
				firmas = firmasMes;
				arch = "sub";
				inp = { precio, firmas, periodo: 1, extraFirma };
			} else if (v.k === "anual") {
				const mensual = basePrice * 12;
				precio = Math.round(mensual * (1 - discountAnual / 100) * 100) / 100;
				firmas = firmasMes * 12;
				arch = "anual";
				inp = { precio, firmas, periodo: 12 };
			} else {
				const mensual = basePrice * 24;
				precio = Math.round(mensual * (1 - discountBianual / 100) * 100) / 100;
				firmas = firmasMes * 24;
				arch = "anual"; // same arch logic, 24-month period
				inp = { precio, firmas, periodo: 24 };
			}

			const svc = { cloudStorage: false, mailCert: false, paywall: false };
			const calcs = engine({ arch, inp, svc, users: refUsers, costs });
			const precioMensualEq = v.k === "mensual" ? precio : precio / v.periodo;
			const ahorroVsMensual = v.k === "mensual" ? 0 : (basePrice - precioMensualEq) * v.periodo;

			return Object.assign({}, v, { precio, firmas, arch, inp, calcs, precioMensualEq, ahorroVsMensual });
		});
	}, [basePrice, firmasMes, extraFirma, discountAnual, discountBianual, refUsers, costs]);

	return (
		<div>
			{/* Config panel */}
			<div style={{
				background: WHITE,
				border: "1px solid " + BORD,
				borderRadius: 12,
				padding: 16,
				marginBottom: 20,
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
				gap: 12,
			}}>
				<NumInput label="Precio mensual base (USD)" value={basePrice} onChange={setBasePrice} prefix="USD" />
				<NumInput label="Firmas incluidas / mes" value={firmasMes} onChange={setFirmasMes} suffix="firmas" />
				<NumInput label="Firma adicional (USD)" value={extraFirma} onChange={setExtraFirma} prefix="USD" suffix="/ firma" />
				<NumInput label="Descuento plan Anual (%)" value={discountAnual} onChange={setDiscountAnual} suffix="%" />
				<NumInput label="Descuento plan Bianual (%)" value={discountBianual} onChange={setDiscountBianual} suffix="%" />
				<NumInput label="Usuarios de referencia" value={refUsers} onChange={setRefUsers} suffix="usu" />
			</div>

			{/* Variant cards */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 24 }}>
				{variants.map(function (v) {
					const mc = v.calcs.margenPct > 30 ? OK : v.calcs.margenPct > 0 ? WN : ER;
					return (
						<div
							key={v.k}
							style={{
								background: WHITE,
								border: "2px solid " + BORD,
								borderRadius: 12,
								overflow: "hidden",
							}}
						>
							{/* Header */}
							<div style={{ background: BLUE, padding: "12px 16px" }}>
								{v.badge && (
									<div style={Object.assign({}, os(9, 700, BLUE), {
										background: "#fef3c7",
										display: "inline-block",
										padding: "2px 7px",
										borderRadius: 10,
										marginBottom: 5,
									})}>
										{v.badge}
									</div>
								)}
								<div style={Object.assign({}, mont(16), { color: WHITE })}>{v.label}</div>
							</div>

							{/* Pricing */}
							<div style={{ padding: "14px 16px", borderBottom: "1px solid " + BORD }}>
								<div style={Object.assign({}, mont(26), { color: BLUE })}>
									{fMoney2(v.precio)}
								</div>
								<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>
									{v.k === "mensual" ? "/ mes" : "pago " + (v.k === "anual" ? "anual" : "bianual")}
								</div>
								{v.k !== "mensual" && (
									<>
										<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 4 })}>
											Equivale a {fMoney2(v.precioMensualEq)} / mes
										</div>
										<div style={Object.assign({}, os(11, 700, OK), { marginTop: 3 })}>
											Ahorro: {fMoney2(v.ahorroVsMensual)} vs mensual
										</div>
									</>
								)}
							</div>

							{/* Pack details */}
							<div style={{ padding: "12px 16px", borderBottom: "1px solid " + BORD }}>
								<div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
									{[
										{ label: "Firmas incluidas", value: v.firmas.toLocaleString("es-AR") + " firmas" },
										{ label: "Período", value: v.periodo + (v.periodo === 1 ? " mes" : " meses") },
										...(v.k === "mensual" ? [{ label: "Firma adicional", value: fMoney2(extraFirma) + " / firma" }] : []),
									].map(function (row) {
										return (
											<div key={row.label} style={{ display: "flex", justifyContent: "space-between" }}>
												<span style={os(11, 400, GRAY)}>{row.label}</span>
												<span style={os(11, 700, BLACK)}>{row.value}</span>
											</div>
										);
									})}
								</div>
							</div>

							{/* Financial metrics */}
							<div style={{ padding: "12px 16px", background: "#fafafa" }}>
								<div style={Object.assign({}, os(9, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
									Análisis financiero
								</div>
								<div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
									{[
										{ label: "Margen %", value: fP(v.calcs.margenPct), color: mc },
										{ label: "Break-even", value: isFinite(v.calcs.beUsuarios) ? fK(v.calcs.beUsuarios) + " usu." : "∞", color: isFinite(v.calcs.beUsuarios) ? OK : WN },
										{ label: "EBITDA / mes", value: fMoney(v.calcs.ebitda), color: v.calcs.ebitda > 0 ? OK : ER },
									].map(function (m) {
										return (
											<div key={m.label} style={{ display: "flex", justifyContent: "space-between" }}>
												<span style={os(11, 400, GRAY)}>{m.label}</span>
												<span style={os(11, 700, m.color)}>{m.value}</span>
											</div>
										);
									})}
								</div>
							</div>
						</div>
					);
				})}
			</div>

			{/* Metric comparison table */}
			<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, overflow: "hidden" }}>
				<div style={{ padding: "12px 16px", borderBottom: "1px solid " + BORD }}>
					<div style={Object.assign({}, os(11, 700, BLACK))}>Comparación de métricas</div>
					<div style={os(10, 400, GRAY)}>Verde = mejor valor en esa métrica</div>
				</div>
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<thead>
							<tr style={{ background: "#fafafa" }}>
								<th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid " + BORD }}>
									<span style={os(10, 700, GRAY)}>MÉTRICA</span>
								</th>
								{variants.map(function (v) {
									return (
										<th key={v.k} style={{ padding: "8px 12px", textAlign: "right", borderBottom: "1px solid " + BORD }}>
											<span style={os(10, 700, GRAY)}>{v.label.toUpperCase()}</span>
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							<MetricRow
								label="Precio (pago total)"
								values={variants.map(function (v) { return v.precio; })}
								format={fMoney2}
								highlightBest={false}
							/>
							<MetricRow
								label="Precio / mes efectivo"
								values={variants.map(function (v) { return v.precioMensualEq; })}
								format={fMoney2}
								highlightBest={true}
								lowerIsBetter={true}
							/>
							<MetricRow
								label="Margen unitario %"
								values={variants.map(function (v) { return v.calcs.margenPct; })}
								format={fP}
								highlightBest={true}
								lowerIsBetter={false}
							/>
							<MetricRow
								label={"Revenue / mes (" + fK(refUsers) + " usu.)"}
								values={variants.map(function (v) { return v.calcs.revTotal; })}
								format={fMoney}
								highlightBest={true}
								lowerIsBetter={false}
							/>
							<MetricRow
								label={"EBITDA / mes (" + fK(refUsers) + " usu.)"}
								values={variants.map(function (v) { return v.calcs.ebitda; })}
								format={fMoney}
								highlightBest={true}
								lowerIsBetter={false}
							/>
							<MetricRow
								label="Break-even (usuarios)"
								values={variants.map(function (v) { return isFinite(v.calcs.beUsuarios) ? v.calcs.beUsuarios : null; })}
								format={function (v) { return fK(v) + " usu."; }}
								highlightBest={true}
								lowerIsBetter={true}
							/>
							<MetricRow
								label="CV / pack"
								values={variants.map(function (v) { return v.calcs.cvMes * v.periodo; })}
								format={fMoney2}
								highlightBest={true}
								lowerIsBetter={true}
							/>
							<MetricRow
								label="Precio / firma"
								values={variants.map(function (v) { return v.firmas > 0 ? v.precio / v.firmas : null; })}
								format={fMoney2}
								highlightBest={true}
								lowerIsBetter={true}
							/>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
