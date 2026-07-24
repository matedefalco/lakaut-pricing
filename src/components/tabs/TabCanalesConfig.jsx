import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { markSaved, readSaved, formatSaved } from "../../lib/savedAt";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toaster";
import { LEVER_META } from "@/lib/commercialLevers";

const FIRMAS_INCL_REF = 1; // 1 IDC = 1 cert + 1 firma, igual que en Canal B2B2C · Tabla de referencia

function cmClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }

function genId(prefix) {
	return prefix + "_" + Math.random().toString(36).slice(2, 8);
}

// Input numérico compacto para celdas de tabla (design system ShadCN).
function NumCell({ value, onChange, decimals, className }) {
	return (
		<Input
			type="number"
			value={value === null || value === undefined ? "" : value}
			step={decimals > 0 ? Math.pow(10, -decimals) : 1}
			onChange={function (e) { onChange(e.target.value === "" ? null : Number(e.target.value)); }}
			className={cn("h-8 text-right tabular-nums", className)}
		/>
	);
}

// Input de texto compacto para celdas de tabla.
function TextCell({ value, onChange, className }) {
	return (
		<Input value={value || ""} onChange={function (e) { onChange(e.target.value); }} className={cn("h-8", className)} />
	);
}

function DeleteRowButton({ onClick }) {
	return (
		<Button variant="ghost" size="icon" className="size-8" onClick={onClick} title="Eliminar fila">
			<Trash2 className="size-4 text-muted-foreground" />
		</Button>
	);
}

function AddRowButton({ onClick, label }) {
	return (
		<Button variant="outline" size="sm" className="mt-3 border-dashed" onClick={onClick}>
			<Plus className="size-4" /> {label || "Agregar fila"}
		</Button>
	);
}

