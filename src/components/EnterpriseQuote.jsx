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
	const [copied, setCopied] = useState(false);

	// When embedded (hideInputs), values come from props live; otherwise from local state
	const firmas = hideInputs ? (initialFirmas || 5000) : firmasState;
	const certs = hideInputs ? (initialCerts || 4) : certsState;
	const periodo = hideInputs ? (initialPeriodo || 24) : periodoState;
	const marginTarget = hideInputs ? (initialMargin || 40) : marginTargetState;

	// Custom quote from unified inputs
	const customRow = useMemo(function () {
		return computeRow(firmas, certs, periodo, marginTarget, costs);
	}, [firmas, certs, periodo, marginTarget, costs]);

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

	return (
		<div>
			{/* Header */}
			<div style={{ marginBottom: 20 }}>
				<div style={Object.assign({}, mont(18), { marginBottom: 4 })}>Cotizador Enterprise · Volumen personalizado</div>
				<div style={os(12, 400, GRAY)}>
					{hideInputs
						? "Los parámetros se toman del panel de Parámetros (sandbox). El resultado se actualiza al instante."
						: "Ingresá los datos del cliente. El resultado se actualiza al instante y la tabla escalonada usa los mismos parámetros."}
				</div>
			</div>

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
					<div style={Object.assign({}, os(10, 400, GRAY), { alignSelf: "center", marginLeft: "auto" })}>
						CV cert: {fMoney2(costs.cvCertBase)} · CV firma: {fMoney2(costs.cvFirmaBase)}
					</div>
				</div>
			</div>}

			{/* Result cards */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 28 }}>
				<div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid " + BORD }}>
					<div style={os(10, 700, GRAY)}>COSTO VARIABLE</div>
					<div style={Object.assign({}, mont(22), { color: BLACK, marginTop: 6 })}>{fMoney2(customRow.cvPack)}</div>
					<div style={os(10, 400, GRAY)}>{fMoney2(customRow.cvPerFirma)}/firma</div>
				</div>

				<div style={{ background: OKBG, borderRadius: 10, padding: "14px 16px", border: "1.5px solid " + OK }}>
					<div style={os(10, 700, OK)}>PRECIO AL {marginTarget}% MARGEN</div>
					<div style={Object.assign({}, mont(22), { color: OK, marginTop: 6 })}>{fMoney2(customRow.priceSug)}</div>
					<div style={os(10, 400, GRAY)}>{fMoney2(customRow.pricePerFirma)}/firma</div>
				</div>

				<div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid " + BORD }}>
					<div style={os(10, 700, GRAY)}>MARGEN PACK</div>
					<div style={Object.assign({}, mont(22), { color: BLACK, marginTop: 6 })}>{fMoney2(customRow.margenPack)}</div>
					<div style={os(10, 400, GRAY)}>{fP(marginTarget)} del precio</div>
				</div>

				<div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid " + BORD }}>
					<div style={os(10, 700, GRAY)}>BREAK-EVEN</div>
					<div style={Object.assign({}, mont(22), { color: isFinite(customRow.be) ? BLACK : ER, marginTop: 6 })}>
						{isFinite(customRow.be) ? customRow.be.toLocaleString("es-AR") : "∞"}
					</div>
					<div style={os(10, 400, GRAY)}>clientes de este tipo</div>
				</div>

				<div style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px", border: "1px solid " + BORD }}>
					<div style={Object.assign({}, os(10, 700, GRAY), { marginBottom: 6 })}>RANGO DE PRECIOS</div>
					{[30, 40, 50, 60].map(function (m) {
						var p = customRow.cvPack / (1 - m / 100);
						var act = m === marginTarget;
						return (
							<div key={m} style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
								<span style={os(10, act ? 700 : 400, act ? BLUE : GRAY)}>{m}%</span>
								<span style={Object.assign({}, os(11, act ? 700 : 400, act ? BLUE : BLACK), { fontFamily: "Courier New,monospace" })}>
									{fMoney2(p)}
								</span>
							</div>
						);
					})}
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
