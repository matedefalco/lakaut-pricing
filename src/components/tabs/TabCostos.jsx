import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, OKBG, WN, WNBG, ER, CAT_COLOR, os, mont } from "../../theme/tokens";
import { makeMoney } from "../../utils/useMoney";
import { fK } from "../../utils/formatters";
import { InfoTooltip } from "../ui/InfoTooltip";

export function TabCostos({ calcs, users, costConfig, costs, currency, tc }) {
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const subtotalOps = costConfig.fixedItems.reduce(function (s, r) { return s + r.v; }, 0);
	const subtotalAmort = costConfig.assetItems.reduce(function (s, r) { return s + r.amort; }, 0);
	const costoTotalMes = costs.cfDirecto + calcs.cvMes * users;
	const costoPorUsuario = users > 0 ? costoTotalMes / users : 0;
	return (
		<div>
			{/* CF fixed info banner */}
			<div
				style={{
					background: BLUEL,
					border: "1px solid " + BORD,
					borderRadius: 10,
					padding: "10px 14px",
					marginBottom: 16,
					display: "flex",
					flexWrap: "wrap",
					gap: 20,
				}}
			>
				<div>
					<div style={Object.assign({}, os(10, 700, BLUE), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>
						CF directo / mes
						<InfoTooltip text={"Suma de todos los costos fijos clasificados como Directo. Se usa para calcular EBITDA y break-even. CF total empresa: " + fMoney(costs.cfTotal)} />
					</div>
					<div style={Object.assign({}, mont(18), { color: BLUE })}>{fMoney(costs.cfDirecto)}</div>
				</div>
				<div style={{ borderLeft: "1px solid " + BORD, paddingLeft: 20 }}>
					<div style={Object.assign({}, os(10, 700, WN), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>
						CV por certificado
						<InfoTooltip text={"Suma de todos los componentes de CV x Certificado (RENAPER, Veriff, PKI, OTP cert., Sello de competencia)."} />
					</div>
					<div style={Object.assign({}, mont(18), { color: WN })}>{fMoney2(calcs.cvCertUnit)}</div>
				</div>
				<div style={{ borderLeft: "1px solid " + BORD, paddingLeft: 20 }}>
					<div style={Object.assign({}, os(10, 700, OK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>
						CV por firma
						<InfoTooltip text={"OTP SMS + Sello de tiempo RFC 3161 + infra por firma (activos ÷ capacidad anual ÷ 12). Fijo por firma, independiente del cliente."} />
					</div>
					<div style={Object.assign({}, mont(18), { color: OK })}>{fMoney2(calcs.cvFirmaUnit)}</div>
				</div>
				<div style={{ borderLeft: "1px solid " + BORD, paddingLeft: 20 }}>
					<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>
						Costo / usuario / mes
						<InfoTooltip text={"(CF directo + CV mensual × usuarios) ÷ usuarios. Costo de servir a un usuario promedio a la escala actual."} />
					</div>
					<div style={Object.assign({}, mont(18), { color: GRAY })}>{fMoney2(costoPorUsuario)}</div>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
				<div>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
						Costos fijos operativos
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<tbody>
							{costConfig.fixedItems.map(function (r, i) {
								return (
									<tr key={r.item} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={{ padding: "3px 6px" }}>
											<span style={Object.assign({}, os(9, 700, CAT_COLOR[r.cat] || GRAY), { marginRight: 4, textTransform: "uppercase" })}>
												{r.cat}
											</span>
											<span style={os(11, 400, BLACK)}>{r.item}</span>
										</td>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{fMoney(r.v)}
										</td>
									</tr>
								);
							})}
							<tr style={{ background: BLUEL }}>
								<td style={Object.assign({}, os(11, 700, BLUE), { padding: "5px 6px" })}>Subtotal operativos</td>
								<td style={Object.assign({}, os(11, 700, BLUE), { padding: "5px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{fMoney(subtotalOps)}
								</td>
							</tr>
						</tbody>
					</table>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", margin: "14px 0 8px" })}>
						Activos físicos (amortización mensual)
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<tbody>
							{costConfig.assetItems.map(function (r, i) {
								return (
									<tr key={r.item} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={{ padding: "3px 6px" }}>
											<span style={os(11, 400, BLACK)}>{r.item}</span>
											<span style={Object.assign({}, os(10, 400, GRAY), { marginLeft: 4 })}>({r.vida}m)</span>
										</td>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{fMoney(r.amort)}
										</td>
									</tr>
								);
							})}
							<tr style={{ background: BLUEL }}>
								<td style={Object.assign({}, os(11, 700, BLUE), { padding: "5px 6px" })}>Total amortización</td>
								<td style={Object.assign({}, os(11, 700, BLUE), { padding: "5px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{fMoney(subtotalAmort)}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
						CV por certificado emitido
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<tbody>
							{costConfig.cvCertItems.map(function (r, i) {
								return (
									<tr key={r.item} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px" })}>{r.item}</td>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{r.v.toFixed(4)}
										</td>
									</tr>
								);
							})}
							<tr style={{ background: WNBG }}>
								<td style={Object.assign({}, os(11, 700, WN), { padding: "5px 6px" })}>Total CV cert</td>
								<td style={Object.assign({}, os(11, 700, WN), { padding: "5px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{calcs.cvCertUnit.toFixed(4)}
								</td>
							</tr>
						</tbody>
					</table>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", margin: "14px 0 8px" })}>
						CV por firma ejecutada
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<tbody>
							{(costConfig.cvFirmaItems || []).map(function (r, i) {
								return (
									<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px" })}>{r.item}</td>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{r.v.toFixed(4)}
										</td>
									</tr>
								);
							})}
							<tr>
								<td style={{ padding: "3px 6px" }}>
									<span style={os(11, 400, BLACK)}>Infra activada</span>
									<span style={Object.assign({}, os(10, 400, GRAY), { display: "block" })}>
										{fMoney(costs.activosTotal)} ÷ ({fK(costs.capacidadFirmasAnual || 0)} / 12)
									</span>
								</td>
								<td style={Object.assign({}, os(11, 400, BLUE), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{calcs.infraPorFirma.toFixed(6)}
								</td>
							</tr>
							{calcs.svcUserMes > 0 && (
								<tr style={{ background: "#fafafa" }}>
									<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px" })}>Servicios opcionales activos</td>
									<td style={Object.assign({}, os(11, 400, BLUE), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
										{fMoney2(calcs.svcUserMes)}/usr/mes
									</td>
								</tr>
							)}
							<tr style={{ background: OKBG }}>
								<td style={Object.assign({}, os(11, 700, OK), { padding: "5px 6px" })}>Total CV firma</td>
								<td style={Object.assign({}, os(11, 700, OK), { padding: "5px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{calcs.cvFirmaUnit.toFixed(4)}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			{/* Total costs summary */}
			<div style={{ marginTop: 20, background: "#1e293b", borderRadius: 10, padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 24 }}>
			<div>
				<div style={Object.assign({}, os(10, 700, "#94a3b8"), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>Costo total / mes</div>
				<div style={Object.assign({}, mont(22), { color: WHITE })}>{fMoney(costoTotalMes)}</div>
				<div style={Object.assign({}, os(10, 400, "#94a3b8"), { marginTop: 2 })}>CF {fMoney(costs.cfDirecto)} + CV {fMoney(calcs.cvMes * users)}</div>
			</div>
			<div style={{ borderLeft: "1px solid #334155", paddingLeft: 24 }}>
				<div style={Object.assign({}, os(10, 700, "#94a3b8"), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>Costo / usuario</div>
				<div style={Object.assign({}, mont(22), { color: WHITE })}>{fMoney2(costoPorUsuario)}/mes</div>
			</div>
			<div style={{ borderLeft: "1px solid #334155", paddingLeft: 24 }}>
				<div style={Object.assign({}, os(10, 700, "#94a3b8"), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>CV / usuario</div>
				<div style={Object.assign({}, mont(22), { color: WHITE })}>{fMoney2(calcs.cvMes)}/mes</div>
			</div>
			</div>

			{/* Referencia rápida */}
			<div style={{ marginTop: 16, background: BLUEL, border: "1px solid " + BORD, borderRadius: 10, padding: "12px 14px" }}>
				<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
					Referencia rápida
				</div>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
					{[
						{ l: "Break-even", v: isFinite(calcs.beUsuarios) ? calcs.beUsuarios.toLocaleString("es-AR") + " usu." : "∞", color: isFinite(calcs.beUsuarios) ? OK : ER },
						{ l: "CF directo / mes", v: fMoney(costs.cfDirecto), color: GRAY },
						{ l: "CV firma / unidad", v: calcs.cvFirmaUnit.toFixed(4), color: BLUE },
						{ l: "Infra / firma", v: fMoney2(calcs.infraPorFirma), color: GRAY },
					].map(function (row) {
						return (
							<div key={row.l} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
								<span style={os(11, 400, GRAY)}>{row.l}</span>
								<span style={Object.assign({}, os(11, 700, row.color), { fontFamily: "Courier New,monospace", whiteSpace: "nowrap" })}>{row.v}</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
