import { useState } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, os, mont } from "../../theme/tokens";
import { DEFAULT_VOLUME_TIERS } from "../../data/volumeTiers";
import { useChannelConfig } from "../../context/ChannelConfigContext";

function InlineNum({ value, onChange, placeholder, step, min }) {
	return (
		<input
			type="number"
			value={value === null || value === undefined ? "" : value}
			placeholder={placeholder || "—"}
			step={step || 1}
			min={min !== undefined ? min : 0}
			onChange={function (e) {
				const v = e.target.value === "" ? null : Number(e.target.value);
				onChange(v);
			}}
			style={{
				width: "100%",
				border: "1px solid " + BORD,
				borderRadius: 4,
				padding: "4px 6px",
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

const TIER_COLORS = {
	starter:    "#7c3aed",
	scale:      "#0284c7",
	growth:     "#d97706",
	enterprise: "#16a34a",
};

export function TabVolumenConfig({ volumeTiers, onUpdate }) {
	const { channelConfig, update: channelConfigUpdate } = useChannelConfig();
	const precioCertJuridica = channelConfig.precioCertJuridica;
	const [savedFlash, setSavedFlash] = useState(false);

	function updTier(idx, field, val) {
		const next = volumeTiers.map(function (t, i) {
			if (i !== idx) return t;
			return Object.assign({}, t, { [field]: val });
		});
		onUpdate(next);
		setSavedFlash(true);
		setTimeout(function () { setSavedFlash(false); }, 1400);
	}

	function reset() {
		onUpdate(DEFAULT_VOLUME_TIERS.map(function (t) { return Object.assign({}, t); }));
		setSavedFlash(true);
		setTimeout(function () { setSavedFlash(false); }, 1400);
	}

	const COLS = [
		{ key: "certsMin", label: "Certs mín.", step: 1, min: 1 },
		{ key: "certsMax", label: "Certs máx.", step: 1, min: 1, nullable: true },
		{ key: "precioCertFisica", label: "Precio/cert/año", step: 0.5, min: 0, nullable: true },
		{ key: "firmasIncluidas", label: "Firmas incl.", step: 1, min: 0, nullable: true },
		{ key: "precioFirmaExtra", label: "Firma extra ($)", step: 0.01, min: 0, nullable: true },
		{ key: "setupFee", label: "Setup fee/mes", step: 100, min: 0, nullable: true },
	];

	return (
		<div style={{ maxWidth: 820 }}>
			<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0", marginTop: 20 })}>
				Tiers de pricing por volumen
			</div>
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 20, background: WHITE }}>
				<div style={os(11, 400, GRAY, { marginBottom: 16 })}>
					Definí los precios y breakpoints por tier. Los cambios se aplican inmediatamente en la Cotizadora B2B y se guardan en este navegador.
					Dejá un campo vacío para marcarlo como "a negociar" (Enterprise).
				</div>

				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 640 }}>
						<thead>
							<tr style={{ background: "#f8f8f8" }}>
								<th style={Object.assign({}, os(10, 700, GRAY), { padding: "8px 12px", textAlign: "left", borderBottom: "1px solid " + BORD, width: 90 })}>Tier</th>
								{COLS.map(function (c) {
									return (
										<th key={c.key} style={Object.assign({}, os(10, 700, GRAY), { padding: "8px 10px", textAlign: "right", borderBottom: "1px solid " + BORD })}>
											{c.label}
										</th>
									);
								})}
							</tr>
						</thead>
						<tbody>
							{volumeTiers.map(function (tier, idx) {
								const color = TIER_COLORS[tier.id] || "#888";
								return (
									<tr key={tier.id} style={{ borderBottom: "1px solid " + BORD }}>
										<td style={{ padding: "10px 12px" }}>
											<span style={Object.assign({}, os(11, 700, color), { display: "block" })}>{tier.label}</span>
										</td>
										{COLS.map(function (c) {
											return (
												<td key={c.key} style={{ padding: "8px 10px", minWidth: 90 }}>
													<InlineNum
														value={tier[c.key]}
														onChange={function (v) { updTier(idx, c.key, v); }}
														step={c.step}
														min={c.min}
														placeholder={c.nullable ? "negociar" : ""}
													/>
												</td>
											);
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>

				<div style={{ marginTop: 16, padding: "12px 14px", background: BLUEL, borderRadius: 8, border: "1px solid " + BLUE, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
					<span style={os(11, 700, BLACK)}>Cert jurídica (USD/empresa/año):</span>
					<InlineNum
						value={precioCertJuridica}
						onChange={function (v) { channelConfigUpdate({ precioCertJuridica: v }); }}
						step={0.5}
						min={0}
					/>
					<span style={os(11, 400, GRAY)}>No es tier-based — aplica en todas las cotizaciones B2B.</span>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
					<button
						onClick={reset}
						style={{ padding: "8px 18px", background: WHITE, color: GRAY, border: "1.5px solid " + BORD, borderRadius: 8, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 400, cursor: "pointer" }}
					>
						Restaurar defaults
					</button>
					{savedFlash && (
						<span style={Object.assign({}, os(11, 700, OK), { background: "#dcfce7", padding: "4px 10px", borderRadius: 6 })}>
							✓ Guardado
						</span>
					)}
					{!savedFlash && (
						<span style={os(11, 400, GRAY)}>Los cambios se guardan automáticamente en este navegador.</span>
					)}
				</div>
			</div>

			{/* Preview: margen por tier a distintos volúmenes */}
			<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0", marginTop: 24 })}>
				Vista previa · lógica de tiers
			</div>
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
					<thead>
						<tr style={{ background: "#f8f8f8" }}>
							{["Certs/año", "Tier asignado", "Precio/cert", "Firmas incl.", "Setup fee/mes"].map(function (h, i) {
								return <th key={h} style={Object.assign({}, os(10, 700, GRAY), { padding: "7px 12px", textAlign: i === 0 ? "left" : "right", borderBottom: "1px solid " + BORD })}>{h}</th>;
							})}
						</tr>
					</thead>
					<tbody>
						{[100, 500, 1000, 2500, 5000, 10000, 20000, 50000, 100000].map(function (n, i) {
							const tier = volumeTiers.find(function (t) {
								return n >= t.certsMin && (t.certsMax === null || n <= t.certsMax);
							});
							const color = tier ? (TIER_COLORS[tier.id] || GRAY) : GRAY;
							return (
								<tr key={n} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
									<td style={Object.assign({}, os(12, 400, BLACK), { padding: "7px 12px", fontFamily: "Courier New,monospace" })}>{n.toLocaleString()}</td>
									<td style={{ padding: "7px 12px", textAlign: "right" }}>
										{tier ? <span style={Object.assign({}, os(11, 700, color))}>{tier.label}</span> : <span style={os(11, 400, GRAY)}>—</span>}
									</td>
									<td style={Object.assign({}, os(12, 400, BLACK), { padding: "7px 12px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
										{tier && tier.precioCertFisica ? "$" + tier.precioCertFisica : "—"}
									</td>
									<td style={Object.assign({}, os(12, 400, BLACK), { padding: "7px 12px", textAlign: "right" })}>
										{tier && tier.firmasIncluidas != null ? tier.firmasIncluidas : "∞"}
									</td>
									<td style={Object.assign({}, os(12, 400, BLACK), { padding: "7px 12px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
										{tier && tier.setupFee ? "$" + tier.setupFee : "—"}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
