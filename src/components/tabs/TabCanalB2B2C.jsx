import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { makeMoney } from "@/utils/useMoney";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NumberField, SelectField, StatCard } from "@/components/ui/field";
import { ClientSelector } from "@/components/ui/ClientSelector";

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }
function margAccent(pct) { return pct >= 0.5 ? "success" : pct >= 0.2 ? "warning" : "destructive"; }

function getB2B2CSegmentLocal(idcMensuales, segments) {
	return segments.find(function (s) {
		return idcMensuales >= s.idcMin && (s.idcMax === null || idcMensuales <= s.idcMax);
	}) || segments[0];
}

export function TabCanalB2B2C({ costs, currency, tc, dealsApi, clientsApi, pendingEdit, onConsumeEdit }) {
	const { channelConfig } = useChannelConfig();
	const b2b2cSegments = channelConfig.b2b2cSegments;
	const b2b2cApiTiers = channelConfig.b2b2cApiTiers;
	const slaPlans = channelConfig.slaPlans;
	const costoIdcRef = channelConfig.costoIdcRef;
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	const [selectedClient, setSelectedClient] = useState(null);
	const [frecuencia, setFrecuencia] = useState("mensual");
	const [idcMensuales, setIdcMensuales] = useState(5500);
	const [fee, setFee] = useState(3250);
	const [slaId, setSlaId] = useState("standard");
	const [slaBonificado, setSlaBonificado] = useState(false);
	const [firmasInclPorIDC, setFirmasInclPorIDC] = useState(4);
	const [firmasAdicPorIDC, setFirmasAdicPorIDC] = useState(0);
	const [precioFirmaAdic, setPrecioFirmaAdic] = useState(0.5);
	const [casosDeUso, setCasosDeUso] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [flash, setFlash] = useState(false);
	const [showOverrides, setShowOverrides] = useState(false);
	const [overridePrecioIDC, setOverridePrecioIDC] = useState("");
	const [overrideCvCert, setOverrideCvCert] = useState("");
	const [overrideCvFirma, setOverrideCvFirma] = useState("");

	const esUnica = frecuencia === "unica";

	const api = b2b2cApiTiers.slice().reverse().find(function (t) { return (Number(fee) || 0) >= t.feeMin; }) || b2b2cApiTiers[0];
	const sla = slaPlans.find(function (s) { return s.id === slaId; }) || slaPlans[0];
	const seg = getB2B2CSegmentLocal(idcMensuales, b2b2cSegments);

	useEffect(function () {
		if (!pendingEdit) return;
		const i = pendingEdit.inputs || {};
		if (pendingEdit.clients) setSelectedClient(pendingEdit.clients);
		setFrecuencia(i.frecuencia || "mensual");
		setIdcMensuales(i.idcMensuales || 0);
		setFee(i.fee != null ? i.fee : 3250);
		setSlaId(i.slaId || "standard");
		setSlaBonificado(i.slaBonificado || false);
		setFirmasInclPorIDC(i.firmasInclPorIDC != null ? i.firmasInclPorIDC : 4);
		setFirmasAdicPorIDC(i.firmasAdicPorIDC || 0);
		setPrecioFirmaAdic(i.precioFirmaAdic != null ? i.precioFirmaAdic : 0.5);
		setCasosDeUso(i.casosDeUso || "");
		if (i.overridePrecioIDC != null) { setOverridePrecioIDC(String(i.overridePrecioIDC)); setShowOverrides(true); } else { setOverridePrecioIDC(""); }
		if (i.overrideCvCert != null) { setOverrideCvCert(String(i.overrideCvCert)); setShowOverrides(true); } else { setOverrideCvCert(""); }
		if (i.overrideCvFirma != null) { setOverrideCvFirma(String(i.overrideCvFirma)); setShowOverrides(true); } else { setOverrideCvFirma(""); }
		setEditingId(pendingEdit.id);
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	const incl = Number(firmasInclPorIDC) || 0;
	const adic = Number(firmasAdicPorIDC) || 0;
	const firmasPorIDC = incl + adic;

	const effCvCert = overrideCvCert !== "" ? (Number(overrideCvCert) || 0) : cvCert;
	const effCvFirma = overrideCvFirma !== "" ? (Number(overrideCvFirma) || 0) : cvFirma;
	const effPrecioIDC = overridePrecioIDC !== "" ? (Number(overridePrecioIDC) || 0) : seg.precioIDC;

	const costoIDC = effCvCert + incl * effCvFirma;
	const precioIDC = effPrecioIDC;
	const margenIDC = precioIDC - costoIDC;
	const margenPctIDC = precioIDC > 0 ? margenIDC / precioIDC : 0;

	const firmasMes = idcMensuales * firmasPorIDC;
	const firmasAdicMes = idcMensuales * adic;

	const revIDCmes = idcMensuales * precioIDC;
	const revFirmasMes = firmasAdicMes * (Number(precioFirmaAdic) || 0);
	const costoCertMes = idcMensuales * effCvCert;
	const costoFirmasMes = firmasMes * effCvFirma;
	const costoMes = costoCertMes + costoFirmasMes;
	const slaMes = slaBonificado ? 0 : (sla.precioMes || 0);
	const revMesTotal = revIDCmes + revFirmasMes + slaMes;
	const margenMes = revIDCmes + revFirmasMes - costoMes;
	const margenPct = revIDCmes + revFirmasMes > 0 ? margenMes / (revIDCmes + revFirmasMes) : 0;
	const revAnual = revMesTotal * 12 + fee;

	// Única vez: IDC = cantidad total, sin proyección mensual
	const revUnica = revIDCmes + revFirmasMes + fee + (sla.precioMes || 0);
	const costoUnica = costoMes;
	const margenUnica = margenMes;

	async function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? dealsApi.deals.find(function (d) { return d.id === editingId; }) : null;

		let client = selectedClient;
		if (!client && clientsApi) {
			client = await clientsApi.create("(sin nombre)", "b2b2c");
			setSelectedClient(client);
		}

		await dealsApi.save({
			id: editingId || Date.now().toString(36),
			channel: "b2b2c",
			fecha: prev ? prev.fecha : now,
			updatedAt: editingId ? now : undefined,
			inputs: { frecuencia, idcMensuales, fee, slaId, slaBonificado,
			firmasInclPorIDC, firmasAdicPorIDC, precioFirmaAdic, casosDeUso,
			...(overridePrecioIDC !== "" ? { overridePrecioIDC: Number(overridePrecioIDC) } : {}),
			...(overrideCvCert !== "" ? { overrideCvCert: Number(overrideCvCert) } : {}),
			...(overrideCvFirma !== "" ? { overrideCvFirma: Number(overrideCvFirma) } : {}),
		},
			resumen: { segmento: seg.label, frecuencia, idcMensuales, firmasMes, precioIDC, revMesTotal: esUnica ? revUnica : revMesTotal, revAnual: esUnica ? revUnica : revAnual, margenMes: esUnica ? margenUnica : margenMes, margenPct },
		}, client?.id || null);

		setEditingId(null);
		setFlash(true);
		setTimeout(function () { setFlash(false); }, 1500);
	}

	const beClientesMes = margenMes > 0 ? Math.ceil(costs.cfDirecto / margenMes) : null;
	const beClientesUnica = margenUnica > 0 ? Math.ceil(costs.cfDirecto / margenUnica) : null;

	return (
		<div className="space-y-6">

			{/* Card principal de cotización */}
			<Card className="bg-card border-border">
				<CardHeader className="pb-3">
					<div className="flex items-center justify-between gap-4 flex-wrap">
						<CardTitle className="font-heading text-base font-semibold">Canal B2B2C · Identidades Digitales Certificadas</CardTitle>
						<div className="flex items-center gap-1 rounded-md border border-border bg-muted p-0.5 text-xs">
							<button onClick={function () { setFrecuencia("mensual"); }} className={"px-3 py-1 rounded transition-colors " + (frecuencia === "mensual" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground")}>Recurrente mensual</button>
							<button onClick={function () { setFrecuencia("unica"); }} className={"px-3 py-1 rounded transition-colors " + (frecuencia === "unica" ? "bg-background text-foreground shadow-sm font-semibold" : "text-muted-foreground hover:text-foreground")}>Única vez</button>
						</div>
					</div>
					<p className="text-sm text-muted-foreground">
						{esUnica
							? "Cotización de compra única de IDC (no recurrente). El cliente adquiere un lote fijo sin compromiso mensual."
							: "Empresas que integran los servicios de confianza en sus propios productos. La unidad es el IDC. Las firmas incluidas por IDC son configurables (firma inicial + activación, según lo que requiera la institución)."}
					</p>
				</CardHeader>
				<CardContent className="space-y-5">
					{/* Cliente */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">
							Cliente
							{editingId && <span className="ml-1.5 text-[var(--success)] font-semibold normal-case tracking-normal">· editando</span>}
						</Label>
						<ClientSelector
							channel="b2b2c"
							clients={clientsApi?.clients || []}
							onCreate={clientsApi?.create}
							value={selectedClient}
							onChange={setSelectedClient}
						/>
					</div>

					<Separator />

					{/* Parámetros */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<NumberField label={esUnica ? "Total IDC (única vez)" : "IDC nuevas por mes"} value={idcMensuales} onChange={setIdcMensuales} note={esUnica ? "Cantidad total del lote" : undefined} />
						<div className="flex flex-col gap-1.5">
							<NumberField label="Fee de implementación" value={fee} onChange={setFee} prefix="USD" note={api.label + " · rango USD " + api.feeMin.toLocaleString("es-AR") + "–" + api.feeMax.toLocaleString("es-AR")} />
						</div>
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
						<NumberField label="Firmas incluidas por IDC" value={firmasInclPorIDC} onChange={setFirmasInclPorIDC} note="Firma inicial + activación (editable)" />
						<NumberField label="Firmas adicionales por IDC / mes" value={firmasAdicPorIDC} onChange={setFirmasAdicPorIDC} note="Se cobran aparte" />
						<NumberField label="Precio firma adicional" value={precioFirmaAdic} onChange={setPrecioFirmaAdic} prefix="USD" />
					</div>

					<Separator />

					{/* Ajuste de precios personalizado */}
					<div className="flex flex-col gap-2">
						<button onClick={function () { setShowOverrides(function (v) { return !v; }); }} className="flex items-center gap-2 text-sm font-medium border border-dashed border-border rounded-md px-3 py-2 hover:bg-muted/50 transition-colors w-full text-left">
							<span>Ajuste de precios personalizado</span>
							<span className="text-xs text-muted-foreground">(precio IDC, costo cert, costo firma)</span>
							<span className="ml-auto text-muted-foreground text-xs">{showOverrides ? "▲ ocultar" : "▼ mostrar"}</span>
							{(overridePrecioIDC !== "" || overrideCvCert !== "" || overrideCvFirma !== "") && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)]">activo</Badge>}
						</button>
						{showOverrides && (
							<div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pl-1 border-l-2 border-muted ml-1">
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio IDC <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
									<div className="flex items-center gap-1.5">
										<Input type="number" value={overridePrecioIDC} onChange={function (e) { setOverridePrecioIDC(e.target.value); }} placeholder={"Tabla: " + seg.precioIDC} className="h-8 text-sm" />
										{overridePrecioIDC !== "" && <button onClick={function () { setOverridePrecioIDC(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
									</div>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Costo certificado <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
									<div className="flex items-center gap-1.5">
										<Input type="number" value={overrideCvCert} onChange={function (e) { setOverrideCvCert(e.target.value); }} placeholder={"Base: " + cvCert.toFixed(4)} className="h-8 text-sm" />
										{overrideCvCert !== "" && <button onClick={function () { setOverrideCvCert(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
									</div>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Costo firma <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
									<div className="flex items-center gap-1.5">
										<Input type="number" value={overrideCvFirma} onChange={function (e) { setOverrideCvFirma(e.target.value); }} placeholder={"Base: " + cvFirma.toFixed(4)} className="h-8 text-sm" />
										{overrideCvFirma !== "" && <button onClick={function () { setOverrideCvFirma(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
									</div>
								</div>
								<p className="text-[10px] text-muted-foreground col-span-full">Dejá en blanco para usar los valores globales. Los cambios aplican solo a esta cotización.</p>
							</div>
						)}
					</div>

					<Separator />

					{/* Casos de uso para propuesta */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Casos de uso <span className="normal-case tracking-normal font-normal">(para propuesta comercial)</span></Label>
						<textarea
							value={casosDeUso}
							onChange={function (e) { setCasosDeUso(e.target.value); }}
							rows={2}
							placeholder="Ej: recibos de haberes, contratos de RRHH, acuerdos comerciales..."
							className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground"
						/>
					</div>

					<Separator />

					{/* Guardar — al final */}
					<div className="flex justify-end gap-2">
						{editingId && <Button variant="outline" onClick={function () { setEditingId(null); }}>Cancelar</Button>}
						<Button onClick={saveQuote} disabled={idcMensuales <= 0} className={flash ? "bg-[var(--success)] hover:bg-[var(--success)]" : ""}>
							{flash ? <><Check className="size-4" /> Guardada</> : editingId ? "Actualizar cotización" : "Guardar cotización"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* KPIs */}
			<div className="flex flex-wrap gap-3">
				<StatCard label="Segmento" value={seg.label} sub={seg.idcMin.toLocaleString("es-AR") + "–" + (seg.idcMax == null ? "+" : seg.idcMax.toLocaleString("es-AR")) + " IDC" + (esUnica ? "" : "/mes")} accent="primary" />
				<StatCard label="Precio por IDC" value={fMoney2(precioIDC)} sub={"Costo " + fMoney2(costoIDC)} accent="primary" />
				<StatCard label="Cont. marginal por IDC" value={(margenPctIDC * 100).toFixed(0) + "%"} sub={fMoney2(margenIDC) + "/IDC"} accent={margAccent(margenPctIDC)} valueClass={margClass(margenPctIDC)} />
				<StatCard label="Total firmas" value={firmasMes.toLocaleString("es-AR")} sub={idcMensuales.toLocaleString("es-AR") + " IDC × " + firmasPorIDC + " firmas"} accent="muted" />
				{esUnica
					? <StatCard label="Revenue total (única vez)" value={fMoney(revUnica)} sub={"IDC + firmas + fee + SLA"} accent="success" />
					: <>
						<StatCard label="Revenue mensual" value={fMoney(revMesTotal)} sub={"+ fee " + fMoney(fee) + " única vez"} accent="success" />
						<StatCard label="Revenue año 1" value={fMoney(revAnual)} sub="IDC+firmas+SLA ×12 + fee" accent="success" />
					</>
				}
			</div>

			{/* Desglose */}
			<Card>
				<CardContent>
					{esUnica ? (
					<Table>
						<TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">Total (única vez)</TableHead></TableRow></TableHeader>
						<TableBody>
							<TableRow><TableCell>Ingreso por IDC ({idcMensuales.toLocaleString("es-AR")} × {fMoney2(precioIDC)})</TableCell><TableCell className="text-right tabular-nums">{fMoney(revIDCmes)}</TableCell></TableRow>
							<TableRow><TableCell>Ingreso firmas adicionales ({firmasAdicMes.toLocaleString("es-AR")})</TableCell><TableCell className="text-right tabular-nums">{revFirmasMes ? fMoney(revFirmasMes) : "—"}</TableCell></TableRow>
							<TableRow><TableCell>Costo certificados</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoCertMes)}</TableCell></TableRow>
							<TableRow><TableCell>Costo firmas ({firmasMes.toLocaleString("es-AR")})</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoFirmasMes)}</TableCell></TableRow>
							<TableRow><TableCell>Soporte / SLA ({sla.label})</TableCell><TableCell className="text-right tabular-nums">{slaMes ? fMoney(slaMes) : "incluido"}</TableCell></TableRow>
							<TableRow><TableCell>Fee de implementación</TableCell><TableCell className="text-right tabular-nums">{fMoney(fee)}</TableCell></TableRow>
							<TableRow className={margenUnica >= 0 ? "bg-success/5" : "bg-destructive/5"}><TableCell className={"font-semibold " + (margenUnica >= 0 ? "text-[var(--success)]" : "text-destructive")}>Contribución marginal</TableCell><TableCell className={"text-right tabular-nums font-semibold " + (margenUnica >= 0 ? "text-[var(--success)]" : "text-destructive")}>{fMoney(margenUnica)}</TableCell></TableRow>
											<TableRow className="bg-muted/30"><TableCell className="font-semibold text-muted-foreground">Clientes p/cubrir CF mensual</TableCell><TableCell className="text-right tabular-nums text-muted-foreground">{beClientesUnica == null ? "—" : beClientesUnica.toLocaleString("es-AR") + " clientes"}</TableCell></TableRow>
						</TableBody>
					</Table>
				) : (
					<Table>
						<TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">Mensual</TableHead><TableHead className="text-right">Anual</TableHead></TableRow></TableHeader>
						<TableBody>
							<TableRow><TableCell>Ingreso por IDC ({idcMensuales.toLocaleString("es-AR")} × {fMoney2(precioIDC)})</TableCell><TableCell className="text-right tabular-nums">{fMoney(revIDCmes)}</TableCell><TableCell className="text-right tabular-nums">{fMoney(revIDCmes * 12)}</TableCell></TableRow>
							<TableRow><TableCell>Ingreso firmas adicionales ({firmasAdicMes.toLocaleString("es-AR")})</TableCell><TableCell className="text-right tabular-nums">{revFirmasMes ? fMoney(revFirmasMes) : "—"}</TableCell><TableCell className="text-right tabular-nums">{revFirmasMes ? fMoney(revFirmasMes * 12) : "—"}</TableCell></TableRow>
							<TableRow><TableCell>Costo certificados</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoCertMes)}</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoCertMes * 12)}</TableCell></TableRow>
							<TableRow><TableCell>Costo firmas ({firmasMes.toLocaleString("es-AR")})</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoFirmasMes)}</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoFirmasMes * 12)}</TableCell></TableRow>
							<TableRow><TableCell>Soporte / SLA ({sla.label})</TableCell><TableCell className="text-right tabular-nums">{slaMes ? fMoney(slaMes) : "incluido"}</TableCell><TableCell className="text-right tabular-nums">{slaMes ? fMoney(slaMes * 12) : "incluido"}</TableCell></TableRow>
							<TableRow><TableCell>Fee de implementación</TableCell><TableCell className="text-right tabular-nums">—</TableCell><TableCell className="text-right tabular-nums">{fMoney(fee)}</TableCell></TableRow>
							<TableRow className={margenMes >= 0 ? "bg-success/5" : "bg-destructive/5"}><TableCell className={"font-semibold " + (margenMes >= 0 ? "text-[var(--success)]" : "text-destructive")}>Contribución marginal</TableCell><TableCell className={"text-right tabular-nums font-semibold " + (margenMes >= 0 ? "text-[var(--success)]" : "text-destructive")}>{fMoney(margenMes)}</TableCell><TableCell className={"text-right tabular-nums font-semibold " + (margenMes >= 0 ? "text-[var(--success)]" : "text-destructive")}>{fMoney(margenMes * 12)}</TableCell></TableRow>
											<TableRow className="bg-muted/30"><TableCell className="font-semibold text-muted-foreground">Clientes p/cubrir CF mensual</TableCell><TableCell className="text-right tabular-nums text-muted-foreground">{beClientesMes == null ? "—" : beClientesMes.toLocaleString("es-AR") + " clientes"}</TableCell><TableCell></TableCell></TableRow>
						</TableBody>
					</Table>
				)}
				</CardContent>
			</Card>

			{/* Tabla de segmentos */}
			<Card>
				<CardContent>
					<div className="mb-3 text-sm font-semibold">Pricing por segmento (Borrador v5)</div>
					<Table>
						<TableHeader><TableRow><TableHead>Segmento</TableHead><TableHead className="text-right">IDC/mes</TableHead><TableHead className="text-right">Precio (USD/IDC)</TableHead><TableHead className="text-right">C. Marginal ref.</TableHead><TableHead className="text-right">C. Marginal real (costo USD {costoIDC.toFixed(4)})</TableHead></TableRow></TableHeader>
						<TableBody>
							{b2b2cSegments.map(function (s) {
								const act = s.id === seg.id;
								const mReal = s.precioIDC > 0 ? (s.precioIDC - costoIDC) / s.precioIDC : 0;
								return (
									<TableRow key={s.id} className={act ? "bg-accent" : ""}>
										<TableCell className="font-semibold">{s.label}{act && <Badge className="ml-2">actual</Badge>}</TableCell>
										<TableCell className="text-right tabular-nums">{s.idcMin.toLocaleString("es-AR")}–{s.idcMax == null ? "+" : s.idcMax.toLocaleString("es-AR")}</TableCell>
										<TableCell className="text-right tabular-nums font-semibold">{"USD " + s.precioIDC.toFixed(2)}</TableCell>
										<TableCell className="text-right tabular-nums">{(s.margenRef * 100).toFixed(0)}%</TableCell>
										<TableCell className={"text-right tabular-nums font-semibold " + margClass(mReal)}>{(mReal * 100).toFixed(0)}%</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<p className="text-[11px] text-muted-foreground">Firmas totales = IDC × (incluidas + adicionales) = {idcMensuales.toLocaleString("es-AR")} × {firmasPorIDC} = {firmasMes.toLocaleString("es-AR")}. El ratio es configurable, no fijo. "C. Marginal real" recalcula con costo cotizadora: cert USD {effCvCert.toFixed(4)} + {incl} firmas × USD {effCvFirma.toFixed(4)} = USD {costoIDC.toFixed(4)}. Referencia doc (USD {costoIdcRef.toFixed(4)}). Modo: {esUnica ? "única vez" : "recurrente mensual"}.{(overridePrecioIDC !== "" || overrideCvCert !== "" || overrideCvFirma !== "") && " ⚠ Precios personalizados activos en esta cotización."}</p>
		</div>
	);
}
