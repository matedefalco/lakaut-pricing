import { useState, useEffect } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, WN, ER, os, mont } from "../../theme/tokens";
import { markSaved, readSaved, formatSaved } from "../../lib/savedAt";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard as SharedSectionCard } from "@/components/ui/SectionCard";
import { Toast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/button";

const FIRMAS_INCL_REF = 1; // 1 IDC = 1 cert + 1 firma, igual que en Canal B2B2C · Tabla de referencia

function margColor(pct) { return pct >= 0.5 ? OK : pct >= 0.2 ? WN : ER; }

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

function inputStyle(width) {
	return { width: width || "100%", border: "1px solid " + BORD, borderRadius: 4, padding: "2px 6px", fontSize: 11, fontFamily: "'Open Sans',sans-serif", color: BLACK, background: WHITE, outline: "none" };
}

const thStyle = Object.assign({}, os(10, 700, GRAY), { padding: "8px 10px", borderBottom: "1px solid " + BORD, textTransform: "uppercase", letterSpacing: "0.4px" });
const thL = Object.assign({}, thStyle, { textAlign: "left" });
const thR = Object.assign({}, thStyle, { textAlign: "right" });

const ZEBRA = "#f8f9fa";

function genId(prefix) {
	return prefix + "_" + Math.random().toString(36).slice(2, 8);
}

function AddRowButton({ onClick, label }) {
	return (
		<button
			onClick={onClick}
			style={{
				marginTop: 10,
				padding: "6px 14px",
				background: "transparent",
				color: BLUE,
				border: "1px dashed " + BLUE,
				borderRadius: 6,
				fontFamily: "'Open Sans',sans-serif",
				fontSize: 12,
				fontWeight: 700,
				cursor: "pointer",
			}}
		>
			+ {label || "Agregar fila"}
		</button>
	);
}

function DeleteRowButton({ onClick }) {
	return (
		<button
			onClick={onClick}
			title="Eliminar fila"
			style={{
				width: 22,
				height: 22,
				lineHeight: "20px",
				textAlign: "center",
				padding: 0,
				background: "transparent",
				color: GRAY,
				border: "1px solid " + BORD,
				borderRadius: 4,
				fontSize: 13,
				cursor: "pointer",
			}}
		>
			×
		</button>
	);
}

function SectionCard({ title, description, children }) {
	return (
		<SharedSectionCard title={title} description={description} className="mb-5">
			{children}
		</SharedSectionCard>
	);
}

export function TabCanalesConfig({ channelConfig, updateChannelConfig, costs }) {
	const [draft, setDraft] = useState(channelConfig);
	const [isDirty, setIsDirty] = useState(false);
	const [toast, setToast] = useState(null); // { msg, id }
	const [segPriceMode, setSegPriceMode] = useState("manual"); // "manual" | "margen"
	const [savedAt, setSavedAt] = useState(function () { return readSaved("channelConfig"); });

	const cvCert = costs?.cvCertBase ?? 0;
	const cvFirma = costs?.cvFirmaBase ?? 0;
	const cfDirecto = costs?.cfDirecto ?? 0;
	const costoRealIDC = cvCert + FIRMAS_INCL_REF * cvFirma;

	useEffect(function () {
		setDraft(channelConfig);
		setIsDirty(false);
	}, [channelConfig]);

	function showToast(msg) {
		const id = Date.now();
		setToast({ msg, id });
		setTimeout(function () { setToast(function (t) { return t && t.id === id ? null : t; }); }, 3000);
	}

	function updDraft(patch) {
		setDraft(function (prev) {
			const next = Object.assign({}, prev, patch);
			setIsDirty(true);
			return next;
		});
	}

	function handleSave() {
		updateChannelConfig(draft);
		setIsDirty(false);
		setSavedAt(markSaved("channelConfig"));
		showToast("Cambios guardados");
	}

	function addRow(key, blankRow) {
		const list = draft[key] || [];
		updDraft({ [key]: list.concat([blankRow]) });
	}

	function removeRow(key, idx) {
		const list = draft[key] || [];
		updDraft({ [key]: list.filter(function (_, i) { return i !== idx; }) });
	}

	if (!channelConfig || !updateChannelConfig) return null;

	return (
		<div className="space-y-6" style={{ maxWidth: 920 }}>

			<Toast toast={toast} />

			<PageHeader
				title="Precios por canal"
				description={isDirty ? "Cambios sin guardar" : (savedAt ? "Última edición: " + formatSaved(savedAt) : "Sin cambios registrados")}
				actions={<Button onClick={handleSave} disabled={!isDirty}>Guardar cambios</Button>}
			/>

			{/* ── Tiers de distribuidores ── */}
			<SectionCard
				title="1 · Tiers de Distribuidores e Integradores"
				description="El nivel se asigna por el mayor entre certificados activos y compromiso anual de facturación (USD)."
			>
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
						<thead>
							<tr>
								{["Nivel", "Label", "Certs mín.", "Certs máx.", "Descuento %", "Compromiso mín. (USD)", "Compromiso máx. (USD)"].map(function (h, i) {
									return <th key={h} style={i <= 1 ? thL : thR}>{h}</th>;
								})}
								<th style={thR}></th>
							</tr>
						</thead>
						<tbody>
							{(draft.distributorTiers || []).map(function (tier, idx) {
								function upd(field, val) {
									const next = draft.distributorTiers.map(function (t, i) {
										return i === idx ? Object.assign({}, t, { [field]: val }) : t;
									});
									updDraft({ distributorTiers: next });
								}
								return (
									<tr key={tier.id || idx} style={{ background: idx % 2 === 0 ? ZEBRA : WHITE }}>
										<td style={{ padding: "5px 8px" }}>
											<input value={tier.id || ""} onChange={function (e) { upd("id", e.target.value); }} style={inputStyle(80)} />
										</td>
										<td style={{ padding: "5px 8px" }}>
											<input value={tier.label || ""} onChange={function (e) { upd("label", e.target.value); }} style={inputStyle(90)} />
										</td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={tier.certsMin} decimals={0} onChange={function (v) { upd("certsMin", v); }} /></td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={tier.certsMax} decimals={0} onChange={function (v) { upd("certsMax", v); }} /></td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={Math.round((tier.descuento || 0) * 100)} decimals={0} onChange={function (v) { upd("descuento", (v || 0) / 100); }} /></td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={tier.compromisoMin} decimals={0} onChange={function (v) { upd("compromisoMin", v); }} /></td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={tier.compromisoMax} decimals={0} onChange={function (v) { upd("compromisoMax", v); }} /></td>
										<td style={{ padding: "5px 8px", textAlign: "center" }}>
											<DeleteRowButton onClick={function () { removeRow("distributorTiers", idx); }} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<AddRowButton
					label="Agregar tier"
					onClick={function () {
						addRow("distributorTiers", { id: genId("tier"), label: "Nuevo tier", certsMin: 0, certsMax: null, descuento: 0, compromisoMin: 0, compromisoMax: null });
					}}
				/>
			</SectionCard>

			{/* ── Segmentos B2B2C ── */}
			<SectionCard
				title="2 · Segmentos B2B2C (precio por IDC)"
				description={"CV/IDC = cert USD " + cvCert.toFixed(4) + " + " + FIRMAS_INCL_REF + " firma USD " + cvFirma.toFixed(4) + " = USD " + costoRealIDC.toFixed(4) + ". CM = Precio − CV. BE = CF directo (USD " + cfDirecto.toFixed(0) + ") ÷ CM por IDC."}
			>
				{/* Toggle de modo de carga de precio */}
				<div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
					{[
						{ id: "manual", label: "Precio manual" },
						{ id: "margen", label: "Margen objetivo" },
					].map(function (m) {
						const active = segPriceMode === m.id;
						return (
							<button
								key={m.id}
								onClick={function () { setSegPriceMode(m.id); }}
								style={{
									padding: "5px 12px",
									borderRadius: 6,
									border: "1px solid " + (active ? BLUE : BORD),
									background: active ? BLUE : WHITE,
									color: active ? WHITE : GRAY,
									fontFamily: "'Open Sans',sans-serif",
									fontSize: 11,
									fontWeight: 700,
									cursor: "pointer",
								}}
							>
								{m.label}
							</button>
						);
					})}
				</div>

				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
						<thead>
							<tr>
								<th style={thR}>IDC mín.</th>
								<th style={thR}>IDC máx.</th>
								{segPriceMode === "margen" && <th style={thR}>Margen objetivo (%)</th>}
								<th style={thR}>Precio IDC (USD){segPriceMode === "margen" ? " (calc.)" : ""}</th>
								<th style={thR}>Costo CV (USD/IDC)</th>
								<th style={thR}>CM $</th>
								<th style={thR}>CM %</th>
								<th style={thR}>BE (IDC)</th>
								<th style={thR}></th>
							</tr>
						</thead>
						<tbody>
							{(draft.b2b2cSegments || []).map(function (seg, idx) {
								function upd(field, val) {
									const next = draft.b2b2cSegments.map(function (s, i) {
										return i === idx ? Object.assign({}, s, { [field]: val }) : s;
									});
									updDraft({ b2b2cSegments: next });
								}
								function updMargen(v) {
									const m = (v || 0) / 100;
									const newPrecio = m > 0 && m < 1 ? costoRealIDC / (1 - m) : costoRealIDC;
									upd("precioIDC", Math.round(newPrecio * 10000) / 10000);
								}
								const precioIDC = seg.precioIDC || 0;
								const cmVal = precioIDC - costoRealIDC;
								const cmPct = precioIDC > 0 ? cmVal / precioIDC : 0;
								const beVal = cmVal > 0 ? Math.ceil(cfDirecto / cmVal) : null;
								const margenPct = precioIDC > 0 ? Math.round((cmVal / precioIDC) * 1000) / 10 : 0;
								return (
									<tr key={seg.id || idx} style={{ background: idx % 2 === 0 ? ZEBRA : WHITE }}>
										<td style={{ padding: "5px 8px" }}><InlineNum value={seg.idcMin} decimals={0} onChange={function (v) { upd("idcMin", v); }} /></td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={seg.idcMax} decimals={0} onChange={function (v) { upd("idcMax", v); }} /></td>
										{segPriceMode === "margen" && (
											<td style={{ padding: "5px 8px" }}><InlineNum value={margenPct} decimals={1} onChange={updMargen} /></td>
										)}
										<td style={{ padding: "5px 8px" }}>
											{segPriceMode === "manual"
												? <InlineNum value={seg.precioIDC} decimals={4} onChange={function (v) { upd("precioIDC", v); }} />
												: <div style={Object.assign({}, os(12, 700, BLACK), { textAlign: "right", padding: "2px 6px" })}>{precioIDC.toFixed(4)}</div>}
										</td>
										<td style={{ padding: "5px 8px", textAlign: "right", color: GRAY }}>{costoRealIDC.toFixed(4)}</td>
										<td style={{ padding: "5px 8px", textAlign: "right", color: margColor(cmPct), fontWeight: 700 }}>{cmVal.toFixed(4)}</td>
										<td style={{ padding: "5px 8px", textAlign: "right", color: margColor(cmPct), fontWeight: 700 }}>{(cmPct * 100).toFixed(0)}%</td>
										<td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{beVal != null ? beVal.toLocaleString("es-AR") : "—"}</td>
										<td style={{ padding: "5px 8px", textAlign: "center" }}>
											<DeleteRowButton onClick={function () { removeRow("b2b2cSegments", idx); }} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<AddRowButton
					label="Agregar segmento"
					onClick={function () {
						addRow("b2b2cSegments", { id: genId("seg"), label: "Nuevo segmento", idcMin: 0, idcMax: null, precioIDC: 0 });
					}}
				/>
			</SectionCard>

			{/* ── API Tiers B2B2C ── */}
			<SectionCard title="3 · API Tiers B2B2C (fee de implementación)">
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 480 }}>
						<thead>
							<tr>
								<th style={thL}>Label</th>
								{["Fee mín. (USD)", "Fee máx. (USD)", "Fee default (USD)"].map(function (h) {
									return <th key={h} style={thR}>{h}</th>;
								})}
								<th style={thR}></th>
							</tr>
						</thead>
						<tbody>
							{(draft.b2b2cApiTiers || []).map(function (tier, idx) {
								function upd(field, val) {
									const next = draft.b2b2cApiTiers.map(function (t, i) {
										return i === idx ? Object.assign({}, t, { [field]: val }) : t;
									});
									updDraft({ b2b2cApiTiers: next });
								}
								return (
									<tr key={tier.id || idx} style={{ background: idx % 2 === 0 ? ZEBRA : WHITE }}>
										<td style={{ padding: "5px 8px" }}>
											<input value={tier.label || ""} onChange={function (e) { upd("label", e.target.value); }} style={inputStyle(160)} />
										</td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={tier.feeMin} decimals={0} onChange={function (v) { upd("feeMin", v); }} /></td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={tier.feeMax} decimals={0} onChange={function (v) { upd("feeMax", v); }} /></td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={tier.feeDefault} decimals={0} onChange={function (v) { upd("feeDefault", v); }} /></td>
										<td style={{ padding: "5px 8px", textAlign: "center" }}>
											<DeleteRowButton onClick={function () { removeRow("b2b2cApiTiers", idx); }} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<AddRowButton
					label="Agregar API tier"
					onClick={function () {
						addRow("b2b2cApiTiers", { id: genId("api"), label: "Nuevo API tier", feeMin: 0, feeMax: 0, feeDefault: 0 });
					}}
				/>
			</SectionCard>

			{/* ── Planes SLA ── */}
			<SectionCard title="4 · Planes SLA">
				<div style={{ overflowX: "auto" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 600 }}>
						<thead>
							<tr>
								<th style={thL}>Label</th>
								<th style={thR}>Precio/mes (USD)</th>
								<th style={thR}>SLA (%)</th>
								<th style={thR}>TX/mes</th>
								<th style={thL}>Descripción</th>
								<th style={thR}></th>
							</tr>
						</thead>
						<tbody>
							{(draft.slaPlans || []).map(function (plan, idx) {
								function upd(field, val) {
									const next = draft.slaPlans.map(function (p, i) {
										return i === idx ? Object.assign({}, p, { [field]: val }) : p;
									});
									updDraft({ slaPlans: next });
								}
								return (
									<tr key={plan.id || idx} style={{ background: idx % 2 === 0 ? ZEBRA : WHITE }}>
										<td style={{ padding: "5px 8px" }}>
											<input value={plan.label || ""} onChange={function (e) { upd("label", e.target.value); }} style={inputStyle(120)} />
										</td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={plan.precioMes} decimals={0} onChange={function (v) { upd("precioMes", v); }} /></td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={plan.sla !== null && plan.sla !== undefined ? Math.round(plan.sla * 1000) / 10 : null} decimals={1} onChange={function (v) { upd("sla", v === null ? null : v / 100); }} /></td>
										<td style={{ padding: "5px 8px" }}><InlineNum value={plan.txMes} decimals={0} onChange={function (v) { upd("txMes", v); }} /></td>
										<td style={{ padding: "5px 8px" }}>
											<input value={plan.desc || ""} onChange={function (e) { upd("desc", e.target.value); }} style={inputStyle("100%")} />
										</td>
										<td style={{ padding: "5px 8px", textAlign: "center" }}>
											<DeleteRowButton onClick={function () { removeRow("slaPlans", idx); }} />
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
				<AddRowButton
					label="Agregar plan SLA"
					onClick={function () {
						addRow("slaPlans", { id: genId("sla"), label: "Nuevo plan", precioMes: 0, sla: null, txMes: null, desc: "" });
					}}
				/>
			</SectionCard>

			{/* ── Parámetros generales ── */}
			<SectionCard title="5 · Parámetros generales">
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
					<div>
						<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 })}>Costo IDC referencia (USD)</div>
						<InlineNum value={draft.costoIdcRef} decimals={4} onChange={function (v) { updDraft({ costoIdcRef: v }); }} />
					</div>
					<div>
						<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 })}>Precio cert jurídica (USD/empresa/año)</div>
						<InlineNum value={draft.precioCertJuridica} decimals={2} onChange={function (v) { updDraft({ precioCertJuridica: v }); }} />
					</div>
				</div>
			</SectionCard>

		</div>
	);
}
