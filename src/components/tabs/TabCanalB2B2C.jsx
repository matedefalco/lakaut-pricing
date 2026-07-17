import { useState, useEffect } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { getB2B2CSegment } from "@/lib/tiers";
import { CHANNELS } from "@/data/channelMeta";
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
import { QuoteLayout, FieldGroup } from "@/components/ui/QuoteLayout";
import { ResultPanel, ResultHero, ResultRow, StatusPill, AnimatedNumber } from "@/components/ui/ResultPanel";
import { TierHint } from "@/components/ui/TierHint";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useToast, notifyQuoteSaved } from "@/components/ui/Toaster";
import { TabCanalB2B2CPrecios } from "@/components/tabs/TabCanalB2B2CPrecios";

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }
function margAccent(pct) { return pct >= 0.5 ? "success" : pct >= 0.2 ? "warning" : "destructive"; }
function margWord(pct) { return pct >= 0.5 ? "saludable" : pct >= 0.2 ? "ajustado" : "a revisar"; }

const OVERRIDE_LABEL = { bundle: "precio bundle", componente: "por componente", margen: "margen objetivo" };
const DESCUENTO_ABONO = 0.35;

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
	// Modelo por tipo de certificado. Un certificado (IDC) es físico (persona) o
	// jurídico (empresa/representante). Mismo precio y costo; se separan solo para
	// el desglose de la propuesta. Cada tipo lleva su cantidad de certificados y las
	// firmas que entran en cada certificado de ese tipo (sin firma inicial extra).
	const [certFisicos, setCertFisicos] = useState("");
	const [firmasPorCertFisico, setFirmasPorCertFisico] = useState(0);
	const [certJuridicos, setCertJuridicos] = useState("");
	const [firmasPorCertJuridico, setFirmasPorCertJuridico] = useState(0);
	const [fee, setFee] = useState(3250);
	const [slaId, setSlaId] = useState("standard");
	const [slaBonificado, setSlaBonificado] = useState(false);
	// Precio de la firma a precio de lista. Cotiza las firmas del mes 1 y es, además,
	// el precio de la firma adicional si el cliente supera el presupuesto armado.
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

	const conApi = integracion !== "sin_api";
	const api = b2b2cApiTiers.slice().reverse().find(function (t) { return (Number(fee) || 0) >= t.feeMin; }) || b2b2cApiTiers[0];
	const sla = slaPlans.find(function (s) { return s.id === slaId; }) || slaPlans[0];

	// ── Cantidades ──
	const nf = Math.max(0, Number(certFisicos) || 0);
	const nj = Math.max(0, Number(certJuridicos) || 0);
	const ff = Math.max(0, Number(firmasPorCertFisico) || 0);
	const fj = Math.max(0, Number(firmasPorCertJuridico) || 0);
	const idc = nf + nj; // total de certificados (IDC) · define el segmento
	const firmasFisica = nf * ff;
	const firmasJuridica = nj * fj;
	const firmasIncl = firmasFisica + firmasJuridica;

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
		// Cantidades nuevas (por tipo). Fallback a formato legacy (IDC único + firmas
		// por IDC → todo se toma como certificados físicos, preservando el total).
		if (i.certFisicos != null || i.certJuridicos != null) {
			setCertFisicos(i.certFisicos != null ? i.certFisicos : "");
			setCertJuridicos(i.certJuridicos != null ? i.certJuridicos : "");
			setFirmasPorCertFisico(i.firmasPorCertFisico != null ? i.firmasPorCertFisico : 0);
			setFirmasPorCertJuridico(i.firmasPorCertJuridico != null ? i.firmasPorCertJuridico : 0);
		} else {
			setCertFisicos(i.idcMensuales != null ? i.idcMensuales : "");
			setCertJuridicos("");
			const legacyFis = i.firmasInclFisicaPorIDC != null ? i.firmasInclFisicaPorIDC : (i.firmasInclPorIDC != null ? i.firmasInclPorIDC : 0);
			setFirmasPorCertFisico(legacyFis || 0);
			setFirmasPorCertJuridico(i.firmasInclJuridicaPorIDC || 0);
		}
		setFee(i.fee != null ? i.fee : 3250);
		setSlaId(i.slaId || "standard");
		setSlaBonificado(i.slaBonificado || false);
		setPrecioFirmaAdic(i.precioFirmaAdic != null ? i.precioFirmaAdic : 0.5);
		setCasosDeUso(i.casosDeUso || "");
		setAbono(i.abono || false);
		if (i.overrideMode) {
			setOverrideMode(i.overrideMode);
			setShowOverrides(true);
			if (i.overrideMode === "bundle") { setOverridePrecioIDC(i.overridePrecioIDC != null ? String(i.overridePrecioIDC) : ""); }
			if (i.overrideMode === "componente") { setOverridePrecioCert(i.overridePrecioCert != null ? String(i.overridePrecioCert) : ""); setOverridePrecioFirma(i.overridePrecioFirma != null ? String(i.overridePrecioFirma) : ""); }
			if (i.overrideMode === "margen") { setOverrideMargenPct(i.overrideMargenPct != null ? String(i.overrideMargenPct) : ""); }
		} else {
			setOverrideMode(null);
			setOverridePrecioIDC(""); setOverridePrecioCert(""); setOverridePrecioFirma(""); setOverrideMargenPct("");
		}
		setEditingId(pendingEdit.id);
		setSaved(null);
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	// ── Precios efectivos (con ajuste personalizado si está activo) ──
	// precioIDC = precio del certificado (sin firmas). precioFirmaLista = precio
	// unitario de cada firma. Ambos se cotizan por separado; el ajuste mantiene esa
	// separación. El certificado y la firma nunca se mezclan en un mismo valor.
	const precioFirmaBase = Math.max(0, Number(precioFirmaAdic) || 0);
	const costoCert = idc * cvCert;
	const costoFirmas = firmasIncl * cvFirma;
	const costoTotal = costoCert + costoFirmas;

	let precioIDC, precioFirmaLista;
	if (overrideMode === "bundle" && overridePrecioIDC !== "") {
		precioIDC = Math.max(0, Number(overridePrecioIDC) || 0);
		precioFirmaLista = precioFirmaBase;
	} else if (overrideMode === "componente") {
		precioIDC = overridePrecioCert !== "" ? Math.max(0, Number(overridePrecioCert) || 0) : cvCert;
		precioFirmaLista = overridePrecioFirma !== "" ? Math.max(0, Number(overridePrecioFirma) || 0) : cvFirma;
	} else if (overrideMode === "margen" && overrideMargenPct !== "" && idc > 0) {
		const m = (Number(overrideMargenPct) || 0) / 100;
		precioFirmaLista = precioFirmaBase;
		const revServicioObjetivo = m < 1 && m > 0 ? costoTotal / (1 - m) : costoTotal;
		precioIDC = Math.max(0, (revServicioObjetivo - firmasIncl * precioFirmaLista) / idc);
	} else {
		precioIDC = seg.precioIDC;
		precioFirmaLista = precioFirmaBase;
	}

	// ── Ingresos (mes 1 · activación) ──
	const revCertFisicos = nf * precioIDC;
	const revCertJuridicos = nj * precioIDC;
	const revIDC = idc * precioIDC;
	const revFirmasFisica = firmasFisica * precioFirmaLista;
	const revFirmasJuridica = firmasJuridica * precioFirmaLista;
	const revFirmas = firmasIncl * precioFirmaLista;
	const revServicio = revIDC + revFirmas;

	const feeAplicado = conApi ? Math.max(0, Number(fee) || 0) : 0;
	const slaMes = conApi && !slaBonificado ? (sla.precioMes || 0) : 0;
	const revSinFee = revServicio + slaMes;
	const revTotal = revSinFee + feeAplicado;

	const margen = revServicio - costoTotal;
	const margenPct = revServicio > 0 ? margen / revServicio : 0;
	const resultadoTotal = margen + slaMes + feeAplicado;

	// Abono (opcional): repone la bolsa de firmas cada mes con el 35% de descuento.
	const precioFirmaAbono = precioFirmaBase * (1 - DESCUENTO_ABONO);
	const revAbonoMes = firmasIncl * precioFirmaAbono;
	const revAbonoAnual = revAbonoMes * 12;

	// Distancia al siguiente segmento: contexto de volumen para el vendedor.
	const segIdx = b2b2cSegments.findIndex(function (s) { return s.id === seg.id; });
	const nextSeg = segIdx >= 0 && segIdx < b2b2cSegments.length - 1 ? b2b2cSegments[segIdx + 1] : null;
	let segHint = null;
	if (hasVolume && nextSeg) {
		const idcFaltan = Math.max(0, nextSeg.idcMin - idc);
		segHint = "Con " + idcFaltan.toLocaleString("es-AR") + " certificados más entrás en " + nextSeg.label + " · precio de tabla USD " + nextSeg.precioIDC + " por certificado.";
	} else if (hasVolume) {
		segHint = "Es el segmento de mayor volumen.";
	}
	const segRows = b2b2cSegments.map(function (s) {
		return {
			id: s.id,
			cells: [
				s.label,
				s.idcMin.toLocaleString("es-AR") + (s.idcMax == null ? "+" : "–" + s.idcMax.toLocaleString("es-AR")),
				"USD " + s.precioIDC,
			],
		};
	});

	// Resumen de estado de las condiciones comerciales (subtítulo del grupo).
	const condResumen = [
		conApi ? api.label : "sin integración API",
		conApi ? (slaBonificado ? "SLA bonificado" : sla.label) : null,
		overrideMode ? "precio " + (OVERRIDE_LABEL[overrideMode] || overrideMode) : "precio de tabla",
		abono ? "con abono mensual" : "sin abono",
	].filter(Boolean).join(" · ");

	function buildDeal(id, fecha) {
		return {
			id: id,
			channel: "b2b2c",
			fecha: fecha,
			updatedAt: editingId ? new Date().toISOString() : undefined,
			inputs: {
				integracion,
				certFisicos: nf, firmasPorCertFisico: ff,
				certJuridicos: nj, firmasPorCertJuridico: fj,
				idcMensuales: idc, // compat: consumido por historial/reportes/clientes
				firmasAdicPorIDC: 0,
				// Guardamos el precio de firma efectivo (con ajuste si lo hubo) para que la
				// propuesta exportada cotice exactamente lo mismo que la cotizadora.
				precioFirmaAdic: precioFirmaLista,
				...(conApi ? { fee, slaId, slaBonificado } : {}),
				casosDeUso, abono,
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
				segmento: seg.label, idcMensuales: idc,
				certFisicos: nf, certJuridicos: nj,
				firmasTotales: firmasIncl, firmasMes: firmasIncl, precioIDC,
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

	const header = (
		<PageHeader
			title={CHANNELS.b2b2c.full + (selectedClient ? " · " + selectedClient.name : "")}
			description={
				<>
					{CHANNELS.b2b2c.desc}
					<InfoTooltip text="Un certificado (IDC) es físico o jurídico; cuestan y cotizan igual. Cada uno lleva las firmas que se le carguen, sin firma inicial extra." />
				</>
			}
		/>
	);

	// Panel de resultado = resumen de la cotización: segmento, cantidades y precios
	// por tipo, condiciones comerciales y total. Es lo que el vendedor lee para
	// entender qué está cotizando de un vistazo.
	const result = (
		<ResultPanel eyebrow={hasVolume ? "Resumen de la cotización" : "Resumen · sin datos"}>
			<ResultHero
				label={conApi ? "Total · mes 1" : "Total"}
				value={hasVolume ? <AnimatedNumber value={revTotal} format={fMoney} /> : "—"}
				sub={hasVolume ? (conApi ? "Certificados + firmas + SLA · fee incluido" : "Certificados + firmas · sin integración API") : "Cargá certificados para ver el total"}
				empty={!hasVolume}
				pill={hasVolume ? <StatusPill tone={margAccent(margenPct)}>Margen {(margenPct * 100).toFixed(0)}% · {margWord(margenPct)}</StatusPill> : null}
			/>

			{/* Segmento + acceso contextual a la tabla de precios */}
			<div className="flex items-center justify-between gap-2 border-t border-border/60 pt-3">
				<div className="min-w-0">
					<div className="text-[11px] text-muted-foreground">Segmento · {hasVolume ? idc.toLocaleString("es-AR") + " certs" : "por volumen total"}</div>
					<div className="text-sm font-semibold">
						{hasVolume ? <>{seg.label} <span className="font-normal text-[11px] text-muted-foreground">· {fMoney2(precioIDC)}/cert</span></> : <span className="text-muted-foreground/40">—</span>}
					</div>
				</div>
				{hasVolume && (
					<TierHint label="ver segmentos" columns={["Segmento", "Certs", "Precio"]} rows={segRows} activeId={seg.id} nextHint={segHint} />
				)}
			</div>

			{/* Desglose por tipo de certificado */}
			{hasVolume ? (
				<div className="space-y-3">
					{nf > 0 && (
						<div className="rounded-lg bg-sky-50 px-3 py-2">
							<div className="flex items-center justify-between">
								<span className="text-[11px] font-semibold text-sky-700">Certificados físicos</span>
								<span className="text-[11px] text-muted-foreground">{nf.toLocaleString("es-AR")} × {ff} firma{ff !== 1 ? "s" : ""}</span>
							</div>
							<ResultRow label={"Certificados (" + nf.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revCertFisicos} format={fMoney} />} accent="primary" />
							{firmasFisica > 0 && <ResultRow label={"Firmas (" + firmasFisica.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revFirmasFisica} format={fMoney} />} />}
						</div>
					)}
					{nj > 0 && (
						<div className="rounded-lg bg-violet-50 px-3 py-2">
							<div className="flex items-center justify-between">
								<span className="text-[11px] font-semibold text-violet-700">Certificados jurídicos</span>
								<span className="text-[11px] text-muted-foreground">{nj.toLocaleString("es-AR")} × {fj} firma{fj !== 1 ? "s" : ""}</span>
							</div>
							<ResultRow label={"Certificados (" + nj.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revCertJuridicos} format={fMoney} />} accent="primary" />
							{firmasJuridica > 0 && <ResultRow label={"Firmas (" + firmasJuridica.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revFirmasJuridica} format={fMoney} />} />}
						</div>
					)}

					{/* Condiciones comerciales */}
					<div>
						{conApi && <ResultRow label={"SLA · " + sla.label} value={slaBonificado ? "bonificado" : slaMes > 0 ? <AnimatedNumber value={slaMes} format={fMoney} /> : "incluido"} />}
						{conApi && <ResultRow label="Fee de implementación (única vez)" value={<AnimatedNumber value={feeAplicado} format={fMoney} />} />}
						{abono && <ResultRow label="Abono mensual (firmas)" value={<><AnimatedNumber value={revAbonoMes} format={fMoney} />/mes</>} accent="success" />}
					</div>

					{/* Total */}
					<div className="flex items-center justify-between border-t-2 border-border pt-2">
						<span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{conApi ? "Total mes 1" : "Total"}</span>
						<span className="font-heading text-lg font-semibold tabular-nums"><AnimatedNumber value={revTotal} format={fMoney} /></span>
					</div>

					<p className="text-[10px] text-muted-foreground">Firma adicional (si superan el presupuesto): {fMoney2(precioFirmaBase)} c/u.</p>
				</div>
			) : (
				<p className="text-[11px] text-muted-foreground">Cargá certificados físicos o jurídicos para ver el desglose y el total.</p>
			)}
		</ResultPanel>
	);

	const footer = (
		<SaveExportBar
			hint={hasVolume ? "" : "Cargá al menos un certificado para guardar o exportar."}
			canSave={hasVolume}
			canExport={hasVolume}
			onSave={saveQuote}
			onExport={exportNow}
			onCancelEdit={function () { setEditingId(null); }}
			editingId={editingId}
			flash={flash}
		/>
	);

	return (
		<QuoteLayout header={header} result={result} footer={footer}>
			{/* ── 1 · Qué cotizás ── */}
			<FieldGroup step={1} title="Qué cotizás" subtitle="Modalidad y volumen de certificados por tipo. El resumen se arma a la derecha.">
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
					{!conApi && <p className="text-[11px] text-muted-foreground">Sin integración API: se cotiza únicamente el volumen de certificados, sin fee de implementación ni plan de soporte.</p>}
				</div>

				<Separator />

				{/* Volumen agrupado por tipo de certificado */}
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3">
						<div className="mb-2.5 flex items-center gap-1.5">
							<span className="inline-block size-2 rounded-full bg-sky-500" />
							<span className="text-xs font-semibold text-sky-700">Certificados físicos</span>
							<span className="text-[10px] text-muted-foreground">· personas</span>
						</div>
						<div className="grid grid-cols-2 gap-2.5">
							<NumberField label="Cantidad" value={certFisicos} onChange={setCertFisicos} min={0} placeholder="0" />
							<NumberField label="Firmas c/u" value={firmasPorCertFisico} onChange={setFirmasPorCertFisico} min={0} />
						</div>
					</div>
					<div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
						<div className="mb-2.5 flex items-center gap-1.5">
							<span className="inline-block size-2 rounded-full bg-violet-500" />
							<span className="text-xs font-semibold text-violet-700">Certificados jurídicos</span>
							<span className="text-[10px] text-muted-foreground">· empresas</span>
						</div>
						<div className="grid grid-cols-2 gap-2.5">
							<NumberField label="Cantidad" value={certJuridicos} onChange={setCertJuridicos} min={0} placeholder="0" />
							<NumberField label="Firmas c/u" value={firmasPorCertJuridico} onChange={setFirmasPorCertJuridico} min={0} />
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<NumberField label="Precio por firma" value={precioFirmaAdic} onChange={setPrecioFirmaAdic} prefix="USD" min={0} note="Cotiza las firmas del mes 1 y es el precio de la firma adicional si superan el presupuesto." />
				</div>
			</FieldGroup>

			{/* ── 2 · Condiciones comerciales ── */}
			<FieldGroup step={2} title="Condiciones comerciales" subtitle={condResumen}>
				{conApi && (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<NumberField label="Fee de implementación" value={fee} onChange={setFee} prefix="USD" min={0} note={api.label + " · rango USD " + api.feeMin.toLocaleString("es-AR") + "–" + api.feeMax.toLocaleString("es-AR")} />
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
					</div>
				)}

				{conApi && <Separator />}

				{/* Abono mensual */}
				<div className="flex flex-col gap-3">
					<label className="flex items-center gap-2.5 cursor-pointer select-none">
						<input type="checkbox" checked={abono} onChange={function (e) { setAbono(e.target.checked); }} className="rounded" />
						<span className="text-sm font-medium">Incluir abono mensual de firmas</span>
						{abono && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activo</Badge>}
					</label>
					{abono && hasVolume && (
						<div className="pl-6 border-l-2 border-muted ml-1 text-sm text-muted-foreground space-y-1">
							<p>Repone la bolsa de firmas cada mes con un descuento del {(DESCUENTO_ABONO * 100).toFixed(0)}% sobre el precio de firma.</p>
							<p className="text-xs">{firmasIncl.toLocaleString("es-AR")} firmas × USD {precioFirmaAbono.toFixed(3)}/firma = <span className="font-semibold text-foreground">{fMoney(revAbonoMes)}/mes</span></p>
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
									{ id: "bundle", label: "Precio por cert." },
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
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio por certificado <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
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
											<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio firma <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
											<div className="flex items-center gap-1">
												<Input type="number" value={overridePrecioFirma} onChange={function (e) { setOverridePrecioFirma(e.target.value); }} placeholder={cvFirma.toFixed(4)} className="h-8 text-sm" />
												{overridePrecioFirma !== "" && <button onClick={function () { setOverridePrecioFirma(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
											</div>
										</div>
									</div>
									<p className="text-[10px] text-muted-foreground">Precio efectivo: cert {fMoney2(precioIDC)} · firma {fMoney2(precioFirmaLista)}.</p>
								</div>
							)}
							{overrideMode === "margen" && (
								<div className="flex flex-col gap-1.5 max-w-xs">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Margen objetivo <span className="normal-case tracking-normal font-normal">(%)</span></Label>
									<div className="flex items-center gap-1.5">
										<Input type="number" value={overrideMargenPct} onChange={function (e) { setOverrideMargenPct(e.target.value); }} placeholder="Ej: 75" min="0" max="99" className="h-8 text-sm" />
										{overrideMargenPct !== "" && <button onClick={function () { setOverrideMargenPct(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
									</div>
									{overrideMargenPct !== "" && hasVolume && <p className="text-[10px] text-muted-foreground">Precio por certificado resultante = <span className="font-semibold text-foreground">{fMoney2(precioIDC)}</span>.</p>}
								</div>
							)}
							{!overrideMode && <p className="text-[10px] text-muted-foreground">Seleccioná un modo para aplicar un ajuste de precio a esta cotización.</p>}
						</div>
					)}
				</div>
			</FieldGroup>

			{/* ── 3 · Para la propuesta ── */}
			<FieldGroup step={3} title="Para la propuesta" subtitle="Datos del documento final. No cambian el cálculo.">
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">
						Cliente
						{editingId && <span className="ml-1.5 text-[var(--success)] font-semibold normal-case tracking-normal">· editando</span>}
					</Label>
					<ClientSelector channel="b2b2c" clients={clientsApi?.clients || []} onCreate={clientsApi?.create} value={selectedClient} onChange={setSelectedClient} />
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">Casos de uso <span className="normal-case tracking-normal font-normal">(para propuesta comercial)</span></Label>
					<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: recibos de haberes, contratos de RRHH, acuerdos comerciales..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
				</div>
			</FieldGroup>

			{/* ── Rentabilidad (interno) ── */}
			{hasVolume && (
				<CollapsibleSection tone="internal" title="Rentabilidad · uso interno" subtitle="Costo variable, contribución marginal y break-even. No aparece en la propuesta del cliente.">
					<div className="flex flex-wrap gap-3 mb-4">
						<StatCard label="Contribución marginal" value={fMoney(margen)} sub={(margenPct * 100).toFixed(0) + "% sobre revenue de servicio"} accent={margAccent(margenPct)} valueClass={margClass(margenPct)} />
						<StatCard label="Costo variable total" value={fMoney(costoTotal)} sub={idc.toLocaleString("es-AR") + " certs + " + firmasIncl.toLocaleString("es-AR") + " firmas"} accent="muted" />
					</div>
					<Table>
						<TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
						<TableBody>
							<TableRow><TableCell>Ingreso certificados ({idc.toLocaleString("es-AR")} × {fMoney2(precioIDC)})</TableCell><TableCell className="text-right tabular-nums">{fMoney(revIDC)}</TableCell></TableRow>
							<TableRow><TableCell>Ingreso firmas ({firmasIncl.toLocaleString("es-AR")} × {fMoney2(precioFirmaLista)})</TableCell><TableCell className="text-right tabular-nums">{revFirmas ? fMoney(revFirmas) : "—"}</TableCell></TableRow>
							<TableRow><TableCell>Costo certificados ({idc.toLocaleString("es-AR")} × {fMoney2(cvCert)})</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoCert)}</TableCell></TableRow>
							<TableRow><TableCell>Costo firmas ({firmasIncl.toLocaleString("es-AR")} × {fMoney2(cvFirma)})</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(costoFirmas)}</TableCell></TableRow>
							<TableRow className={margen >= 0 ? "bg-success/5" : "bg-destructive/5"}>
								<TableCell className={"font-semibold " + (margen >= 0 ? "text-[var(--success)]" : "text-destructive")}>Contribución marginal <span className="font-normal text-muted-foreground">· volumen (cert + firmas)</span></TableCell>
								<TableCell className={"text-right tabular-nums font-semibold " + (margen >= 0 ? "text-[var(--success)]" : "text-destructive")}>{fMoney(margen)} ({(margenPct * 100).toFixed(0)}%)</TableCell>
							</TableRow>
							{conApi && (
								<>
									<TableRow className="border-t-2 border-border hover:bg-transparent">
										<TableCell className="text-[11px] uppercase tracking-wide text-muted-foreground pt-4">Fuera de la contribución marginal</TableCell>
										<TableCell />
									</TableRow>
									<TableRow><TableCell>Soporte / SLA ({sla.label}){slaMes ? " · mensual" : ""}</TableCell><TableCell className="text-right tabular-nums">{slaBonificado ? "bonificado" : slaMes ? fMoney(slaMes) : "incluido"}</TableCell></TableRow>
									<TableRow><TableCell>Fee de implementación · pago único</TableCell><TableCell className="text-right tabular-nums">{fMoney(feeAplicado)}</TableCell></TableRow>
									<TableRow className="bg-muted/40">
										<TableCell className="font-semibold">Resultado mes 1 <span className="font-normal text-muted-foreground">· con SLA y fee</span></TableCell>
										<TableCell className="text-right tabular-nums font-semibold">{fMoney(resultadoTotal)}</TableCell>
									</TableRow>
								</>
							)}
						</TableBody>
					</Table>
					<p className="text-[11px] text-muted-foreground mt-3">CV = {idc.toLocaleString("es-AR")} certs × USD {cvCert.toFixed(4)} + {firmasIncl.toLocaleString("es-AR")} firmas × USD {cvFirma.toFixed(4)} = USD {costoTotal.toFixed(2)}. CM = Ingreso servicio − CV (sin CF).{overrideMode ? " ⚠ Precio personalizado activo (" + overrideMode + ")." : ""}</p>
				</CollapsibleSection>
			)}

			{/* ── Referencia ── */}
			<CollapsibleSection title="Referencia · precios por segmento, API y SLA" subtitle="Tabla completa del modelo de volumen (Borrador v5).">
				<TabCanalB2B2CPrecios costs={costs} />
			</CollapsibleSection>
		</QuoteLayout>
	);
}
