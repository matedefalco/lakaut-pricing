import { useState, useEffect } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { getB2B2CSegment } from "@/lib/tiers";
import { CHANNELS } from "@/data/channelMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NumberField, SelectField, StatCard } from "@/components/ui/field";
import { ClientSelector } from "@/components/ui/ClientSelector";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { SaveExportBar } from "@/components/ui/SaveExportBar";
import { useToast, notifyQuoteSaved } from "@/components/ui/Toaster";
import { TabCanalB2B2CPrecios } from "@/components/tabs/TabCanalB2B2CPrecios";

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }
function margAccent(pct) { return pct >= 0.5 ? "success" : pct >= 0.2 ? "warning" : "destructive"; }

export function TabCanalB2B2C({ costs, currency, tc, dealsApi, clientsApi, onExport, onGoHistorial, pendingEdit, onConsumeEdit }) {
	const { channelConfig } = useChannelConfig();
	const b2b2cSegments = channelConfig.b2b2cSegments;
	const b2b2cApiTiers = channelConfig.b2b2cApiTiers;
	const slaPlans = channelConfig.slaPlans;
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const { toast } = useToast();
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	const [selectedClient, setSelectedClient] = useState(null);
	const [integracion, setIntegracion] = useState("api"); // "api" | "sin_api"
	const [idcMensuales, setIdcMensuales] = useState(""); // arranca vacío: sin alarmas por defecto
	const [fee, setFee] = useState(3250);
	const [slaId, setSlaId] = useState("standard");
	const [slaBonificado, setSlaBonificado] = useState(false);
	const [firmasInclPorIDC, setFirmasInclPorIDC] = useState(4);
	const [firmasAdicPorIDC, setFirmasAdicPorIDC] = useState(0);
	const [precioFirmaAdic, setPrecioFirmaAdic] = useState(0.5);
	const [casosDeUso, setCasosDeUso] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [flash, setFlash] = useState(false);
	const [saved, setSaved] = useState(null); // { deal, client } tras guardar
	const [showOverrides, setShowOverrides] = useState(false);
	const [overrideMode, setOverrideMode] = useState(null); // null | "bundle" | "componente" | "margen"
	const [overridePrecioIDC, setOverridePrecioIDC] = useState("");
	const [overridePrecioCert, setOverridePrecioCert] = useState("");
	const [overridePrecioFirma, setOverridePrecioFirma] = useState("");
	const [overrideMargenPct, setOverrideMargenPct] = useState("");
	const [abono, setAbono] = useState(false);

	const DESCUENTO_ABONO = 0.35;

	const conApi = integracion !== "sin_api";
	const api = b2b2cApiTiers.slice().reverse().find(function (t) { return (Number(fee) || 0) >= t.feeMin; }) || b2b2cApiTiers[0];
	const sla = slaPlans.find(function (s) { return s.id === slaId; }) || slaPlans[0];
	const idc = Math.max(0, Number(idcMensuales) || 0);
	const seg = getB2B2CSegment(idc || b2b2cSegments[0].idcMin, b2b2cSegments);
	const hasVolume = idc > 0;

	useEffect(function () {
		if (!pendingEdit) return;
		const i = pendingEdit.inputs || {};
		if (pendingEdit.client_id) {
			const live = (clientsApi?.clients || []).find(function (c) { return c.id === pendingEdit.client_id; });
			setSelectedClient(live || pendingEdit.clients || null);
		} else if (pendingEdit.clients) {
			setSelectedClient(pendingEdit.clients);
		}
		setIntegracion(i.integracion || "api");
		setIdcMensuales(i.idcMensuales || "");
		setFee(i.fee != null ? i.fee : 3250);
		setSlaId(i.slaId || "standard");
		setSlaBonificado(i.slaBonificado || false);
		setFirmasInclPorIDC(i.firmasInclPorIDC != null ? i.firmasInclPorIDC : 4);
		setFirmasAdicPorIDC(i.firmasAdicPorIDC || 0);
		setPrecioFirmaAdic(i.precioFirmaAdic != null ? i.precioFirmaAdic : 0.5);
		setCasosDeUso(i.casosDeUso || "");
		setAbono(i.abono || false);
		if (i.overrideMode) {
			setOverrideMode(i.overrideMode);
			setShowOverrides(true);
			if (i.overrideMode === "bundle") { setOverridePrecioIDC(i.overridePrecioIDC != null ? String(i.overridePrecioIDC) : ""); }
			if (i.overrideMode === "componente") { setOverridePrecioCert(i.overridePrecioCert != null ? String(i.overridePrecioCert) : ""); setOverridePrecioFirma(i.overridePrecioFirma != null ? String(i.overridePrecioFirma) : ""); }
			if (i.overrideMode === "margen") { setOverrideMargenPct(i.overrideMargenPct != null ? String(i.overrideMargenPct) : ""); }
		} else if (i.overridePrecioIDC != null) {
			setOverrideMode("bundle");
			setOverridePrecioIDC(String(i.overridePrecioIDC));
			setShowOverrides(true);
		} else {
			setOverrideMode(null);
			setOverridePrecioIDC(""); setOverridePrecioCert(""); setOverridePrecioFirma(""); setOverrideMargenPct("");
		}
		setEditingId(pendingEdit.id);
		setSaved(null);
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	const incl = Math.max(0, Number(firmasInclPorIDC) || 0);
	const adic = Math.max(0, Number(firmasAdicPorIDC) || 0);
	const firmasPorIDC = incl + adic;

	const costoIDC = cvCert + incl * cvFirma;

	// precioIDC = solo el certificado. precioFirmaLista = precio unitario de cada
	// firma (incluidas y adicionales). El precio del IDC en el mes 1 se compone de
	// certificado + firmas incluidas a precio de lista. Cada modo de ajuste mantiene
	// esa separación: el certificado y la firma nunca se mezclan en un mismo valor.
	const precioFirmaBase = Math.max(0, Number(precioFirmaAdic) || 0);

	let precioIDC;        // certificado, sin firmas
	let precioFirmaLista; // precio unitario de firma (incl. + adic.)

	if (overrideMode === "bundle" && overridePrecioIDC !== "") {
		precioIDC = Math.max(0, Number(overridePrecioIDC) || 0);
		precioFirmaLista = precioFirmaBase;
	} else if (overrideMode === "componente") {
		precioIDC = overridePrecioCert !== "" ? Math.max(0, Number(overridePrecioCert) || 0) : cvCert;
		precioFirmaLista = overridePrecioFirma !== "" ? Math.max(0, Number(overridePrecioFirma) || 0) : cvFirma;
	} else if (overrideMode === "margen" && overrideMargenPct !== "") {
		const m = (Number(overrideMargenPct) || 0) / 100;
		const mes1Objetivo = m < 1 && m > 0 ? costoIDC / (1 - m) : costoIDC;
		precioFirmaLista = precioFirmaBase;
		precioIDC = Math.max(0, mes1Objetivo - incl * precioFirmaLista);
	} else {
		precioIDC = seg.precioIDC;
		precioFirmaLista = precioFirmaBase;
	}

	const precioIDCmes1 = precioIDC + incl * precioFirmaLista;
	// Alias para las etiquetas del panel de ajuste ("Precio IDC resultante").
	const effPrecioIDC = precioIDCmes1;
	const margenIDC = precioIDCmes1 - costoIDC;
	const margenPctIDC = precioIDCmes1 > 0 ? margenIDC / precioIDCmes1 : 0;

	const firmasTotales = idc * firmasPorIDC;
	const firmasAdicTotal = idc * adic;
	const firmasInclTotal = idc * incl;

	// Mes 1 (activación): certificados + bolsa inicial de firmas incluidas + firmas
	// adicionales, todo a precio de lista. El 35% de descuento aplica recién al abono.
	const revIDC = idc * precioIDC;
	const revFirmasIncl = firmasInclTotal * precioFirmaLista;
	const revFirmasAdic = firmasAdicTotal * precioFirmaLista;
	const costoCert = idc * cvCert;
	const costoFirmas = firmasTotales * cvFirma;
	const costoTotal = costoCert + costoFirmas;
	const feeAplicado = conApi ? Math.max(0, Number(fee) || 0) : 0;
	const slaMes = conApi && !slaBonificado ? (sla.precioMes || 0) : 0;
	const revSinFee = revIDC + revFirmasIncl + revFirmasAdic + slaMes;
	const revTotal = revSinFee + feeAplicado;
	const revServicio = revIDC + revFirmasIncl + revFirmasAdic;
	const margen = revServicio - costoTotal;
	const margenPct = revServicio > 0 ? margen / revServicio : 0;

	const precioFirmaAbono = Math.max(0, Number(precioFirmaAdic) || 0) * (1 - DESCUENTO_ABONO);
	const revAbonoMes = firmasInclTotal * precioFirmaAbono;
	const revAbonoAnual = revAbonoMes * 12;

	// Objeto deal compartido por guardar y exportar (así "Exportar" funciona con o sin guardar).
	function buildDeal(id, fecha) {
		return {
			id: id,
			channel: "b2b2c",
			fecha: fecha,
			updatedAt: editingId ? new Date().toISOString() : undefined,
			inputs: {
				integracion, idcMensuales: idc,
				...(conApi ? { fee, slaId, slaBonificado } : {}),
				firmasInclPorIDC: incl, firmasAdicPorIDC: adic, precioFirmaAdic, casosDeUso, abono,
				...(overrideMode ? {
					overrideMode,
					...(overrideMode === "bundle" && overridePrecioIDC !== "" ? { overridePrecioIDC: Number(overridePrecioIDC) } : {}),
					...(overrideMode === "componente" ? {
						...(overridePrecioCert !== "" ? { overridePrecioCert: Number(overridePrecioCert) } : {}),
						...(overridePrecioFirma !== "" ? { overridePrecioFirma: Number(overridePrecioFirma) } : {}),
					} : {}),
					...(overrideMode === "margen" && overrideMargenPct !== "" ? { overrideMargenPct: Number(overrideMargenPct) } : {}),
				} : {}),
			},
			resumen: {
				segmento: seg.label, idcMensuales: idc, firmasTotales, firmasMes: firmasTotales, precioIDC,
				revTotal, revMesTotal: revSinFee, revAnual: revSinFee * 12 + feeAplicado,
				margen, margenPct,
				...(abono ? { revAbonoMes, revAbonoAnual } : {}),
			},
		};
	}

	async function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? dealsApi.deals.find(function (d) { return d.id === editingId; }) : null;

		let client = selectedClient;
		if (!client && clientsApi) {
			client = await clientsApi.create("(sin nombre)", "b2b2c");
			setSelectedClient(client);
		}

		const deal = buildDeal(editingId || Date.now().toString(36), prev ? prev.fecha : now);
		if (prev?.resumen?.status) deal.resumen.status = prev.resumen.status;

		await dealsApi.save(deal, client?.id || null);

		setEditingId(null);
		setFlash(true);
		setSaved({ deal, client });
		setTimeout(function () { setFlash(false); }, 1500);

		notifyQuoteSaved(toast, {
			clientName: client?.name,
			onExport: function () { onExport && onExport(deal, client); },
			onGoHistorial: function () { onGoHistorial && onGoHistorial(deal.id); },
		});
	}

	function exportNow() {
		const now = new Date().toISOString();
		const src = saved ? saved.deal : buildDeal(editingId || "preview", now);
		onExport && onExport(src, saved ? saved.client : selectedClient);
	}

	return (
		<div className="space-y-6">
			<PageHeader
				title={CHANNELS.b2b2c.full}
				description={CHANNELS.b2b2c.desc + " Las firmas incluidas por IDC son configurables (firma inicial + activación, según la institución)."}
			/>

			{/* ── Inputs ── */}
			<Card className="bg-card border-border">
				<CardHeader className="pb-3">
					<CardTitle className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">Datos de la cotización</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5">
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">
							Cliente
							{editingId && <span className="ml-1.5 text-[var(--success)] font-semibold normal-case tracking-normal">· editando</span>}
						</Label>
						<ClientSelector channel="b2b2c" clients={clientsApi?.clients || []} onCreate={clientsApi?.create} value={selectedClient} onChange={setSelectedClient} />
					</div>

					<Separator />

					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Modalidad de integración</Label>
						<div className="flex gap-1 flex-wrap">
							{[
								{ id: "api", label: "Con integración API", sub: "fee de implementación + SLA" },
								{ id: "sin_api", label: "Sin integración", sub: "solo volumen solicitado" },
							].map(function (m) {
								const active = integracion === m.id;
								return (
									<button key={m.id} onClick={function () { setIntegracion(m.id); }} className={"px-3 py-1.5 rounded-md text-xs transition-colors text-left " + (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
										<span className="font-medium">{m.label}</span>
										<span className={"ml-1.5 " + (active ? "opacity-75" : "opacity-60")}>· {m.sub}</span>
									</button>
								);
							})}
						</div>
						{!conApi && <p className="text-[11px] text-muted-foreground">Sin integración API: se cotiza únicamente el volumen de IDC, sin fee de implementación ni plan de soporte.</p>}
					</div>

					<Separator />

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<NumberField label="Cantidad de IDC" value={idcMensuales} onChange={setIdcMensuales} min={0} placeholder="Ej: 5.000" />
						{conApi && (
							<NumberField label="Fee de implementación" value={fee} onChange={setFee} prefix="USD" min={0} note={api.label + " · rango USD " + api.feeMin.toLocaleString("es-AR") + "–" + api.feeMax.toLocaleString("es-AR")} />
						)}
						{conApi && (
							<div className="flex flex-col gap-1.5">
								<SelectField label="Plan de soporte / SLA" value={slaId} onValueChange={setSlaId}
									options={slaPlans.map(function (s) { return { value: s.id, label: s.label + (s.precioMes ? " · USD " + s.precioMes.toLocaleString("es-AR") + "/mes" : (s.precioMes === 0 ? " · incluido" : " · a medida")) }; })} note={sla.desc} />
								{sla.precioMes > 0 && (
									<label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
										<input type="checkbox" checked={slaBonificado} onChange={function (e) { setSlaBonificado(e.target.checked); }} className="rounded" />
										Bonificar SLA para este cliente
										{slaBonificado && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)] border-[var(--success)]">bonificado</Badge>}
									</label>
								)}
							</div>
						)}
						<NumberField label="Firmas incluidas por IDC" value={firmasInclPorIDC} onChange={setFirmasInclPorIDC} min={0} note="Firma inicial + activación (editable)" />
						<NumberField label="Firmas adicionales por IDC" value={firmasAdicPorIDC} onChange={setFirmasAdicPorIDC} min={0} note="Se cobran aparte" />
						<NumberField label="Precio firma adicional" value={precioFirmaAdic} onChange={setPrecioFirmaAdic} prefix="USD" min={0} />
					</div>

					<Separator />

					{/* Abono mensual */}
					<div className="flex flex-col gap-3">
						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<input type="checkbox" checked={abono} onChange={function (e) { setAbono(e.target.checked); }} className="rounded" />
							<span className="text-sm font-medium">Incluir abono mensual de firmas</span>
							{abono && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activo</Badge>}
						</label>
						{abono && hasVolume && (
							<div className="pl-6 border-l-2 border-muted ml-1 text-sm text-muted-foreground space-y-1">
								<p>Repone la bolsa de firmas incluidas por IDC con un descuento del {(DESCUENTO_ABONO * 100).toFixed(0)}% sobre el precio de firma adicional.</p>
								<p className="text-xs">{firmasInclTotal.toLocaleString("es-AR")} firmas ({idc.toLocaleString("es-AR")} IDC × {incl} firmas incl.) × USD {precioFirmaAbono.toFixed(3)}/firma = <span className="font-semibold text-foreground">{fMoney(revAbonoMes)}/mes</span></p>
							</div>
						)}
					</div>

					<Separator />

					{/* Ajuste de precios personalizado */}
					<div className="flex flex-col gap-2">
						<button onClick={function () { setShowOverrides(function (v) { return !v; }); }} className="flex items-center gap-2 text-sm font-medium border border-dashed border-border rounded-md px-3 py-2 hover:bg-muted/50 transition-colors w-full text-left">
							<span>Ajuste de precios personalizado</span>
							<span className="ml-auto text-muted-foreground text-xs">{showOverrides ? "▲ ocultar" : "▼ mostrar"}</span>
							{overrideMode && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)]">activo</Badge>}
						</button>
						{showOverrides && (
							<div className="pl-1 border-l-2 border-muted ml-1 space-y-3">
								<div className="flex gap-1 flex-wrap">
									{[
										{ id: null, label: "Sin ajuste" },
										{ id: "bundle", label: "Precio bundle" },
										{ id: "componente", label: "Por componente" },
										{ id: "margen", label: "Margen objetivo" },
									].map(function (m) {
										const active = overrideMode === m.id;
										return (
											<button key={m.id ?? "none"} onClick={function () { setOverrideMode(m.id); }} className={"px-2.5 py-1 rounded-md text-xs transition-colors " + (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{m.label}</button>
										);
									})}
								</div>
								{overrideMode === "bundle" && (
									<div className="flex flex-col gap-1.5 max-w-xs">
										<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio IDC <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
										<div className="flex items-center gap-1.5">
											<Input type="number" value={overridePrecioIDC} onChange={function (e) { setOverridePrecioIDC(e.target.value); }} placeholder={"Tabla: " + seg.precioIDC} className="h-8 text-sm" />
											{overridePrecioIDC !== "" && <button onClick={function () { setOverridePrecioIDC(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
										</div>
										<p className="text-[10px] text-muted-foreground">Reemplaza el precio de tabla para esta cotización.</p>
									</div>
								)}
								{overrideMode === "componente" && (
									<div className="space-y-2">
										<div className="grid grid-cols-2 gap-3 max-w-sm">
											<div className="flex flex-col gap-1.5">
												<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio cert. <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
												<div className="flex items-center gap-1">
													<Input type="number" value={overridePrecioCert} onChange={function (e) { setOverridePrecioCert(e.target.value); }} placeholder={cvCert.toFixed(4)} className="h-8 text-sm" />
													{overridePrecioCert !== "" && <button onClick={function () { setOverridePrecioCert(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
												</div>
											</div>
											<div className="flex flex-col gap-1.5">
												<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio firma incl. <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
												<div className="flex items-center gap-1">
													<Input type="number" value={overridePrecioFirma} onChange={function (e) { setOverridePrecioFirma(e.target.value); }} placeholder={cvFirma.toFixed(4)} className="h-8 text-sm" />
													{overridePrecioFirma !== "" && <button onClick={function () { setOverridePrecioFirma(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
												</div>
											</div>
										</div>
										<p className="text-[10px] text-muted-foreground">Precio IDC resultante = cert + {incl} firma{incl !== 1 ? "s" : ""} = <span className="font-semibold text-foreground">USD {effPrecioIDC.toFixed(4)}</span></p>
									</div>
								)}
								{overrideMode === "margen" && (
									<div className="flex flex-col gap-1.5 max-w-xs">
										<Label className="text-xs text-muted-foreground uppercase tracking-wide">Margen objetivo <span className="normal-case tracking-normal font-normal">(%)</span></Label>
										<div className="flex items-center gap-1.5">
											<Input type="number" value={overrideMargenPct} onChange={function (e) { setOverrideMargenPct(e.target.value); }} placeholder="Ej: 75" min="0" max="99" className="h-8 text-sm" />
											{overrideMargenPct !== "" && <button onClick={function () { setOverrideMargenPct(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
										</div>
										{overrideMargenPct !== "" && <p className="text-[10px] text-muted-foreground">Precio IDC = costo / (1 − {overrideMargenPct}%) = <span className="font-semibold text-foreground">USD {effPrecioIDC.toFixed(4)}</span></p>}
									</div>
								)}
								{!overrideMode && <p className="text-[10px] text-muted-foreground">Seleccioná un modo para aplicar un ajuste de precio a esta cotización.</p>}
							</div>
						)}
					</div>

					<Separator />

					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Casos de uso <span className="normal-case tracking-normal font-normal">(para propuesta comercial)</span></Label>
						<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: recibos de haberes, contratos de RRHH, acuerdos comerciales..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
					</div>
				</CardContent>
			</Card>

			{/* ── Resultado (comercial) ── */}
			{hasVolume ? (
				<div className="flex flex-wrap gap-3">
					<StatCard label="Segmento" value={seg.label} sub={seg.idcMin.toLocaleString("es-AR") + "–" + (seg.idcMax == null ? "+" : seg.idcMax.toLocaleString("es-AR")) + " IDC"} accent="primary" />
					<StatCard label="Precio por IDC (mes 1)" value={fMoney2(precioIDCmes1)} sub={"cert " + fMoney2(precioIDC) + " + " + incl + " firma" + (incl !== 1 ? "s" : "") + (overrideMode ? " · personalizado" : "")} accent="primary" />
					<StatCard label="Total firmas" value={firmasTotales.toLocaleString("es-AR")} sub={idc.toLocaleString("es-AR") + " IDC × " + firmasPorIDC + " firmas"} accent="muted" />
					<StatCard label="Revenue total" value={fMoney(revTotal)} sub={conApi ? "IDC + firmas + SLA · fee " + fMoney(feeAplicado) + " incluido" : "IDC + firmas · sin integración API"} accent="success" />
					{abono && (
						<>
							<StatCard label="Abono mensual (firmas)" value={fMoney(revAbonoMes)} sub={"Renovación " + firmasInclTotal.toLocaleString("es-AR") + " firmas · −" + (DESCUENTO_ABONO * 100).toFixed(0) + "%"} accent="success" />
							<StatCard label="Facturación abono anual" value={fMoney(revAbonoAnual)} sub="Abono × 12 meses" accent="success" />
						</>
					)}
				</div>
			) : (
				<Card><CardContent className="py-8 text-center">
					<p className="text-sm text-muted-foreground">Ingresá la cantidad de IDC para ver el precio y el revenue de la cotización.</p>
				</CardContent></Card>
			)}

			{/* ── Rentabilidad (interno) ── */}
			{hasVolume && (
				<CollapsibleSection tone="internal" title="Rentabilidad · uso interno" subtitle="Costo variable, contribución marginal y break-even. No aparece en la propuesta del cliente.">
					<div className="flex flex-wrap gap-3 mb-4">
						<StatCard label="Cont. marginal por IDC" value={(margenPctIDC * 100).toFixed(0) + "%"} sub={fMoney2(margenIDC) + "/IDC · costo " + fMoney2(costoIDC)} accent={margAccent(margenPctIDC)} valueClass={margClass(margenPctIDC)} />
						<StatCard label="Contribución marginal total" value={fMoney(margen)} sub={"sobre revenue de servicio"} accent={margen >= 0 ? "success" : "destructive"} valueClass={margen >= 0 ? "text-[var(--success)]" : "text-destructive"} />
					</div>
					<Table>
						<TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
						<TableBody>
							<TableRow><TableCell>Ingreso certificados ({idc.toLocaleString("es-AR")} × {fMoney2(precioIDC)})</TableCell><TableCell className="text-right tabular-nums">{fMoney(revIDC)}</TableCell></TableRow>
							<TableRow><TableCell>Ingreso firmas incluidas ({firmasInclTotal.toLocaleString("es-AR")} × {fMoney2(precioFirmaLista)} · mes 1)</TableCell><TableCell className="text-right tabular-nums">{revFirmasIncl ? fMoney(revFirmasIncl) : "—"}</TableCell></TableRow>
							<TableRow><TableCell>Ingreso firmas adicionales ({firmasAdicTotal.toLocaleString("es-AR")})</TableCell><TableCell className="text-right tabular-nums">{revFirmasAdic ? fMoney(revFirmasAdic) : "—"}</TableCell></TableRow>
							<TableRow><TableCell>Costo certificados</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoCert)}</TableCell></TableRow>
							<TableRow><TableCell>Costo firmas ({firmasTotales.toLocaleString("es-AR")})</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoFirmas)}</TableCell></TableRow>
							{conApi && <TableRow><TableCell>Soporte / SLA ({sla.label})</TableCell><TableCell className="text-right tabular-nums">{slaMes ? fMoney(slaMes) : "incluido"}</TableCell></TableRow>}
							{conApi && <TableRow><TableCell>Fee de implementación</TableCell><TableCell className="text-right tabular-nums">{fMoney(feeAplicado)}</TableCell></TableRow>}
							<TableRow className={margen >= 0 ? "bg-success/5" : "bg-destructive/5"}>
								<TableCell className={"font-semibold " + (margen >= 0 ? "text-[var(--success)]" : "text-destructive")}>Contribución marginal</TableCell>
								<TableCell className={"text-right tabular-nums font-semibold " + (margen >= 0 ? "text-[var(--success)]" : "text-destructive")}>{fMoney(margen)} ({(margenPct * 100).toFixed(0)}%)</TableCell>
							</TableRow>
						</TableBody>
					</Table>
					<p className="text-[11px] text-muted-foreground mt-3">CV/IDC = cert USD {cvCert.toFixed(4)} + {incl} firma{incl !== 1 ? "s" : ""} × USD {cvFirma.toFixed(4)} = USD {costoIDC.toFixed(4)}. Precio IDC mes 1 = cert + {incl} firma{incl !== 1 ? "s" : ""} a precio de lista = USD {precioIDCmes1.toFixed(4)}. CM = Precio − CV (sin CF).{overrideMode ? " ⚠ Precio personalizado activo (" + overrideMode + ")." : ""}</p>
				</CollapsibleSection>
			)}

			{/* ── Referencia ── */}
			<CollapsibleSection title="Referencia · precios por segmento, API y SLA" subtitle="Tabla completa del modelo de volumen (Borrador v5).">
				<TabCanalB2B2CPrecios costs={costs} />
			</CollapsibleSection>

			<SaveExportBar
				hint={hasVolume ? "" : "Ingresá la cantidad de IDC para guardar o exportar."}
				canSave={hasVolume}
				canExport={hasVolume}
				onSave={saveQuote}
				onExport={exportNow}
				onCancelEdit={function () { setEditingId(null); }}
				editingId={editingId}
				flash={flash}
			/>
		</div>
	);
}
