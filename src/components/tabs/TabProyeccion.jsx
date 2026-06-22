import {
	ComposedChart,
	Bar,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ReferenceLine,
	ResponsiveContainer,
} from "recharts";
import { BLUE, BLUEL, BORD, GRAY, BLACK, WHITE, OK, OKBG, WN, WNBG, ER, ERBG, os, mont } from "../../theme/tokens";
import { makeMoney } from "../../utils/useMoney";
import { ChartTip } from "../ui/ChartTip";
import { NumInput } from "../ui/NumInput";

export function TabProyeccion({ proj, beMes, calcs, costs, currency, tc, projParams, setProjParams, arch }) {
	const { fMoney2 } = makeMoney(currency, tc);
	const hasExtras = proj && proj.length > 0 && (proj[0]["Rev Extras"] || 0) > 0;
	const PRICE_FACTORS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
	const beRows = calcs ? PRICE_FACTORS.map(function (f) {
		const precio = calcs.revMes * f;
		const margen = precio - calcs.cvMes;
		const be = margen > 0 ? Math.ceil(costs.cfDirecto / margen) : Infinity;
		return { f, precio, margen, be };
	}) : [];

	const params = projParams || { usersM1: 1000, growthRate: 10, churnRate: 5 };
	function setParam(key, val) {
		if (!setProjParams) return;
		setProjParams(function (p) { return Object.assign({}, p, { [key]: val }); });
	}

	return (
		<div>
			{/* Projection parameters */}
			<div style={{ background: BLUEL, border: "1px solid " + BORD, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
				<div style={Object.assign({}, os(10, 700, BLUE), { textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "center", flexShrink: 0 })}>
					Parámetros de proyección
				</div>
				<div style={{ flex: "0 0 140px" }}>
					<NumInput
						label="Usuarios mes 1"
						value={params.usersM1}
						onChange={function (v) { setParam("usersM1", Math.max(1, Math.round(v))); }}
						suffix="usu"
					/>
				</div>
				<div style={{ flex: "0 0 140px" }}>
					<NumInput
						label="Crecimiento mensual"
						value={params.growthRate}
						onChange={function (v) { setParam("growthRate", v); }}
						suffix="%"
					/>
				</div>
				{arch === "sub" && (
					<div style={{ flex: "0 0 140px" }}>
						<NumInput
							label="Churn mensual"
							value={params.churnRate}
							onChange={function (v) { setParam("churnRate", Math.max(0, v)); }}
							suffix="%"
						/>
					</div>
				)}
				{arch === "sub" && (
					<div style={Object.assign({}, os(10, 400, GRAY), { alignSelf: "flex-end", paddingBottom: 10, maxWidth: 180 })}>
						Neto: {(params.growthRate - params.churnRate).toFixed(1)}% / mes
					</div>
				)}
				<div style={{ flex: "0 0 140px" }}>
					<NumInput
						label="CAC por usuario"
						value={params.cac || 0}
						onChange={function (v) { setParam("cac", Math.max(0, v)); }}
						suffix="USD"
					/>
				</div>
				{(params.cac || 0) > 0 && (
					<div style={Object.assign({}, os(10, 400, GRAY), { alignSelf: "flex-end", paddingBottom: 10, maxWidth: 200 })}>
						Costo de adquisición descontado del EBITDA mensual según nuevos usuarios
					</div>
				)}
			</div>

			{/* Chart 1: Revenue / Costo / EBITDA */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 8,
				}}
			>
				<div
					style={Object.assign({}, os(11, 700, BLACK), {
						textTransform: "uppercase",
						letterSpacing: "0.5px",
					})}
				>
					Revenue · Costo · EBITDA mensual (ramp 24M)
				</div>
				{beMes ? (
					<span
						style={Object.assign({}, os(11, 700, OK), {
							background: OKBG,
							padding: "3px 10px",
							borderRadius: 20,
						})}
					>
						Break-even mes {beMes}
					</span>
				) : (
					<span
						style={Object.assign({}, os(11, 700, ER), {
							background: ERBG,
							padding: "3px 10px",
							borderRadius: 20,
						})}
					>
						Sin break-even en 24M
					</span>
				)}
			</div>
			{/* Legend when extras are present */}
			{hasExtras && (
				<div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<div style={{ width: 12, height: 12, background: BLUE, opacity: 0.85, borderRadius: 2 }} />
						<span style={os(10, 400, GRAY)}>Packs</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<div style={{ width: 12, height: 12, background: "#22c55e", opacity: 0.85, borderRadius: 2 }} />
						<span style={os(10, 400, GRAY)}>Firmas extra</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<div style={{ width: 12, height: 12, background: GRAY, opacity: 0.6, borderRadius: 2 }} />
						<span style={os(10, 400, GRAY)}>Costo</span>
					</div>
					<div style={{ display: "flex", alignItems: "center", gap: 5 }}>
						<div style={{ width: 20, height: 2.5, background: OK, borderRadius: 2 }} />
						<span style={os(10, 400, GRAY)}>EBITDA</span>
					</div>
				</div>
			)}
			<div style={{ height: 200, marginBottom: 20 }}>
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart
						data={proj}
						margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#eee" />
						<XAxis
							dataKey="mes"
							tick={{ fontSize: 10, fill: GRAY }}
							interval={3}
						/>
						<YAxis
							tick={{ fontSize: 10, fill: GRAY }}
							tickFormatter={function (v) {
								return v >= 1000 ? Math.round(v / 1000) + "k" : v;
							}}
						/>
						<Tooltip content={ChartTip} />
						{hasExtras ? (
							<>
								<Bar dataKey="Rev Pack" name="Packs" stackId="rev" fill={BLUE} opacity={0.85} />
								<Bar dataKey="Rev Extras" name="Firmas extra" stackId="rev" fill="#22c55e" opacity={0.85} radius={[2, 2, 0, 0]} />
							</>
						) : (
							<Bar
								dataKey="Revenue"
								fill={BLUE}
								opacity={0.85}
								radius={[2, 2, 0, 0]}
							/>
						)}
						<Bar
							dataKey="Costo"
							fill={GRAY}
							opacity={0.6}
							radius={[2, 2, 0, 0]}
						/>
						<Line
							type="monotone"
							dataKey="EBITDA"
							stroke={OK}
							strokeWidth={2.5}
							dot={false}
						/>
						{beMes && (
							<ReferenceLine
								x={"M" + beMes}
								stroke={WN}
								strokeDasharray="5 3"
								label={{ value: "M" + beMes, fill: WN, fontSize: 10 }}
							/>
						)}
					</ComposedChart>
				</ResponsiveContainer>
			</div>

			{/* Chart 2: Balance acumulado */}
			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: 8,
				})}
			>
				Balance acumulado
			</div>
			<div style={{ height: 160 }}>
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart
						data={proj}
						margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#eee" />
						<XAxis
							dataKey="mes"
							tick={{ fontSize: 10, fill: GRAY }}
							interval={3}
						/>
						<YAxis
							tick={{ fontSize: 10, fill: GRAY }}
							tickFormatter={function (v) {
								return v >= 1000 ? Math.round(v / 1000) + "k" : v;
							}}
						/>
						<Tooltip content={ChartTip} />
						<ReferenceLine y={0} stroke={ER} strokeDasharray="4 2" />
						<Line
							type="monotone"
							dataKey="Acumulado"
							stroke={BLUE}
							strokeWidth={3}
							dot={false}
						/>
						{beMes && (
							<ReferenceLine
								x={"M" + beMes}
								stroke={WN}
								strokeDasharray="5 3"
							/>
						)}
					</ComposedChart>
				</ResponsiveContainer>
			</div>

			{/* BE by price table */}
			{calcs && beRows.length > 0 && (
				<div style={{ marginTop: 24 }}>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
						Usuarios necesarios para cubrir costos fijos · por precio
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
						<thead>
							<tr style={{ background: BLACK }}>
								{["Precio / usuario / mes", "Margen unit.", "Usuarios para BE", ""].map(function (h) {
									return <th key={h} style={Object.assign({}, os(10, 700, WHITE), { padding: "7px 10px", textAlign: h === "Precio / usuario / mes" ? "left" : "right" })}>{h}</th>;
								})}
							</tr>
						</thead>
						<tbody>
							{beRows.map(function (row) {
								const isCurrent = row.f === 1.0;
								const covered = isFinite(row.be);
								return (
									<tr key={row.f} style={{ background: isCurrent ? "#eaecfb" : "transparent", outline: isCurrent ? "2px solid " + BLUE : "none" }}>
										<td style={Object.assign({}, os(13, isCurrent ? 700 : 400, isCurrent ? BLUE : BLACK), { padding: "8px 10px", fontFamily: "Courier New,monospace" })}>
											{isCurrent ? "▶ " : ""}{fMoney2(row.precio)}
											{isCurrent && <span style={Object.assign({}, os(10, 400, BLUE), { marginLeft: 6 })}>(precio actual)</span>}
										</td>
										<td style={Object.assign({}, os(13, 400, row.margen > 0 ? OK : ER), { padding: "8px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{fMoney2(row.margen)}
										</td>
										<td style={Object.assign({}, os(13, 700, covered ? (row.be <= 50000 ? OK : WN) : ER), { padding: "8px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{covered ? row.be.toLocaleString("es-AR") : "∞"}
										</td>
										<td style={{ padding: "8px 10px", textAlign: "right" }}>
											{covered && <span style={Object.assign({}, os(10, 400, row.be <= 50000 ? OK : WN), { background: row.be <= 50000 ? "#d1fae5" : "#fef3c7", padding: "2px 7px", borderRadius: 10 })}>{row.be <= 10000 ? "alcanzable" : row.be <= 50000 ? "moderado" : "difícil"}</span>}
											{!covered && <span style={Object.assign({}, os(10, 400, ER), { background: "#fee2e2", padding: "2px 7px", borderRadius: 10 })}>sin BE</span>}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
					<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 6 })}>
						CF directo / mes: {fMoney2(costs.cfDirecto)} · CV / usuario / mes: {fMoney2(calcs.cvMes)}
					</div>
				</div>
			)}
		</div>
	);
}
