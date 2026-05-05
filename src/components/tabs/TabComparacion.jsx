import { useState, useMemo } from "react";
import {
	ResponsiveContainer, ComposedChart, Bar, Line,
	XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
	Cell, LabelList,
} from "recharts";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, WN, ER, os, mont } from "../../theme/tokens";
import { useModels } from "../../context/ModelsContext";
import { engine } from "../../engine/engine";
import { modelToInp } from "../../utils/modelToInp";
import { makeMoney } from "../../utils/useMoney";
import { fP, fK, fD2 } from "../../utils/formatters";
import { NumInput } from "../ui/NumInput";

// ─── Metric definitions ────────────────────────────────────────────────────────
const METRICS = [
	{ id: "margenPct", label: "Margen %", fmt: fP, higherIsBetter: true, get: function (c) { return c.margenPct; } },
	{ id: "revMes", label: "Revenue / mes (ref)", fmt: function (v, fm) { return fm(v); }, higherIsBetter: true, get: function (c) { return c.revTotal; } },
	{ id: "ebitda", label: "EBITDA / mes (ref)", fmt: function (v, fm) { return fm(v); }, higherIsBetter: true, get: function (c) { return c.ebitda; } },
	{ id: "margenUnit", label: "Margen unitario", fmt: function (v, fm) { return fm(v) + " / usu."; }, higherIsBetter: true, get: function (c) { return c.margenUnit; } },
	{ id: "beUsuarios", label: "Break-even (usu.)", fmt: function (v) { return isFinite(v) ? fK(v) + " usu." : "∞"; }, higherIsBetter: false, get: function (c) { return c.beUsuarios; } },
	{ id: "cvMes", label: "CV / usuario / mes", fmt: function (v, fm) { return fm(v); }, higherIsBetter: false, get: function (c) { return c.cvMes; } },
	{ id: "precioFirma", label: "Precio / firma", fmt: function (v, fm2) { return fm2(v); }, higherIsBetter: false, get: null }, // computed separately
	{ id: "ltv", label: "LTV (precio × vigencia)", fmt: function (v, fm) { return fm(v); }, higherIsBetter: true, get: null }, // computed separately
];

function bestInRow(values, higherIsBetter) {
	const valid = values.filter(function (v) { return v !== null && isFinite(v); });
	if (valid.length === 0) return null;
	return higherIsBetter ? Math.max(...valid) : Math.min(...valid);
}

