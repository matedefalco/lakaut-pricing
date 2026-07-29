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
import { TierBadge } from "@/components/ui/TierBadge";

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
	const [savedAt, setSavedAt] = useState(function () { return readSaved("channelConfig"); });
	const { toast } = useToast();

	const cvCert = costs?.cvCertBase ?? 0;
	const cvFirma = costs?.cvFirmaBase ?? 0;

	// Precios base del canal Volumen. El descuento de cada segmento se aplica sobre
	// estos dos valores, así que son el único lugar donde se edita un precio.
	const base = draft.b2b2cBase || { cert: 0, firma: 0 };
	function updBase(field, val) {
		updDraft({ b2b2cBase: Object.assign({}, base, { [field]: val }) });
	}
	function cmPctOf(precio, cv) {
		const p = Number(precio) || 0;
		return p > 0 ? (p - cv) / p : 0;
	}
	function fPct(n) { return (n * 100).toFixed(0) + "%"; }

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

			{/* ── 1 · Niveles de descuento de Packs ── */}
			<CollapsibleSection
				defaultOpen
				title="1 · Packs · Niveles y descuentos"
				subtitle="El nivel se asigna por el mayor entre certificados activos y compromiso anual de facturación (USD)."
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[130px]">Se ve así</TableHead>
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
									<TableCell><TierBadge tier={tier} tiers={draft.distributorTiers} size="sm" /></TableCell>
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

			{/* ── 2 · Volumen · precios base + escala de descuento ── */}
			<CollapsibleSection
				title="2 · Volumen · Precio base y segmentos por compromiso"
				subtitle={"Un precio de lista para el certificado y otro para la firma; el segmento aplica un % de descuento sobre ambos. El segmento sale del compromiso del contrato en USD. CV cert = USD " + cvCert.toFixed(4) + " · CV firma = USD " + cvFirma.toFixed(4) + "."}
			>
				{/* Precios base de lista */}
				<div className="mb-5 flex flex-wrap gap-6">
					<div className="w-44">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio base certificado (USD)</Label>
						<NumCell value={base.cert} decimals={4} onChange={function (v) { updBase("cert", v); }} className="mt-1.5" />
						<p className="text-[11px] text-muted-foreground mt-1">CM a lista: {fPct(cmPctOf(base.cert, cvCert))}</p>
					</div>
					<div className="w-44">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio base firma (USD)</Label>
						<NumCell value={base.firma} decimals={4} onChange={function (v) { updBase("firma", v); }} className="mt-1.5" />
						<p className="text-[11px] text-muted-foreground mt-1">CM a lista: {fPct(cmPctOf(base.firma, cvFirma))}</p>
					</div>
					<div className="w-44">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Margen mínimo (%)</Label>
						<NumCell value={Math.round((draft.b2b2cMargenMin != null ? draft.b2b2cMargenMin : 0) * 1000) / 10} decimals={1} onChange={function (v) { updDraft({ b2b2cMargenMin: (v || 0) / 100 }); }} className="mt-1.5" />
						<p className="text-[11px] text-muted-foreground mt-1">Bajo este margen no se puede guardar ni exportar.</p>
					</div>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[140px]">Se ve así</TableHead>
							<TableHead>Segmento</TableHead>
							<TableHead className={thNum}>Compromiso mín. (USD)</TableHead>
							<TableHead className={thNum}>Compromiso máx. (USD)</TableHead>
							<TableHead className={thNum}>Descuento %</TableHead>
							<TableHead className={thNum}>Precio cert</TableHead>
							<TableHead className={thNum}>CM cert</TableHead>
							<TableHead className={thNum}>Precio firma</TableHead>
							<TableHead className={thNum}>CM firma</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.b2b2cSegments || []).map(function (seg, idx) {
							function upd(field, val) {
								const next = draft.b2b2cSegments.map(function (s, i) { return i === idx ? Object.assign({}, s, { [field]: val }) : s; });
								updDraft({ b2b2cSegments: next });
							}
							const desc = Math.min(1, Math.max(0, Number(seg.descuento) || 0));
							const pCert = (Number(base.cert) || 0) * (1 - desc);
							const pFirma = (Number(base.firma) || 0) * (1 - desc);
							const cmCertPct = cmPctOf(pCert, cvCert);
							const cmFirmaPct = cmPctOf(pFirma, cvFirma);
							return (
								<TableRow key={seg.id || idx}>
									<TableCell><TierBadge tier={seg} tiers={draft.b2b2cSegments} size="sm" /></TableCell>
									<TableCell><TextCell value={seg.label} onChange={function (v) { upd("label", v); }} className="w-32" /></TableCell>
									<TableCell><NumCell value={seg.compromisoMin} decimals={0} onChange={function (v) { upd("compromisoMin", v); }} /></TableCell>
									<TableCell><NumCell value={seg.compromisoMax} decimals={0} onChange={function (v) { upd("compromisoMax", v); }} /></TableCell>
									<TableCell><NumCell value={Math.round(desc * 1000) / 10} decimals={1} onChange={function (v) { upd("descuento", (v || 0) / 100); }} /></TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{pCert.toFixed(4)}</TableCell>
									<TableCell className={cn("text-right tabular-nums font-semibold", cmClass(cmCertPct))}>{fPct(cmCertPct)}</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{pFirma.toFixed(4)}</TableCell>
									<TableCell className={cn("text-right tabular-nums font-semibold", cmClass(cmFirmaPct))}>{fPct(cmFirmaPct)}</TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("b2b2cSegments", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar segmento" onClick={function () { addRow("b2b2cSegments", { id: genId("seg"), label: "Nuevo segmento", compromisoMin: 0, compromisoMax: null, descuento: 0 }); }} />
				<p className="text-[11px] text-muted-foreground mt-3">
					El compromiso se mide a precio de lista (certificados × base cert + firmas × base firma) por los meses de vinculación. Los precios y CM de cada fila son calculados: se editan el precio base y el descuento.
				</p>
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
				title="5 · Palancas de descuento comercial (Packs y Volumen)"
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
				<div className="grid grid-cols-2 gap-4 max-w-md">
					<div>
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Costo variable certificado (USD)</Label>
						<div className="mt-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-right font-semibold tabular-nums">{cvCert.toFixed(4)}</div>
						<p className="text-[11px] text-muted-foreground mt-1.5">CV por certificado emitido.</p>
					</div>
					<div>
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Costo variable firma (USD)</Label>
						<div className="mt-1.5 rounded-md border border-border bg-muted/40 px-3 py-2 text-right font-semibold tabular-nums">{cvFirma.toFixed(4)}</div>
						<p className="text-[11px] text-muted-foreground mt-1.5">CV por firma emitida.</p>
					</div>
				</div>
			</CollapsibleSection>
		</div>
	);
}
