import { useState } from "react";
import { saveConfig } from "../../lib/supabase";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, OKBG, WN, WNBG, ER, CAT_COLOR, os, mont } from "../../theme/tokens";
import { fD } from "../../utils/formatters";
import { FIXED_ITEMS, ASSET_ITEMS, CV_CERT_ITEMS, CV_FIRMA_ITEMS, CAPACIDAD_FIRMAS_ANUAL } from "../../data/costs";

function InlineNum({ value, onChange, decimals }) {
	return (
		<input
			type="number"
			value={value}
			step={decimals > 0 ? Math.pow(10, -decimals) : 1}
			onChange={function (e) { onChange(Number(e.target.value)); }}
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
		<div
			style={Object.assign({}, mont(14), {
				color: WHITE,
				background: BLACK,
				padding: "10px 16px",
				borderRadius: "8px 8px 0 0",
				marginTop: 20,
			})}
		>
			{title}
		</div>
	);
}

const DEFAULT_COST_CONFIG = {
	fixedItems: FIXED_ITEMS.map(function (r) { return Object.assign({}, r); }),
	assetItems: ASSET_ITEMS.map(function (r) { return Object.assign({}, r); }),
	cvCertItems: CV_CERT_ITEMS.map(function (r) { return Object.assign({}, r); }),
	cvFirmaItems: CV_FIRMA_ITEMS.map(function (r) { return Object.assign({}, r); }),
	capacidadFirmasAnual: CAPACIDAD_FIRMAS_ANUAL,
};