function MetricMatrix({ rows }) {
	// rows: [{ label, values: [{ value, formatted, isBest }], higherIsBetter }]
	return (
		<div style={{ overflowX: "auto" }}>
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<tbody>
					{rows.map(function (row, ri) {
						return (
							<tr key={ri} style={{ background: ri % 2 === 0 ? WHITE : "#fafafa" }}>
								<td style={{ padding: "8px 14px", borderBottom: "1px solid " + BORD, minWidth: 160 }}>
									<span style={os(11, 400, GRAY)}>{row.label}</span>
								</td>
								{row.values.map(function (cell, ci) {
									return (
										<td
											key={ci}
											style={{
												padding: "8px 14px",
												borderBottom: "1px solid " + BORD,
												textAlign: "right",
												background: cell.isBest ? "#d1fae5" : "transparent",
											}}
										>
											<span style={os(12, cell.isBest ? 700 : 400, cell.isBest ? OK : cell.value < 0 ? ER : BLACK)}>
												{cell.formatted}
											</span>
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// Dash patterns for distinguishable multi-line charts
const DASH_PATTERNS = ["0", "6 3", "2 3", "8 3 2 3", "4 2 4 2", "1 3"];

function ChartCard({ title, subtitle, children, fullWidth }) {
	return (
		<div style={{
			background: WHITE,
			border: "1px solid " + BORD,
			borderRadius: 12,
			padding: "16px 20px",
			gridColumn: fullWidth ? "1 / -1" : undefined,
		}}>
			<div style={Object.assign({}, os(12, 700, BLACK), { marginBottom: 2 })}>{title}</div>
			{subtitle && <div style={Object.assign({}, os(10, 400, GRAY), { marginBottom: 14 })}>{subtitle}</div>}
			{!subtitle && <div style={{ marginBottom: 14 }} />}
			{children}
		</div>
	);
}

function customTooltipStyle() {
	return {
		background: WHITE,
		border: "1px solid " + BORD,
		borderRadius: 8,
		padding: "8px 12px",
		fontFamily: "'Open Sans',sans-serif",
		fontSize: 11,
	};
}

export function TabComparacion({ costs, currency, tc }) {
	const { models } = useModels();
	const { fMoney, fMoney2 } = makeMoney(currency, tc);

	// Selection state
	const [selectedIds, setSelectedIds] = useState(function () {
		return models.slice(0, Math.min(4, models.length)).map(function (m) { return m.id; });
	});
	const [refUsers, setRefUsers] = useState(1000);
	const [growthRate, setGrowthRate] = useState(10);
	const [churnRate, setChurnRate] = useState(5);
	const [sensitivityFirmas, setSensitivityFirmas] = useState(50);

	// Active charts
	const [activeCharts, setActiveCharts] = useState({
		margen: true,
		ebitda: true,
		breakeven: true,
		arpu: true,
		ltvcv: false,
		margenUnit: false,
		proyeccionRev: true,
		proyeccionEbitda: false,
		sensibilidad: true,
		sensibilidadUsu: false,
	});

	function toggleChart(k) {
		setActiveCharts(function (prev) { return Object.assign({}, prev, { [k]: !prev[k] }); });
	}

	function toggleModel(id) {
		setSelectedIds(function (prev) {
			return prev.includes(id) ? prev.filter(function (x) { return x !== id; }) : [...prev, id];
		});
	}

	const selectedModels = models.filter(function (m) { return selectedIds.includes(m.id); });

	// Compute engine results per model
	const results = useMemo(function () {
		return selectedModels.map(function (model) {
			const inp = modelToInp(model);
			const svc = model.services || { cloudStorage: false, mailCert: false, paywall: false };
			const calcs = engine({ arch: model.arch || "bolsa", inp, svc, users: refUsers, costs, projConfig: { usersM1: Math.round(refUsers * 0.05), growthRate, churnRate } });
			const precioFirma = model.firmas > 0 ? model.priceUSD / model.firmas : null;
			const ltv = model.priceUSD;
			return { model, calcs, precioFirma, ltv };
		});
	}, [selectedModels, refUsers, growthRate, churnRate, costs]);

	// Sensitivity: vary firmas and see margen change per model
	const sensitivityData = useMemo(function () {
		const steps = [10, 25, 50, 100, 200, 500, 1000, 2000, 5000];
		return steps.map(function (firmas) {
			const row = { firmas };
			selectedModels.forEach(function (model) {
				const baseInp = modelToInp(model);
				const modifiedInp = Object.assign({}, baseInp, { firmas });
				const svc = model.services || { cloudStorage: false, mailCert: false, paywall: false };
				const c = engine({ arch: model.arch || "bolsa", inp: modifiedInp, svc, users: refUsers, costs });
				row[model.id] = Math.round(c.margenPct * 10) / 10;
			});
			return row;
		});
	}, [selectedModels, refUsers, costs]);

	// Projection data: revenue + ebitda per model over 24 months
	const projData = useMemo(function () {
		return Array.from({ length: 24 }, function (_, i) {
			const row = { mes: "M" + (i + 1), label: i % 5 === 0 || i === 23 ? "M" + (i + 1) : "" };
			results.forEach(function (r) {
				const p = r.calcs.proj[i];
				row[r.model.id + "_rev"] = p ? Math.round(p.Revenue) : 0;
				row[r.model.id + "_ebitda"] = p ? Math.round(p.EBITDA || 0) : 0;
			});
			return row;
		});
	}, [results]);

	// Sensitivity by users: margen% as users grow
	const sensitivityUsersData = useMemo(function () {
		const steps = [100, 250, 500, 1000, 2000, 5000, 10000, 25000, 50000];
		return steps.map(function (usu) {
			const row = { usu };
			selectedModels.forEach(function (model) {
				const inp = modelToInp(model);
				const svc = model.services || { cloudStorage: false, mailCert: false, paywall: false };
				const c = engine({ arch: model.arch || "bolsa", inp, svc, users: usu, costs });
				row[model.id] = Math.round(c.margenPct * 10) / 10;
			});
			return row;
		});
	}, [selectedModels, costs]);

	// Build metric matrix rows
	const matrixRows = useMemo(function () {
		return METRICS.map(function (metric) {
			const rawValues = results.map(function (r) {
				if (metric.id === "precioFirma") return r.precioFirma;
				if (metric.id === "ltv") return r.ltv;
				return metric.get ? metric.get(r.calcs) : null;
			});
			const best = bestInRow(rawValues, metric.higherIsBetter);
			const values = rawValues.map(function (v) {
				const formatted = v === null || !isFinite(v)
					? "—"
					: (metric.id === "margenPct" ? fP(v)
						: metric.id === "beUsuarios" ? (isFinite(v) ? fK(v) + " usu." : "∞")
						: metric.id === "precioFirma" ? fMoney2(v)
						: metric.id === "ltv" ? fMoney2(v)
						: metric.id === "cvMes" || metric.id === "margenUnit" ? fMoney2(v)
						: fMoney(v));
				return { value: v, formatted, isBest: v !== null && isFinite(v) && v === best };
			});
			return { label: metric.label, values, higherIsBetter: metric.higherIsBetter };
		});
	}, [results, fMoney, fMoney2]);

	// Bar chart data per model
	const barData = useMemo(function () {
		return results.map(function (r) {
			const arpu = refUsers > 0 ? r.calcs.revTotal / refUsers : 0;
			const cvTotal = r.calcs.cvMes * (r.model.vigencia || 24);
			const ltvCvRatio = cvTotal > 0 ? r.model.priceUSD / cvTotal : null;
			return {
				name: r.model.label,
				color: r.model.color,
				margen: Math.round(r.calcs.margenPct * 10) / 10,
				ebitda: Math.round(r.calcs.ebitda),
				be: isFinite(r.calcs.beUsuarios) ? Math.round(r.calcs.beUsuarios) : null,
				arpu: Math.round(arpu * 100) / 100,
				margenUnit: Math.round(r.calcs.margenUnit * 100) / 100,
				ltvcv: ltvCvRatio !== null ? Math.round(ltvCvRatio * 10) / 10 : null,
			};
		});
	}, [results, refUsers]);

	if (models.length === 0) {
		return (
			<div style={{ textAlign: "center", padding: 40, color: GRAY }}>
				<div style={os(13, 400, GRAY)}>No hay modelos guardados.</div>
				<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 4 })}>Creá modelos en la pestaña "Guardados" primero.</div>
			</div>
		);
	}

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

			{/* ─── Config bar ─────────────────────────────────────────────────────── */}
			<div style={{
				background: WHITE,
				border: "1px solid " + BORD,
				borderRadius: 12,
				padding: 16,
				display: "grid",
				gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
				gap: 12,
			}}>
				<NumInput label="Usuarios de referencia" value={refUsers} onChange={setRefUsers} suffix="usu" />
				<NumInput label="Crecimiento mensual (%)" value={growthRate} onChange={setGrowthRate} suffix="%" />
				<NumInput label="Churn mensual (%)" value={churnRate} onChange={setChurnRate} suffix="%" />
				<NumInput label="Firmas (sensibilidad)" value={sensitivityFirmas} onChange={setSensitivityFirmas} suffix="firmas" />
			</div>

			{/* ─── Model selector ──────────────────────────────────────────────────── */}
			<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: 16 }}>
				<div style={Object.assign({}, os(11, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 })}>
					Modelos a comparar ({selectedIds.length} activos)
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
					{models.map(function (model) {
						const active = selectedIds.includes(model.id);
						return (
							<button
								key={model.id}
								onClick={function () { toggleModel(model.id); }}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 6,
									padding: "6px 12px",
									borderRadius: 20,
									border: "1.5px solid " + (active ? model.color : BORD),
									background: active ? model.color + "15" : WHITE,
									cursor: "pointer",
									fontFamily: "'Open Sans',sans-serif",
									fontSize: 12,
									fontWeight: active ? 700 : 400,
									color: active ? model.color : GRAY,
								}}
							>
								<span style={{ width: 8, height: 8, borderRadius: "50%", background: active ? model.color : BORD, flexShrink: 0 }} />
								{model.label}
							</button>
						);
					})}
				</div>
			</div>

			{selectedModels.length === 0 && (
				<div style={{ textAlign: "center", padding: 32, color: GRAY, background: BLUEL, borderRadius: 12 }}>
					<div style={os(12, 400, GRAY)}>Seleccioná al menos un modelo para ver la comparación.</div>
				</div>
			)}

			{selectedModels.length > 0 && (
				<>
					{/* ─── Metric matrix ──────────────────────────────────────────────── */}
					<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, overflow: "hidden" }}>
						<div style={{
							padding: "12px 16px",
							borderBottom: "1px solid " + BORD,
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}>
							<div style={os(11, 700, BLACK)}>Matriz de métricas</div>
							<div style={os(10, 400, GRAY)}>Verde = mejor valor · Rojo = negativo</div>
						</div>
						{/* Table header with model names */}
						<div style={{ overflowX: "auto" }}>
							<table style={{ width: "100%", borderCollapse: "collapse" }}>
								<thead>
									<tr style={{ background: "#fafafa" }}>
										<th style={{ padding: "8px 14px", textAlign: "left", borderBottom: "1px solid " + BORD, minWidth: 160 }}>
											<span style={os(10, 700, GRAY)}>MÉTRICA</span>
										</th>
										{selectedModels.map(function (m) {
											return (
												<th key={m.id} style={{ padding: "8px 14px", textAlign: "right", borderBottom: "1px solid " + BORD }}>
													<div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
														<span style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
														<span style={os(10, 700, m.color)}>{m.label}</span>
													</div>
												</th>
											);
										})}
									</tr>
								</thead>
							</table>
							<MetricMatrix rows={matrixRows} />
						</div>
					</div>

					{/* ─── Chart toggles ──────────────────────────────────────────────── */}
					<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: "12px 16px" }}>
						<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 })}>
							Gráficos activos
						</div>
						{[
							{ group: "Punto de operación", items: [
								{ k: "margen", label: "Margen %" },
								{ k: "ebitda", label: "EBITDA" },
								{ k: "breakeven", label: "Break-even usuarios" },
								{ k: "arpu", label: "ARPU mensual" },
								{ k: "margenUnit", label: "Margen unitario" },
								{ k: "ltvcv", label: "Ratio LTV / CV" },
							]},
							{ group: "Proyecciones 24 meses", items: [
								{ k: "proyeccionRev", label: "Revenue" },
								{ k: "proyeccionEbitda", label: "EBITDA" },
							]},
							{ group: "Sensibilidad", items: [
								{ k: "sensibilidad", label: "Margen vs firmas del pack" },
								{ k: "sensibilidadUsu", label: "Margen vs base de usuarios" },
							]},
						].map(function (group) {
							return (
								<div key={group.group} style={{ marginBottom: 10 }}>
									<div style={Object.assign({}, os(10, 400, GRAY), { marginBottom: 6 })}>{group.group}</div>
									<div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
										{group.items.map(function (ch) {
											const active = activeCharts[ch.k];
											return (
												<button
													key={ch.k}
													onClick={function () { toggleChart(ch.k); }}
													style={{
														padding: "4px 11px",
														borderRadius: 20,
														border: "1.5px solid " + (active ? BLUE : BORD),
														background: active ? BLUEL : WHITE,
														color: active ? BLUE : GRAY,
														fontFamily: "'Open Sans',sans-serif",
														fontSize: 11,
														fontWeight: active ? 700 : 400,
														cursor: "pointer",
													}}
												>
													{active ? "✓ " : ""}{ch.label}
												</button>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>

					{/* ─── Charts ─────────────────────────────────────────────────────── */}
					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>

						{/* Margen % */}
						{activeCharts.margen && (
							<ChartCard title={"Margen % por modelo"} subtitle={"A " + fK(refUsers) + " usuarios de referencia"}>
								<ResponsiveContainer width="100%" height={240}>
									<ComposedChart data={barData} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} vertical={false} />
										<XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} />
										<YAxis tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} tickFormatter={function (v) { return v + "%"; }} width={40} />
										<Tooltip contentStyle={customTooltipStyle()} formatter={function (v) { return [fP(v), "Margen"]; }} />
										<ReferenceLine y={0} stroke={ER} strokeDasharray="4 2" />
										<Bar dataKey="margen" radius={[5, 5, 0, 0]} maxBarSize={60}>
											{barData.map(function (entry, i) {
												return <Cell key={i} fill={entry.color || BLUE} />;
											})}
											<LabelList dataKey="margen" position="top" formatter={function (v) { return fP(v); }} style={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fontWeight: 700 }} />
										</Bar>
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}

						{/* EBITDA */}
						{activeCharts.ebitda && (
							<ChartCard title={"EBITDA / mes"} subtitle={"A " + fK(refUsers) + " usuarios de referencia"}>
								<ResponsiveContainer width="100%" height={240}>
									<ComposedChart data={barData} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} vertical={false} />
										<XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} />
										<YAxis tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} tickFormatter={function (v) { return v >= 1000 ? (v / 1000).toFixed(0) + "K" : v <= -1000 ? "-" + (Math.abs(v) / 1000).toFixed(0) + "K" : String(v); }} width={44} />
										<Tooltip contentStyle={customTooltipStyle()} formatter={function (v) { return [fMoney(v), "EBITDA"]; }} />
										<ReferenceLine y={0} stroke={ER} strokeDasharray="4 2" label={{ value: "BE", position: "right", fontSize: 9, fill: ER }} />
										<Bar dataKey="ebitda" radius={[5, 5, 0, 0]} maxBarSize={60}>
											{barData.map(function (entry, i) {
												return <Cell key={i} fill={entry.color || BLUE} />;
											})}
											<LabelList dataKey="ebitda" position="top" formatter={function (v) { return v >= 0 ? "+" + fMoney(v) : fMoney(v); }} style={{ fontSize: 9, fontFamily: "'Open Sans',sans-serif", fontWeight: 700 }} />
										</Bar>
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}

						{/* Break-even */}
						{activeCharts.breakeven && (
							<ChartCard title="Break-even (usuarios necesarios)" subtitle="Cantidad de usuarios activos para cubrir costos fijos">
								<ResponsiveContainer width="100%" height={240}>
									<ComposedChart data={barData.filter(function (d) { return d.be !== null; })} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} vertical={false} />
										<XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} />
										<YAxis tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} tickFormatter={function (v) { return fK(v); }} width={40} />
										<Tooltip contentStyle={customTooltipStyle()} formatter={function (v) { return [fK(v) + " usuarios", "Break-even"]; }} />
										<Bar dataKey="be" name="Break-even" radius={[5, 5, 0, 0]} maxBarSize={60}>
											{barData.map(function (entry, i) {
												return <Cell key={i} fill={entry.color || BLUE} fillOpacity={0.8} />;
											})}
											<LabelList dataKey="be" position="top" formatter={function (v) { return fK(v) + " usu."; }} style={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fontWeight: 700 }} />
										</Bar>
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}

						{/* ARPU */}
						{activeCharts.arpu && (
							<ChartCard title="ARPU mensual (Revenue / usuario)" subtitle={"Ingreso promedio por usuario activo a " + fK(refUsers) + " usuarios"}>
								<ResponsiveContainer width="100%" height={240}>
									<ComposedChart data={barData} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} vertical={false} />
										<XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} />
										<YAxis tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} tickFormatter={function (v) { return fMoney2(v); }} width={52} />
										<Tooltip contentStyle={customTooltipStyle()} formatter={function (v) { return [fMoney2(v) + " / usuario", "ARPU"]; }} />
										<Bar dataKey="arpu" name="ARPU" radius={[5, 5, 0, 0]} maxBarSize={60}>
											{barData.map(function (entry, i) {
												return <Cell key={i} fill={entry.color || BLUE} />;
											})}
											<LabelList dataKey="arpu" position="top" formatter={function (v) { return fMoney2(v); }} style={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fontWeight: 700 }} />
										</Bar>
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}

						{/* Margen unitario */}
						{activeCharts.margenUnit && (
							<ChartCard title="Margen unitario por usuario" subtitle="Ingreso neto que deja cada usuario activo al mes">
								<ResponsiveContainer width="100%" height={240}>
									<ComposedChart data={barData} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} vertical={false} />
										<XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} />
										<YAxis tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} tickFormatter={function (v) { return fMoney2(v); }} width={52} />
										<Tooltip contentStyle={customTooltipStyle()} formatter={function (v) { return [fMoney2(v) + " / usuario", "Margen unitario"]; }} />
										<ReferenceLine y={0} stroke={ER} strokeDasharray="4 2" />
										<Bar dataKey="margenUnit" name="Margen unitario" radius={[5, 5, 0, 0]} maxBarSize={60}>
											{barData.map(function (entry, i) {
												return <Cell key={i} fill={entry.color || BLUE} />;
											})}
											<LabelList dataKey="margenUnit" position="top" formatter={function (v) { return fMoney2(v); }} style={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fontWeight: 700 }} />
										</Bar>
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}

						{/* LTV / CV ratio */}
						{activeCharts.ltvcv && (
							<ChartCard title="Ratio LTV / Costo de servicio" subtitle="Cuántas veces cubre el precio al costo variable total del pack">
								<ResponsiveContainer width="100%" height={240}>
									<ComposedChart data={barData.filter(function (d) { return d.ltvcv !== null; })} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} vertical={false} />
										<XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} />
										<YAxis tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} tickFormatter={function (v) { return v + "×"; }} width={36} />
										<Tooltip contentStyle={customTooltipStyle()} formatter={function (v) { return [v + "× el costo", "LTV / CV"]; }} />
										<ReferenceLine y={1} stroke={WN} strokeDasharray="4 2" label={{ value: "BE", position: "right", fontSize: 9, fill: WN }} />
										<Bar dataKey="ltvcv" name="LTV / CV" radius={[5, 5, 0, 0]} maxBarSize={60}>
											{barData.map(function (entry, i) {
												return <Cell key={i} fill={entry.color || BLUE} />;
											})}
											<LabelList dataKey="ltvcv" position="top" formatter={function (v) { return v + "×"; }} style={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fontWeight: 700 }} />
										</Bar>
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}

						{/* Proyección Revenue */}
						{activeCharts.proyeccionRev && (
							<ChartCard title="Proyección de Revenue (24 meses)" subtitle={"Crecimiento mensual " + growthRate + "% · Churn " + churnRate + "%"} fullWidth={true}>
								<ResponsiveContainer width="100%" height={300}>
									<ComposedChart data={projData} margin={{ top: 10, right: 40, left: 10, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} />
										<XAxis
											dataKey="mes"
											tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }}
											interval={2}
										/>
										<YAxis
											tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }}
											tickFormatter={function (v) { return v >= 1000 ? (v / 1000).toFixed(0) + "K" : String(v); }}
											width={50}
											label={{ value: "Revenue (USD)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 9, fill: GRAY, fontFamily: "'Open Sans',sans-serif" } }}
										/>
										<Tooltip
											contentStyle={customTooltipStyle()}
											formatter={function (v, name) {
												var id = name.replace("_rev", "");
												var m = selectedModels.find(function (x) { return x.id === id; });
												return [fMoney(v), m ? m.label : id];
											}}
											labelFormatter={function (label) { return "Mes: " + label; }}
										/>
										<Legend
											formatter={function (name) {
												var id = name.replace("_rev", "");
												var m = selectedModels.find(function (x) { return x.id === id; });
												return m ? m.label : id;
											}}
											wrapperStyle={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", paddingTop: 12 }}
										/>
										{selectedModels.map(function (m, i) {
											return (
												<Line
													key={m.id}
													type="monotone"
													dataKey={m.id + "_rev"}
													stroke={m.color}
													strokeWidth={2.5}
													strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
													dot={false}
													activeDot={{ r: 5, fill: m.color }}
												/>
											);
										})}
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}

						{/* Proyección EBITDA */}
						{activeCharts.proyeccionEbitda && (
							<ChartCard title="Proyección de EBITDA (24 meses)" subtitle={"Crecimiento mensual " + growthRate + "% · Churn " + churnRate + "%"} fullWidth={true}>
								<ResponsiveContainer width="100%" height={300}>
									<ComposedChart data={projData} margin={{ top: 10, right: 40, left: 10, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} />
										<XAxis dataKey="mes" tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }} interval={2} />
										<YAxis
											tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }}
											tickFormatter={function (v) { return v >= 1000 ? (v / 1000).toFixed(0) + "K" : v <= -1000 ? "-" + (Math.abs(v) / 1000).toFixed(0) + "K" : String(v); }}
											width={50}
											label={{ value: "EBITDA (USD)", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 9, fill: GRAY, fontFamily: "'Open Sans',sans-serif" } }}
										/>
										<Tooltip
											contentStyle={customTooltipStyle()}
											formatter={function (v, name) {
												var id = name.replace("_ebitda", "");
												var m = selectedModels.find(function (x) { return x.id === id; });
												return [fMoney(v), m ? m.label : id];
											}}
											labelFormatter={function (label) { return "Mes: " + label; }}
										/>
										<ReferenceLine y={0} stroke={ER} strokeDasharray="4 2" label={{ value: "Break-even", position: "right", fontSize: 9, fill: ER }} />
										<Legend
											formatter={function (name) {
												var id = name.replace("_ebitda", "");
												var m = selectedModels.find(function (x) { return x.id === id; });
												return m ? m.label : id;
											}}
											wrapperStyle={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", paddingTop: 12 }}
										/>
										{selectedModels.map(function (m, i) {
											return (
												<Line
													key={m.id}
													type="monotone"
													dataKey={m.id + "_ebitda"}
													stroke={m.color}
													strokeWidth={2.5}
													strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
													dot={false}
													activeDot={{ r: 5, fill: m.color }}
												/>
											);
										})}
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}

						{/* Sensibilidad por firmas */}
						{activeCharts.sensibilidad && (
							<ChartCard title="Sensibilidad: Margen % vs firmas del pack" subtitle="Cómo cambia el margen al variar la cantidad de firmas incluidas" fullWidth={true}>
								<ResponsiveContainer width="100%" height={300}>
									<ComposedChart data={sensitivityData} margin={{ top: 10, right: 40, left: 10, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} />
										<XAxis
											dataKey="firmas"
											tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }}
											tickFormatter={function (v) { return fK(v); }}
											label={{ value: "Firmas incluidas en el pack", position: "insideBottom", offset: -2, style: { fontSize: 9, fill: GRAY, fontFamily: "'Open Sans',sans-serif" } }}
										/>
										<YAxis
											tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }}
											tickFormatter={function (v) { return v + "%"; }}
											width={50}
											domain={["auto", "auto"]}
											label={{ value: "Margen %", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 9, fill: GRAY, fontFamily: "'Open Sans',sans-serif" } }}
										/>
										<Tooltip
											contentStyle={customTooltipStyle()}
											formatter={function (v, name) {
												var m = selectedModels.find(function (x) { return x.id === name; });
												return [fP(v), m ? m.label : name];
											}}
											labelFormatter={function (v) { return "Firmas: " + fK(v); }}
										/>
										<ReferenceLine y={0} stroke={ER} strokeDasharray="4 2" label={{ value: "0%", position: "right", fontSize: 9, fill: ER }} />
										<Legend
											formatter={function (id) {
												var m = selectedModels.find(function (x) { return x.id === id; });
												return m ? m.label : id;
											}}
											wrapperStyle={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", paddingTop: 12 }}
										/>
										{selectedModels.map(function (m, i) {
											return (
												<Line
													key={m.id}
													type="monotone"
													dataKey={m.id}
													stroke={m.color}
													strokeWidth={2.5}
													strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
													dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
													activeDot={{ r: 6, fill: m.color }}
												/>
											);
										})}
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}

						{/* Sensibilidad por usuarios */}
						{activeCharts.sensibilidadUsu && (
							<ChartCard title="Sensibilidad: Margen % vs base de usuarios" subtitle="Cómo evoluciona el margen a medida que crece la base activa" fullWidth={true}>
								<ResponsiveContainer width="100%" height={300}>
									<ComposedChart data={sensitivityUsersData} margin={{ top: 10, right: 40, left: 10, bottom: 4 }}>
										<CartesianGrid strokeDasharray="3 3" stroke={BORD} />
										<XAxis
											dataKey="usu"
											tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }}
											tickFormatter={function (v) { return fK(v); }}
											label={{ value: "Usuarios activos", position: "insideBottom", offset: -2, style: { fontSize: 9, fill: GRAY, fontFamily: "'Open Sans',sans-serif" } }}
										/>
										<YAxis
											tick={{ fontSize: 10, fontFamily: "'Open Sans',sans-serif", fill: GRAY }}
											tickFormatter={function (v) { return v + "%"; }}
											width={50}
											domain={["auto", "auto"]}
											label={{ value: "Margen %", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 9, fill: GRAY, fontFamily: "'Open Sans',sans-serif" } }}
										/>
										<Tooltip
											contentStyle={customTooltipStyle()}
											formatter={function (v, name) {
												var m = selectedModels.find(function (x) { return x.id === name; });
												return [fP(v), m ? m.label : name];
											}}
											labelFormatter={function (v) { return "Usuarios: " + fK(v); }}
										/>
										<ReferenceLine y={0} stroke={ER} strokeDasharray="4 2" label={{ value: "0%", position: "right", fontSize: 9, fill: ER }} />
										<Legend
											formatter={function (id) {
												var m = selectedModels.find(function (x) { return x.id === id; });
												return m ? m.label : id;
											}}
											wrapperStyle={{ fontSize: 11, fontFamily: "'Open Sans',sans-serif", paddingTop: 12 }}
										/>
										{selectedModels.map(function (m, i) {
											return (
												<Line
													key={m.id}
													type="monotone"
													dataKey={m.id}
													stroke={m.color}
													strokeWidth={2.5}
													strokeDasharray={DASH_PATTERNS[i % DASH_PATTERNS.length]}
													dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
													activeDot={{ r: 6, fill: m.color }}
												/>
											);
										})}
									</ComposedChart>
								</ResponsiveContainer>
							</ChartCard>
						)}
					</div>
				</>
			)}
		</div>
	);
}
