import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, OKBG, WN, WNBG, ER, os, mont } from "../../theme/tokens";
import { makeMoney } from "../../utils/useMoney";
import { fP, fK } from "../../utils/formatters";

function buildDisplayPrice(arch, inp, fMoney2) {
	if (arch === "ppu") {
		const fa = inp.firmasAsumidas || 5;
		return {
			price: "Cert " + fMoney2(inp.precioCert || 0) + " + " + fMoney2(inp.precioFirma || 0) + "/firma",
			suffix: "(" + fa + " firmas/mes asumidas)",
		};
	}
	if (arch === "anual") {
		return {
			price: fMoney2(inp.precio || 0),
			suffix: "/año (" + fMoney2((inp.precio || 0) / 12) + "/mes)",
		};
	}
	if (arch === "free") return { price: "USD 0", suffix: "(gratuito)" };
	if (arch === "hibrido") {
		const p = inp.periodo || 24;
		return {
			price: "Cert " + fMoney2(inp.precioCert || 0) + " + Bolsa " + fMoney2(inp.precio || 0),
			suffix: "/ pack (" + p + "m)",
		};
	}
	if (arch === "bolsa") {
		const p = inp.periodo || 24;
		return { price: fMoney2(inp.precio || 0), suffix: "/ pack (" + p + " meses)" };
	}
	// sub
	return { price: fMoney2(inp.precio || 0), suffix: "/mes" };
}

export function TabPrecios({ calcs, users, costs, currency, tc, arch, inp }) {
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const dp = (arch && inp) ? buildDisplayPrice(arch, inp, fMoney2) : { price: calcs.displayPrice, suffix: calcs.displayPriceSuffix };
	const VOLS = [5000, 10000, 20000, 50000, 100000, 200000];
	return (
		<div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
					gap: 12,
					marginBottom: 20,
				}}
			>
				{/* Actual price card - shows real price, not amortized */}
				<div
					style={{
						background: BLUEL,
						border: "2px solid " + BLUE,
						borderRadius: 12,
						padding: "18px 20px",
					}}
				>
					<div
						style={Object.assign({}, os(10, 700, BLUE), {
							textTransform: "uppercase",
							letterSpacing: "0.6px",
							marginBottom: 6,
						})}
					>
						Precio al cliente
					</div>
					<div
						style={Object.assign({}, mont(28), {
							color: BLUE,
							lineHeight: 1.1,
						})}
					>
						{dp.price}
					</div>
					<div style={Object.assign({}, os(12, 400, GRAY), { marginTop: 6 })}>
						{dp.suffix}
					</div>
					<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 8 })}>
						Equivalente mensual: {fMoney2(calcs.revMes)} · CV: {fMoney2(calcs.cvMes)} ·
						Margen: {fMoney2(calcs.margenUnit)}
					</div>
				</div>
				<div
					style={{
						background: calcs.priceSug > calcs.revMes ? WNBG : OKBG,
						border: "2px solid " + (calcs.priceSug > calcs.revMes ? WN : OK),
						borderRadius: 12,
						padding: "18px 20px",
					}}
				>
					<div
						style={Object.assign(
							{},
							os(10, 700, calcs.priceSug > calcs.revMes ? WN : OK),
							{
								textTransform: "uppercase",
								letterSpacing: "0.6px",
								marginBottom: 6,
							},
						)}
					>
						Precio mínimo sugerido · usuario / mes
					</div>
					<div
						style={Object.assign({}, mont(36), {
							color: calcs.priceSug > calcs.revMes ? WN : OK,
							lineHeight: 1,
						})}
					>
						{fMoney2(calcs.priceSug)}
					</div>
					<div style={Object.assign({}, os(12, 400, GRAY), { marginTop: 8 })}>
						{calcs.priceSug > calcs.revMes
							? "↑ Precio actual por debajo del mínimo"
							: "✓ Precio actual cubre el costo mínimo"}
					</div>
				</div>
			</div>

			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: 10,
				})}
			>
				Sensibilidad EBITDA por volumen · CF directo: {fMoney(costs.cfDirecto)}/mes
			</div>
			<table
				style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
			>
				<thead>
					<tr style={{ background: BLACK }}>
						{[
							"Usuarios",
							"Revenue / mes",
							"CV total",
							"EBITDA / mes",
							"Margen %",
							"vs BE",
						].map(function (h) {
							return (
								<th
									key={h}
									style={Object.assign({}, os(10, 700, WHITE), {
										padding: "8px 10px",
										textAlign: h === "Usuarios" ? "left" : "right",
									})}
								>
									{h}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{VOLS.map(function (u, i) {
						const r = calcs.revMes * u,
							cv = calcs.cvMes * u,
							e = r - cv - costs.cfDirecto;
						const m = r > 0 ? (e / r) * 100 : -100;
						const ec = e > 0 ? OK : e > -20000 ? WN : ER;
						const act = u === users;
						return (
							<tr
								key={u}
								style={{
									background: act ? BLUEL : i % 2 === 0 ? "#fafafa" : WHITE,
									outline: act ? "2px solid " + BLUE : "none",
								}}
							>
								<td
									style={Object.assign(
										{},
										os(13, act ? 700 : 400, act ? BLUE : BLACK),
										{ padding: "9px 10px" },
									)}
								>
									{act ? "▶ " : ""}
									{u.toLocaleString()}
								</td>
								<td
									style={Object.assign({}, os(13, 400, BLACK), {
										fontFamily: "Courier New,monospace",
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{fMoney(r)}
								</td>
								<td
									style={Object.assign({}, os(13, 400, GRAY), {
										fontFamily: "Courier New,monospace",
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{fMoney(cv)}
								</td>
								<td
									style={Object.assign({}, os(13, 700, ec), {
										fontFamily: "Courier New,monospace",
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{fMoney(e)}
								</td>
								<td
									style={Object.assign({}, os(13, 400, ec), {
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{fP(m)}
								</td>
								<td
									style={Object.assign(
										{},
										os(11, 400, u >= calcs.beUsuarios ? OK : GRAY),
										{ textAlign: "right", padding: "9px 10px" },
									)}
								>
									{u >= calcs.beUsuarios
										? "✓ BE"
										: "−" + fK(calcs.beUsuarios - u)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
