import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { makeMoney } from "@/utils/useMoney";
import { B2B2C_SEGMENTS, B2B2C_API_TIERS, SLA_PLANS, getB2B2CSegment, COSTO_IDC_REF } from "@/data/channels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NumberField, SelectField, StatCard } from "@/components/ui/field";

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }
function margAccent(pct) { return pct >= 0.5 ? "success" : pct >= 0.2 ? "warning" : "destructive"; }

export function TabCanalB2B2C({ costs, currency, tc, quotesApi, pendingEdit, onConsumeEdit }) {
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	const [clientName, setClientName] = useState("");
	const [idcMensuales, setIdcMensuales] = useState(5500);
	const [apiId, setApiId] = useState("standard");
	const [slaId, setSlaId] = useState("standard");
	const [firmasInclPorIDC, setFirmasInclPorIDC] = useState(4);
	const [firmasAdicPorIDC, setFirmasAdicPorIDC] = useState(0);
	const [precioFirmaAdic, setPrecioFirmaAdic] = useState(0.5);
	const [editingId, setEditingId] = useState(null);
	const [flash, setFlash] = useState(false);

	const api = B2B2C_API_TIERS.find(function (t) { return t.id === apiId; }) || B2B2C_API_TIERS[0];
	const [fee, setFee] = useState(api.feeDefault);
	const sla = SLA_PLANS.find(function (s) { return s.id === slaId; }) || SLA_PLANS[0];
	const seg = getB2B2CSegment(idcMensuales);

	useEffect(function () {
		if (!pendingEdit) return;
		const i = pendingEdit.inputs || {};
		setClientName(pendingEdit.clientName === "(sin nombre)" ? "" : pendingEdit.clientName);
		setIdcMensuales(i.idcMensuales || 0);
		setApiId(i.apiId || "standard");
		setFee(i.fee != null ? i.fee : api.feeDefault);
		setSlaId(i.slaId || "standard");
		setFirmasInclPorIDC(i.firmasInclPorIDC != null ? i.firmasInclPorIDC : 4);
		setFirmasAdicPorIDC(i.firmasAdicPorIDC || 0);
		setPrecioFirmaAdic(i.precioFirmaAdic != null ? i.precioFirmaAdic : 0.5);
		setEditingId(pendingEdit.id);
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	const incl = Number(firmasInclPorIDC) || 0;
	const adic = Number(firmasAdicPorIDC) || 0;
	const firmasPorIDC = incl + adic;

	const costoIDC = cvCert + incl * cvFirma;
	const precioIDC = seg.precioIDC;
	const margenIDC = precioIDC - costoIDC;
	const margenPctIDC = precioIDC > 0 ? margenIDC / precioIDC : 0;

	const firmasMes = idcMensuales * firmasPorIDC;
	const firmasAdicMes = idcMensuales * adic;

	const revIDCmes = idcMensuales * precioIDC;
	const revFirmasMes = firmasAdicMes * (Number(precioFirmaAdic) || 0);
	const costoCertMes = idcMensuales * cvCert;
	const costoFirmasMes = firmasMes * cvFirma;
	const costoMes = costoCertMes + costoFirmasMes;
	const slaMes = sla.precioMes || 0;
	const revMesTotal = revIDCmes + revFirmasMes + slaMes;
	const margenMes = revIDCmes + revFirmasMes - costoMes;
	const margenPct = revIDCmes + revFirmasMes > 0 ? margenMes / (revIDCmes + revFirmasMes) : 0;
	const revAnual = revMesTotal * 12 + fee;

	function onApi(id) {
		setApiId(id);
		const t = B2B2C_API_TIERS.find(function (x) { return x.id === id; });
		if (t) setFee(t.feeDefault);
	}

	function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? quotesApi.quotes.find(function (q) { return q.id === editingId; }) : null;
		quotesApi.save({
			id: editingId || Date.now().toString(36),
			channel: "b2b2c",
			fecha: prev ? prev.fecha : now,
			updatedAt: editingId ? now : undefined,
			clientName: clientName || "(sin nombre)",
			inputs: { idcMensuales, apiId, fee, slaId, firmasInclPorIDC, firmasAdicPorIDC, precioFirmaAdic },
			resumen: { segmento: seg.label, idcMensuales, firmasMes, precioIDC, revMesTotal, revAnual, margenMes, margenPct },
		});
		setEditingId(null);
		setFlash(true);
		setTimeout(function () { setFlash(false); }, 1500);
	}

	return (
		<div className="space-y-6">

			{/* Card principal de cotización */}
			<Card className="bg-card border-border">
				<CardHeader className="pb-3">
					<CardTitle className="font-heading text-base font-semibold">Canal B2B2C · Identidades Digitales Certificadas</CardTitle>
					<p className="text-sm text-muted-foreground">Empresas que integran los servicios de confianza en sus propios productos. La unidad es el IDC. Las firmas incluidas por IDC son configurables (firma inicial + activación, según lo que requiera la institución).</p>
				</CardHeader>
				<CardContent className="space-y-5">
					{/* Nombre del cliente — al inicio */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">
							Nombre del cliente
							{editingId && <span className="ml-1.5 text-[var(--success)] font-semibold normal-case tracking-normal">· editando</span>}
						</Label>
						<Input placeholder="Ej: Banco XYZ S.A." value={clientName} onChange={function (e) { setClientName(e.target.value); }} />
					</div>

					<Separator />

					{/* Parámetros */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<NumberField label="IDC nuevas por mes" value={idcMensuales} onChange={setIdcMensuales} />
						<SelectField label="Tipo de instalación (API)" value={apiId} onValueChange={onApi}
							options={B2B2C_API_TIERS.map(function (t) { return { value: t.id, label: t.label + " (USD " + t.feeMin.toLocaleString("es-AR") + "–" + t.feeMax.toLocaleString("es-AR") + ")" }; })} />
						<NumberField label="Fee de implementación" value={fee} onChange={setFee} prefix="USD" note={"Rango " + api.feeMin.toLocaleString("es-AR") + "–" + api.feeMax.toLocaleString("es-AR")} />
						<SelectField label="Plan de soporte / SLA" value={slaId} onValueChange={setSlaId}
							options={SLA_PLANS.map(function (s) { return { value: s.id, label: s.label + (s.precioMes ? " · USD " + s.precioMes.toLocaleString("es-AR") + "/mes" : (s.precioMes === 0 ? " · incluido" : " · a medida")) }; })} note={sla.desc} />
						<NumberField label="Firmas incluidas por IDC" value={firmasInclPorIDC} onChange={setFirmasInclPorIDC} note="Firma inicial + activación (editable)" />
						<NumberField label="Firmas adicionales por IDC / mes" value={firmasAdicPorIDC} onChange={setFirmasAdicPorIDC} note="Se cobran aparte" />
						<NumberField label="Precio firma adicional" value={precioFirmaAdic} onChange={setPrecioFirmaAdic} prefix="USD" />
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
				<StatCard label="Segmento" value={seg.label} sub={seg.idcMin.toLocaleString("es-AR") + "–" + (seg.idcMax == null ? "+" : seg.idcMax.toLocaleString("es-AR")) + " IDC/mes"} accent="primary" />
				<StatCard label="Precio por IDC" value={fMoney2(precioIDC)} sub={"Costo " + fMoney2(costoIDC)} accent="primary" />
				<StatCard label="Margen por IDC" value={(margenPctIDC * 100).toFixed(0) + "%"} sub={fMoney2(margenIDC) + "/IDC"} accent={margAccent(margenPctIDC)} valueClass={margClass(margenPctIDC)} />
				<StatCard label="Firmas / mes" value={firmasMes.toLocaleString("es-AR")} sub={idcMensuales.toLocaleString("es-AR") + " IDC × " + firmasPorIDC + " firmas"} accent="muted" />
				<StatCard label="Revenue mensual" value={fMoney(revMesTotal)} sub={"+ fee " + fMoney(fee) + " única vez"} accent="success" />
				<StatCard label="Revenue año 1" value={fMoney(revAnual)} sub="IDC+firmas+SLA ×12 + fee" accent="success" />
			</div>

			{/* Desglose */}
			<Card>
				<CardContent>
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
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* Tabla de segmentos */}
			<Card>
				<CardContent>
					<div className="mb-3 text-sm font-semibold">Pricing por segmento (Borrador v5)</div>
					<Table>
						<TableHeader><TableRow><TableHead>Segmento</TableHead><TableHead className="text-right">IDC/mes</TableHead><TableHead className="text-right">Precio USD</TableHead><TableHead className="text-right">Margen ref. doc</TableHead><TableHead className="text-right">Margen real (costo {fMoney2(costoIDC)})</TableHead></TableRow></TableHeader>
						<TableBody>
							{B2B2C_SEGMENTS.map(function (s) {
								const act = s.id === seg.id;
								const mReal = s.precioIDC > 0 ? (s.precioIDC - costoIDC) / s.precioIDC : 0;
								return (
									<TableRow key={s.id} className={act ? "bg-accent" : ""}>
										<TableCell className="font-semibold">{s.label}{act && <Badge className="ml-2">actual</Badge>}</TableCell>
										<TableCell className="text-right tabular-nums">{s.idcMin.toLocaleString("es-AR")}–{s.idcMax == null ? "+" : s.idcMax.toLocaleString("es-AR")}</TableCell>
										<TableCell className="text-right tabular-nums font-semibold">{fMoney2(s.precioIDC)}</TableCell>
										<TableCell className="text-right tabular-nums">{(s.margenRef * 100).toFixed(0)}%</TableCell>
										<TableCell className={"text-right tabular-nums font-semibold " + margClass(mReal)}>{(mReal * 100).toFixed(0)}%</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<p className="text-[11px] text-muted-foreground">Firmas/mes = IDC × (incluidas + adicionales) = {idcMensuales.toLocaleString("es-AR")} × {firmasPorIDC} = {firmasMes.toLocaleString("es-AR")}. El ratio es configurable, no fijo. "Margen real" recalcula con costo cotizadora: cert {fMoney2(cvCert)} + {incl} firmas × {fMoney2(cvFirma)} = {fMoney2(costoIDC)}. Referencia doc (USD {COSTO_IDC_REF.toFixed(4)}).</p>
		</div>
	);
}
