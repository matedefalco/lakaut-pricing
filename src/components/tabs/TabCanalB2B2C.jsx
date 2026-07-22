import { useState, useEffect } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { getB2B2CSegment } from "@/lib/tiers";
import { buildProyeccion, PROYECCION_DRIVERS, DEFAULT_PROYECCION_STEPS } from "@/lib/proyeccion";
import { CHANNELS } from "@/data/channelMeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NumberField, SelectField } from "@/components/ui/field";
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

const DESCUENTO_ABONO = 0.35;
// Fallback del precio de firma si un segmento de la config no tiene `precioFirma`
// cargado todavía (config vieja). Con la columna cargada, el precio es dinámico.
const DEFAULT_FIRMA_PRICE = 0.5;

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
	// Precio de la firma extra (excedente sobre lo cotizado). Por defecto usa el
	// precio de firma del segmento alcanzado (dinámico); "" = dinámico. Se puede
	// sobrescribir a mano para ese excedente.
	const [precioFirmaExtra, setPrecioFirmaExtra] = useState("");
	const [casosDeUso, setCasosDeUso] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [flash, setFlash] = useState(false);
	const [saved, setSaved] = useState(null); // { deal, client } tras guardar
	// Ajuste de precios personalizado (por componente): cada campo que se complete
	// sobrescribe ese elemento; vacío = usa el precio normal (segmento/dinámico).
	const [showOverrides, setShowOverrides] = useState(false);
	const [overridePrecioCert, setOverridePrecioCert] = useState("");
	const [overridePrecioFirma, setOverridePrecioFirma] = useState("");
	const [abono, setAbono] = useState(false);
	// Proyección de crecimiento (opcional, override por propuesta): escalones de
	// volumen con descuento progresivo para que el cliente proyecte su costo.
	const [proyEnabled, setProyEnabled] = useState(false);
	const [proyDriver, setProyDriver] = useState("packs");
	const [proySteps, setProySteps] = useState(function () { return DEFAULT_PROYECCION_STEPS.map(function (s) { return { ...s }; }); });

	const conApi = integracion !== "sin_api";
	const api = b2b2cApiTiers.slice().reverse().find(function (t) { return (Number(fee) || 0) >= t.feeMin; }) || b2b2cApiTiers[0];
	const sla = slaPlans.find(function (s) { return s.id === slaId; }) || slaPlans[0];

	// ── Cantidades ──
	const nf = Math.max(0, Number(certFisicos) || 0);
	const nj = Math.max(0, Number(certJuridicos) || 0);
	const ff = Math.max(0, Number(firmasPorCertFisico) || 0);
	const fj = Math.max(0, Number(firmasPorCertJuridico) || 0);
	const idc = nf + nj; // total de certificados (IDC)
	const firmasFisica = nf * ff;
	const firmasJuridica = nj * fj;
	const firmasIncl = firmasFisica + firmasJuridica;

	// El segmento se alcanza por el MAYOR entre las unidades (certs + firmas) y la
	// facturación a precio de lista (rompe la circularidad precio↔segmento: la
	// facturación de referencia se calcula con el precio del segmento base, el más
	// caro; el segmento alcanzado recién define el precio final, como Distribuidores).
	const unidades = idc + firmasIncl;
	const segBase = b2b2cSegments[0] || {};
	const precioIDCbase = segBase.precioIDC || 0;
	const precioFirmaBaseSeg = segBase.precioFirma != null ? segBase.precioFirma : DEFAULT_FIRMA_PRICE;
	const facturacionAtList = idc * precioIDCbase + firmasIncl * precioFirmaBaseSeg;
	const seg = getB2B2CSegment(unidades, facturacionAtList, b2b2cSegments);
	const segFirma = seg && seg.precioFirma != null ? seg.precioFirma : DEFAULT_FIRMA_PRICE;
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
		// Precio de firma extra: si el deal guardó un override lo tomamos; si no,
		// queda dinámico ("" = precio de firma del segmento).
		setPrecioFirmaExtra(i.precioFirmaExtra != null ? String(i.precioFirmaExtra) : "");
		setCasosDeUso(i.casosDeUso || "");
		setAbono(i.abono || false);
		// Proyección de crecimiento: se reabre con el driver y los escalones guardados.
		const p = i.proyeccion;
		if (p && p.enabled) {
			setProyEnabled(true);
			setProyDriver(p.driver || "packs");
			const steps = Array.isArray(p.steps) && p.steps.length ? p.steps : DEFAULT_PROYECCION_STEPS;
			setProySteps(steps.map(function (s) {
				return {
					pct: s.pct != null ? s.pct : 0,
					descuento: s.descuento != null ? s.descuento : 0,
					...(s.idc != null ? { idc: s.idc } : {}),
					...(s.firmas != null ? { firmas: s.firmas } : {}),
				};
			}));
		} else {
			setProyEnabled(false);
			setProyDriver("packs");
			setProySteps(DEFAULT_PROYECCION_STEPS.map(function (s) { return { ...s }; }));
		}
		// Solo ajuste por componente. Deals viejos con "bundle" mapean su precio de
		// certificado al override de cert; "margen" ya no se reconstruye.
		const legacyCert = i.overridePrecioCert != null ? i.overridePrecioCert : (i.overrideMode === "bundle" ? i.overridePrecioIDC : null);
		setOverridePrecioCert(legacyCert != null ? String(legacyCert) : "");
		setOverridePrecioFirma(i.overridePrecioFirma != null ? String(i.overridePrecioFirma) : "");
		setShowOverrides(legacyCert != null || i.overridePrecioFirma != null);
		setEditingId(pendingEdit.id);
		setSaved(null);
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	// ── Precios efectivos ──
	// precioIDC = precio del certificado (sin firmas). precioFirmaLista = precio
	// unitario de cada firma, dinámico según el segmento alcanzado (ya no se ingresa
	// a mano). El ajuste personalizado puede sobrescribir ambos; el certificado y la
	// firma nunca se mezclan en un mismo valor.
	const costoCert = idc * cvCert;
	const costoFirmas = firmasIncl * cvFirma;
	const costoTotal = costoCert + costoFirmas;

	// Ajuste por componente: cada campo cargado sobrescribe ese elemento; vacío usa
	// el precio normal (precio del segmento para el certificado, dinámico para la firma).
	const overrideActive = overridePrecioCert !== "" || overridePrecioFirma !== "";
	const precioIDC = overridePrecioCert !== "" ? Math.max(0, Number(overridePrecioCert) || 0) : seg.precioIDC;
	const precioFirmaLista = overridePrecioFirma !== "" ? Math.max(0, Number(overridePrecioFirma) || 0) : segFirma;

	// Precio de firma extra (excedente): dinámico = precio de firma del segmento,
	// salvo que se haya cargado un override manual.
	const precioFirmaExtraEff = precioFirmaExtra !== "" ? Math.max(0, Number(precioFirmaExtra) || 0) : precioFirmaLista;

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

	// Abono (opcional): repone la bolsa de firmas cada mes con el 35% de descuento.
	const precioFirmaAbono = precioFirmaLista * (1 - DESCUENTO_ABONO);
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
				"USD " + (s.precioFirma != null ? s.precioFirma : DEFAULT_FIRMA_PRICE),
			],
		};
	});

	// Resumen de estado de las condiciones comerciales (subtítulo del grupo).
	const condResumen = [
		conApi ? api.label : "sin integración API",
		conApi ? (slaBonificado ? "SLA bonificado" : sla.label) : null,
		overrideActive ? "precio ajustado" : "precio de tabla",
		abono ? "con abono mensual" : "sin abono",
	].filter(Boolean).join(" · ");

	// ── Proyección de crecimiento (preview) ──
	// Base = volumen y precio ya cotizados. El motor es el mismo que usa el export.
	const proyBase = { idc: idc, firmas: firmasIncl, precioCert: precioIDC, precioFirma: precioFirmaLista };
	const proyRows = proyEnabled && hasVolume ? buildProyeccion(proyBase, proyDriver, proySteps) : [];

	function updateStep(i, patch) {
		setProySteps(function (prev) { return prev.map(function (s, idx) { return idx === i ? { ...s, ...patch } : s; }); });
	}
	function addStep() {
		setProySteps(function (prev) {
			const last = prev.length ? prev[prev.length - 1] : { pct: 0, descuento: 0 };
			return prev.concat([{ pct: (Number(last.pct) || 0) + 10, descuento: (Number(last.descuento) || 0) + 3 }]);
		});
	}
	function removeStep(i) {
		setProySteps(function (prev) { return prev.filter(function (_, idx) { return idx !== i; }); });
	}
	function resetSteps() {
		setProySteps(DEFAULT_PROYECCION_STEPS.map(function (s) { return { ...s }; }));
	}
	// Al pasar a modo manual, pre-cargamos el volumen de cada escalón con el
	// crecimiento proporcional para que arranquen con un número editable.
	function changeDriver(d) {
		if (d === "manual") {
			setProySteps(function (prev) {
				return prev.map(function (s) {
					const k = 1 + (Number(s.pct) || 0) / 100;
					return {
						...s,
						idc: s.idc != null && s.idc !== "" ? s.idc : Math.round(idc * k),
						firmas: s.firmas != null && s.firmas !== "" ? s.firmas : Math.round(firmasIncl * k),
					};
				});
			});
		}
		setProyDriver(d);
	}

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
				// precioFirmaAdic = precio de firma con que se cotizan las firmas del mes 1
				// (dinámico del segmento o ajuste). La propuesta exportada usa este valor.
				precioFirmaAdic: precioFirmaLista,
				// Precio de firma extra (excedente): guardamos el override solo si difiere
				// del dinámico, para reabrir la cotización con el mismo valor.
				...(precioFirmaExtra !== "" ? { precioFirmaExtra: precioFirmaExtraEff } : {}),
				...(conApi ? { fee, slaId, slaBonificado } : {}),
				casosDeUso, abono,
				...(proyEnabled && proySteps.length ? {
					proyeccion: {
						enabled: true,
						driver: proyDriver,
						steps: proySteps.map(function (s) {
							return {
								pct: Number(s.pct) || 0,
								descuento: Number(s.descuento) || 0,
								...(proyDriver === "manual" ? {
									...(s.idc != null && s.idc !== "" ? { idc: Number(s.idc) } : {}),
									...(s.firmas != null && s.firmas !== "" ? { firmas: Number(s.firmas) } : {}),
								} : {}),
							};
						}),
					},
				} : {}),
				...(overrideActive ? {
					overrideMode: "componente",
					...(overridePrecioCert !== "" ? { overridePrecioCert: Number(overridePrecioCert) } : {}),
					...(overridePrecioFirma !== "" ? { overridePrecioFirma: Number(overridePrecioFirma) } : {}),
				} : {}),
			},
			resumen: {
				segmento: seg.label, idcMensuales: idc,
				certFisicos: nf, certJuridicos: nj,
				firmasTotales: firmasIncl, firmasMes: firmasIncl,
				precioIDC, precioFirma: precioFirmaLista, precioFirmaExtra: precioFirmaExtraEff,
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
		<>
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
					<div className="text-[11px] text-muted-foreground">Segmento · {hasVolume ? unidades.toLocaleString("es-AR") + " unidades" : "por volumen total"}</div>
					<div className="text-sm font-semibold">
						{hasVolume ? <>{seg.label} <span className="font-normal text-[11px] text-muted-foreground">· {fMoney2(precioIDC)}/cert · {fMoney2(precioFirmaLista)}/firma</span></> : <span className="text-muted-foreground/40">—</span>}
					</div>
				</div>
				{hasVolume && (
					<TierHint label="ver segmentos" columns={["Segmento", "Unidades", "Cert", "Firma"]} rows={segRows} activeId={seg.id} nextHint={segHint} />
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

					<p className="text-[10px] text-muted-foreground">Firma extra (si superan el presupuesto): {fMoney2(precioFirmaExtraEff)} c/u{precioFirmaExtra !== "" ? " · manual" : " · dinámico"}.</p>
				</div>
			) : (
				<p className="text-[11px] text-muted-foreground">Cargá certificados físicos o jurídicos para ver el desglose y el total.</p>
			)}
		</ResultPanel>

		{/* Rentabilidad · uso interno: vive debajo del resumen para ver el impacto en
		    vivo mientras se cotiza. No se exporta a la propuesta del cliente. */}
		{hasVolume && (
			<div className="rounded-xl border border-border bg-card p-4 shadow-float">
				<div className="mb-3">
					<span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rentabilidad · uso interno</span>
				</div>
				<div className="mb-3 grid grid-cols-2 gap-3">
					<div>
						<div className="text-[10px] text-muted-foreground">Contribución marginal</div>
						<div className={"font-heading text-base font-semibold tabular-nums " + margClass(margenPct)}><AnimatedNumber value={margen} format={fMoney} /></div>
						<div className="text-[10px] text-muted-foreground">{(margenPct * 100).toFixed(0)}% · {margWord(margenPct)}</div>
					</div>
					<div>
						<div className="text-[10px] text-muted-foreground">Costo variable total</div>
						<div className="font-heading text-base font-semibold tabular-nums"><AnimatedNumber value={costoTotal} format={fMoney} /></div>
						<div className="text-[10px] text-muted-foreground">{idc.toLocaleString("es-AR")} certs + {firmasIncl.toLocaleString("es-AR")} firmas</div>
					</div>
				</div>
				<div className="space-y-1 border-t border-border/60 pt-2">
					<ResultRow label={<>Ingreso certificados<InfoTooltip text={idc.toLocaleString("es-AR") + " certificados × " + fMoney2(precioIDC) + " por certificado = " + fMoney(revIDC)} /></>} value={<AnimatedNumber value={revIDC} format={fMoney} />} accent="primary" />
					<ResultRow label={<>Ingreso firmas<InfoTooltip text={firmasIncl.toLocaleString("es-AR") + " firmas × " + fMoney2(precioFirmaLista) + " por firma = " + fMoney(revFirmas)} /></>} value={revFirmas ? <AnimatedNumber value={revFirmas} format={fMoney} /> : "—"} />
					<ResultRow label={<>Costo certificados<InfoTooltip text={idc.toLocaleString("es-AR") + " certificados × " + fMoney2(cvCert) + " de costo variable c/u = " + fMoney(costoCert)} /></>} value={<span className="tabular-nums text-destructive">−{fMoney(costoCert)}</span>} />
					<ResultRow label={<>Costo firmas<InfoTooltip text={firmasIncl.toLocaleString("es-AR") + " firmas × " + fMoney2(cvFirma) + " de costo variable c/u = " + fMoney(costoFirmas)} /></>} value={<span className="tabular-nums text-destructive">−{fMoney(costoFirmas)}</span>} />
				</div>
			</div>
		)}
		</>
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
			{/* ── 1 · Para la propuesta ── */}
			<FieldGroup step={1} title="Para la propuesta" subtitle="Empezá por el cliente. Estos datos van al documento final; no cambian el cálculo.">
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">
						Cliente
						{editingId && <span className="ml-1.5 text-[var(--success)] font-semibold normal-case tracking-normal">· editando</span>}
					</Label>
					<ClientSelector channel="b2b2c" clients={clientsApi?.clients || []} onCreate={clientsApi?.create} value={selectedClient} onChange={setSelectedClient} />
					{!selectedClient && <p className="text-[11px] text-[var(--warning)]">Indicá el cliente antes de guardar o exportar la cotización.</p>}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">Casos de uso <span className="normal-case tracking-normal font-normal">(para propuesta comercial)</span></Label>
					<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: recibos de haberes, contratos de RRHH, acuerdos comerciales..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
				</div>
			</FieldGroup>

			{/* ── 2 · Qué cotizás ── */}
			<FieldGroup step={2} title="Qué cotizás" subtitle="Modalidad y volumen de certificados por tipo. El resumen se arma a la derecha.">
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

				{/* Precio de firma: dinámico según el segmento (no se ingresa a mano). El
				    input es solo el precio de la firma extra (excedente), con override. */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio por firma <span className="normal-case tracking-normal font-normal">(dinámico)</span></Label>
						<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
							<span className="font-semibold tabular-nums">{hasVolume ? fMoney2(precioFirmaLista) : "—"}</span>
							<span className="ml-2 text-[11px] text-muted-foreground">{hasVolume ? "según segmento " + seg.label : "según el segmento alcanzado"}</span>
						</div>
						<span className="text-[11px] text-muted-foreground">Se calcula por el segmento (volumen facturado o cantidad de certs + firmas).</span>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio de firma extra <span className="normal-case tracking-normal font-normal">(excedente)</span></Label>
						<div className="relative flex items-center">
							<span className="absolute left-3 text-sm text-muted-foreground">USD</span>
							<Input type="number" min={0} value={precioFirmaExtra} onChange={function (e) { setPrecioFirmaExtra(e.target.value); }} placeholder={hasVolume ? precioFirmaLista.toFixed(3) : "dinámico"} className="tabular-nums pl-11" />
							{precioFirmaExtra !== "" && <button onClick={function () { setPrecioFirmaExtra(""); }} className="absolute right-3 text-muted-foreground hover:text-foreground text-xs">✕</button>}
						</div>
						<span className="text-[11px] text-muted-foreground">Precio si superan lo cotizado y siguen consumiendo. Vacío = usa el precio del segmento.</span>
					</div>
				</div>
			</FieldGroup>

			{/* ── 3 · Condiciones comerciales ── */}
			<FieldGroup step={3} title="Condiciones comerciales" subtitle={condResumen}>
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

				{/* Ajuste de precios personalizado (por componente) */}
				<div className="flex flex-col gap-2">
					<button onClick={function () { setShowOverrides(function (v) { return !v; }); }} className="flex items-center gap-2 text-sm font-medium border border-dashed border-border rounded-md px-3 py-2 hover:bg-muted/50 transition-colors w-full text-left">
						<span>Ajuste de precios personalizado</span>
						<span className="ml-auto text-muted-foreground text-xs">{showOverrides ? "▲ ocultar" : "▼ mostrar"}</span>
						{overrideActive && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)]">activo</Badge>}
					</button>
					{showOverrides && (
						<div className="pl-1 border-l-2 border-muted ml-1 space-y-2">
							<p className="text-[11px] text-muted-foreground">Completá el precio que quieras fijar a mano. El campo que dejes vacío usa el precio normal (segmento {seg.label}).</p>
							<div className="grid grid-cols-2 gap-3 max-w-sm">
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio cert. <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
									<div className="flex items-center gap-1">
										<Input type="number" value={overridePrecioCert} onChange={function (e) { setOverridePrecioCert(e.target.value); }} placeholder={seg.precioIDC != null ? String(seg.precioIDC) : ""} className="h-8 text-sm" />
										{overridePrecioCert !== "" && <button onClick={function () { setOverridePrecioCert(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
									</div>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio firma <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
									<div className="flex items-center gap-1">
										<Input type="number" value={overridePrecioFirma} onChange={function (e) { setOverridePrecioFirma(e.target.value); }} placeholder={segFirma.toFixed(3)} className="h-8 text-sm" />
										{overridePrecioFirma !== "" && <button onClick={function () { setOverridePrecioFirma(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
									</div>
								</div>
							</div>
							<p className="text-[10px] text-muted-foreground">Precio efectivo: cert {fMoney2(precioIDC)}{overridePrecioCert !== "" ? " · manual" : " · segmento"} · firma {fMoney2(precioFirmaLista)}{overridePrecioFirma !== "" ? " · manual" : " · segmento"}.</p>
						</div>
					)}
				</div>
				<Separator />

				{/* Proyección de crecimiento (opcional): override por propuesta que suma
				    al PDF una tabla de precios por volumen alcanzado. */}
				<div className="flex flex-col gap-3">
					<label className="flex items-center gap-2.5 cursor-pointer select-none">
						<input type="checkbox" checked={proyEnabled} onChange={function (e) { setProyEnabled(e.target.checked); }} className="rounded" />
						<span className="text-sm font-medium">Proyección de crecimiento en la propuesta</span>
						{proyEnabled && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activa</Badge>}
					</label>
					{!proyEnabled && <p className="text-[11px] text-muted-foreground pl-6">Opcional. Agrega al PDF una tabla de precios por volumen alcanzado, con descuento progresivo.</p>}

				{proyEnabled && (
					<div className="space-y-4">
						<p className="text-[11px] text-muted-foreground">
							Parte del volumen y el precio de esta cotización y muestra escalones crecientes con mejor precio. Es un override solo para esta propuesta: no cambia tu segmentación.
						</p>

						{/* Driver: qué escala en cada escalón */}
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">Qué crece en cada escalón</Label>
							<div className="flex gap-1 flex-wrap">
								{PROYECCION_DRIVERS.map(function (d) {
									const active = proyDriver === d.id;
									return (
										<button key={d.id} onClick={function () { changeDriver(d.id); }} className={"px-2.5 py-1 rounded-md text-xs transition-colors " + (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{d.label}</button>
									);
								})}
							</div>
							<span className="text-[11px] text-muted-foreground">{(PROYECCION_DRIVERS.find(function (d) { return d.id === proyDriver; }) || {}).desc}</span>
						</div>

						{/* Escalones editables */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-xs text-muted-foreground uppercase tracking-wide">Escalones</Label>
								<button onClick={resetSteps} className="text-[11px] text-muted-foreground hover:text-foreground">restaurar (5/10/25/50%)</button>
							</div>
							<div className="space-y-1.5">
								{proySteps.map(function (s, i) {
									return (
										<div key={i} className="flex items-end gap-2 flex-wrap">
											{proyDriver === "manual" ? (
												<>
													<div className="flex flex-col gap-1">
														<span className="text-[10px] text-muted-foreground">Certificados</span>
														<Input type="number" min={0} value={s.idc != null ? s.idc : ""} onChange={function (e) { updateStep(i, { idc: e.target.value }); }} className="h-8 w-28 text-sm tabular-nums" />
													</div>
													<div className="flex flex-col gap-1">
														<span className="text-[10px] text-muted-foreground">Firmas</span>
														<Input type="number" min={0} value={s.firmas != null ? s.firmas : ""} onChange={function (e) { updateStep(i, { firmas: e.target.value }); }} className="h-8 w-28 text-sm tabular-nums" />
													</div>
												</>
											) : (
												<div className="flex flex-col gap-1">
													<span className="text-[10px] text-muted-foreground">Crecimiento</span>
													<div className="flex items-center">
														<span className="text-xs text-muted-foreground mr-1">+</span>
														<Input type="number" min={0} value={s.pct} onChange={function (e) { updateStep(i, { pct: e.target.value }); }} className="h-8 w-20 text-sm tabular-nums" />
														<span className="text-xs text-muted-foreground ml-1">%</span>
													</div>
												</div>
											)}
											<div className="flex flex-col gap-1">
												<span className="text-[10px] text-muted-foreground">Descuento</span>
												<div className="flex items-center">
													<span className="text-xs text-muted-foreground mr-1">−</span>
													<Input type="number" min={0} max={100} value={s.descuento} onChange={function (e) { updateStep(i, { descuento: e.target.value }); }} className="h-8 w-20 text-sm tabular-nums" />
													<span className="text-xs text-muted-foreground ml-1">%</span>
												</div>
											</div>
											<button onClick={function () { removeStep(i); }} className="h-8 px-2 text-muted-foreground hover:text-destructive text-xs shrink-0" title="Quitar escalón">✕</button>
										</div>
									);
								})}
							</div>
							<button onClick={addStep} className="text-xs font-medium text-primary hover:underline">+ agregar escalón</button>
						</div>

						{/* Preview de la tabla que va al PDF */}
						{hasVolume ? (
							<div className="rounded-lg border border-border overflow-hidden">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Escenario</TableHead>
											<TableHead>Volumen</TableHead>
											<TableHead className="text-right">/ cert</TableHead>
											<TableHead className="text-right">/ firma</TableHead>
											<TableHead className="text-right">Costo est.</TableHead>
											<TableHead className="text-right">Ahorro</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{proyRows.map(function (r, i) {
											const isBase = i === 0;
											const isTarget = proyRows.length > 1 && i === proyRows.length - 1;
											return (
												<TableRow key={i} className={isTarget ? "bg-primary/5" : ""}>
													<TableCell className="font-medium">{isBase ? "Actual" : "+" + r.pct + "%"}{isTarget ? <span className="ml-1 text-[10px] text-primary font-semibold">objetivo</span> : null}</TableCell>
													<TableCell className="text-muted-foreground text-xs tabular-nums">{r.idc.toLocaleString("es-AR")} cert{r.firmas > 0 ? " · " + r.firmas.toLocaleString("es-AR") + " firmas" : ""}</TableCell>
													<TableCell className="text-right tabular-nums">{fMoney2(r.precioCert)}</TableCell>
													<TableCell className="text-right tabular-nums">{fMoney2(r.precioFirma)}</TableCell>
													<TableCell className="text-right tabular-nums font-semibold">{fMoney(r.costo)}</TableCell>
													<TableCell className="text-right tabular-nums text-[var(--success)]">{isBase ? "—" : fMoney(r.ahorroMonto) + " (" + (r.ahorroPct * 100).toFixed(0) + "%)"}</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						) : (
							<p className="text-[11px] text-muted-foreground">Cargá certificados para ver la proyección.</p>
						)}
						<p className="text-[10px] text-muted-foreground">Costo estimado = volumen de certificados y firmas a ese escalón (sin fee ni SLA). El descuento se aplica al precio de cert y de firma por igual.</p>
						</div>
					)}
				</div>
			</FieldGroup>

			{/* ── Referencia ── */}
			<CollapsibleSection title="Referencia · precios por segmento, API y SLA" subtitle="Tabla completa del modelo de volumen (Borrador v5).">
				<TabCanalB2B2CPrecios costs={costs} />
			</CollapsibleSection>
		</QuoteLayout>
	);
}
