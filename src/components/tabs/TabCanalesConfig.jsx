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
import { segmentPricing, idcBundleCost, markupOf, minPriceForMarkup } from "@/lib/tiers";
import { TierBadge } from "@/components/ui/TierBadge";

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

	// Guardarraíl del canal Volumen: markup mínimo (precio ÷ costo) que tiene que
	// cumplir una cotización para poder guardarse. Ver B2B2C_MARKUP_MIN.
	const markupMin = draft.b2b2cMarkupMin != null ? draft.b2b2cMarkupMin : 1.2;
	// Precio base del canal Volumen: el descuento de cada segmento se aplica sobre
	// estos dos valores, así que son el único lugar donde se edita un precio.
	const volBase = draft.volumenBase || { cert: 0, firma: 0 };
	function updVolBase(field, val) {
		updDraft({ volumenBase: Object.assign({}, volBase, { [field]: val }) });
	}
	function fMarkupTxt(precio, cv) {
		const m = markupOf(precio, cv);
		return m == null ? "—" : m.toFixed(2) + "x";
	}

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

			{/* ── 1b · Distribuidores · Volumen · Niveles y descuentos ── */}
			<CollapsibleSection
				title="1b · Distribuidores-Volumen · Niveles y descuentos"
				subtitle={"Modalidad Volumen del canal: el descuento del nivel se aplica sobre el precio base por elemento (cert USD " + (Number(volBase.cert) || 0).toFixed(4) + " / firma USD " + (Number(volBase.firma) || 0).toFixed(4) + "). El nivel se asigna igual que en Packs (mayor entre certificados activos y compromiso anual). El precio del certificado no puede bajar del markup mínimo de " + markupMin.toFixed(2) + "x."}
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
							<TableHead className={thNum}>Precio cert · markup</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.distribuidorVolTiers || []).map(function (tier, idx) {
							function upd(field, val) {
								const next = draft.distribuidorVolTiers.map(function (t, i) { return i === idx ? Object.assign({}, t, { [field]: val }) : t; });
								updDraft({ distribuidorVolTiers: next });
							}
							const precioCert = (Number(volBase.cert) || 0) * (1 - (Number(tier.descuento) || 0));
							const m = markupOf(precioCert, cvCert);
							const ok = m == null || m >= markupMin;
							return (
								<TableRow key={tier.id || idx}>
									<TableCell><TierBadge tier={tier} tiers={draft.distribuidorVolTiers} size="sm" /></TableCell>
									<TableCell><TextCell value={tier.id} onChange={function (v) { upd("id", v); }} className="w-20" /></TableCell>
									<TableCell><TextCell value={tier.label} onChange={function (v) { upd("label", v); }} className="w-24" /></TableCell>
									<TableCell><NumCell value={tier.certsMin} decimals={0} onChange={function (v) { upd("certsMin", v); }} /></TableCell>
									<TableCell><NumCell value={tier.certsMax} decimals={0} onChange={function (v) { upd("certsMax", v); }} /></TableCell>
									<TableCell><NumCell value={Math.round((tier.descuento || 0) * 100)} decimals={0} onChange={function (v) { upd("descuento", (v || 0) / 100); }} /></TableCell>
									<TableCell><NumCell value={tier.compromisoMin} decimals={0} onChange={function (v) { upd("compromisoMin", v); }} /></TableCell>
									<TableCell><NumCell value={tier.compromisoMax} decimals={0} onChange={function (v) { upd("compromisoMax", v); }} /></TableCell>
									<TableCell className={"text-right tabular-nums text-xs " + (ok ? "text-muted-foreground" : "text-destructive font-semibold")}>{"USD " + precioCert.toFixed(4) + " · " + fMarkupTxt(precioCert, cvCert)}</TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("distribuidorVolTiers", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar nivel" onClick={function () { addRow("distribuidorVolTiers", { id: genId("dvtier"), label: "Nuevo nivel", certsMin: 0, certsMax: null, descuento: 0, compromisoMin: 0, compromisoMax: null }); }} />
			</CollapsibleSection>

			{/* ── 1c · Web · Firma adicional por volumen ── */}
			<CollapsibleSection
				title="1c · Web · Firma adicional (escala por volumen)"
				subtitle="Precio por firma adicional del catálogo web, en ARS: a mayor cantidad comprada, menor el precio por unidad. Reemplaza el precio plano por plan. El precio de un tramo aplica desde su umbral de firmas hacia arriba. Distribuidores-packs descuenta sobre esta lista."
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className={thNum}>Desde (firmas)</TableHead>
							<TableHead className={thNum}>Precio por firma (ARS)</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.webFirmaExtraTiers || []).map(function (step, idx) {
							function upd(field, val) {
								const next = draft.webFirmaExtraTiers.map(function (s, i) { return i === idx ? Object.assign({}, s, { [field]: val }) : s; });
								updDraft({ webFirmaExtraTiers: next });
							}
							return (
								<TableRow key={idx}>
									<TableCell><NumCell value={step.firmas} decimals={0} onChange={function (v) { upd("firmas", v); }} /></TableCell>
									<TableCell><NumCell value={step.precioARS} decimals={0} onChange={function (v) { upd("precioARS", v); }} /></TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("webFirmaExtraTiers", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar tramo" onClick={function () { addRow("webFirmaExtraTiers", { firmas: 0, precioARS: 0 }); }} />
			</CollapsibleSection>

			{/* ── 2 · Volumen · escala de precios por IDC ── */}
			<CollapsibleSection
				title="2 · IDC · Escala de precios por IDC"
				subtitle={"Cada segmento tiene su precio por IDC según el volumen mensual, más un cupo de firmas incluidas en ese precio. CV cert = USD " + cvCert.toFixed(4) + " · CV firma = USD " + cvFirma.toFixed(4) + "."}
			>
				<div className="mb-5 flex flex-wrap gap-6">
					<div className="w-52">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Markup mínimo (x)</Label>
						<NumCell value={markupMin} decimals={2} onChange={function (v) { updDraft({ b2b2cMarkupMin: v || 0 }); }} className="mt-1.5" />
						<p className="text-[11px] text-muted-foreground mt-1">Precio ÷ costo. Es la métrica de la columna MARGEN del Borrador v5. Bajo este valor no se puede guardar ni exportar.</p>
					</div>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-[140px]">Se ve así</TableHead>
							<TableHead>Segmento</TableHead>
							<TableHead className={thNum}>IDC mín. / mes</TableHead>
							<TableHead className={thNum}>IDC máx. / mes</TableHead>
							<TableHead className={thNum}>Precio IDC</TableHead>
							<TableHead className={thNum}>Firmas incl.</TableHead>
							<TableHead className={thNum}>Firma s/ cupo</TableHead>
							<TableHead className={thNum}>CV bundle</TableHead>
							<TableHead className={thNum}>Markup</TableHead>
							<TableHead className={thNum}>Mín. viable</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.b2b2cSegments || []).map(function (seg, idx) {
							function upd(field, val) {
								const next = draft.b2b2cSegments.map(function (s, i) { return i === idx ? Object.assign({}, s, { [field]: val }) : s; });
								updDraft({ b2b2cSegments: next });
							}
							const p = segmentPricing(seg, { precioIDC: 0, firmasIncluidas: 0, precioFirmaExtra: 0 });
							const cvBundle = idcBundleCost(cvCert, cvFirma, p.firmasIncluidas);
							const markup = markupOf(p.precioIDC, cvBundle);
							const minViable = minPriceForMarkup(cvBundle, markupMin);
							const viable = markup == null || markup >= markupMin;
							return (
								<TableRow key={seg.id || idx} className={viable ? "" : "bg-destructive/5"}>
									<TableCell><TierBadge tier={seg} tiers={draft.b2b2cSegments} size="sm" /></TableCell>
									<TableCell><TextCell value={seg.label} onChange={function (v) { upd("label", v); }} className="w-32" /></TableCell>
									<TableCell><NumCell value={seg.idcMin} decimals={0} onChange={function (v) { upd("idcMin", v); }} /></TableCell>
									<TableCell><NumCell value={seg.idcMax} decimals={0} onChange={function (v) { upd("idcMax", v); }} /></TableCell>
									<TableCell><NumCell value={seg.precioIDC} decimals={4} onChange={function (v) { upd("precioIDC", v); }} /></TableCell>
									<TableCell><NumCell value={seg.firmasIncluidas} decimals={0} onChange={function (v) { upd("firmasIncluidas", v); }} /></TableCell>
									<TableCell><NumCell value={seg.precioFirmaExtra} decimals={4} onChange={function (v) { upd("precioFirmaExtra", v); }} /></TableCell>
									<TableCell className="text-right tabular-nums text-muted-foreground">{cvBundle.toFixed(4)}</TableCell>
									<TableCell className={cn("text-right tabular-nums font-semibold", markup == null ? "" : (viable ? (markup >= markupMin * 1.4 ? "text-[var(--success)]" : "text-[var(--warning)]") : "text-destructive"))}>
										{markup == null ? "—" : markup.toFixed(2) + "x"}
									</TableCell>
									<TableCell className={cn("text-right tabular-nums", viable ? "text-muted-foreground" : "font-semibold text-destructive")}>{minViable.toFixed(4)}</TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("b2b2cSegments", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar segmento" onClick={function () { addRow("b2b2cSegments", { id: genId("seg"), label: "Nuevo segmento", idcMin: 0, idcMax: null, precioIDC: 0, firmasIncluidas: 4, precioFirmaExtra: 0.5 }); }} />
				<p className="text-[11px] text-muted-foreground mt-3">
					El segmento sale del volumen mensual de IDC. <strong>CV bundle</strong> es el costo de lo que se entrega por el precio de la IDC (certificado + las firmas del cupo) y <strong>Mín. viable</strong> el precio más bajo que cumple el markup mínimo: si una fila queda en rojo, ninguna cotización de ese segmento se va a poder guardar. Se resuelve subiendo el precio o bajando el cupo.
				</p>
			</CollapsibleSection>

			{/* ── 3 · SDK Tiers B2B2C ── */}
			{/* ── 3 · Volumen · precio base + escala de descuento ── */}
			<CollapsibleSection
				title="3 · Volumen · Precio base y segmentos por compromiso"
				subtitle={"Un precio de lista para el certificado y otro para la firma; el segmento aplica el mismo % de descuento sobre ambos. El segmento sale del compromiso del contrato en USD. CV cert = USD " + cvCert.toFixed(4) + " · CV firma = USD " + cvFirma.toFixed(4) + "."}
			>
				<div className="mb-5 flex flex-wrap gap-6">
					<div className="w-44">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio base certificado (USD)</Label>
						<NumCell value={volBase.cert} decimals={4} onChange={function (v) { updVolBase("cert", v); }} className="mt-1.5" />
						<p className="text-[11px] text-muted-foreground mt-1">Markup a lista: {fMarkupTxt(volBase.cert, cvCert)}</p>
					</div>
					<div className="w-44">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio base firma (USD)</Label>
						<NumCell value={volBase.firma} decimals={4} onChange={function (v) { updVolBase("firma", v); }} className="mt-1.5" />
						<p className="text-[11px] text-muted-foreground mt-1">Markup a lista: {fMarkupTxt(volBase.firma, cvFirma)}</p>
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
							<TableHead className={thNum}>Markup cert</TableHead>
							<TableHead className={thNum}>Precio firma</TableHead>
							<TableHead className={thNum}>Markup firma</TableHead>
							<TableHead className="w-10" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.volumenSegments || []).map(function (seg, idx) {
							function upd(field, val) {
								const next = draft.volumenSegments.map(function (s, i) { return i === idx ? Object.assign({}, s, { [field]: val }) : s; });
								updDraft({ volumenSegments: next });
							}
							const desc = Math.min(1, Math.max(0, Number(seg.descuento) || 0));
							const pCert = (Number(volBase.cert) || 0) * (1 - desc);
							const pFirma = (Number(volBase.firma) || 0) * (1 - desc);
							const mCert = markupOf(pCert, cvCert);
							const mFirma = markupOf(pFirma, cvFirma);
							const viable = (mCert == null || mCert >= markupMin) && (mFirma == null || mFirma >= markupMin);
							return (
								<TableRow key={seg.id || idx} className={viable ? "" : "bg-destructive/5"}>
									<TableCell><TierBadge tier={seg} tiers={draft.volumenSegments} size="sm" /></TableCell>
									<TableCell><TextCell value={seg.label} onChange={function (v) { upd("label", v); }} className="w-32" /></TableCell>
									<TableCell><NumCell value={seg.compromisoMin} decimals={0} onChange={function (v) { upd("compromisoMin", v); }} /></TableCell>
									<TableCell><NumCell value={seg.compromisoMax} decimals={0} onChange={function (v) { upd("compromisoMax", v); }} /></TableCell>
									<TableCell><NumCell value={Math.round(desc * 1000) / 10} decimals={1} onChange={function (v) { upd("descuento", (v || 0) / 100); }} /></TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{pCert.toFixed(4)}</TableCell>
									<TableCell className={cn("text-right tabular-nums font-semibold", mCert == null ? "" : (mCert >= markupMin ? "text-[var(--success)]" : "text-destructive"))}>{mCert == null ? "—" : mCert.toFixed(2) + "x"}</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{pFirma.toFixed(4)}</TableCell>
									<TableCell className={cn("text-right tabular-nums font-semibold", mFirma == null ? "" : (mFirma >= markupMin ? "text-[var(--success)]" : "text-destructive"))}>{mFirma == null ? "—" : mFirma.toFixed(2) + "x"}</TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("volumenSegments", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar segmento" onClick={function () { addRow("volumenSegments", { id: genId("vseg"), label: "Nuevo segmento", compromisoMin: 0, compromisoMax: null, descuento: 0 }); }} />
				<p className="text-[11px] text-muted-foreground mt-3">
					El compromiso se mide a precio de lista (certificados × base cert + firmas × base firma) por los meses de vinculación. Los precios y markups de cada fila son calculados: se editan el precio base y el descuento. Una fila en rojo vende algún elemento por debajo del markup mínimo.
				</p>
			</CollapsibleSection>

			{/* ── Volumen · escalonado estándar de crecimiento ── */}
			<CollapsibleSection
				title="Volumen · Escalonado estándar de crecimiento"
				subtitle="Escala fija de precios por cantidad de firmas que va, por defecto, en toda propuesta de Volumen. Da referencia y equidad entre clientes; el vendedor puede ajustarla por propuesta puntual. El precio por firma sale del precio base menos el descuento del escalón."
			>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Desde (firmas)</TableHead>
							<TableHead>Descuento %</TableHead>
							<TableHead className="text-right">Precio / firma</TableHead>
							<TableHead className="text-right">Markup</TableHead>
							<TableHead></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{(draft.volumenProyeccion || []).map(function (step, idx) {
							function upd(field, val) {
								const next = draft.volumenProyeccion.map(function (s, i) { return i === idx ? Object.assign({}, s, { [field]: val }) : s; });
								updDraft({ volumenProyeccion: next });
							}
							const desc = Math.min(100, Math.max(0, Number(step.descuento) || 0)) / 100;
							const pFirma = (Number(volBase.firma) || 0) * (1 - desc);
							const mFirma = markupOf(pFirma, cvFirma);
							const viable = mFirma == null || mFirma >= markupMin;
							return (
								<TableRow key={idx} className={viable ? "" : "bg-destructive/5"}>
									<TableCell><NumCell value={step.firmas} decimals={0} onChange={function (v) { upd("firmas", v); }} /></TableCell>
									<TableCell><NumCell value={step.descuento} decimals={0} onChange={function (v) { upd("descuento", v); }} /></TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{pFirma.toFixed(4)}</TableCell>
									<TableCell className={cn("text-right tabular-nums font-semibold", mFirma == null ? "" : (mFirma >= markupMin ? "text-[var(--success)]" : "text-destructive"))}>{mFirma == null ? "—" : mFirma.toFixed(2) + "x"}</TableCell>
									<TableCell><DeleteRowButton onClick={function () { removeRow("volumenProyeccion", idx); }} /></TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
				<AddRowButton label="Agregar escalón" onClick={function () { addRow("volumenProyeccion", { firmas: 0, descuento: 0 }); }} />
				<p className="text-[11px] text-muted-foreground mt-3">
					Cada escalón es un umbral absoluto de firmas con su descuento sobre el precio base de la firma. Amplialo con varios tramos para cubrir un espectro de volumen: cada cliente ve el mismo escalonado y encuentra el tramo que se adecúa a su necesidad. Una fila en rojo vende la firma por debajo del markup mínimo.
				</p>
			</CollapsibleSection>

			<CollapsibleSection title="4 · IDC · SDK · Fee de implementación">
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
				<AddRowButton label="Agregar SDK tier" onClick={function () { addRow("b2b2cApiTiers", { id: genId("sdk"), label: "Nuevo SDK tier", feeMin: 0, feeMax: 0, feeDefault: 0 }); }} />
			</CollapsibleSection>

			{/* ── 4 · Planes SLA ── */}
			<CollapsibleSection title="5 · IDC · Planes SLA">
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
				title="6 · Palancas de descuento comercial (todos los canales)"
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
				title="7 · Parámetros derivados del esquema de costos"
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
