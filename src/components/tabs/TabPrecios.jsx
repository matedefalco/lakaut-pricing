import { useMemo } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, OKBG, WN, WNBG, ER, ERBG, os, mont } from "../../theme/tokens";
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

	const isPack = arch === "bolsa" || arch === "hibrido" || arch === "anual";
	const packPeriodo = inp ? (inp.periodo || 24) : 24;
	const cvPack = isPack ? calcs.cvMes * packPeriodo : null;
	const currentPackPrice = isPack && inp ? (inp.precio || 0) : null;
	const priceSugPack = isPack ? calcs.priceSug * packPeriodo : null;

	const priceSugAboveActual = isPack
		? (priceSugPack > currentPackPrice)
		: (calcs.priceSug > calcs.revMes);
	const priceSugLabel = arch === "ppu"
		? "Precio mínimo sugerido · equiv. mensual (" + (inp ? (inp.firmasAsumidas ?? 5) : 5) + " f/mes asumidas)"
		: isPack
		? "Precio mínimo sugerido · por pack (" + packPeriodo + "m)"
		: "Precio mínimo sugerido · usuario / mes";

	const MARGIN_TARGETS = useMemo(function () {
		if (!isPack || cvPack === null) return [];
		return [20, 30, 40, 50, 60].map(function (m) {
			var price = cvPack / (1 - m / 100);
			var diff = currentPackPrice - price;
			return { m: m, price: price, diff: diff, ok: diff >= 0 };
		});
	}, [isPack, cvPack, currentPackPrice]);
	const VOLS = useMemo(function () {
		var beU = calcs.beUsuarios;
		if (!isFinite(beU) || beU <= 0) {
			var c = Math.max(users, 1000);
			return [
				Math.max(1, Math.round(c * 0.1)),
				Math.max(1, Math.round(c * 0.25)),
				Math.max(1, Math.round(c * 0.5)),
				c,
				Math.round(c * 2),
				Math.round(c * 5),
			];
		}
		var be = Math.ceil(beU);
		return [
			Math.max(1, Math.round(be * 0.2)),
			Math.max(1, Math.round(be * 0.5)),
			Math.max(1, Math.round(be * 0.8)),
			be,
			Math.round(be * 1.5),
			Math.round(be * 3),
		];
	}, [calcs.beUsuarios, users]);
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
						background: priceSugAboveActual ? WNBG : OKBG,
						border: "2px solid " + (priceSugAboveActual ? WN : OK),
						borderRadius: 12,
						padding: "18px 20px",
					}}
				>
					<div
						style={Object.assign(
							{},
							os(10, 700, priceSugAboveActual ? WN : OK),
							{
								textTransform: "uppercase",
								letterSpacing: "0.6px",
								marginBottom: 6,
							},
						)}
					>
						{priceSugLabel}
					</div>
					<div
						style={Object.assign({}, mont(36), {
							color: priceSugAboveActual ? WN : OK,
							lineHeight: 1,
						})}
					>
						{fMoney2(isPack ? priceSugPack : calcs.priceSug)}
					</div>
					<div style={Object.assign({}, os(12, 400, GRAY), { marginTop: 8 })}>
						{priceSugAboveActual
							? "↑ Precio actual por debajo del mínimo"
							: "✓ Precio actual cubre el costo mínimo"}
					</div>
					{isPack && (
						<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 6 })}>
							CV pack: {fMoney2(cvPack)} · Margen mín. cargado al CF: incluido
						</div>
					)}
				</div>
			</div>

			{/* Pack price targets table */}
			{isPack && MARGIN_TARGETS.length > 0 && (
				<div style={{ marginBottom: 24 }}>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 })}>
						Precio sugerido por pack · según objetivo de margen
					</div>
					<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 10 })}>
						CV total del pack: {fMoney2(cvPack)} · Precio actual: {fMoney2(currentPackPrice)}
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
						<thead>
							<tr style={{ background: BLACK }}>
								{["Margen obj.", "CV pack", "Precio sugerido", "vs precio actual", "Estado"].map(function (h) {
									return <th key={h} style={Object.assign({}, os(10, 700, WHITE), { padding: "7px 10px", textAlign: h === "Margen obj." ? "left" : "right" })}>{h}</th>;
								})}
							</tr>
						</thead>
						<tbody>
							{MARGIN_TARGETS.map(function (row, i) {
								var isRec = row.m === 40;
								var sc = row.ok ? OK : ER;
								return (
									<tr key={row.m} style={{ background: isRec ? "#eaecfb" : i % 2 === 0 ? "#fafafa" : WHITE, outline: isRec ? "2px solid " + BLUE : "none" }}>
										<td style={Object.assign({}, os(13, isRec ? 700 : 400, isRec ? BLUE : BLACK), { padding: "8px 10px" })}>
											{isRec ? "▶ " : ""}{row.m}%{isRec ? <span style={Object.assign({}, os(10, 400, BLUE), { marginLeft: 6 })}>(mín. recomendado)</span> : null}
										</td>
										<td style={Object.assign({}, os(13, 400, GRAY), { padding: "8px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{fMoney2(cvPack)}
										</td>
										<td style={Object.assign({}, os(13, 700, isRec ? BLUE : BLACK), { padding: "8px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{fMoney2(row.price)}
										</td>
										<td style={Object.assign({}, os(13, 700, sc), { padding: "8px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{row.ok ? "+" : ""}{fMoney2(row.diff)}
										</td>
										<td style={{ padding: "8px 10px", textAlign: "right" }}>
											<span style={Object.assign({}, os(10, 700, sc), { background: row.ok ? OKBG : ERBG, padding: "2px 7px", borderRadius: 10 })}>
												{row.ok ? "✓ Cubre" : "↑ Subir precio"}
											</span>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}

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
						const r = calcs.revMes * u + (calcs.extraRevMes || 0),
							cv = calcs.cvMes * u + (calcs.cvExtras || 0),
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

			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginTop: 28,
					marginBottom: 6,
				})}
			>
				{isPack
					? "Precio mínimo según escala · precio actual: " + fMoney2(currentPackPrice) + "/pack"
					: "Precio mínimo según escala · precio actual: " + fMoney2(calcs.revMes) + "/usu·mes"}
			</div>
			<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 10 })}>
				A mayor escala el CF directo se diluye entre más usuarios y baja el precio mínimo necesario.
			</div>
			<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
				<thead>
					<tr style={{ background: BLACK }}>
						{["Usuarios", "Precio BE", "vs actual", "Estado"].map(function (h) {
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
						const cfNeto = costs.cfDirecto + (calcs.cvExtras || 0) - (calcs.extraRevMes || 0);
						const bePrice = calcs.cvMes + Math.max(0, cfNeto) / u;
						const diff = calcs.revMes - bePrice;
						const viable = diff >= 0;
						const needPct = !viable && calcs.revMes > 0 ? ((bePrice - calcs.revMes) / calcs.revMes) * 100 : 0;
						const act = u === users;
						const sc = viable ? OK : ER;
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
									style={Object.assign({}, os(13, 700, sc), {
										fontFamily: "Courier New,monospace",
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{fMoney2(bePrice)}
								</td>
								<td
									style={Object.assign({}, os(13, 400, sc), {
										fontFamily: "Courier New,monospace",
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{viable ? "+" + fMoney2(diff) : "−" + fMoney2(-diff)}
								</td>
								<td
									style={Object.assign({}, os(11, 700, sc), {
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{viable ? "✓ Viable" : "↑ +" + fP(needPct)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>

		</div>
	);
}
