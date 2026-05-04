import { useMemo } from "react";
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
import { BLUE, GRAY, BLACK, WHITE, BORD, OK, OKBG, WN, ER, ERBG, os } from "../../theme/tokens";
import { fD, fD2, fK } from "../../utils/formatters";
import { beCurveData, priceSensData } from "../../engine/chartData";

export function TabBreakEven({ arch, inp, svc, currentUsers, costs }) {
	const curveData = useMemo(
		function () {
			return beCurveData(arch, inp, svc, currentUsers, costs);
		},
		[arch, inp, svc, currentUsers, costs],
	);
	const sensData = useMemo(
		function () {
			return priceSensData(arch, inp, svc, currentUsers, costs);
		},
		[arch, inp, svc, currentUsers, costs],
	);

	const bePoint = curveData.find(function (d) {
		return d.EBITDA >= 0;
	});

	const TipU = function ({ active, payload, label }) {
		if (!active || !payload || !payload.length) return null;
		return (
			<div
				style={{
					background: WHITE,
					border: "1px solid " + BORD,
					borderRadius: 8,
					padding: "8px 12px",
				}}
			>
				<div style={Object.assign({}, os(12, 700, BLACK), { marginBottom: 4 })}>
					{Number(label).toLocaleString()} usuarios
				</div>
				{payload.map(function (p) {
					return (
						<div
							key={p.name}
							style={{
								display: "flex",
								justifyContent: "space-between",
								gap: 12,
								color: p.color || p.stroke,
							}}
						>
							<span style={os(11, 400)}>{p.name}</span>
							<span style={os(11, 700)}>{fD(p.value)}</span>
						</div>
					);
				})}
			</div>
		);
	};
	const TipP = function ({ active, payload, label }) {
		if (!active || !payload || !payload.length) return null;
		return (
			<div
				style={{
					background: WHITE,
					border: "1px solid " + BORD,
					borderRadius: 8,
					padding: "8px 12px",
				}}
			>
				<div style={Object.assign({}, os(12, 700, BLACK), { marginBottom: 4 })}>
					Precio equiv. {fD2(Number(label))}/mes
				</div>
				{payload.map(function (p) {
					return (
						<div key={p.name} style={{ color: p.color || BLUE }}>
							<span style={os(11, 400)}>{p.name}: </span>
							<span style={os(11, 700)}>
								{p.value ? Number(p.value).toLocaleString() + " usuarios" : "—"}
							</span>
						</div>
					);
				})}
			</div>
		);
	};

	return (
		<div>
			{/* Chart 1: EBITDA vs users */}
			<div style={{ marginBottom: 28 }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 8,
					}}
				>
					<div
						style={Object.assign({}, os(11, 700, BLACK), {
							textTransform: "uppercase",
							letterSpacing: "0.5px",
						})}
					>
						EBITDA del segmento vs. volumen de usuarios
					</div>
					{bePoint ? (
						<span
							style={Object.assign({}, os(11, 700, OK), {
								background: OKBG,
								padding: "3px 10px",
								borderRadius: 20,
							})}
						>
							BE a ~{fK(bePoint.users)} usuarios
						</span>
					) : (
						<span
							style={Object.assign({}, os(11, 700, ER), {
								background: ERBG,
								padding: "3px 10px",
								borderRadius: 20,
							})}
						>
							Sin BE en el rango analizado
						</span>
					)}
				</div>
				<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 8 })}>
					La línea verde muestra el EBITDA conforme crece la base de usuarios.
					Cruza 0 en el punto de equilibrio.
				</div>
				<div style={{ height: 240 }}>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart
							data={curveData}
							margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#eee" />
							<XAxis
								dataKey="users"
								tick={{ fontSize: 10, fill: GRAY }}
								tickFormatter={function (v) {
									return fK(v);
								}}
								label={{
									value: "Usuarios activos",
									position: "insideBottom",
									offset: -2,
									style: { fontSize: 10, fill: GRAY },
								}}
							/>
							<YAxis
								tick={{ fontSize: 10, fill: GRAY }}
								tickFormatter={function (v) {
									return v >= 1000 ? Math.round(v / 1000) + "k" : v;
								}}
							/>
							<Tooltip content={TipU} />
							<ReferenceLine
								y={0}
								stroke={ER}
								strokeDasharray="4 2"
								label={{
									value: "Break-even",
									fill: ER,
									fontSize: 10,
									position: "insideTopRight",
								}}
							/>
							<ReferenceLine
								x={currentUsers}
								stroke={BLUE}
								strokeDasharray="4 2"
								label={{ value: "Actual", fill: BLUE, fontSize: 10 }}
							/>
							<Bar
								dataKey="Revenue"
								fill={BLUE}
								opacity={0.3}
								radius={[1, 1, 0, 0]}
							/>
							<Line
								type="monotone"
								dataKey="EBITDA"
								stroke={OK}
								strokeWidth={2.5}
								dot={false}
								name="EBITDA"
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Chart 2: BE users vs price */}
			<div>
				<div
					style={Object.assign({}, os(11, 700, BLACK), {
						textTransform: "uppercase",
						letterSpacing: "0.5px",
						marginBottom: 8,
					})}
				>
					Sensibilidad de precio: usuarios necesarios para break-even según
					precio equivalente mensual
				</div>
				<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 8 })}>
					Cuántos usuarios necesitás según el precio que elijas. A mayor precio
					→ menos usuarios necesarios para cubrir costos fijos.
				</div>
				<div style={{ height: 220 }}>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart
							data={sensData}
							margin={{ top: 4, right: 12, bottom: 16, left: 8 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#eee" />
							<XAxis
								dataKey="precio"
								tick={{ fontSize: 10, fill: GRAY }}
								tickFormatter={function (v) {
									return "USD " + v.toFixed(2);
								}}
								label={{
									value: "Precio equivalente / mes",
									position: "insideBottom",
									offset: -8,
									style: { fontSize: 10, fill: GRAY },
								}}
							/>
							<YAxis
								tick={{ fontSize: 10, fill: GRAY }}
								tickFormatter={function (v) {
									return fK(v);
								}}
								label={{
									value: "Usuarios para BE",
									angle: -90,
									position: "insideLeft",
									style: { fontSize: 10, fill: GRAY },
								}}
							/>
							<Tooltip content={TipP} />
							<ReferenceLine
								x={
									arch === "sub"
										? inp.precio || 8
										: arch === "anual"
											? (inp.precio || 80) / 12
											: arch === "bolsa"
												? (inp.precio || 19) / 24
												: inp.precioFirma || 1.5
								}
								stroke={BLUE}
								strokeDasharray="4 2"
								label={{ value: "Actual", fill: BLUE, fontSize: 10 }}
							/>
							<Line
								type="monotone"
								dataKey="BE_usuarios"
								stroke={WN}
								strokeWidth={2.5}
								dot={false}
								name="BE usuarios"
								connectNulls={false}
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	);
}
