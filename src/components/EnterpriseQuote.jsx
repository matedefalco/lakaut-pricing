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

const ESCALONES = [2000, 3000, 5000, 7500, 10000, 15000, 25000, 50000];
const MARGIN_OPTS = [30, 40, 50, 60];

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

export function EnterpriseQuote({ costs, currency, tc }) {
	const { fMoney2 } = makeMoney(currency, tc);

	const [certs, setCerts] = useState(4);
	const [periodo, setPeriodo] = useState(24);
	const [marginTarget, setMarginTarget] = useState(40);
	const [customFirmas, setCustomFirmas] = useState(5000);
	const [customCerts, setCustomCerts] = useState(4);

	const rows = useMemo(function () {
		return ESCALONES.map(function (f) {
			return computeRow(f, certs, periodo, marginTarget, costs);
		});
	}, [certs, periodo, marginTarget, costs]);

	const customRow = useMemo(function () {
		return computeRow(customFirmas, customCerts, periodo, marginTarget, costs);
	}, [customFirmas, customCerts, periodo, marginTarget, costs]);

	const baseRow = rows[0]; // 2000 firmas — referencia

	const chartData = rows.map(function (r) {
		return {
			label: (r.firmas / 1000).toFixed(0) + "k",
			"CV pack": Math.round(r.cvPack),
			"Margen": Math.round(r.margenPack),
			"$/firma": Number(r.pricePerFirma.toFixed(3)),
		};
	});

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
			<div style={{ marginBottom: 16 }}>
				<div style={Object.assign({}, mont(18), { marginBottom: 4 })}>Cotizador Enterprise · Volumen personalizado</div>
				<div style={os(12, 400, GRAY)}>
					Precios óptimos para clientes con volúmenes superiores al pack Enterprise estándar (2.000 firmas).
				</div>
			</div>

			{/* Config panel */}
			<div style={{ background: BLUEL, border: "1px solid " + BORD, borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
				<div style={Object.assign({}, os(10, 700, BLUE), { textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center", flexShrink: 0 })}>
					Parámetros globales
				</div>
				<div style={{ flex: "0 0 130px" }}>
					<NumInput
						label="Certs por pack"
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

			{/* Custom quote hero */}
			<div style={{ background: WHITE, border: "2px solid " + BLUE, borderRadius: 14, marginBottom: 24, overflow: "hidden" }}>
				<div style={{ background: BLUE, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
					<span style={Object.assign({}, mont(15), { color: WHITE })}>Cotización puntual</span>
					<span style={Object.assign({}, os(11, 400, WHITE), { opacity: 0.75 })}>
						Ingresá el volumen exacto y obtenés el precio al instante
					</span>
				</div>
				<div style={{ padding: "16px 20px" }}>
					<div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16, alignItems: "flex-end" }}>
						<div style={{ flex: "0 0 160px" }}>
							<NumInput
								label="Firmas totales"
								value={customFirmas}
								onChange={function (v) { setCustomFirmas(Math.max(1, Math.round(v))); }}
								suffix="firmas"
							/>
						</div>
						<div style={{ flex: "0 0 160px" }}>
							<NumInput
								label="Certificados"
								value={customCerts}
								onChange={function (v) { setCustomCerts(Math.max(1, Math.round(v))); }}
								suffix="certs"
							/>
						</div>
						<div style={Object.assign({}, os(11, 400, GRAY), { alignSelf: "center", paddingBottom: 10 })}>
							Vigencia: {periodo}m · Margen objetivo: {marginTarget}%
						</div>
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
						<div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid " + BORD }}>
							<div style={os(10, 700, GRAY)}>COSTO VARIABLE</div>
							<div style={Object.assign({}, mont(20), { color: BLACK, marginTop: 4 })}>{fMoney2(customRow.cvPack)}</div>
							<div style={os(10, 400, GRAY)}>{fMoney2(customRow.cvPerFirma)}/firma</div>
						</div>

						<div style={{ background: OKBG, borderRadius: 10, padding: "12px 14px", border: "1.5px solid " + OK }}>
							<div style={os(10, 700, OK)}>PRECIO AL {marginTarget}% MARGEN</div>
							<div style={Object.assign({}, mont(20), { color: OK, marginTop: 4 })}>{fMoney2(customRow.priceSug)}</div>
							<div style={os(10, 400, GRAY)}>{fMoney2(customRow.pricePerFirma)}/firma</div>
						</div>

						<div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid " + BORD }}>
							<div style={os(10, 700, GRAY)}>MARGEN PACK</div>
							<div style={Object.assign({}, mont(20), { color: BLACK, marginTop: 4 })}>{fMoney2(customRow.margenPack)}</div>
							<div style={os(10, 400, GRAY)}>{fP(marginTarget)} de {fMoney2(customRow.priceSug)}</div>
						</div>

						<div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid " + BORD }}>
							<div style={os(10, 700, GRAY)}>BREAK-EVEN</div>
							<div style={Object.assign({}, mont(20), { color: isFinite(customRow.be) ? BLACK : ER, marginTop: 4 })}>
								{isFinite(customRow.be) ? customRow.be.toLocaleString("es-AR") : "∞"}
							</div>
							<div style={os(10, 400, GRAY)}>clientes de este tipo</div>
						</div>

						<div style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid " + BORD }}>
							<div style={Object.assign({}, os(10, 700, GRAY), { marginBottom: 4 })}>RANGO DE PRECIOS</div>
							{[30, 40, 50, 60].map(function (m) {
								var p = customRow.cvPack / (1 - m / 100);
								var act = m === marginTarget;
								return (
									<div key={m} style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
										<span style={os(10, act ? 700 : 400, act ? BLUE : GRAY)}>{m}%</span>
										<span style={Object.assign({}, os(11, act ? 700 : 400, act ? BLUE : BLACK), { fontFamily: "Courier New,monospace" })}>
											{fMoney2(p)}
										</span>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			</div>

			{/* Chart */}
			<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
				CV (gris) + Margen (verde) = Precio sugerido · $/firma por volumen (eje derecho)
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
								return "$" + (v >= 1000 ? Math.round(v / 1000) + "k" : v);
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

			{/* Escalation table */}
			<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
				Tabla escalonada · {certs} cert{certs !== 1 ? "s" : ""} por pack · margen objetivo {marginTarget}%
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
													{vsBase < 0 ? "" : "+"}{vsBase.toFixed(2)}% /firma
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
				BE = clientes de ese tipo necesarios para cubrir CF directo mensual (USD {Math.round(costs.cfDirecto).toLocaleString("es-AR")}/mes)
			</div>
		</div>
	);
}
