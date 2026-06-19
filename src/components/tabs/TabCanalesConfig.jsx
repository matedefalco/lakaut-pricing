import { GRAY, BLACK, WHITE, BORD, os, mont } from "../../theme/tokens";

function InlineNum({ value, onChange, decimals }) {
	return (
		<input
			type="number"
			value={value === null || value === undefined ? "" : value}
			step={decimals > 0 ? Math.pow(10, -decimals) : 1}
			onChange={function (e) { onChange(e.target.value === "" ? null : Number(e.target.value)); }}
			style={{
				width: "100%",
				border: "1px solid " + BORD,
				borderRadius: 4,
				padding: "2px 6px",
				fontFamily: "Courier New,monospace",
				fontSize: 12,
				textAlign: "right",
				color: BLACK,
				background: WHITE,
				outline: "none",
				boxSizing: "border-box",
			}}
		/>
	);
}

function SectionHeader({ title }) {
	return (
		<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0", marginTop: 20 })}>
			{title}
		</div>
	);
}

function inputStyle(width) {
	return { width: width || "100%", border: "1px solid " + BORD, borderRadius: 4, padding: "2px 6px", fontSize: 11, fontFamily: "'Open Sans',sans-serif", color: BLACK, background: WHITE, outline: "none" };
}

const thStyle = Object.assign({}, os(10, 700, WHITE), { padding: "6px 10px", background: GRAY });
const thL = Object.assign({}, thStyle, { textAlign: "left" });
const thR = Object.assign({}, thStyle, { textAlign: "right" });

