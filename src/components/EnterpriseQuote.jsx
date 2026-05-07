import { useState, useMemo } from "react";
import {
	ComposedChart, Bar, Line, XAxis, YAxis,
	CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { BLUE, BLUEL, BORD, GRAY, BLACK, WHITE, OK, OKBG, WN, ER, os, mont } from "../theme/tokens";
import { makeMoney } from "../utils/useMoney";
import { fP } from "../utils/formatters";
import { NumInput } from "./ui/NumInput";
import { ChartTip } from "./ui/ChartTip";

const ESCALONES = [2000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000, 2500000, 5000000];
const MARGIN_OPTS = [30, 40, 50, 60];

function fNum(n) {
	if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + "M";
	if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
	return n.toLocaleString("es-AR");
}

function computeRow(firmas, certs, periodo, marginTarget, costs) {
	const cvPack = certs * costs.cvCertBase + firmas * costs.cvFirmaBase;
	const priceSug = cvPack / (1 - marginTarget / 100);
	const margenPack = priceSug - cvPack;
	const margenMes = margenPack / periodo;
	const be = margenMes > 0 ? Math.ceil(costs.cfDirecto / margenMes) : Infinity;
	const pricePerFirma = firmas > 0 ? priceSug / firmas : 0;
	const cvPerFirma = firmas > 0 ? cvPack / firmas : 0;
	return { firmas, certs, cvPack, priceSug, margenPack, margenMes, be, pricePerFirma, cvPerFirma };
}

export function EnterpriseQuote({ costs, currency, tc, initialFirmas, initialCerts, initialPeriodo, initialMargin, hideInputs }) {
	const { fMoney2 } = makeMoney(currency, tc);

	const [firmasState, setFirmas] = useState(initialFirmas || 5000);
	const [certsState, setCerts] = useState(initialCerts || 4);
	const [periodoState, setPeriodo] = useState(initialPeriodo || 24);
	const [marginTargetState, setMarginTarget] = useState(initialMargin || 40);
	const [extraFirmaPriceState, setExtraFirmaPrice] = useState(1.0);
	const [cantFirmasExtraState, setCantFirmasExtra] = useState(0);
	const [copied, setCopied] = useState(false);

	// When embedded (hideInputs), values come from props live; otherwise from local state
	const firmas = hideInputs ? (initialFirmas || 5000) : firmasState;
	const certs = hideInputs ? (initialCerts || 4) : certsState;
	const periodo = hideInputs ? (initialPeriodo || 24) : periodoState;
	const marginTarget = hideInputs ? (initialMargin || 40) : marginTargetState;
	const extraFirmaPrice = extraFirmaPriceState;
	const cantFirmasExtra = cantFirmasExtraState;

	// Custom quote from unified inputs
	const customRow = useMemo(function () {
		const row = computeRow(firmas, certs, periodo, marginTarget, costs);
		const extraRevTotal = extraFirmaPrice * cantFirmasExtra;
		const extraCvTotal = cantFirmasExtra * costs.cvFirmaBase;
		return Object.assign({}, row, {
			extraRevTotal,
			extraCvTotal,
			totalRevenue: row.priceSug + extraRevTotal,
			margenConExtras: row.margenPack + extraRevTotal - extraCvTotal,
		});
	}, [firmas, certs, periodo, marginTarget, costs, extraFirmaPrice, cantFirmasExtra]);

	// Escalation table: same certs/periodo/margin, varying firmas
	const rows = useMemo(function () {
		return ESCALONES.map(function (f) {
			return computeRow(f, certs, periodo, marginTarget, costs);
		});
	}, [certs, periodo, marginTarget, costs]);

	const baseRow = rows[0]; // 2000 firmas

	const chartData = rows.slice(0, 8).map(function (r) {
		return {
			label: fNum(r.firmas),
			"CV pack": Math.round(r.cvPack),
			"Margen": Math.round(r.margenPack),
			"$/firma": Number(r.pricePerFirma.toFixed(3)),
		};
	});

	function handleCopy() {
		function pad(str, len, right) {
			var s = String(str);
			return right ? s.padStart(len) : s.padEnd(len);
		}

		var sep = "─".repeat(72);
		var thin = "·".repeat(72);

		// Header
		var lines = [];
		lines.push("COTIZACIÓN ENTERPRISE — LAKAUT");
		lines.push(sep);
		lines.push("");

		// Parameters
		lines.push("PARÁMETROS");
		lines.push("  Certificaciones por pack  : " + certs);
		lines.push("  Vigencia del contrato     : " + periodo + " meses");
		lines.push("  Margen objetivo           : " + marginTarget + "%");
		lines.push("  Moneda                    : " + (currency === "USD" ? "USD" : "ARS (TC " + tc + ")"));
		lines.push("");

		// Custom quote
		var cr = customRow;
		lines.push("COTIZACIÓN PERSONALIZADA");
		lines.push(thin);
		lines.push("  Firmas                    : " + cr.firmas.toLocaleString("es-AR"));
		lines.push("  Costo variable del pack   : USD " + Math.round(cr.cvPack).toLocaleString("es-AR"));
		lines.push("  Precio sugerido al cliente: USD " + Math.round(cr.priceSug).toLocaleString("es-AR"));
		lines.push("  Margen bruto              : USD " + Math.round(cr.margenPack).toLocaleString("es-AR") + "  (" + marginTarget + "%)");
		lines.push("  Precio por firma          : USD " + cr.pricePerFirma.toFixed(3));
		lines.push("  Break-even en clientes    : " + (isFinite(cr.be) ? cr.be.toLocaleString("es-AR") + " clientes" : "N/A"));
		lines.push("");

		// Escalation table
		lines.push("TABLA DE ESCALONAMIENTO — VOLÚMENES DE REFERENCIA");
		lines.push(sep);
		lines.push(
			pad("Firmas", 12) +
			pad("CV Pack (USD)", 16, true) +
			pad("Precio (USD)", 15, true) +
			pad("Margen (USD)", 15, true) +
			pad("USD/firma", 12, true) +
			pad("Break-even", 12, true)
		);
		lines.push(sep);
		rows.forEach(function (r) {
			lines.push(
				pad(r.firmas.toLocaleString("es-AR"), 12) +
				pad(Math.round(r.cvPack).toLocaleString("es-AR"), 16, true) +
				pad(Math.round(r.priceSug).toLocaleString("es-AR"), 15, true) +
				pad(Math.round(r.margenPack).toLocaleString("es-AR"), 15, true) +
				pad(r.pricePerFirma.toFixed(3), 12, true) +
				pad(isFinite(r.be) ? r.be.toLocaleString("es-AR") : "—", 12, true)
			);
		});
		lines.push(sep);
		lines.push("");
		lines.push("Generado con Cotizador Lakaut · " + new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }));

		navigator.clipboard.writeText(lines.join("\n"));
		setCopied(true);
		setTimeout(function () { setCopied(false); }, 2000);
	}

	const thStyle = Object.assign({}, os(10, 700, WHITE), {
		padding: "7px 10px",
		background: "#1e293b",
		textAlign: "right",
		whiteSpace: "nowrap",
	});
	const thL = Object.assign({}, thStyle, { textAlign: "left" });
	const tdMono = { fontFamily: "Courier New,monospace", textAlign: "right", padding: "9px 10px" };

	// Diverging chart data: delta from current price
	const rangoData = [30, 40, 50, 60].map(function (m) {
		var p = customRow.cvPack / (1 - m / 100);
		var delta = p - customRow.priceSug;
		return { m: m, p: p, delta: delta };
	});
	var maxAbsDelta = rangoData.reduce(function (mx, r) { return Math.max(mx, Math.abs(r.delta)); }, 0);

	return (
		<div>

			{/* Unified input panel — hidden when embedded in Simulador */}
			{!hideInputs && <div style={{ background: BLUEL, border: "2px solid " + BLUE, borderRadius: 12, padding: "16px 20px", marginBottom: 24 }}>
				<div style={Object.assign({}, os(10, 700, BLUE), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 14 })}>
					Parámetros del cliente
				</div>
				<div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
					<div style={{ flex: "0 0 160px" }}>
						<NumInput
							label="Firmas totales"
							value={firmas}
							onChange={function (v) { setFirmas(Math.max(1, Math.round(v))); }}
							suffix="firmas"
						/>
					</div>
					<div style={{ flex: "0 0 140px" }}>
						<NumInput
							label="Certificados"
							value={certs}
							onChange={function (v) { setCerts(Math.max(1, Math.round(v))); }}
							suffix="certs"
						/>
					</div>
					<div style={{ flex: "0 0 130px" }}>
						<NumInput
							label="Vigencia"
							value={periodo}
							onChange={function (v) { setPeriodo(Math.max(6, Math.min(60, Math.round(v)))); }}
							suffix="meses"
						/>
					</div>
					<div>
						<div style={os(10, 400, GRAY)}>Margen objetivo</div>
						<div style={{ display: "flex", gap: 4, marginTop: 4 }}>
							{MARGIN_OPTS.map(function (m) {
								var act = m === marginTarget;
								return (
									<button
										key={m}
										onClick={function () { setMarginTarget(m); }}
										style={{
											padding: "5px 10px",
											borderRadius: 6,
											border: "1.5px solid " + (act ? BLUE : BORD),
											background: act ? BLUE : WHITE,
											color: act ? WHITE : GRAY,
											fontFamily: "'Open Sans',sans-serif",
											fontSize: 11,
											fontWeight: 700,
											cursor: "pointer",
										}}
									>
										{m}%
									</button>
								);
							})}
						</div>
					</div>
					<div style={{ flex: "0 0 140px" }}>
							<NumInput
								label="Precio firma extra"
								value={extraFirmaPrice}
								onChange={function (v) { setExtraFirmaPrice(Math.max(0, v)); }}
								prefix="USD"
							/>
						</div>
						<div style={{ flex: "0 0 160px" }}>
							<NumInput
								label="Firmas extra usadas"
								value={cantFirmasExtra}
								onChange={function (v) { setCantFirmasExtra(Math.max(0, Math.round(v))); }}
								suffix="firmas"
							/>
						</div>
					</div>
					<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 8 })}>
						CV cert: {fMoney2(costs.cvCertBase)} · CV firma: {fMoney2(costs.cvFirmaBase)}
					</div>
				</div>}

			{/* KPI cards */}
			<div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
				{/* Costo variable */}
				<div style={{ flex: "1 1 140px", background: "#fff7ed", border: "1px solid #f59e0b", borderLeft: "4px solid #f59e0b", borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
					<div style={os(8, 700, "#b45309")}>COSTO VARIABLE</div>
					<div style={Object.assign({}, mont(16), { color: "#b45309", marginTop: 2, lineHeight: 1.2 })}>{fMoney2(customRow.cvPack)}</div>
					<div style={os(9, 400, "#92400e")}>{fMoney2(customRow.cvPerFirma)}/firma</div>
				</div>
				{/* Precio */}
				<div style={{ flex: "1 1 160px", background: OKBG, border: "1px solid " + OK, borderLeft: "4px solid " + OK, borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
					<div style={os(8, 700, OK)}>PRECIO AL {marginTarget}% MARGEN</div>
					<div style={Object.assign({}, mont(20), { color: OK, marginTop: 2, lineHeight: 1.2 })}>{fMoney2(customRow.priceSug)}</div>
					<div style={os(9, 400, OK)}>{fMoney2(customRow.pricePerFirma)}/firma</div>
				</div>
				{/* Margen */}
				<div style={{ flex: "1 1 140px", background: BLUEL, border: "1px solid " + BLUE, borderLeft: "4px solid " + BLUE, borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
					<div style={os(8, 700, BLUE)}>{cantFirmasExtra > 0 ? "MARGEN TOTAL" : "MARGEN PACK"}</div>
					<div style={Object.assign({}, mont(16), { color: BLUE, marginTop: 2, lineHeight: 1.2 })}>{fMoney2(cantFirmasExtra > 0 ? customRow.margenConExtras : customRow.margenPack)}</div>
					<div style={os(9, 400, BLUE)}>{cantFirmasExtra > 0 ? "pack + extras" : fP(marginTarget) + " del precio"}</div>
				</div>
				{/* Firmas extra */}
				{cantFirmasExtra > 0 && (
					<div style={{ flex: "1 1 150px", background: "#f0fdf4", border: "1px solid #86efac", borderLeft: "4px solid #22c55e", borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
						<div style={os(8, 700, "#15803d")}>FIRMAS EXTRA</div>
						<div style={Object.assign({}, mont(16), { color: "#15803d", marginTop: 2, lineHeight: 1.2 })}>{fMoney2(customRow.extraRevTotal)}</div>
						<div style={os(9, 400, "#15803d")}>{cantFirmasExtra.toLocaleString("es-AR")} f. × {fMoney2(extraFirmaPrice)}</div>
					</div>
				)}
				{/* Break-even */}
				{(function () {
					var beOk = isFinite(customRow.be) && customRow.be < 5000;
					var beMid = isFinite(customRow.be) && customRow.be >= 5000;
					var bc = beOk ? OK : beMid ? WN : ER;
					var bbg = beOk ? OKBG : beMid ? "#fffbeb" : "#fef2f2";
					var bborder = beOk ? OK : beMid ? WN : ER;
					return (
						<div style={{ flex: "1 1 130px", background: bbg, border: "1px solid " + bborder, borderLeft: "4px solid " + bborder, borderRadius: 10, padding: "8px 12px", minWidth: 0 }}>
							<div style={os(8, 700, bc)}>BREAK-EVEN</div>
							<div style={Object.assign({}, mont(16), { color: bc, marginTop: 2, lineHeight: 1.2 })}>
								{isFinite(customRow.be) ? customRow.be.toLocaleString("es-AR") : "∞"}
							</div>
							<div style={os(9, 400, bc)}>clientes de este tipo</div>
						</div>
					);
				})()}
			</div>

			{/* Price range number line */}
			<div style={{ background: "#f8fafc", border: "1px solid " + BORD, borderRadius: 10, padding: "14px 20px", marginBottom: 20 }}>
				<div style={Object.assign({}, os(8, 700, GRAY), { marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" })}>Rango de precio</div>
				<div style={{ position: "relative", padding: "0 16px" }}>
					{/* Horizontal line */}
					<div style={{ position: "absolute", top: "50%", left: 16, right: 16, height: 2, background: "#e2e8f0", transform: "translateY(-50%)", zIndex: 0 }} />
					{/* Items */}
					<div style={{ display: "flex", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
						{rangoData.map(function (r) {
							var isSel = r.m === marginTarget;
							var dotColor = isSel ? BLUE : "#94a3b8";
							var labelColor = isSel ? BLUE : GRAY;
							return (
								<div key={r.m} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
									{/* Price above */}
									<span style={Object.assign({}, os(isSel ? 12 : 10, isSel ? 700 : 400, labelColor), { fontFamily: "Courier New,monospace", whiteSpace: "nowrap" })}>
										{fMoney2(r.p)}
									</span>
									{/* Dot */}
									<div style={{
										width: isSel ? 13 : 8,
										height: isSel ? 13 : 8,
										borderRadius: "50%",
										background: dotColor,
										border: "2px solid " + WHITE,
										boxShadow: isSel ? "0 0 0 2px " + BLUE : "none",
										flexShrink: 0,
									}} />
									{/* % below */}
									<span style={os(isSel ? 11 : 9, isSel ? 700 : 400, labelColor)}>{r.m}%</span>
								</div>
							);
						})}
					</div>
				</div>
			</div>

			{/* Chart — first 8 tiers to keep it readable */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
				<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px" })}>
					Precio por volumen de firmas
				</div>
				{/* Legend */}
				<div style={{ display: "flex", gap: 16, alignItems: "center" }}>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<div style={{ width: 12, height: 12, background: GRAY, opacity: 0.5, borderRadius: 2 }} />
						<span style={os(10, 400, GRAY)}>Costo variable</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<div style={{ width: 12, height: 12, background: OK, opacity: 0.85, borderRadius: 2 }} />
						<span style={os(10, 400, GRAY)}>Margen</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<div style={{ width: 20, height: 2.5, background: BLUE, borderRadius: 2 }} />
						<div style={{ width: 6, height: 6, background: BLUE, borderRadius: "50%", marginLeft: -4 }} />
						<span style={os(10, 400, GRAY)}>USD / firma (eje der.)</span>
					</div>
				</div>
			</div>
			{/* Axis labels row */}
			<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, paddingRight: 4 }}>
				<span style={os(9, 700, GRAY)}>← Precio total pack (USD)</span>
				<span style={os(9, 700, BLUE)}>Precio por firma (USD) →</span>
			</div>
			<div style={{ height: 220, marginBottom: 28 }}>
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart data={chartData} margin={{ top: 4, right: 60, bottom: 4, left: 8 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#eee" />
						<XAxis dataKey="label" tick={{ fontSize: 10, fill: GRAY }} />
						<YAxis
							yAxisId="left"
							tick={{ fontSize: 10, fill: GRAY }}
							tickFormatter={function (v) {
								return "$" + (v >= 1000000 ? Math.round(v / 1000000) + "M" : v >= 1000 ? Math.round(v / 1000) + "k" : v);
							}}
						/>
						<YAxis
							yAxisId="right"
							orientation="right"
							tick={{ fontSize: 10, fill: BLUE }}
							tickFormatter={function (v) { return "$" + v.toFixed(2); }}
						/>
						<Tooltip content={ChartTip} />
						<Bar yAxisId="left" dataKey="CV pack" stackId="a" fill={GRAY} opacity={0.5} />
						<Bar yAxisId="left" dataKey="Margen" stackId="a" fill={OK} opacity={0.85} radius={[2, 2, 0, 0]} />
						<Line yAxisId="right" type="monotone" dataKey="$/firma" stroke={BLUE} strokeWidth={2.5} dot={{ r: 3, fill: BLUE }} />
					</ComposedChart>
				</ResponsiveContainer>
			</div>

			{/* Escalation table header + copy button */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
				<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px" })}>
					Tabla escalonada · {certs} cert{certs !== 1 ? "s" : ""} por pack · {marginTarget}% margen
				</div>
				<button
					onClick={handleCopy}
					style={{
						padding: "6px 14px",
						background: copied ? OK : WHITE,
						color: copied ? WHITE : BLUE,
						border: "1.5px solid " + (copied ? OK : BLUE),
						borderRadius: 6,
						fontFamily: "'Open Sans',sans-serif",
						fontSize: 12,
						fontWeight: 700,
						cursor: "pointer",
						transition: "all 0.2s",
					}}
				>
					{copied ? "✓ Copiado" : "Copiar tabla"}
				</button>
			</div>

			<div style={{ overflowX: "auto" }}>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 720 }}>
					<thead>
						<tr>
							<th style={thL}>Firmas</th>
							<th style={thStyle}>Certs</th>
							<th style={thStyle}>CV pack</th>
							<th style={thStyle}>Precio ({marginTarget}%)</th>
							<th style={thStyle}>Margen pack</th>
							<th style={thStyle}>$/firma</th>
							<th style={thStyle}>BE clientes</th>
							<th style={thStyle}>vs base</th>
						</tr>
					</thead>
					<tbody>
						{rows.map(function (r, i) {
							var isBase = i === 0;
							var vsBase = baseRow && baseRow.pricePerFirma > 0
								? ((r.pricePerFirma - baseRow.pricePerFirma) / baseRow.pricePerFirma) * 100
								: 0;
							var beColor = !isFinite(r.be) ? ER : r.be <= 5000 ? OK : r.be <= 20000 ? WN : ER;
							return (
								<tr
									key={r.firmas}
									style={{
										background: isBase ? "#eaecfb" : i % 2 === 0 ? "#fafafa" : WHITE,
										outline: isBase ? "2px solid " + BLUE : "none",
									}}
								>
									<td style={Object.assign({}, os(13, isBase ? 700 : 400, isBase ? BLUE : BLACK), { padding: "9px 10px" })}>
										{isBase && "▶ "}{r.firmas.toLocaleString("es-AR")}
										{isBase && <span style={Object.assign({}, os(10, 400, BLUE), { marginLeft: 6 })}>base</span>}
									</td>
									<td style={Object.assign({}, os(13, 400, GRAY), tdMono)}>{r.certs}</td>
									<td style={Object.assign({}, os(13, 400, BLACK), tdMono)}>{fMoney2(r.cvPack)}</td>
									<td style={Object.assign({}, os(13, 700, OK), tdMono)}>{fMoney2(r.priceSug)}</td>
									<td style={Object.assign({}, os(13, 700, OK), tdMono)}>{fMoney2(r.margenPack)}</td>
									<td style={Object.assign({}, os(13, 400, BLACK), tdMono)}>{fMoney2(r.pricePerFirma)}</td>
									<td style={Object.assign({}, os(13, 700, beColor), tdMono)}>
										{isFinite(r.be) ? r.be.toLocaleString("es-AR") : "∞"}
									</td>
									<td style={{ padding: "9px 10px", textAlign: "right" }}>
										{isBase
											? <span style={os(10, 400, GRAY)}>referencia</span>
											: (
												<span style={Object.assign({}, os(10, 700, vsBase < 0 ? OK : GRAY), {
													background: vsBase < 0 ? OKBG : "#f1f5f9",
													padding: "2px 7px",
													borderRadius: 10,
												})}>
													{vsBase < 0 ? "" : "+"}{vsBase.toFixed(2)}%/firma
												</span>
											)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 8 })}>
				BE = clientes de ese tipo necesarios para cubrir CF directo (USD {Math.round(costs.cfDirecto).toLocaleString("es-AR")}/mes) ·
				CV cert: {fMoney2(costs.cvCertBase)} · CV firma: {fMoney2(costs.cvFirmaBase)}
			</div>
		</div>
	);
}
