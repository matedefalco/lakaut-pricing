import { useState } from "react";
import { saveConfig } from "../../lib/supabase";
import { CAT_COLOR } from "../../theme/tokens";
import { cn } from "@/lib/utils";
import { fD } from "../../utils/formatters";
import { FIXED_ITEMS, ASSET_ITEMS, CV_CERT_ITEMS, CV_FIRMA_ITEMS, CAPACIDAD_FIRMAS_ANUAL } from "../../data/costs";
import { markSaved, readSaved, formatSaved } from "../../lib/savedAt";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";

// Celda numérica editable de las tablas de costos. Tenía `outline: none` sin
// reemplazo, así que ninguna celda mostraba foco: el mismo bug que NumInput,
// repetido en cada fila de cada tabla. Y sin `label` la celda no se anunciaba.
function InlineNum({ value, onChange, decimals, label }) {
	return (
		<input
			type="number"
			value={value}
			step={decimals > 0 ? Math.pow(10, -decimals) : 1}
			aria-label={label}
			onChange={function (e) { onChange(Number(e.target.value)); }}
			className="box-border w-full rounded border border-input bg-card px-1.5 py-0.5 text-right font-mono text-xs text-foreground tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
		/>
	);
}

// Header de sección alineado al lenguaje de SectionCard/CardTitle (ShadCN):
// título chico en mayúsculas sobre fondo claro, en lugar del bloque negro.
function SectionHeader({ title, description }) {
	return (
		<div className="mt-5 rounded-t-2xl border border-b-0 border-white/70 bg-card px-4.5 pt-4 pb-0.5">
			<h2 className="font-heading text-xs font-semibold tracking-[0.5px] text-muted-foreground uppercase">{title}</h2>
			{description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
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

export function TabConfig({ costConfig, setCostConfig, channelConfig, updateChannelConfig }) {
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
	const [savedAt, setSavedAt] = useState(function () { return readSaved("costConfig"); });
	function handleSave() {
		try { localStorage.setItem("lakaut_costConfig", JSON.stringify(costConfig)); } catch (e) {}
		saveConfig("costConfig", costConfig);
		setSaveOk(true);
		setIsDirty(false);
		setSavedAt(markSaved("costConfig"));
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
	const rowTotal = function (r) {
		if (r.frecuencia === "único") return 0;
		return (r.qty || 1) * r.v * (r.frecuencia === "anual" ? 1 / 12 : 1);
	};
	const cfSalary = salaryRows.reduce(function (s, r) { return s + rowTotal(r); }, 0);
	const cfOps = opsRows.reduce(function (s, r) { return s + rowTotal(r); }, 0);
	const cfAmort = costConfig.assetItems.reduce(function (s, r) { return s + r.amort; }, 0);
	const cfTotal = cfSalary + cfOps + cfAmort;
	const cfDirecto = costConfig.fixedItems.filter(function (r) { return r.tipo === "directo"; }).reduce(function (s, r) { return s + rowTotal(r); }, 0)
		+ costConfig.assetItems.filter(function (r) { return r.tipo === "directo"; }).reduce(function (s, r) { return s + r.amort; }, 0);
	const cvCertTotal = costConfig.cvCertItems.reduce(function (s, r) { return s + r.v; }, 0);
	const cvFirmaTotal = (costConfig.cvFirmaItems || []).reduce(function (s, r) { return s + r.v; }, 0);

	const thStyle = "border-b border-border px-2.5 py-2 text-left text-xs font-bold tracking-[0.4px] text-muted-foreground uppercase";
	const thR = thStyle + " text-right";
	const tipoClass = function (t) {
		return cn(
			"cursor-pointer rounded border border-border px-1.5 py-0.5 text-xs font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
			t === "directo" ? "bg-[#d1fae5] text-success" : "bg-[#fef3c7] text-warning"
		);
	};
	// Fila par/impar y celdas: clases compartidas para no repetir el mismo objeto.
	const rowClass = function (i) { return i % 2 === 0 ? "bg-muted/40" : "bg-card"; };
	const cellClass = "px-1.5 py-1";
	const totalCellClass = "px-2.5 py-1 text-right font-mono text-sm font-bold text-foreground tabular-nums";

	const FREC_OPTS = [
		{ k: "mensual", label: "mensual", bg: "#f0f9ff", color: "#0369a1" },
		{ k: "anual",   label: "anual",   bg: "#ede9fe", color: "#7c3aed" },
		{ k: "único",   label: "único",   bg: "#fef3c7", color: "#b45309" },
	];
	function FrecToggle({ value, onChange, label }) {
		const cur = value || "mensual";
		return (
			<div className="inline-flex overflow-hidden rounded-md border border-border" role="group" aria-label={label}>
				{FREC_OPTS.map(function (o) {
					const active = cur === o.k;
					return (
						<button
							key={o.k}
							type="button"
							aria-pressed={active}
							onClick={function () { onChange(o.k); }}
							className={cn(
								"cursor-pointer border-0 border-r border-border px-2 py-0.5 text-xs leading-relaxed font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
								active ? "" : "bg-card text-muted-foreground"
							)}
							style={active ? { background: o.bg, color: o.color } : undefined}
						>{o.label}</button>
					);
				})}
			</div>
		);
	}

	const inputText = "box-border w-full rounded border border-input bg-card px-1.5 py-0.5 text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
	const addBtn = "mt-2 cursor-pointer rounded-md border-[1.5px] border-dashed border-primary bg-card px-3.5 py-1.5 text-xs font-bold text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";
	const delBtn = "cursor-pointer border-none bg-transparent px-1 text-sm leading-none text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

	return (
		<div className="max-w-[900px]">
			<PageHeader
				title="Costos"
				description="Matriz de costos fijos y variables del negocio. Alimenta los cálculos de margen y break-even de toda la app."
			/>
			{/* ── COSTOS FIJOS ─────────────────────────────────────── */}
			<SectionHeader title="1 · Costos Fijos" />
			<div className="mb-1 rounded-b-2xl border border-t-0 border-white/70 bg-card p-4.5 shadow-card">

				{/* Activos adquiridos */}
				<div className="mb-2 text-xs font-bold tracking-[0.5px] text-foreground uppercase">
					Activos adquiridos
				</div>
				<table className="mb-1 w-full border-collapse">
					<thead>
						<tr>
							<th className={thStyle}>Ítem</th>
							<th className={thR + " w-[130px]"}>Amort. / mes (USD)</th>
							<th className={thR + " w-[90px]"}>Vida útil (m)</th>
							<th className={thStyle + " w-[80px]"}>Tipo</th>
							<th className={thStyle + " w-[28px]"} />
						</tr>
					</thead>
					<tbody>
						{costConfig.assetItems.map(function (r, i) {
							return (
								<tr key={i} className={rowClass(i)}>
									<td className={cellClass}>
										<input aria-label="Nombre del ítem" className={inputText} value={r.item} onChange={function (e) { updRow("assetItems", i, "item", e.target.value); }} />
									</td>
									<td className={cellClass + " w-[130px]"}>
										<InlineNum label={"Amortización mensual de " + (r.item || "activo sin nombre")} value={r.amort} decimals={2} onChange={function (v) { updRow("assetItems", i, "amort", v); }} />
									</td>
									<td className={cellClass + " w-[90px]"}>
										<InlineNum label={"Vida útil de " + (r.item || "activo sin nombre")} value={r.vida} decimals={0} onChange={function (v) { updRow("assetItems", i, "vida", v); }} />
									</td>
									<td className={cellClass + " w-[80px] text-center"}>
										<button type="button" aria-label={"Tipo de costo: " + (r.tipo || "directo") + ". Cambiar."} className={tipoClass(r.tipo || "directo")} onClick={function () { updRow("assetItems", i, "tipo", r.tipo === "directo" ? "indirecto" : "directo"); }}>{r.tipo || "directo"}</button>
									</td>
									<td className={"px-1 py-1 w-[28px] text-center"}>
										<button type="button" className={delBtn} onClick={function () { removeRow("assetItems", i); }} title="Eliminar" aria-label="Eliminar fila">×</button>
									</td>
								</tr>
							);
						})}
						<tr className="bg-secondary">
							<td className="px-2.5 py-1.5 text-xs font-bold text-primary">Subtotal activos</td>
							<td className="px-2.5 py-1.5 text-right font-mono text-sm font-bold text-primary tabular-nums">{fD(cfAmort)}</td>
							<td colSpan={2} />
						</tr>
					</tbody>
				</table>
				<button type="button" className={addBtn} onClick={function () { addRow("assetItems", { item: "", amort: 0, vida: 36, tipo: "directo" }); }}>+ Agregar activo</button>

				{/* Sueldos */}
				<div className="mt-5 mb-2 text-xs font-bold tracking-[0.5px] text-foreground uppercase">
					Sueldos
				</div>
				<table className="mb-1 w-full border-collapse">
					<thead>
						<tr>
							<th className={thStyle}>Ítem</th>
							<th className={thR + " w-[60px]"}>Cant.</th>
							<th className={thR + " w-[130px]"}>Costo unit. (USD)</th>
							<th className={thR + " w-[110px]"}>Total / mes</th>
							<th className={thStyle + " w-[160px]"}>Frec.</th>
							<th className={thStyle + " w-[80px]"}>Tipo</th>
							<th className={thStyle + " w-[28px]"} />
						</tr>
					</thead>
					<tbody>
						{salaryRows.map(function (r) {
							var i = r._i;
							var qty = r.qty || 1;
							return (
								<tr key={i} className={rowClass(i)}>
									<td className={cellClass}>
										<input aria-label="Nombre del ítem" className={inputText} value={r.item} onChange={function (e) { updRow("fixedItems", i, "item", e.target.value); }} />
									</td>
									<td className={cellClass + " w-[60px]"}>
										<InlineNum label={"Cantidad de " + (r.item || "ítem sin nombre")} value={qty} decimals={0} onChange={function (v) { updRow("fixedItems", i, "qty", Math.max(1, v)); }} />
									</td>
									<td className={cellClass + " w-[130px]"}>
										<InlineNum label={"Costo unitario de " + (r.item || "ítem sin nombre")} value={r.v} decimals={0} onChange={function (v) { updRow("fixedItems", i, "v", v); }} />
									</td>
									<td className={totalCellClass + " w-[110px]"}>
										{fD(rowTotal(r))}
									</td>
									<td className={cellClass + " w-[160px]"}>
										<FrecToggle label={"Frecuencia de " + (r.item || "ítem sin nombre")} value={r.frecuencia} onChange={function (v) { updRow("fixedItems", i, "frecuencia", v); }} />
									</td>
									<td className={cellClass + " w-[80px] text-center"}>
										<button type="button" aria-label={"Tipo de costo: " + (r.tipo || "indirecto") + ". Cambiar."} className={tipoClass(r.tipo || "indirecto")} onClick={function () { updRow("fixedItems", i, "tipo", r.tipo === "directo" ? "indirecto" : "directo"); }}>{r.tipo || "indirecto"}</button>
									</td>
									<td className={"px-1 py-1 w-[28px] text-center"}>
										<button type="button" className={delBtn} onClick={function () { removeRow("fixedItems", i); }} title="Eliminar" aria-label="Eliminar fila">×</button>
									</td>
								</tr>
							);
						})}
						<tr className="bg-secondary">
							<td className="px-2.5 py-1.5 text-xs font-bold text-primary">Subtotal sueldos</td>
							<td colSpan={2} />
							<td className="px-2.5 py-1.5 text-right font-mono text-sm font-bold text-primary tabular-nums">{fD(cfSalary)}</td>
							<td colSpan={3} />
						</tr>
					</tbody>
				</table>
				<button type="button" className={addBtn} onClick={function () { addRow("fixedItems", { cat: "RRHH", item: "", v: 0, qty: 1, tipo: "indirecto", frecuencia: "mensual" }); }}>+ Agregar sueldo</button>

				{/* Costos fijos operativos */}
				<div className="mt-5 mb-2 text-xs font-bold tracking-[0.5px] text-foreground uppercase">
					Costos fijos operativos
				</div>
				<table className="mb-1 w-full border-collapse">
					<thead>
						<tr>
							<th className={thStyle + " w-[70px]"}>Cat.</th>
							<th className={thStyle}>Ítem</th>
							<th className={thR + " w-[60px]"}>Cant.</th>
							<th className={thR + " w-[130px]"}>Costo unit. (USD)</th>
							<th className={thR + " w-[110px]"}>Total / mes</th>
							<th className={thStyle + " w-[160px]"}>Frec.</th>
							<th className={thStyle + " w-[80px]"}>Tipo</th>
							<th className={thStyle + " w-[28px]"} />
						</tr>
					</thead>
					<tbody>
						{opsRows.map(function (r) {
							var i = r._i;
							var qty = r.qty || 1;
							return (
								<tr key={i} className={rowClass(i)}>
									<td className={cellClass + " w-[70px]"}>
										<input
											aria-label="Categoría del ítem"
											className={inputText + " font-bold uppercase"}
											style={{ color: CAT_COLOR[r.cat] || "var(--muted-foreground)" }}
											value={r.cat}
											onChange={function (e) { updRow("fixedItems", i, "cat", e.target.value.toUpperCase()); }}
										/>
									</td>
									<td className={cellClass}>
										<input aria-label="Nombre del ítem" className={inputText} value={r.item} onChange={function (e) { updRow("fixedItems", i, "item", e.target.value); }} />
									</td>
									<td className={cellClass + " w-[60px]"}>
										<InlineNum label={"Cantidad de " + (r.item || "ítem sin nombre")} value={qty} decimals={0} onChange={function (v) { updRow("fixedItems", i, "qty", Math.max(1, v)); }} />
									</td>
									<td className={cellClass + " w-[130px]"}>
										<InlineNum label={"Costo unitario de " + (r.item || "ítem sin nombre")} value={r.v} decimals={2} onChange={function (v) { updRow("fixedItems", i, "v", v); }} />
									</td>
									<td className={totalCellClass + " w-[110px]"}>
										{fD(rowTotal(r))}
									</td>
									<td className={cellClass + " w-[160px]"}>
										<FrecToggle label={"Frecuencia de " + (r.item || "ítem sin nombre")} value={r.frecuencia} onChange={function (v) { updRow("fixedItems", i, "frecuencia", v); }} />
									</td>
									<td className={cellClass + " w-[80px] text-center"}>
										<button type="button" aria-label={"Tipo de costo: " + (r.tipo || "directo") + ". Cambiar."} className={tipoClass(r.tipo || "directo")} onClick={function () { updRow("fixedItems", i, "tipo", r.tipo === "directo" ? "indirecto" : "directo"); }}>{r.tipo || "directo"}</button>
									</td>
									<td className={"px-1 py-1 w-[28px] text-center"}>
										<button type="button" className={delBtn} onClick={function () { removeRow("fixedItems", i); }} title="Eliminar" aria-label="Eliminar fila">×</button>
									</td>
								</tr>
							);
						})}
						<tr className="bg-secondary">
							<td /><td className="px-2.5 py-1.5 text-xs font-bold text-primary">Subtotal operativos</td>
							<td colSpan={2} />
							<td className="px-2.5 py-1.5 text-right font-mono text-sm font-bold text-primary tabular-nums">{fD(cfOps)}</td>
							<td colSpan={3} />
						</tr>
					</tbody>
				</table>
				<button type="button" className={addBtn} onClick={function () { addRow("fixedItems", { cat: "Ops", item: "", v: 0, qty: 1, tipo: "directo", frecuencia: "mensual" }); }}>+ Agregar costo operativo</button>

				{/* CF summary */}
				<div className="mt-5 flex flex-wrap items-center gap-6 rounded-xl border border-border bg-secondary px-4 py-3">
					<div>
						<div className="mb-0.5 text-xs font-bold tracking-[0.5px] text-primary uppercase">CF Total empresa / mes</div>
						<div className="font-heading text-lg font-semibold text-primary tabular-nums">{fD(cfTotal)}</div>
					</div>
					<div className="border-l border-border pl-6">
						<div className="mb-0.5 text-xs font-bold tracking-[0.5px] text-success uppercase">CF Directo / mes</div>
						<div className="font-heading text-lg font-semibold text-success tabular-nums">{fD(cfDirecto)}</div>
						<div className="text-xs text-muted-foreground">Usado en EBITDA y break-even</div>
					</div>
				</div>
			</div>

			{/* ── COSTOS VARIABLES ─────────────────────────────────── */}
			<SectionHeader title="2 · Costos Variables" />
			<div className="rounded-b-2xl border border-t-0 border-white/70 bg-card p-4.5 shadow-card">
				<div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr))]">

					{/* CV × Certificado */}
					<div>
						<div className="mb-2 text-xs font-bold tracking-[0.5px] text-foreground uppercase">
							CV × Certificado emitido
						</div>
						<table className="mb-1 w-full border-collapse">
							<thead>
								<tr>
									<th className={thStyle}>Componente</th>
									<th className={thR + " w-[130px]"}>Costo (USD)</th>
									<th className={thStyle + " w-[28px]"} />
								</tr>
							</thead>
							<tbody>
								{costConfig.cvCertItems.map(function (r, i) {
									return (
										<tr key={i} className={rowClass(i)}>
											<td className={cellClass}>
												<input aria-label="Nombre del ítem" className={inputText} value={r.item} onChange={function (e) { updRow("cvCertItems", i, "item", e.target.value); }} />
											</td>
											<td className={cellClass + " w-[130px]"}>
												<InlineNum label={"Costo de " + (r.item || "componente sin nombre")} value={r.v} decimals={4} onChange={function (v) { updRow("cvCertItems", i, "v", v); }} />
											</td>
											<td className={"px-1 py-1 w-[28px] text-center"}>
												<button type="button" className={delBtn} onClick={function () { removeRow("cvCertItems", i); }} title="Eliminar" aria-label="Eliminar fila">×</button>
											</td>
										</tr>
									);
								})}
								<tr className="bg-[#fef3c7]">
									<td className="px-2.5 py-1.5 text-xs font-bold text-warning">Total CV cert</td>
									<td className="px-2.5 py-1.5 text-right font-mono text-sm font-bold text-warning tabular-nums">{cvCertTotal.toFixed(4)}</td>
									<td />
								</tr>
							</tbody>
						</table>
						<button type="button" className={addBtn} onClick={function () { addRow("cvCertItems", { item: "", v: 0 }); }}>+ Agregar componente</button>
					</div>

					{/* CV × Firma */}
					<div>
						<div className="mb-2 text-xs font-bold tracking-[0.5px] text-foreground uppercase">
							CV × Firma ejecutada
						</div>
						<table className="mb-1 w-full border-collapse">
							<thead>
								<tr>
									<th className={thStyle}>Componente</th>
									<th className={thR + " w-[130px]"}>Costo (USD)</th>
									<th className={thStyle + " w-[80px]"}>Tipo</th>
									<th className={thStyle + " w-[28px]"} />
								</tr>
							</thead>
							<tbody>
								{(costConfig.cvFirmaItems || []).map(function (r, i) {
									return (
										<tr key={i} className={rowClass(i)}>
											<td className={cellClass}>
												<input aria-label="Nombre del ítem" className={inputText} value={r.item} onChange={function (e) { updRow("cvFirmaItems", i, "item", e.target.value); }} />
											</td>
											<td className={cellClass + " w-[130px]"}>
												<InlineNum label={"Costo de " + (r.item || "componente sin nombre")} value={r.v} decimals={4} onChange={function (v) { updRow("cvFirmaItems", i, "v", v); }} />
											</td>
											<td className={cellClass + " w-[80px] text-center"}>
												<button type="button" aria-label={"Tipo de costo: " + (r.tipo || "directo") + ". Cambiar."} className={tipoClass(r.tipo || "directo")} onClick={function () { updRow("cvFirmaItems", i, "tipo", r.tipo === "directo" ? "indirecto" : "directo"); }}>{r.tipo || "directo"}</button>
											</td>
											<td className={"px-1 py-1 w-[28px] text-center"}>
												<button type="button" className={delBtn} onClick={function () { removeRow("cvFirmaItems", i); }} title="Eliminar" aria-label="Eliminar fila">×</button>
											</td>
										</tr>
									);
								})}
								<tr className="bg-[#d1fae5]">
									<td className="px-2.5 py-1.5 text-xs font-bold text-success">Total CV firma</td>
									<td className="px-2.5 py-1.5 text-right font-mono text-sm font-bold text-success tabular-nums">{cvFirmaTotal.toFixed(4)}</td>
									<td colSpan={2} />
								</tr>
							</tbody>
						</table>
						<button type="button" className={addBtn} onClick={function () { addRow("cvFirmaItems", { item: "", v: 0, tipo: "directo" }); }}>+ Agregar componente</button>

					</div>
				</div>
			</div>

			{/* Save / reset buttons */}
			<div className="mt-6 flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					{isDirty && !saveOk ? (
						<span className="rounded-md bg-[#fee2e2] px-2.5 py-1 text-xs font-bold text-destructive">
							Cambios sin guardar
						</span>
					) : (
						savedAt && <span className="text-xs text-muted-foreground">Última edición: {formatSaved(savedAt)}</span>
					)}
				</div>
				<div className="flex gap-2.5">
					<Button variant="outline" onClick={handleReset}>Restaurar valores originales</Button>
					<Button onClick={handleSave} className={saveOk ? "bg-[var(--success)] hover:bg-[var(--success)]" : ""}>
						{saveOk ? "✓ Guardado" : "Guardar configuración"}
					</Button>
				</div>
			</div>
		</div>
	);
}