export function TabCanalesConfig({ channelConfig, updateChannelConfig }) {
	if (!channelConfig || !updateChannelConfig) return null;

	return (
		<div style={{ maxWidth: 900 }}>

			{/* ── Tiers de distribuidores ── */}
			<SectionHeader title="1 · Tiers de Distribuidores e Integradores" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
				<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 12 })}>
					El nivel se asigna por el mayor entre certificados activos y compromiso anual de facturación (USD).
				</div>
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
						<thead>
							<tr>
								{["Nivel", "Label", "Certs mín.", "Certs máx.", "Descuento %", "Compromiso mín. (USD)", "Compromiso máx. (USD)"].map(function (h, i) {
									return <th key={h} style={i <= 1 ? thL : thR}>{h}</th>;
								})}
							</tr>
						</thead>
						<tbody>
							{(channelConfig.distributorTiers || []).map(function (tier, idx) {
								function upd(field, val) {
									const next = channelConfig.distributorTiers.map(function (t, i) {
										return i === idx ? Object.assign({}, t, { [field]: val }) : t;
									});
									updateChannelConfig({ distributorTiers: next });
								}
								return (
									<tr key={tier.id || idx} style={{ background: idx % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={{ padding: "4px 8px" }}>
											<input value={tier.id || ""} onChange={function (e) { upd("id", e.target.value); }} style={inputStyle(80)} />
										</td>
										<td style={{ padding: "4px 8px" }}>
											<input value={tier.label || ""} onChange={function (e) { upd("label", e.target.value); }} style={inputStyle(90)} />
										</td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={tier.certsMin} decimals={0} onChange={function (v) { upd("certsMin", v); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={tier.certsMax} decimals={0} onChange={function (v) { upd("certsMax", v); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={Math.round((tier.descuento || 0) * 100)} decimals={0} onChange={function (v) { upd("descuento", (v || 0) / 100); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={tier.compromisoMin} decimals={0} onChange={function (v) { upd("compromisoMin", v); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={tier.compromisoMax} decimals={0} onChange={function (v) { upd("compromisoMax", v); }} /></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* ── Segmentos B2B2C ── */}
			<SectionHeader title="2 · Segmentos B2B2C (precio por IDC)" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
						<thead>
							<tr>
								{["IDC mín.", "IDC máx.", "Precio IDC (USD)", "Margen ref. %"].map(function (h) {
									return <th key={h} style={thR}>{h}</th>;
								})}
							</tr>
						</thead>
						<tbody>
							{(channelConfig.b2b2cSegments || []).map(function (seg, idx) {
								function upd(field, val) {
									const next = channelConfig.b2b2cSegments.map(function (s, i) {
										return i === idx ? Object.assign({}, s, { [field]: val }) : s;
									});
									updateChannelConfig({ b2b2cSegments: next });
								}
								return (
									<tr key={seg.id || idx} style={{ background: idx % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={{ padding: "4px 8px" }}><InlineNum value={seg.idcMin} decimals={0} onChange={function (v) { upd("idcMin", v); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={seg.idcMax} decimals={0} onChange={function (v) { upd("idcMax", v); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={seg.precioIDC} decimals={4} onChange={function (v) { upd("precioIDC", v); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={Math.round((seg.margenRef || 0) * 100)} decimals={0} onChange={function (v) { upd("margenRef", (v || 0) / 100); }} /></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* ── API Tiers B2B2C ── */}
			<SectionHeader title="3 · API Tiers B2B2C (fee de implementación)" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
						<thead>
							<tr>
								<th style={thL}>Label</th>
								{["Fee mín. (USD)", "Fee máx. (USD)", "Fee default (USD)"].map(function (h) {
									return <th key={h} style={thR}>{h}</th>;
								})}
							</tr>
						</thead>
						<tbody>
							{(channelConfig.b2b2cApiTiers || []).map(function (tier, idx) {
								function upd(field, val) {
									const next = channelConfig.b2b2cApiTiers.map(function (t, i) {
										return i === idx ? Object.assign({}, t, { [field]: val }) : t;
									});
									updateChannelConfig({ b2b2cApiTiers: next });
								}
								return (
									<tr key={tier.id || idx} style={{ background: idx % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={{ padding: "4px 8px" }}>
											<input value={tier.label || ""} onChange={function (e) { upd("label", e.target.value); }} style={inputStyle(160)} />
										</td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={tier.feeMin} decimals={0} onChange={function (v) { upd("feeMin", v); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={tier.feeMax} decimals={0} onChange={function (v) { upd("feeMax", v); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={tier.feeDefault} decimals={0} onChange={function (v) { upd("feeDefault", v); }} /></td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* ── Planes SLA ── */}
			<SectionHeader title="4 · Planes SLA" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
						<thead>
							<tr>
								<th style={thL}>Label</th>
								<th style={thR}>Precio/mes (USD)</th>
								<th style={thR}>SLA (%)</th>
								<th style={thR}>TX/mes</th>
								<th style={thL}>Descripción</th>
							</tr>
						</thead>
						<tbody>
							{(channelConfig.slaPlans || []).map(function (plan, idx) {
								function upd(field, val) {
									const next = channelConfig.slaPlans.map(function (p, i) {
										return i === idx ? Object.assign({}, p, { [field]: val }) : p;
									});
									updateChannelConfig({ slaPlans: next });
								}
								return (
									<tr key={plan.id || idx} style={{ background: idx % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={{ padding: "4px 8px" }}>
											<input value={plan.label || ""} onChange={function (e) { upd("label", e.target.value); }} style={inputStyle(120)} />
										</td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={plan.precioMes} decimals={0} onChange={function (v) { upd("precioMes", v); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={plan.sla !== null && plan.sla !== undefined ? Math.round(plan.sla * 1000) / 10 : null} decimals={1} onChange={function (v) { upd("sla", v === null ? null : v / 100); }} /></td>
										<td style={{ padding: "4px 8px" }}><InlineNum value={plan.txMes} decimals={0} onChange={function (v) { upd("txMes", v); }} /></td>
										<td style={{ padding: "4px 8px" }}>
											<input value={plan.desc || ""} onChange={function (e) { upd("desc", e.target.value); }} style={inputStyle("100%")} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

			{/* ── Otros parámetros ── */}
			<SectionHeader title="5 · Otros parámetros" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
				<div style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
					<div>
						<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 })}>Costo IDC referencia (USD)</div>
						<div style={{ width: 160 }}>
							<InlineNum value={channelConfig.costoIdcRef} decimals={4} onChange={function (v) { updateChannelConfig({ costoIdcRef: v }); }} />
						</div>
					</div>
					<div>
						<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 })}>Precio cert jurídica (USD/empresa/año)</div>
						<div style={{ width: 200 }}>
							<InlineNum value={channelConfig.precioCertJuridica} decimals={2} onChange={function (v) { updateChannelConfig({ precioCertJuridica: v }); }} />
						</div>
					</div>
				</div>
			</div>

		</div>
	);
}
