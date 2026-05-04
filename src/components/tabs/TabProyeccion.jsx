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
import { BLUE, GRAY, BLACK, WHITE, OK, WN, WNBG, ER, ERBG, os, mont } from "../../theme/tokens";
import { makeMoney } from "../../utils/useMoney";
import { ChartTip } from "../ui/ChartTip";

export function TabProyeccion({ proj, beMes, calcs, costs, currency, tc }) {
	const { fMoney2 } = makeMoney(currency, tc);
	const PRICE_FACTORS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
	const beRows = calcs ? PRICE_FACTORS.map(function (f) {
		const precio = calcs.revMes * f;
		const margen = precio - calcs.cvMes;
		const be = margen > 0 ? Math.ceil(costs.cfDirecto / margen) : Infinity;
		return { f, precio, margen, be };
	}) : [];
	return (
		<div>
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
						style={Object.assign({}, os(11, 700, WN), {
							background: WNBG,
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
						<Bar
							dataKey="Revenue"
							fill={BLUE}
							opacity={0.85}
							radius={[2, 2, 0, 0]}
						/>
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