export function TabCanalesConfig({ channelConfig, updateChannelConfig, costs }) {
	const [draft, setDraft] = useState(channelConfig);
	const [isDirty, setIsDirty] = useState(false);
	const [segPriceMode, setSegPriceMode] = useState("manual"); // "manual" | "margen"
	const [savedAt, setSavedAt] = useState(function () { return readSaved("channelConfig"); });
	const { toast } = useToast();

	const cvCert = costs?.cvCertBase ?? 0;
	const cvFirma = costs?.cvFirmaBase ?? 0;
	const cfDirecto = costs?.cfDirecto ?? 0;
	const costoRealIDC = cvCert + FIRMAS_INCL_REF * cvFirma;

	useEffect(function () {
		setDraft(channelConfig);
		setIsDirty(false);
	}, [channelConfig]);

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
		toast({ variant: "success", title: "Cambios guardados" });
	}

	function addRow(key, blankRow) {
		const list = draft[key] || [];
		updDraft({ [key]: list.concat([blankRow]) });
	}

	function removeRow(key, idx) {
		const list = draft[key] || [];
		updDraft({ [key]: list.filter(function (_, i) { return i !== idx; }) });
	}

	// ── Palancas de descuento comercial (objeto anidado commercialLevers) ──
	const levers = draft.commercialLevers || {};
	function updLevers(patch) {
		updDraft({ commercialLevers: Object.assign({}, draft.commercialLevers, patch) });
	}
	function updLeverRow(key, idx, field, val) {
		const list = (levers[key] || []).map(function (r, i) { return i === idx ? Object.assign({}, r, { [field]: val }) : r; });
		updLevers({ [key]: list });
	}
	function addLeverRow(key) {
		updLevers({ [key]: (levers[key] || []).concat([{ id: genId(key), value: 0, discount: 0 }]) });
	}
	function removeLeverRow(key, idx) {
		updLevers({ [key]: (levers[key] || []).filter(function (_, i) { return i !== idx; }) });
	}

	if (!channelConfig || !updateChannelConfig) return null;

	const thNum = "text-right";

	return (
		<div className="space-y-4" style={{ maxWidth: 960 }}>
			<PageHeader
				title="Precios por canal"
				description={isDirty ? "Cambios sin guardar" : (savedAt ? "Última edición: " + formatSaved(savedAt) : "Sin cambios registrados")}
				actions={<Button onClick={handleSave} disabled={!isDirty}>Guardar cambios</Button>}
			/>

			{/* ── 1 · Tiers de distribuidores ── */}
			<CollapsibleSection
				defaultOpen
				title="1 · Precio de lista con descuento · Niveles y descuentos"
				subtitle="El nivel se asigna por el mayor entre certificados activos y compromiso anual de facturación (USD)."
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Nivel</TableHead>
							<TableHead>Label</TableHead>
							<TableHead className={thNum}>Certs mín.</TableHead>
							<TableHead className={thNum}>Certs máx.</TableHead>
							<TableHead className={thNum}>Descuento %</TableHead>
							<TableHead className={thNum}>Compromiso mín. (USD)</TableHead>
							<TableHead className={thNum}>Compromiso máx. (USD)</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.distributorTiers || []).map(function (tier, idx) {
							function upd(field, val) {
								const next = draft.distributorTiers.map(function (t, i) { return i === idx ? Object.assign({}, t, { [field]: val }) : t; });
								updDraft({ distributorTiers: next });
							}
							return (
								<TableRow key={tier.id || idx}>
									<TableCell><TextCell value={tier.id} onChange={function (v) { upd("id", v); }} className="w-20" /></TableCell>
									<TableCell><TextCell value={tier.label} onChange={function (v) { upd("label", v); }} className="w-24" /></TableCell>
									<TableCell><NumCell value={tier.certsMin} decimals={0} onChange={function (v) { upd("certsMin", v); }} /></TableCell>
									<TableCell><NumCell value={tier.certsMax} decimals={0} onChange={function (v) { upd("certsMax", v); }} /></TableCell>
									<TableCell><NumCell value={Math.round((tier.descuento || 0) * 100)} decimals={0} onChange={function (v) { upd("descuento", (v || 0) / 100); }} /></TableCell>
									<TableCell><NumCell value={tier.compromisoMin} decimals={0} onChange={function (v) { upd("compromisoMin", v); }} /></TableCell>
									<TableCell><NumCell value={tier.compromisoMax} decimals={0} onChange={function (v) { upd("compromisoMax", v); }} /></TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("distributorTiers", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar nivel" onClick={function () { addRow("distributorTiers", { id: genId("tier"), label: "Nuevo nivel", certsMin: 0, certsMax: null, descuento: 0, compromisoMin: 0, compromisoMax: null }); }} />
			</CollapsibleSection>

			{/* ── 2 · Segmentos B2B2C ── */}
			<CollapsibleSection
				title="2 · Volumen · Segmentos por unidades y facturación"
				subtitle={"El segmento se alcanza por el mayor entre unidades (certs + firmas) y facturación a lista. CV/IDC = cert USD " + cvCert.toFixed(4) + " + " + FIRMAS_INCL_REF + " firma USD " + cvFirma.toFixed(4) + " = USD " + costoRealIDC.toFixed(4) + "."}
			>
				<div className="mb-3 flex gap-1.5">
					{[{ id: "manual", label: "Precio manual" }, { id: "margen", label: "Margen objetivo" }].map(function (m) {
						const active = segPriceMode === m.id;
						return (
							<Button key={m.id} variant={active ? "default" : "outline"} size="sm" onClick={function () { setSegPriceMode(m.id); }}>{m.label}</Button>
						);
					})}
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Segmento</TableHead>
							<TableHead className={thNum}>Unid. mín.</TableHead>
							<TableHead className={thNum}>Unid. máx.</TableHead>
							<TableHead className={thNum}>Fact. mín (USD)</TableHead>
							<TableHead className={thNum}>Fact. máx (USD)</TableHead>
							{segPriceMode === "margen" && <TableHead className={thNum}>Margen obj. (%)</TableHead>}
							<TableHead className={thNum}>Precio IDC (USD){segPriceMode === "margen" ? " (calc.)" : ""}</TableHead>
							<TableHead className={thNum}>Precio firma (USD)</TableHead>
							<TableHead className={thNum}>CV (USD/IDC)</TableHead>
							<TableHead className={thNum}>CM $</TableHead>
							<TableHead className={thNum}>CM %</TableHead>
							<TableHead className={thNum}>BE (IDC)</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.b2b2cSegments || []).map(function (seg, idx) {
							function upd(field, val) {
								const next = draft.b2b2cSegments.map(function (s, i) { return i === idx ? Object.assign({}, s, { [field]: val }) : s; });
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
								<TableRow key={seg.id || idx}>
									<TableCell><TextCell value={seg.label} onChange={function (v) { upd("label", v); }} className="w-32" /></TableCell>
									<TableCell><NumCell value={seg.idcMin} decimals={0} onChange={function (v) { upd("idcMin", v); }} /></TableCell>
									<TableCell><NumCell value={seg.idcMax} decimals={0} onChange={function (v) { upd("idcMax", v); }} /></TableCell>
									<TableCell><NumCell value={seg.facturacionMin} decimals={0} onChange={function (v) { upd("facturacionMin", v); }} /></TableCell>
									<TableCell><NumCell value={seg.facturacionMax} decimals={0} onChange={function (v) { upd("facturacionMax", v); }} /></TableCell>
									{segPriceMode === "margen" && <TableCell><NumCell value={margenPct} decimals={1} onChange={updMargen} /></TableCell>}
									<TableCell>
										{segPriceMode === "manual"
											? <NumCell value={seg.precioIDC} decimals={4} onChange={function (v) { upd("precioIDC", v); }} />
											: <div className="text-right font-semibold tabular-nums px-2">{precioIDC.toFixed(4)}</div>}
									</TableCell>
									<TableCell><NumCell value={seg.precioFirma} decimals={4} onChange={function (v) { upd("precioFirma", v); }} /></TableCell>
									<TableCell className="text-right tabular-nums text-muted-foreground">{costoRealIDC.toFixed(4)}</TableCell>
									<TableCell className={cn("text-right tabular-nums font-semibold", cmClass(cmPct))}>{cmVal.toFixed(4)}</TableCell>
									<TableCell className={cn("text-right tabular-nums font-semibold", cmClass(cmPct))}>{(cmPct * 100).toFixed(0)}%</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{beVal != null ? beVal.toLocaleString("es-AR") : "—"}</TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("b2b2cSegments", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar segmento" onClick={function () { addRow("b2b2cSegments", { id: genId("seg"), label: "Nuevo segmento", idcMin: 0, idcMax: null, facturacionMin: 0, facturacionMax: null, precioIDC: 0, precioFirma: 0 }); }} />
			</CollapsibleSection>

			{/* ── 3 · API Tiers B2B2C ── */}
			<CollapsibleSection title="3 · Volumen · API · Fee de implementación">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Label</TableHead>
							<TableHead className={thNum}>Fee mín. (USD)</TableHead>
							<TableHead className={thNum}>Fee máx. (USD)</TableHead>
							<TableHead className={thNum}>Fee default (USD)</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.b2b2cApiTiers || []).map(function (tier, idx) {
							function upd(field, val) {
								const next = draft.b2b2cApiTiers.map(function (t, i) { return i === idx ? Object.assign({}, t, { [field]: val }) : t; });
								updDraft({ b2b2cApiTiers: next });
							}
							return (
								<TableRow key={tier.id || idx}>
									<TableCell><TextCell value={tier.label} onChange={function (v) { upd("label", v); }} className="w-40" /></TableCell>
									<TableCell><NumCell value={tier.feeMin} decimals={0} onChange={function (v) { upd("feeMin", v); }} /></TableCell>
									<TableCell><NumCell value={tier.feeMax} decimals={0} onChange={function (v) { upd("feeMax", v); }} /></TableCell>
									<TableCell><NumCell value={tier.feeDefault} decimals={0} onChange={function (v) { upd("feeDefault", v); }} /></TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("b2b2cApiTiers", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar API tier" onClick={function () { addRow("b2b2cApiTiers", { id: genId("api"), label: "Nuevo API tier", feeMin: 0, feeMax: 0, feeDefault: 0 }); }} />
			</CollapsibleSection>

			{/* ── 4 · Planes SLA ── */}
			<CollapsibleSection title="4 · Volumen · Planes SLA">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Label</TableHead>
							<TableHead className={thNum}>Precio/mes (USD)</TableHead>
							<TableHead className={thNum}>SLA (%)</TableHead>
							<TableHead className={thNum}>TX/mes</TableHead>
							<TableHead>Descripción</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.slaPlans || []).map(function (plan, idx) {
							function upd(field, val) {
								const next = draft.slaPlans.map(function (p, i) { return i === idx ? Object.assign({}, p, { [field]: val }) : p; });
								updDraft({ slaPlans: next });
							}
							return (
								<TableRow key={plan.id || idx}>
									<TableCell><TextCell value={plan.label} onChange={function (v) { upd("label", v); }} className="w-28" /></TableCell>
									<TableCell><NumCell value={plan.precioMes} decimals={0} onChange={function (v) { upd("precioMes", v); }} /></TableCell>
									<TableCell><NumCell value={plan.sla !== null && plan.sla !== undefined ? Math.round(plan.sla * 1000) / 10 : null} decimals={1} onChange={function (v) { upd("sla", v === null ? null : v / 100); }} /></TableCell>
									<TableCell><NumCell value={plan.txMes} decimals={0} onChange={function (v) { upd("txMes", v); }} /></TableCell>
									<TableCell><TextCell value={plan.desc} onChange={function (v) { upd("desc", v); }} className="min-w-[220px]" /></TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("slaPlans", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar plan SLA" onClick={function () { addRow("slaPlans", { id: genId("sla"), label: "Nuevo plan", precioMes: 0, sla: null, txMes: null, desc: "" }); }} />
			</CollapsibleSection>

			{/* ── 5 · Palancas de descuento comercial ── */}
			<CollapsibleSection
				title="5 · Palancas de descuento comercial (Volumen y Distribuidores)"
				subtitle="Descuentos por condiciones favorables, además del volumen. Se suman con tope y aplican sobre el subtotal de servicio. El texto que ve el cliente se arma con el número."
			>
				<div className="mb-5 flex flex-wrap gap-6">
					<div className="w-48">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Tope máximo de la suma (%)</Label>
						<NumCell value={levers.cap} decimals={0} onChange={function (v) { updLevers({ cap: v }); }} className="mt-1.5" />
					</div>
					<div className="w-56">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Descuento de abono · default (%)</Label>
						<NumCell value={draft.abonoDescuentoPct} decimals={0} onChange={function (v) { updDraft({ abonoDescuentoPct: v }); }} className="mt-1.5" />
						<p className="text-[11px] text-muted-foreground mt-1">Valor sugerido al activar el abono; ajustable por cotización.</p>
					</div>
				</div>

				{LEVER_META.map(function (lv) {
					return (
						<div key={lv.key} className="mb-5">
							<div className="text-sm font-semibold mb-1.5">{lv.label}</div>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>{lv.col}</TableHead>
										<TableHead className={thNum}>Descuento %</TableHead>
										<TableHead className="w-10" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{(levers[lv.key] || []).map(function (opt, idx) {
										return (
											<TableRow key={opt.id || idx}>
												<TableCell><NumCell value={opt.value != null ? opt.value : (parseInt(String(opt.label || "").replace(/[^0-9]/g, ""), 10) || 0)} decimals={0} onChange={function (v) { updLeverRow(lv.key, idx, "value", v || 0); }} className="w-32" /></TableCell>
												<TableCell><NumCell value={opt.discount} decimals={0} onChange={function (v) { updLeverRow(lv.key, idx, "discount", v || 0); }} className="w-24 ml-auto" /></TableCell>
												<TableCell><DeleteRowButton onClick={function () { removeLeverRow(lv.key, idx); }} /></TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
							<AddRowButton label="Agregar opción" onClick={function () { addLeverRow(lv.key); }} />
						</div>
					);
				})}
				<p className="text-[11px] text-muted-foreground">
					El texto visible se arma con el número: la opción de mayor valor se muestra como "N o más"; en Time to cash, 0 = "Pago contado".
				</p>
			</CollapsibleSection>

			{/* ── 6 · Parámetros derivados ── */}
			<CollapsibleSection
				title="6 · Parámetros derivados del esquema de costos"
				subtitle="Se calculan automáticamente desde Configuración → Costos. No se editan a mano."
			>
				<div className="max-w-xs">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">Costo IDC referencia (USD)</Label>
					<div className="mt-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-right font-semibold tabular-nums">{costoRealIDC.toFixed(4)}</div>
					<p className="text-[11px] text-muted-foreground mt-1.5">= cert USD {cvCert.toFixed(4)} + {FIRMAS_INCL_REF} firma USD {cvFirma.toFixed(4)}</p>
				</div>
			</CollapsibleSection>
		</div>
	);
}