export function TabConfig({ costConfig, setCostConfig, tc, setTc }) {
	const activosTotal = costConfig.assetItems.reduce(function (s, r) { return s + r.amort; }, 0);
	const [isDirty, setIsDirty] = useState(false);

	function updRow(key, i, field, val) {
		setIsDirty(true);
		setCostConfig(function (prev) {
			return Object.assign({}, prev, {
				[key]: prev[key].map(function (r, j) {
					return j === i ? Object.assign({}, r, { [field]: val }) : r;
				}),
			});
		});
	}
	function removeRow(key, i) {
		setIsDirty(true);
		setCostConfig(function (prev) {
			return Object.assign({}, prev, {
				[key]: prev[key].filter(function (_, j) { return j !== i; }),
			});
		});
	}
	function addRow(key, blank) {
		setIsDirty(true);
		setCostConfig(function (prev) {
			return Object.assign({}, prev, { [key]: prev[key].concat([blank]) });
		});
	}

	const [saveOk, setSaveOk] = useState(false);
	function handleSave() {
		try { localStorage.setItem("lakaut_costConfig", JSON.stringify(costConfig)); } catch (e) {}
		saveConfig("costConfig", costConfig);
		setSaveOk(true);
		setIsDirty(false);
		setTimeout(function () { setSaveOk(false); }, 2000);
	}
	function handleReset() {
		setCostConfig({
			fixedItems: FIXED_ITEMS.map(function (r) { return Object.assign({}, r); }),
			assetItems: ASSET_ITEMS.map(function (r) { return Object.assign({}, r); }),
			cvCertItems: CV_CERT_ITEMS.map(function (r) { return Object.assign({}, r); }),
			cvFirmaItems: CV_FIRMA_ITEMS.map(function (r) { return Object.assign({}, r); }),
			capacidadFirmasAnual: CAPACIDAD_FIRMAS_ANUAL,
		});
		setIsDirty(true);
	}
	const salaryRows = costConfig.fixedItems.map(function (r, i) { return Object.assign({}, r, { _i: i }); }).filter(function (r) { return r.cat === "RRHH"; });
	const opsRows = costConfig.fixedItems.map(function (r, i) { return Object.assign({}, r, { _i: i }); }).filter(function (r) { return r.cat !== "RRHH"; });
	const cfSalary = salaryRows.reduce(function (s, r) { return s + r.v; }, 0);
	const cfOps = opsRows.reduce(function (s, r) { return s + r.v; }, 0);
	const cfAmort = costConfig.assetItems.reduce(function (s, r) { return s + r.amort; }, 0);
	const cfTotal = cfSalary + cfOps + cfAmort;
	const cfDirecto = costConfig.fixedItems.filter(function (r) { return r.tipo === "directo"; }).reduce(function (s, r) { return s + r.v; }, 0)
		+ costConfig.assetItems.filter(function (r) { return r.tipo === "directo"; }).reduce(function (s, r) { return s + r.amort; }, 0);
	const cvCertTotal = costConfig.cvCertItems.reduce(function (s, r) { return s + r.v; }, 0);
	const cvFirmaTotal = (costConfig.cvFirmaItems || []).reduce(function (s, r) { return s + r.v; }, 0);

	const thStyle = Object.assign({}, os(10, 700, WHITE), { padding: "6px 10px", textAlign: "left", background: GRAY });
	const thR = Object.assign({}, thStyle, { textAlign: "right" });
	const tipoStyle = function (t) {
		return { padding: "2px 5px", border: "1px solid " + BORD, borderRadius: 4, fontSize: 10, fontWeight: 700, fontFamily: "'Open Sans',sans-serif", cursor: "pointer", background: t === "directo" ? OKBG : WNBG, color: t === "directo" ? OK : WN };
	};

	const inputText = {
		width: "100%",
		border: "1px solid " + BORD,
		borderRadius: 4,
		padding: "2px 6px",
		fontFamily: "'Open Sans',sans-serif",
		fontSize: 12,
		color: BLACK,
		background: WHITE,
		outline: "none",
		boxSizing: "border-box",
	};

	const addBtn = {
		marginTop: 8,
		padding: "5px 14px",
		background: WHITE,
		border: "1.5px dashed " + BLUE,
		borderRadius: 6,
		color: BLUE,
		fontFamily: "'Open Sans',sans-serif",
		fontSize: 12,
		fontWeight: 700,
		cursor: "pointer",
	};

	const delBtn = {
		background: "none",
		border: "none",
		color: GRAY,
		cursor: "pointer",
		fontSize: 14,
		lineHeight: 1,
		padding: "0 4px",
	};

	return (
		<div style={{ maxWidth: 900 }}>
			{/* ── COSTOS FIJOS ─────────────────────────────────────── */}
			<SectionHeader title="1 · Costos Fijos" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE, marginBottom: 4 }}>

				{/* Activos adquiridos */}
				<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
					Activos adquiridos
				</div>
				<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
					<thead>
						<tr>
							<th style={thStyle}>Ítem</th>
							<th style={Object.assign({}, thR, { width: 130 })}>Amort. / mes (USD)</th>
							<th style={Object.assign({}, thR, { width: 90 })}>Vida útil (m)</th>
							<th style={Object.assign({}, thStyle, { width: 80 })}>Tipo</th>
							<th style={Object.assign({}, thStyle, { width: 28 })} />
						</tr>
					</thead>
					<tbody>
						{costConfig.assetItems.map(function (r, i) {
							return (
								<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
									<td style={{ padding: "4px 6px" }}>
										<input style={inputText} value={r.item} onChange={function (e) { updRow("assetItems", i, "item", e.target.value); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 130 }}>
										<InlineNum value={r.amort} decimals={2} onChange={function (v) { updRow("assetItems", i, "amort", v); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 90 }}>
										<InlineNum value={r.vida} decimals={0} onChange={function (v) { updRow("assetItems", i, "vida", v); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 80, textAlign: "center" }}>
										<button style={tipoStyle(r.tipo || "directo")} onClick={function () { updRow("assetItems", i, "tipo", r.tipo === "directo" ? "indirecto" : "directo"); }}>{r.tipo || "directo"}</button>
									</td>
									<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
										<button style={delBtn} onClick={function () { removeRow("assetItems", i); }} title="Eliminar">×</button>
									</td>
								</tr>
							);
						})}
						<tr style={{ background: BLUEL }}>
							<td style={Object.assign({}, os(11, 700, BLUE), { padding: "6px 10px" })}>Subtotal activos</td>
							<td style={Object.assign({}, os(12, 700, BLUE), { padding: "6px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>{fD(cfAmort)}</td>
							<td colSpan={2} />
						</tr>
					</tbody>
				</table>
				<button style={addBtn} onClick={function () { addRow("assetItems", { item: "", amort: 0, vida: 36, tipo: "directo" }); }}>+ Agregar activo</button>

				{/* Sueldos */}
				<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", margin: "20px 0 8px" })}>
					Sueldos
				</div>
				<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
					<thead>
						<tr>
							<th style={thStyle}>Ítem</th>
							<th style={Object.assign({}, thR, { width: 150 })}>Monto / mes (USD)</th>
							<th style={Object.assign({}, thStyle, { width: 80 })}>Tipo</th>
							<th style={Object.assign({}, thStyle, { width: 28 })} />
						</tr>
					</thead>
					<tbody>
						{salaryRows.map(function (r) {
							var i = r._i;
							return (
								<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
									<td style={{ padding: "4px 6px" }}>
										<input style={inputText} value={r.item} onChange={function (e) { updRow("fixedItems", i, "item", e.target.value); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 150 }}>
										<InlineNum value={r.v} decimals={0} onChange={function (v) { updRow("fixedItems", i, "v", v); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 80, textAlign: "center" }}>
										<button style={tipoStyle(r.tipo || "indirecto")} onClick={function () { updRow("fixedItems", i, "tipo", r.tipo === "directo" ? "indirecto" : "directo"); }}>{r.tipo || "indirecto"}</button>
									</td>
									<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
										<button style={delBtn} onClick={function () { removeRow("fixedItems", i); }} title="Eliminar">×</button>
									</td>
								</tr>
							);
						})}
						<tr style={{ background: BLUEL }}>
							<td style={Object.assign({}, os(11, 700, BLUE), { padding: "6px 10px" })}>Subtotal sueldos</td>
							<td style={Object.assign({}, os(12, 700, BLUE), { padding: "6px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>{fD(cfSalary)}</td>
							<td colSpan={2} />
						</tr>
					</tbody>
				</table>
				<button style={addBtn} onClick={function () { addRow("fixedItems", { cat: "RRHH", item: "", v: 0, tipo: "indirecto" }); }}>+ Agregar sueldo</button>

				{/* Costos fijos operativos */}
				<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", margin: "20px 0 8px" })}>
					Costos fijos operativos
				</div>
				<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
					<thead>
						<tr>
							<th style={Object.assign({}, thStyle, { width: 70 })}>Cat.</th>
							<th style={thStyle}>Ítem</th>
							<th style={Object.assign({}, thR, { width: 150 })}>Monto / mes (USD)</th>
							<th style={Object.assign({}, thStyle, { width: 80 })}>Tipo</th>
							<th style={Object.assign({}, thStyle, { width: 28 })} />
						</tr>
					</thead>
					<tbody>
						{opsRows.map(function (r) {
							var i = r._i;
							return (
								<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
									<td style={{ padding: "4px 6px", width: 70 }}>
										<input
											style={Object.assign({}, inputText, { textTransform: "uppercase", fontWeight: 700, fontSize: 10, color: CAT_COLOR[r.cat] || GRAY })}
											value={r.cat}
											onChange={function (e) { updRow("fixedItems", i, "cat", e.target.value.toUpperCase()); }}
										/>
									</td>
									<td style={{ padding: "4px 6px" }}>
										<input style={inputText} value={r.item} onChange={function (e) { updRow("fixedItems", i, "item", e.target.value); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 150 }}>
										<InlineNum value={r.v} decimals={0} onChange={function (v) { updRow("fixedItems", i, "v", v); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 80, textAlign: "center" }}>
										<button style={tipoStyle(r.tipo || "directo")} onClick={function () { updRow("fixedItems", i, "tipo", r.tipo === "directo" ? "indirecto" : "directo"); }}>{r.tipo || "directo"}</button>
									</td>
									<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
										<button style={delBtn} onClick={function () { removeRow("fixedItems", i); }} title="Eliminar">×</button>
									</td>
								</tr>
							);
						})}
						<tr style={{ background: BLUEL }}>
							<td /><td style={Object.assign({}, os(11, 700, BLUE), { padding: "6px 10px" })}>Subtotal operativos</td>
							<td style={Object.assign({}, os(12, 700, BLUE), { padding: "6px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>{fD(cfOps)}</td>
							<td colSpan={2} />
						</tr>
					</tbody>
				</table>
				<button style={addBtn} onClick={function () { addRow("fixedItems", { cat: "Ops", item: "", v: 0, tipo: "directo" }); }}>+ Agregar costo operativo</button>

				{/* CF summary */}
				<div style={{ background: BLUEL, border: "1px solid " + BORD, borderRadius: 10, padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", marginTop: 20 }}>
					<div>
						<div style={Object.assign({}, os(10, 700, BLUE), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>CF Total empresa / mes</div>
						<div style={Object.assign({}, mont(20), { color: BLUE })}>{fD(cfTotal)}</div>
					</div>
					<div style={{ borderLeft: "1px solid " + BORD, paddingLeft: 24 }}>
						<div style={Object.assign({}, os(10, 700, OK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>CF Directo / mes</div>
						<div style={Object.assign({}, mont(20), { color: OK })}>{fD(cfDirecto)}</div>
						<div style={os(10, 400, GRAY)}>Usado en EBITDA y break-even</div>
					</div>
				</div>
			</div>

			{/* ── COSTOS VARIABLES ─────────────────────────────────── */}
			<SectionHeader title="2 · Costos Variables" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>

					{/* CV × Certificado */}
					<div>
						<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
							CV × Certificado emitido
						</div>
						<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
							<thead>
								<tr>
									<th style={thStyle}>Componente</th>
									<th style={Object.assign({}, thR, { width: 130 })}>Costo (USD)</th>
									<th style={Object.assign({}, thStyle, { width: 28 })} />
								</tr>
							</thead>
							<tbody>
								{costConfig.cvCertItems.map(function (r, i) {
									return (
										<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
											<td style={{ padding: "4px 6px" }}>
												<input style={inputText} value={r.item} onChange={function (e) { updRow("cvCertItems", i, "item", e.target.value); }} />
											</td>
											<td style={{ padding: "4px 6px", width: 130 }}>
												<InlineNum value={r.v} decimals={4} onChange={function (v) { updRow("cvCertItems", i, "v", v); }} />
											</td>
											<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
												<button style={delBtn} onClick={function () { removeRow("cvCertItems", i); }} title="Eliminar">×</button>
											</td>
										</tr>
									);
								})}
								<tr style={{ background: WNBG }}>
									<td style={Object.assign({}, os(11, 700, WN), { padding: "6px 10px" })}>Total CV cert</td>
									<td style={Object.assign({}, os(12, 700, WN), { padding: "6px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>{cvCertTotal.toFixed(4)}</td>
									<td />
								</tr>
							</tbody>
						</table>
						<button style={addBtn} onClick={function () { addRow("cvCertItems", { item: "", v: 0 }); }}>+ Agregar componente</button>
					</div>

					{/* CV × Firma */}
					<div>
						<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
							CV × Firma ejecutada
						</div>
						<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
							<thead>
								<tr>
									<th style={thStyle}>Componente</th>
									<th style={Object.assign({}, thR, { width: 130 })}>Costo (USD)</th>
									<th style={Object.assign({}, thStyle, { width: 80 })}>Tipo</th>
									<th style={Object.assign({}, thStyle, { width: 28 })} />
								</tr>
							</thead>
							<tbody>
								{(costConfig.cvFirmaItems || []).map(function (r, i) {
									return (
										<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
											<td style={{ padding: "4px 6px" }}>
												<input style={inputText} value={r.item} onChange={function (e) { updRow("cvFirmaItems", i, "item", e.target.value); }} />
											</td>
											<td style={{ padding: "4px 6px", width: 130 }}>
												<InlineNum value={r.v} decimals={4} onChange={function (v) { updRow("cvFirmaItems", i, "v", v); }} />
											</td>
											<td style={{ padding: "4px 6px", width: 80, textAlign: "center" }}>
												<button style={tipoStyle(r.tipo || "directo")} onClick={function () { updRow("cvFirmaItems", i, "tipo", r.tipo === "directo" ? "indirecto" : "directo"); }}>{r.tipo || "directo"}</button>
											</td>
											<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
												<button style={delBtn} onClick={function () { removeRow("cvFirmaItems", i); }} title="Eliminar">×</button>
											</td>
										</tr>
									);
								})}
								<tr style={{ background: OKBG }}>
									<td style={Object.assign({}, os(11, 700, OK), { padding: "6px 10px" })}>Total CV firma</td>
									<td style={Object.assign({}, os(12, 700, OK), { padding: "6px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>{cvFirmaTotal.toFixed(4)}</td>
									<td colSpan={2} />
								</tr>
							</tbody>
						</table>
						<button style={addBtn} onClick={function () { addRow("cvFirmaItems", { item: "", v: 0, tipo: "directo" }); }}>+ Agregar componente</button>

					</div>
				</div>
			</div>

			{/* Cotizaciones */}
			<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: 20, marginTop: 24 }}>
				<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 })}>Cotizaciones</div>
				<div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
					<div style={{ flex: "0 0 auto" }}>
						<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 })}>Tipo de cambio USD → ARS</div>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<span style={os(12, 400, GRAY)}>1 USD =</span>
							<input
								type="number"
								value={tc}
								onChange={function (e) { setTc(Number(e.target.value) || 1); }}
								style={{ width: 100, padding: "6px 10px", border: "1px solid " + BORD, borderRadius: 6, fontFamily: "'Open Sans',sans-serif", fontSize: 13, color: BLACK }}
							/>
							<span style={os(12, 400, GRAY)}>ARS</span>
						</div>
					</div>
					<div style={Object.assign({}, os(11, 400, GRAY), { flex: 1, minWidth: 200 })}>
						El toggle USD/ARS en la barra de navegación usa este valor para convertir todos los precios de la herramienta.
					</div>
				</div>
			</div>

			{/* Save / reset buttons */}
			<div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					{isDirty && !saveOk && (
						<span style={Object.assign({}, os(11, 700, ER), { background: "#fee2e2", padding: "4px 10px", borderRadius: 6 })}>
							Cambios sin guardar
						</span>
					)}
				</div>
				<div style={{ display: "flex", gap: 10 }}>
					<button
						onClick={handleReset}
						style={{ padding: "10px 20px", background: WHITE, color: GRAY, border: "1.5px solid " + BORD, borderRadius: 8, fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 400, cursor: "pointer" }}
					>
						Restaurar valores originales
					</button>
					<button
						onClick={handleSave}
						style={{ padding: "10px 28px", background: saveOk ? OK : isDirty ? WN : BLUE, color: WHITE, border: "none", borderRadius: 8, fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "background 0.3s" }}
					>
						{saveOk ? "✓ Guardado" : "Guardar configuración"}
					</button>
				</div>
			</div>
		</div>
	);
}
