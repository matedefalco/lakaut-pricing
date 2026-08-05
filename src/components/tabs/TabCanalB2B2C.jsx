import { useState, useEffect } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { getB2B2CSegment, getVolumenSegment, facturacionAtBase, segmentPricing, idcBundleCost, markupOf, minPriceForMarkup } from "@/lib/tiers";
import { tierMaterialInList } from "@/lib/tierMaterial";
import { useTierUp } from "@/utils/useTierUp";
import { buildProyeccion, PROYECCION_DRIVERS, DEFAULT_PROYECCION_STEPS } from "@/lib/proyeccion";
import { CHANNELS } from "@/data/channelMeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NumberField, SelectField } from "@/components/ui/field";
import { ClientSelector } from "@/components/ui/ClientSelector";
import { CommercialLevers } from "@/components/ui/CommercialLevers";
import { resolveLevers, defaultLeverSelection, leverValue } from "@/lib/commercialLevers";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { SaveExportBar } from "@/components/ui/SaveExportBar";
import { QuoteLayout, FieldGroup } from "@/components/ui/QuoteLayout";
import { TierBadge, TierTrophy } from "@/components/ui/TierBadge";
import { ResultPanel, ResultHero, ResultRow, StatusPill, AnimatedNumber } from "@/components/ui/ResultPanel";
import { TierHint } from "@/components/ui/TierHint";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useToast, notifyQuoteSaved, notifyQuoteExported, notifyTierUp } from "@/components/ui/Toaster";
import { TabCanalB2B2CPrecios } from "@/components/tabs/TabCanalB2B2CPrecios";

// La rentabilidad de este canal se lee como MARKUP sobre el costo variable
// (precio ÷ costo), que es la métrica de la columna "MARGEN" del Borrador v5: los
// 74% de Start Up son 0,65 ÷ 0,3741. Los umbrales son relativos al mínimo
// configurado, así que mover el guardarraíl mueve la semántica de los colores con él.
function markupClass(m, min) { return m == null || m >= min * 1.4 ? "text-[var(--success)]" : m >= min ? "text-[var(--warning)]" : "text-destructive"; }
function markupAccent(m, min) { return m == null || m >= min * 1.4 ? "success" : m >= min ? "warning" : "destructive"; }
function markupWord(m, min) { return m == null || m >= min * 1.4 ? "saludable" : m >= min ? "ajustado" : "a revisar"; }
function fMarkup(m) { return m == null ? "—" : m.toFixed(2) + "x"; }

// Fallback del descuento de abono si la config no lo tiene cargado todavía.
const ABONO_DESC_FALLBACK = 10;
// Fallbacks del precio de segmento si la config todavía no lo trae.
const SEG_FALLBACK = { precioIDC: 1.3438, firmasIncluidas: 3, precioFirmaExtra: 0.5 };
const MARKUP_MIN_FALLBACK = 1.2;
const VOLUMEN_BASE_FALLBACK = { cert: 0.65, firma: 0.5 };

export function TabCanalB2B2C({ channel, costs, currency, tc, dealsApi, clientsApi, onExport, onGoHistorial, pendingEdit, onConsumeEdit }) {
	// Los dos canales por elemento comparten este cotizador y se distinguen por la
	// prop `channel`. La diferencia es qué se vende y cómo se le pone precio:
	//   · b2b2c (IDC) → un bundle por IDC mensual, con cupo de firmas incluidas. El
	//                   segmento sale de la cantidad de IDC y trae su propio precio.
	//   · volumen     → certificados y firmas como items sueltos, cantidades cargadas
	//                   a mano y sin cupo. El segmento sale del compromiso en USD y
	//                   aplica un descuento sobre los dos precios de lista.
	const canal = channel === "volumen" ? "volumen" : "b2b2c";
	const esIDC = canal === "b2b2c";
	const meta = CHANNELS[canal];
	const { channelConfig } = useChannelConfig();
	const b2b2cSegments = channelConfig.b2b2cSegments;
	const volumenSegments = channelConfig.volumenSegments || [];
	const volumenBase = channelConfig.volumenBase || VOLUMEN_BASE_FALLBACK;
	const markupMin = channelConfig.b2b2cMarkupMin != null ? channelConfig.b2b2cMarkupMin : MARKUP_MIN_FALLBACK;
	const b2b2cApiTiers = channelConfig.b2b2cApiTiers;
	const slaPlans = channelConfig.slaPlans;
	const commercialLevers = channelConfig.commercialLevers;
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const { toast } = useToast();
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	const [selectedClient, setSelectedClient] = useState(null);
	// Moneda del PDF exportado. Independiente del toggle global de visualización:
	// arranca en ARS (moneda de facturación histórica) y se puede pasar a USD por
	// cotización desde la barra de exportar.
	const [exportCurrency, setExportCurrency] = useState("ARS");
	const [loadToken, setLoadToken] = useState(0);
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
	// Palancas de descuento por condiciones (time-to-cash, duración, velocidad de cierre).
	const [levers, setLevers] = useState(function () { return defaultLeverSelection(channelConfig.commercialLevers); });
	// Descuento del abono mensual (%): arranca en el default de la config, editable por cotización.
	const [abonoDescPct, setAbonoDescPct] = useState(function () { return channelConfig.abonoDescuentoPct != null ? channelConfig.abonoDescuentoPct : ABONO_DESC_FALLBACK; });
	// Firmas bonificadas (opcional): firmas facturables (las que exceden el cupo del
	// bundle) que no se cobran. No cambia el volumen ni el segmento, que salen de la
	// cantidad de IDC; solo descuenta su importe del subtotal.
	const [firmasBonificadas, setFirmasBonificadas] = useState("");
	const [showBonif, setShowBonif] = useState(false);
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
	const idc = nf + nj; // total de certificados / IDC
	const mesesVinculacion = Math.max(1, leverValue(commercialLevers, levers, "duracion") || 1);

	// ── Cantidad de firmas ──
	// En los dos canales las firmas se cargan por certificado y por tipo: cada tipo
	// lleva su propia cantidad de firmas por certificado (ej. 1 físico con 100 firmas
	// y 2 jurídicos con 1000 c/u). El total sale de multiplicar cantidad × firmas por
	// tipo. La diferencia entre canales no es cómo se cargan, sino qué se cobra: en
	// IDC el cupo del bundle va sin cargo, en Volumen se factura cada firma.
	const firmasFisica = nf * ff;
	const firmasJuridica = nj * fj;
	const firmasTotales = firmasFisica + firmasJuridica;

	// ── Segmento ──
	// IDC: sale de la cantidad de IDC mensuales (umbrales del Borrador v5) y cada
	// segmento trae su propio PRECIO por IDC, no un descuento. Debajo del primer
	// umbral se cotiza como Start Up en lugar de quedar sin precio.
	// Volumen: sale del compromiso del contrato en USD medido a precio de lista, y
	// aplica un DESCUENTO igual sobre el precio del certificado y el de la firma.
	// Usar siempre el precio base rompe la circularidad precio↔segmento.
	const facturacionAtList = facturacionAtBase(idc, firmasTotales, volumenBase);
	// El compromiso no se ingresa a mano: sale del volumen cotizado a precio de lista
	// por los meses de vinculación. Es la métrica que asigna el segmento de Volumen.
	const compromiso = facturacionAtList * mesesVinculacion;

	const seg = (esIDC ? getB2B2CSegment(idc, b2b2cSegments) : getVolumenSegment(compromiso, volumenSegments)) || {};
	const segLabel = seg.label || "—";
	const segDesc = esIDC ? 0 : Math.min(1, Math.max(0, Number(seg.descuento) || 0));
	// Precios de lista del segmento. En IDC vienen del propio tramo; en Volumen se
	// derivan del precio base menos el descuento del segmento.
	const segPrice = esIDC
		? segmentPricing(seg, SEG_FALLBACK)
		: {
			precioIDC: (Number(volumenBase.cert) || 0) * (1 - segDesc),
			firmasIncluidas: 0,
			precioFirmaExtra: (Number(volumenBase.firma) || 0) * (1 - segDesc),
		};

	// Cupo del bundle: cada IDC incluye `firmasIncluidas` sin cargo (la firma inicial
	// que requiere la institución más las de activación). Lo que exceda el cupo se
	// factura por unidad. En Volumen el cupo es cero, así que la misma fórmula deja
	// todas las firmas como facturables.
	const cupo = segPrice.firmasIncluidas;
	const firmasExtra = nf * Math.max(0, ff - cupo) + nj * Math.max(0, fj - cupo);
	const firmasEnCupo = firmasTotales - firmasExtra;
	// Bonificación: solo aplica a las firmas que efectivamente se facturan, porque las
	// del cupo ya van sin cargo. El volumen no cambia, así que el costo variable de las
	// firmas bonificadas se paga igual y baja el markup.
	const firmasBonif = Math.min(firmasExtra, Math.max(0, Number(firmasBonificadas) || 0));
	const firmasCobradas = firmasExtra - firmasBonif;

	const hasVolume = idc > 0 || firmasTotales > 0;

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
		setLevers(i.levers || defaultLeverSelection(commercialLevers));
		setFirmasBonificadas(i.firmasBonificadas != null ? String(i.firmasBonificadas) : "");
		setShowBonif(i.firmasBonificadas != null);
		setCasosDeUso(i.casosDeUso || "");
		setAbono(i.abono || false);
		setAbonoDescPct(i.abonoDescuentoPct != null ? i.abonoDescuentoPct : (channelConfig.abonoDescuentoPct != null ? channelConfig.abonoDescuentoPct : ABONO_DESC_FALLBACK));
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
		setLoadToken(function (n) { return n + 1; });
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	// Festejo al subir de segmento: sólo con volumen cargado y sólo al cambiar el
	// segmento efectivo (no en cada tecla). El loadToken evita festejar la carga de
	// una cotización guardada.
	const segmentList = esIDC ? b2b2cSegments : volumenSegments;
	useTierUp(hasVolume ? seg.id : null, segmentList, function (next) {
		const mat = tierMaterialInList(next, segmentList);
		notifyTierUp(toast, { label: next.label, emoji: mat.emoji, material: mat, discountPct: Math.round((next.descuento || 0) * 100) });
	}, loadToken);

	// ── Costos ──
	// El costo del bundle de una IDC incluye el certificado y las firmas de su cupo.
	// El costo total se calcula sobre las firmas REALES cotizadas (dentro y fuera del
	// cupo, bonificadas incluidas): todas se emiten y todas se pagan.
	const costoCert = idc * cvCert;
	const costoFirmas = firmasTotales * cvFirma;
	const costoTotal = costoCert + costoFirmas;
	const costoBundle = idcBundleCost(cvCert, cvFirma, cupo);

	// ── Precios efectivos ──
	// El precio de la IDC y el de la firma extra salen del segmento alcanzado. El
	// ajuste personalizado puede sobrescribir cualquiera de los dos; la IDC y la firma
	// nunca se mezclan en un mismo valor.
	const overrideActive = overridePrecioCert !== "" || overridePrecioFirma !== "";
	const precioIDC = overridePrecioCert !== "" ? Math.max(0, Number(overridePrecioCert) || 0) : segPrice.precioIDC;
	const precioFirmaExtraEff = overridePrecioFirma !== "" ? Math.max(0, Number(overridePrecioFirma) || 0) : segPrice.precioFirmaExtra;

	// ── Ingresos ──
	// El volumen cotizado es mensual, así que este subtotal es el del mes tipo. Las
	// firmas del cupo no generan ingreso propio: ya están dentro del precio de la IDC.
	const revCertFisicos = nf * precioIDC;
	const revCertJuridicos = nj * precioIDC;
	const revIDC = idc * precioIDC;
	// Firmas facturables por tipo. En IDC son las que exceden el cupo; en Volumen
	// (cupo 0) son todas. Se separan por tipo para el desglose del resumen.
	const firmasExtraFisica = nf * Math.max(0, ff - cupo);
	const firmasExtraJuridica = nj * Math.max(0, fj - cupo);
	const revFirmasFisica = firmasExtraFisica * precioFirmaExtraEff;
	const revFirmasJuridica = firmasExtraJuridica * precioFirmaExtraEff;
	const revFirmas = firmasExtra * precioFirmaExtraEff;
	const revServicioBruto = revIDC + revFirmas;

	// Bonificación de firmas: se resta del subtotal a precio de firma extra. Va antes
	// del descuento por condiciones para no descontar dos veces sobre firmas que no se
	// cobran.
	const bonifMonto = firmasBonif * precioFirmaExtraEff;
	const revServicioNeto = revServicioBruto - bonifMonto;

	// Condiciones comerciales (time-to-cash, duración, velocidad): se OFRECEN al
	// cliente como incentivos en la propuesta, pero NO se contemplan en el total. El
	// precio por segmento y la bonificación de firmas sí lo definen; las condiciones
	// se listan aparte. Snapshot en el deal para armar el apartado "ofrecido".
	const leverRes = resolveLevers(commercialLevers, levers);
	const condOfrecidaPct = leverRes.cappedPts;
	const hayCondOfrecidas = condOfrecidaPct > 0 && leverRes.items.length > 0;
	const revServicio = revServicioNeto;

	const feeAplicado = conApi ? Math.max(0, Number(fee) || 0) : 0;
	const slaMes = conApi && !slaBonificado ? (sla.precioMes || 0) : 0;
	const revSinFee = revServicio + slaMes;
	const revTotal = revSinFee + feeAplicado;

	const margen = revServicio - costoTotal;
	const margenPct = revServicio > 0 ? margen / revServicio : 0;
	// Markup del deal: es la métrica del guardarraíl y la que se compara contra la
	// columna de margen del Borrador v5.
	const markup = markupOf(revServicio, costoTotal);
	// Markup del precio de tabla del segmento contra el costo de su bundle: dice si el
	// precio configurado es viable antes de cualquier negociación.
	const markupSeg = markupOf(segPrice.precioIDC, costoBundle);
	const precioMinSeg = minPriceForMarkup(costoBundle, markupMin);

	// Abono (opcional): repone la bolsa de firmas cada mes con un descuento configurable
	// (default de la config, editable por cotización).
	const descAbono = Math.min(1, Math.max(0, Number(abonoDescPct) || 0) / 100);
	const precioFirmaAbono = precioFirmaExtraEff * (1 - descAbono);
	const revAbonoMes = firmasTotales * precioFirmaAbono;
	const revAbonoAnual = revAbonoMes * 12;

	// Guardarraíl de rentabilidad: se evalúa sobre el markup MEZCLADO (IDC + firmas
	// extra), no componente por componente, así una IDC con precio agresivo no dispara
	// la alarma cuando las firmas compensan. Bajo el mínimo no se puede guardar ni
	// exportar.
	const markupBajoMin = hasVolume && costoTotal > 0 && markup != null && markup < markupMin;

	// Cuánto falta para el siguiente segmento: contexto de negociación. En IDC el salto
	// no es un descuento sino un precio unitario más bajo, así que se muestra la
	// diferencia de precio; en Volumen sí es un descuento.
	const segIdx = segmentList.findIndex(function (s) { return s.id === seg.id; });
	const nextSeg = segIdx >= 0 && segIdx < segmentList.length - 1 ? segmentList[segIdx + 1] : null;
	let segHint = null;
	if (hasVolume && nextSeg) {
		if (esIDC) {
			const faltan = Math.max(0, (Number(nextSeg.idcMin) || 0) - idc);
			const precioNext = segmentPricing(nextSeg, SEG_FALLBACK).precioIDC;
			segHint = "Con " + faltan.toLocaleString("es-AR") + " IDC más entra en " + nextSeg.label + " · " + fMoney2(precioNext) + " por IDC.";
		} else {
			const faltan = Math.max(0, (Number(nextSeg.compromisoMin) || 0) - compromiso);
			segHint = "Con " + fMoney(faltan) + " más de compromiso entra en " + nextSeg.label + " · " + Math.round((Number(nextSeg.descuento) || 0) * 100) + "% de descuento.";
		}
	} else if (hasVolume) {
		segHint = "Es el segmento de mayor volumen.";
	}
	const segRows = segmentList.map(function (s) {
		if (esIDC) {
			const min = Number(s.idcMin) || 0;
			const p = segmentPricing(s, SEG_FALLBACK);
			return {
				id: s.id,
				cells: [
					<TierBadge key="seg" tier={s} tiers={segmentList} size="sm" />,
					min.toLocaleString("es-AR") + (s.idcMax == null ? "+" : "–" + (Number(s.idcMax) || 0).toLocaleString("es-AR")),
					fMoney2(p.precioIDC),
				],
			};
		}
		const min = Number(s.compromisoMin) || 0;
		return {
			id: s.id,
			cells: [
				<TierBadge key="seg" tier={s} tiers={segmentList} size="sm" />,
				fMoney(min) + (s.compromisoMax == null ? "+" : "–" + fMoney(Number(s.compromisoMax) || 0)),
				Math.round((Number(s.descuento) || 0) * 100) + "%",
			],
		};
	});

	// Resumen de estado de las condiciones comerciales (subtítulo del grupo).
	const condResumen = [
		conApi ? api.label : "sin integración API",
		conApi ? (slaBonificado ? "SLA bonificado" : sla.label) : null,
		overrideActive ? "precio ajustado" : "precio de tabla",
		firmasBonif > 0 ? firmasBonif.toLocaleString("es-AR") + " firmas bonificadas" : null,
		hayCondOfrecidas ? leverRes.cappedPts + "% condiciones ofrecidas" : null,
		abono ? "con abono mensual" : "sin abono",
	].filter(Boolean).join(" · ");

	// ── Proyección de crecimiento (preview) ──
	// Base = volumen y precio ya cotizados. El motor es el mismo que usa el export.
	const proyBase = { idc: idc, firmas: firmasExtra, precioCert: precioIDC, precioFirma: precioFirmaExtraEff };
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
						firmas: s.firmas != null && s.firmas !== "" ? s.firmas : Math.round(firmasExtra * k),
					};
				});
			});
		}
		setProyDriver(d);
	}

	function buildDeal(id, fecha) {
		return {
			id: id,
			channel: canal,
			fecha: fecha,
			updatedAt: editingId ? new Date().toISOString() : undefined,
			inputs: {
				integracion,
				certFisicos: nf, firmasPorCertFisico: ff,
				certJuridicos: nj, firmasPorCertJuridico: fj,
				idcMensuales: idc, // compat: consumido por historial/reportes/clientes
				firmasAdicPorIDC: 0,
				// Volumen: el compromiso en USD es lo que asignó el segmento. Las firmas
				// por tipo se guardan igual que en IDC (certFisicos/firmasPorCert…).
				...(esIDC ? {} : { compromiso }),
				// Cupo de firmas del bundle y precio de la firma que lo excede: viajan al
				// deal para que la propuesta y los reportes no dependan de la config viva.
				firmasIncluidasPorIDC: cupo,
				precioFirmaAdic: precioFirmaExtraEff,
				// Firmas bonificadas: solo viaja al deal cuando hay bonificación.
				...(firmasBonif > 0 ? { firmasBonificadas: firmasBonif } : {}),
				...(conApi ? { fee, slaId, slaBonificado } : {}),
				// Palancas de condiciones: selección + snapshot resuelto (estable ante
				// cambios posteriores de la config). Modelo "ofrecido": se listan como
				// incentivos en la propuesta pero no bajan el total. El flag distingue
				// estos deals de los del modelo anterior (donde sí se restaban).
				levers,
				condOfrecidas: true,
				...(hayCondOfrecidas ? { descCond: { pct: leverRes.pct, cappedPts: leverRes.cappedPts, cap: leverRes.cap, rawPct: leverRes.rawPct, capped: leverRes.capped, items: leverRes.items } } : {}),
				mesesVinculacion,
				casosDeUso, abono,
				...(abono ? { abonoDescuentoPct: Number(abonoDescPct) || 0 } : {}),
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
				segmento: segLabel, idcMensuales: idc,
				// Volumen: el segmento es un descuento, así que se guarda como tal para que
				// Reportes y el export lo lean igual que en el canal de distribuidores.
				...(esIDC ? {} : { segmentoDescuento: segDesc, compromiso }),
				certFisicos: nf, certJuridicos: nj,
				firmasTotales, firmasMes: firmasTotales,
				// Firmas dentro del cupo del bundle vs facturadas por unidad. La distinción
				// es la que permite leer el precio por elemento en Reportes sin confundir
				// una firma incluida (sin precio propio) con una vendida.
				firmasEnCupo, firmasExtra, firmasIncluidasPorIDC: cupo,
				// precioIDC = precio realizado; precioIDCLista = precio de tabla del
				// segmento. Con los dos, el descuento negociado se deriva sin mirar la
				// config, que puede haber cambiado desde que se guardó la cotización.
				precioIDC, precioIDCLista: segPrice.precioIDC,
				precioFirma: precioFirmaExtraEff, precioFirmaExtra: precioFirmaExtraEff,
				precioFirmaExtraLista: segPrice.precioFirmaExtra,
				revTotal, revMesTotal: revSinFee, revAnual: revSinFee * 12 + feeAplicado,
				// Las condiciones ya no bajan el total; se guarda el % ofrecido como dato
				// informativo (reportes lo ignoran para el descuento efectivo).
				revServicioBruto,
				...(hayCondOfrecidas ? { condOfrecidaPct } : {}),
				...(firmasBonif > 0 ? { firmasBonificadas: firmasBonif, firmasCobradas, bonifMonto } : {}),
				margen, margenPct, markup, costoTotal,
				...(abono ? { revAbonoMes, revAbonoAnual } : {}),
			},
		};
	}

	async function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? dealsApi.deals.find(function (d) { return d.id === editingId; }) : null;

		let client = selectedClient;
		if (!client && clientsApi) {
			client = await clientsApi.create("(sin nombre)", canal);
			setSelectedClient(client);
		}

		const deal = buildDeal(editingId || Date.now().toString(36), prev ? prev.fecha : now);
		if (prev?.resumen?.status) deal.resumen.status = prev.resumen.status;

		// El deal normalizado que vuelve de save() ya trae el bloque cot (correlativo,
		// versión, tipo), que el export usa para el ID en la portada.
		const norm = await dealsApi.save(deal, client?.id || null, client?.tipo || null);
		const savedDeal = norm || deal;

		setEditingId(savedDeal.id);
		setFlash(true);
		setSaved({ deal: savedDeal, client });
		setTimeout(function () { setFlash(false); }, 1500);

		notifyQuoteSaved(toast, {
			clientName: client?.name,
			onExport: function () { onExport && onExport(savedDeal, client, exportCurrency); },
			onGoHistorial: function () { onGoHistorial && onGoHistorial(savedDeal.id); },
		});
	}

	function exportNow() {
		const now = new Date().toISOString();
		const src = saved ? saved.deal : buildDeal(editingId || "preview", now);
		const client = saved ? saved.client : selectedClient;
		onExport && onExport(src, client, exportCurrency);
		notifyQuoteExported(toast, {
			clientName: client && client.name,
			channelLabel: meta.emoji + " " + meta.label,
			onGoHistorial: (saved && onGoHistorial) ? function () { onGoHistorial(src.id); } : null,
		});
	}

	const header = (
		<PageHeader
			title={meta.full + (selectedClient ? " · " + selectedClient.name : "")}
			description={
				<>
					{meta.desc}
					<InfoTooltip text={esIDC
						? "Un certificado es físico o jurídico; cuestan y cotizan igual. Cada IDC incluye un cupo de firmas sin cargo y las que lo excedan se facturan por unidad. El segmento sale de la cantidad de IDC mensuales y define el precio unitario."
						: "Certificados y firmas se cotizan como items independientes: se cargan las cantidades a mano, sin cupo de firmas incluidas. El segmento sale del compromiso del contrato en USD y aplica el mismo descuento sobre los dos precios de lista."} />
				</>
			}
		/>
	);

	// Panel de resultado = resumen de la cotización: segmento, cantidades y precios
	// por tipo, condiciones comerciales y total. Es lo que el vendedor lee para
	// entender qué está cotizando de un vistazo.
	const result = (
		<>
		<ResultPanel channel={canal} eyebrow={hasVolume ? "Resumen de la cotización" : "Resumen · sin datos"}>
			<ResultHero
				label={conApi ? "Total · mes 1" : "Total"}
				value={hasVolume ? <AnimatedNumber value={revTotal} format={fMoney2} /> : "—"}
				sub={hasVolume ? (conApi ? "Certificados + firmas + SLA · fee incluido" : "Certificados + firmas · sin integración API") : (esIDC ? "Cargá IDC para ver el total" : "Cargá certificados o firmas para ver el total")}
				empty={!hasVolume}
				pill={hasVolume ? <StatusPill tone={markupAccent(markup, markupMin)}>Markup {fMarkup(markup)} · {markupWord(markup, markupMin)}</StatusPill> : null}
			/>

			{/* Segmento + acceso contextual a la tabla de precios */}
			<div className="space-y-2 border-t border-border/60 pt-3">
				<TierTrophy
					tier={seg}
					tiers={segmentList}
					eyebrow={esIDC ? "Segmento · precio por IDC" : "Segmento · descuento"}
					discountPct={!esIDC && segDesc > 0 ? "−" + Math.round(segDesc * 100) : null}
					note={hasVolume
						? (esIDC
							? idc.toLocaleString("es-AR") + " IDC/mes · " + fMoney2(precioIDC) + " por IDC · " + cupo + " firma" + (cupo === 1 ? "" : "s") + " incluidas"
							: "compromiso " + fMoney(compromiso) + " · " + fMoney2(precioIDC) + "/cert · " + fMoney2(precioFirmaExtraEff) + "/firma")
						: null}
					empty={!hasVolume}
				/>
				{hasVolume && (
					<div className="flex justify-end">
						<TierHint label="ver segmentos" columns={esIDC ? ["Segmento", "IDC/mes", "Precio"] : ["Segmento", "Compromiso", "Desc."]} rows={segRows} activeId={seg.id} nextHint={segHint} />
					</div>
				)}
			</div>

			{/* Desglose por tipo de certificado */}
			{hasVolume ? (
				<div className="space-y-3">
					{nf > 0 && (
						<div className="rounded-lg bg-sky-50 px-3 py-2">
							<div className="flex items-center justify-between">
								<span className="text-[11px] font-semibold text-sky-700">{esIDC ? "IDC físicas" : "Certificados físicos"}</span>
								{ff > 0 && <span className="text-[11px] text-muted-foreground">{nf.toLocaleString("es-AR")} × {ff} firma{ff !== 1 ? "s" : ""}</span>}
							</div>
							<ResultRow label={(esIDC ? "IDC (" : "Certificados (") + nf.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revCertFisicos} format={fMoney2} />} accent="primary" />
							{firmasExtraFisica > 0 && <ResultRow label={(esIDC ? "Firmas sobre el cupo (" : "Firmas (") + firmasExtraFisica.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revFirmasFisica} format={fMoney2} />} />}
						</div>
					)}
					{nj > 0 && (
						<div className="rounded-lg bg-violet-50 px-3 py-2">
							<div className="flex items-center justify-between">
								<span className="text-[11px] font-semibold text-violet-700">{esIDC ? "IDC jurídicas" : "Certificados jurídicos"}</span>
								{fj > 0 && <span className="text-[11px] text-muted-foreground">{nj.toLocaleString("es-AR")} × {fj} firma{fj !== 1 ? "s" : ""}</span>}
							</div>
							<ResultRow label={(esIDC ? "IDC (" : "Certificados (") + nj.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revCertJuridicos} format={fMoney2} />} accent="primary" />
							{firmasExtraJuridica > 0 && <ResultRow label={(esIDC ? "Firmas sobre el cupo (" : "Firmas (") + firmasExtraJuridica.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revFirmasJuridica} format={fMoney2} />} />}
						</div>
					)}

					{/* Condiciones comerciales. Las palancas ya no se restan del total: se
					    ofrecen aparte (bloque debajo del total). */}
					<div>
						{firmasBonif > 0 && <ResultRow label={"Firmas bonificadas (" + firmasBonif.toLocaleString("es-AR") + ")"} value={<>−<AnimatedNumber value={bonifMonto} format={fMoney2} /></>} accent="success" valueClass="text-[var(--success)]" />}
						{conApi && <ResultRow label={"SLA · " + sla.label} value={slaBonificado ? "bonificado" : slaMes > 0 ? <AnimatedNumber value={slaMes} format={fMoney2} /> : "incluido"} />}
						{conApi && <ResultRow label="Fee de implementación (única vez)" value={<AnimatedNumber value={feeAplicado} format={fMoney2} />} />}
						{abono && <ResultRow label="Abono mensual (firmas)" value={<><AnimatedNumber value={revAbonoMes} format={fMoney2} />/mes</>} accent="success" />}
					</div>

					{/* Total */}
					<div className="flex items-center justify-between border-t-2 border-border pt-2">
						<span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{conApi ? "Total mes 1" : "Total"}</span>
						<span className="font-heading text-lg font-semibold tabular-nums"><AnimatedNumber value={revTotal} format={fMoney2} /></span>
					</div>

					{/* Condiciones comerciales OFRECIDAS: incentivos que el cliente puede
					    aprovechar, sin restarse del total cotizado. */}
					{hayCondOfrecidas && (
						<div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 space-y-1">
							<div className="flex items-center justify-between">
								<span className="text-[11px] font-semibold uppercase tracking-wide text-primary">Condiciones que puede aprovechar</span>
								<span className="text-[10px] text-muted-foreground">no afectan el total</span>
							</div>
							{leverRes.items.map(function (it) {
								return (
									<div key={it.key} className="flex items-center justify-between text-xs">
										<span className="text-muted-foreground">{it.optionLabel}</span>
										<span className="font-semibold tabular-nums text-primary">−{it.discount}%</span>
									</div>
								);
							})}
						</div>
					)}

					<p className="text-[10px] text-muted-foreground">
						{esIDC
							? "Cada IDC incluye " + cupo + " firma" + (cupo === 1 ? "" : "s") + ". Firma sobre el cupo: " + fMoney2(precioFirmaExtraEff) + " c/u" + (overridePrecioFirma !== "" ? " · manual" : " · segmento") + "."
							: "Certificado " + fMoney2(precioIDC) + " y firma " + fMoney2(precioFirmaExtraEff) + ", cada uno por unidad" + (overrideActive ? " · precio ajustado a mano" : " · segmento " + segLabel) + "."}
					</p>

					{markupBajoMin && (
						<div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2">
							<div className="text-[11px] font-semibold text-destructive">Markup bajo el mínimo ({markupMin.toFixed(2)}x)</div>
							<p className="text-[10px] text-muted-foreground mt-0.5">
								Esta cotización factura {fMarkup(markup)} su costo variable ({fMoney(costoTotal)}). Subí el precio, bajá el cupo de firmas incluidas o ajustá las condiciones para poder guardar y exportar.
							</p>
							{markupSeg != null && markupSeg < markupMin && (
								<p className="text-[10px] text-muted-foreground mt-1">
									El precio de tabla del segmento {segLabel} ya no cierra por sí solo: con {cupo} firma{cupo === 1 ? "" : "s"} incluidas el bundle cuesta {fMoney2(costoBundle)} y el mínimo viable es {fMoney2(precioMinSeg)} por IDC.
								</p>
							)}
						</div>
					)}
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
				<div className="mb-3 grid grid-cols-3 gap-3">
					<div>
						<div className="text-[10px] text-muted-foreground">Markup sobre costo</div>
						<div className={"font-heading text-base font-semibold tabular-nums " + markupClass(markup, markupMin)}>{fMarkup(markup)}</div>
						<div className="text-[10px] text-muted-foreground">mín. {markupMin.toFixed(2)}x · {markupWord(markup, markupMin)}</div>
					</div>
					<div>
						<div className="text-[10px] text-muted-foreground">Contribución marginal</div>
						<div className="font-heading text-base font-semibold tabular-nums"><AnimatedNumber value={margen} format={fMoney2} /></div>
						<div className="text-[10px] text-muted-foreground">{(margenPct * 100).toFixed(0)}% sobre ingreso</div>
					</div>
					<div>
						<div className="text-[10px] text-muted-foreground">Costo variable total</div>
						<div className="font-heading text-base font-semibold tabular-nums"><AnimatedNumber value={costoTotal} format={fMoney2} /></div>
						<div className="text-[10px] text-muted-foreground">{idc.toLocaleString("es-AR")} {esIDC ? "IDC" : "certs"} + {firmasTotales.toLocaleString("es-AR")} firmas{firmasBonif > 0 ? " (" + firmasBonif.toLocaleString("es-AR") + " bonificadas)" : ""}</div>
					</div>
				</div>
				<div className="space-y-1 border-t border-border/60 pt-2">
					<ResultRow label={<>{esIDC ? "Ingreso IDC" : "Ingreso certificados"}<InfoTooltip text={idc.toLocaleString("es-AR") + (esIDC ? " IDC × " : " certificados × ") + fMoney2(precioIDC) + (esIDC ? " por IDC = " : " por certificado = ") + fMoney2(revIDC)} /></>} value={<AnimatedNumber value={revIDC} format={fMoney2} />} accent="primary" />
					<ResultRow label={<>{esIDC ? "Ingreso firmas sobre el cupo" : "Ingreso firmas"}<InfoTooltip text={esIDC
						? firmasExtra.toLocaleString("es-AR") + " firmas por encima del cupo de " + cupo + " × " + fMoney2(precioFirmaExtraEff) + " = " + fMoney2(revFirmas) + ". Las " + firmasEnCupo.toLocaleString("es-AR") + " firmas del cupo ya están en el precio de la IDC."
						: firmasTotales.toLocaleString("es-AR") + " firmas × " + fMoney2(precioFirmaExtraEff) + " = " + fMoney2(revFirmas) + ". Todas se facturan: en este canal no hay cupo incluido."} /></>} value={revFirmas ? <AnimatedNumber value={revFirmas} format={fMoney2} /> : "—"} />
					{firmasBonif > 0 && <ResultRow label={<>Bonificación de firmas<InfoTooltip text={firmasBonif.toLocaleString("es-AR") + " firmas bonificadas × " + fMoney2(precioFirmaExtraEff) + " = " + fMoney(bonifMonto) + " que no se facturan. Su costo variable se paga igual."} /></>} value={<span className="tabular-nums text-destructive">−{fMoney(bonifMonto)}</span>} />}
					<ResultRow label={<>Costo certificados<InfoTooltip text={idc.toLocaleString("es-AR") + " certificados × " + fMoney2(cvCert) + " de costo variable c/u = " + fMoney(costoCert)} /></>} value={<span className="tabular-nums text-destructive">−{fMoney(costoCert)}</span>} />
					<ResultRow label={<>Costo firmas<InfoTooltip text={firmasTotales.toLocaleString("es-AR") + (esIDC ? " firmas emitidas (cupo incluido) × " : " firmas × ") + fMoney2(cvFirma) + " de costo variable c/u = " + fMoney(costoFirmas)} /></>} value={<span className="tabular-nums text-destructive">−{fMoney(costoFirmas)}</span>} />
					{esIDC && <ResultRow label={<>Costo del bundle por IDC<InfoTooltip text={"Certificado (" + fMoney2(cvCert) + ") + " + cupo + " firma" + (cupo === 1 ? "" : "s") + " del cupo (" + fMoney2(cvFirma) + " c/u) = " + fMoney2(costoBundle) + ". Precio mínimo viable a " + markupMin.toFixed(2) + "x: " + fMoney2(precioMinSeg) + "."} /></>} value={<span className="tabular-nums">{fMoney2(costoBundle)}</span>} />}
				</div>
			</div>
		)}
		</>
	);

	const footer = (
		<SaveExportBar
			hint={!hasVolume ? (esIDC ? "Cargá al menos una IDC para guardar o exportar." : "Cargá al menos un certificado para guardar o exportar.") : (markupBajoMin ? "Markup " + fMarkup(markup) + ", bajo el mínimo de " + markupMin.toFixed(2) + "x. Ajustá precio, cupo de firmas o condiciones." : "")}
			canSave={hasVolume && !markupBajoMin}
			canExport={hasVolume && !markupBajoMin}
			onSave={saveQuote}
			onExport={exportNow}
			onCancelEdit={function () { setEditingId(null); }}
			editingId={editingId}
			flash={flash}
			exportCurrency={exportCurrency}
			onExportCurrencyChange={setExportCurrency}
		/>
	);

	return (
		<QuoteLayout header={header} result={result} footer={footer}>
			{/* ── 1 · Para la propuesta ── */}
			<FieldGroup step={1} channel={canal} done={!!selectedClient} title="Para la propuesta" subtitle="Empezá por el cliente. Estos datos van al documento final; no cambian el cálculo.">
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">
						Cliente
						{editingId && <span className="ml-1.5 text-[var(--success)] font-semibold normal-case tracking-normal">· editando</span>}
					</Label>
					<ClientSelector channel={canal} clients={clientsApi?.clients || []} onCreate={clientsApi?.create} onSetTipo={clientsApi?.setTipo} value={selectedClient} onChange={setSelectedClient} />
					{!selectedClient && <p className="text-[11px] text-[var(--warning)]">Indicá el cliente antes de guardar o exportar la cotización.</p>}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">Casos de uso <span className="normal-case tracking-normal font-normal">(para propuesta comercial)</span></Label>
					<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: recibos de haberes, contratos de RRHH, acuerdos comerciales..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
				</div>
			</FieldGroup>

			{/* ── 2 · Qué cotizás ── */}
			<FieldGroup step={2} channel={canal} done={hasVolume} title="Qué cotizás" subtitle={esIDC ? "Modalidad y volumen de IDC por tipo. El resumen se arma a la derecha." : "Modalidad y cantidades de certificados y firmas. Cada elemento se cotiza por separado."}>
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
							<span className="text-xs font-semibold text-sky-700">{esIDC ? "IDC físicas" : "Certificados físicos"}</span>
							<span className="text-[10px] text-muted-foreground">· personas</span>
						</div>
						<div className="grid grid-cols-2 gap-2.5">
							<NumberField label={esIDC ? "Cantidad / mes" : "Cantidad"} value={certFisicos} onChange={setCertFisicos} min={0} placeholder="0" />
							<NumberField label="Firmas c/u" value={firmasPorCertFisico} onChange={setFirmasPorCertFisico} min={0} note={esIDC ? (ff > cupo ? (ff - cupo) + " sobre el cupo" : "dentro del cupo de " + cupo) : (ff > 0 ? (nf * ff).toLocaleString("es-AR") + " firmas físicas" : "por certificado")} />
						</div>
					</div>
					<div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
						<div className="mb-2.5 flex items-center gap-1.5">
							<span className="inline-block size-2 rounded-full bg-violet-500" />
							<span className="text-xs font-semibold text-violet-700">{esIDC ? "IDC jurídicas" : "Certificados jurídicos"}</span>
							<span className="text-[10px] text-muted-foreground">· empresas</span>
						</div>
						<div className="grid grid-cols-2 gap-2.5">
							<NumberField label={esIDC ? "Cantidad / mes" : "Cantidad"} value={certJuridicos} onChange={setCertJuridicos} min={0} placeholder="0" />
							<NumberField label="Firmas c/u" value={firmasPorCertJuridico} onChange={setFirmasPorCertJuridico} min={0} note={esIDC ? (fj > cupo ? (fj - cupo) + " sobre el cupo" : "dentro del cupo de " + cupo) : (fj > 0 ? (nj * fj).toLocaleString("es-AR") + " firmas jurídicas" : "por certificado")} />
						</div>
					</div>
				</div>

				{/* Precios derivados del segmento. En IDC es el precio del bundle más su cupo;
				    en Volumen, los dos precios de lista ya con el descuento del segmento. Ninguno
				    se edita acá: se ajustan desde el bloque de precio personalizado del paso 3. */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">{esIDC ? "Precio por IDC" : "Precio por certificado"}</Label>
						<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
							<span className="font-semibold tabular-nums">{hasVolume ? fMoney2(precioIDC) : "—"}</span>
							<span className="ml-2 text-[11px] text-muted-foreground truncate">{hasVolume ? "segmento " + segLabel + (overridePrecioCert !== "" ? " · manual" : "") : (esIDC ? "según el volumen de IDC" : "según el compromiso")}</span>
						</div>
						<span className="text-[11px] text-muted-foreground">{esIDC ? "Escala por volumen mensual de IDC." : "Precio base menos el descuento del segmento."}</span>
					</div>
					{esIDC ? (
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">Firmas incluidas por IDC</Label>
							<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
								<span className="font-semibold tabular-nums">{cupo}</span>
								<span className="ml-2 text-[11px] text-muted-foreground truncate">{hasVolume && firmasExtra > 0 ? firmasExtra.toLocaleString("es-AR") + " sobre el cupo" : "cupo del bundle"}</span>
							</div>
							<span className="text-[11px] text-muted-foreground">Firma inicial de la institución más firmas de activación.</span>
						</div>
					) : (
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">Descuento del segmento</Label>
							<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
								<span className="font-semibold tabular-nums">{segDesc > 0 ? "−" + Math.round(segDesc * 100) + "%" : "sin descuento"}</span>
							</div>
							<span className="text-[11px] text-muted-foreground">Se aplica por igual al certificado y a la firma.</span>
						</div>
					)}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">{esIDC ? "Firma sobre el cupo" : "Precio por firma"}</Label>
						<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
							<span className="font-semibold tabular-nums">{fMoney2(precioFirmaExtraEff)}</span>
							<span className="ml-2 text-[11px] text-muted-foreground truncate">{overridePrecioFirma !== "" ? "manual" : "segmento"}</span>
						</div>
						<span className="text-[11px] text-muted-foreground">{esIDC ? "Se factura por unidad a partir de la firma " + (cupo + 1) + " de cada IDC." : "Cada firma se factura por unidad."}</span>
					</div>
				</div>
			</FieldGroup>

			{/* ── 3 · Condiciones comerciales ── */}
			<FieldGroup step={3} channel={canal} done={hasVolume} title="Condiciones comerciales" subtitle={condResumen}>
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

				{/* Condiciones comerciales OFRECIDAS: se listan en la propuesta como
				    incentivos que el cliente puede aprovechar. No bajan el total. */}
				<div className="flex flex-col gap-2">
					<span className="text-sm font-medium">Condiciones comerciales que ofrecés</span>
					<p className="text-[11px] text-muted-foreground">Se listan en la propuesta como incentivos que el cliente puede aprovechar. No modifican el total cotizado.</p>
					<CommercialLevers levers={commercialLevers} value={levers} onChange={setLevers} />
				</div>

				<Separator />

				{/* Bonificación de firmas (opcional): parte de las firmas facturables no se
				    cobra. No toca el volumen ni el segmento, solo el subtotal a facturar. */}
				<div className="flex flex-col gap-3">
					<label className="flex items-center gap-2.5 cursor-pointer select-none">
						<input type="checkbox" checked={showBonif} onChange={function (e) { setShowBonif(e.target.checked); if (!e.target.checked) setFirmasBonificadas(""); }} className="rounded" />
						<span className="text-sm font-medium">Bonificar firmas</span>
						{firmasBonif > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)] border-[var(--success)]">{firmasBonif.toLocaleString("es-AR")} bonificadas</Badge>}
					</label>
					{!showBonif && <p className="text-[11px] text-muted-foreground pl-6">Opcional. Regalá firmas que estén por encima del cupo del bundle: son las únicas que se facturan por unidad.</p>}
					{showBonif && (
						<div className="pl-6 border-l-2 border-muted ml-1 space-y-2">
							<div className="max-w-xs">
								<NumberField label="Firmas bonificadas" value={firmasBonificadas} onChange={setFirmasBonificadas} min={0} max={firmasExtra} placeholder="0"
									note={hasVolume ? (firmasExtra > 0 ? "De las " + firmasExtra.toLocaleString("es-AR") + " firmas sobre el cupo." : "Este volumen no tiene firmas sobre el cupo.") : "Cargá el volumen primero."} />
							</div>
							{firmasBonif > 0 && (
								<p className="text-sm text-muted-foreground">
									{firmasBonif.toLocaleString("es-AR")} firmas × {fMoney2(precioFirmaExtraEff)} = <span className="font-semibold text-[var(--success)]">−{fMoney(bonifMonto)}</span> · se facturan {firmasCobradas.toLocaleString("es-AR")} de {firmasExtra.toLocaleString("es-AR")} firmas sobre el cupo.
								</p>
							)}
							{Number(firmasBonificadas) > firmasExtra && (
								<p className="text-[11px] text-[var(--warning)]">Solo se pueden bonificar las {firmasExtra.toLocaleString("es-AR")} firmas que exceden el cupo; las del cupo ya van sin cargo.</p>
							)}
							<p className="text-[11px] text-muted-foreground">El segmento se sigue calculando sobre el volumen completo de IDC. El costo variable de las firmas bonificadas se paga igual, así que baja el markup.</p>
						</div>
					)}
				</div>

				<Separator />

				{/* Segmento y proyección. En IDC el segmento sale del volumen del paso 2 y acá
				    solo se muestra; en Volumen lo define el compromiso del contrato en USD, que
				    se sugiere como facturación a lista × meses de vinculación y se puede
				    sobrescribir cuando el cliente compromete un volumen distinto al cotizado. */}
				<div className="flex flex-col gap-2">
					<span className="text-sm font-medium">{esIDC ? "Segmento y proyección" : "Compromiso del contrato"}</span>
					<p className="text-[11px] text-muted-foreground">
						{esIDC
							? "El segmento lo define el volumen mensual de IDC del paso 2. La duración sale de la palanca de vinculación."
							: "El segmento sale del compromiso del contrato, que se calcula solo: facturación a lista del volumen cotizado × meses de vinculación (palanca de duración)."}
					</p>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						{!esIDC && (
							<div className="flex flex-col gap-1.5">
								<Label className="text-xs text-muted-foreground uppercase tracking-wide">Compromiso del contrato</Label>
								<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
									<span className="font-semibold tabular-nums">{hasVolume ? fMoney(compromiso) : "—"}</span>
								</div>
								<span className="text-[11px] text-muted-foreground">{hasVolume ? fMoney(facturacionAtList) + " a lista × " + mesesVinculacion + " " + (mesesVinculacion === 1 ? "mes" : "meses") : "se calcula del volumen cotizado"}</span>
							</div>
						)}
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">Segmento alcanzado</Label>
							<div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2">
								{hasVolume ? <TierBadge tier={seg} tiers={segmentList} size="sm" sub={esIDC ? fMoney2(segPrice.precioIDC) : (segDesc > 0 ? "−" + Math.round(segDesc * 100) + "%" : null)} /> : <span className="text-sm text-muted-foreground/40">—</span>}
								<span className="text-[11px] text-muted-foreground truncate">{hasVolume ? (esIDC ? "por " + idc.toLocaleString("es-AR") + " IDC/mes" : "por " + fMoney(compromiso)) : "cargá volumen"}</span>
							</div>
							<span className="text-[11px] text-muted-foreground">{esIDC ? "Precio de tabla del segmento." : "Descuento sobre los dos precios de lista."}</span>
						</div>
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">Facturación mensual</Label>
							<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
								<span className="font-semibold tabular-nums">{hasVolume ? fMoney2(revSinFee) : "—"}</span>
							</div>
							<span className="text-[11px] text-muted-foreground">Servicio + SLA, sin el fee.</span>
						</div>
						{esIDC && (
							<div className="flex flex-col gap-1.5">
								<Label className="text-xs text-muted-foreground uppercase tracking-wide">Por la vinculación</Label>
								<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
									<span className="font-semibold tabular-nums">{hasVolume ? fMoney2(revSinFee * mesesVinculacion + feeAplicado) : "—"}</span>
								</div>
								<span className="text-[11px] text-muted-foreground">{mesesVinculacion} {mesesVinculacion === 1 ? "mes" : "meses"} + fee.</span>
							</div>
						)}
					</div>
				</div>

				<Separator />

				{/* Abono mensual */}
				<div className="flex flex-col gap-3">
					<label className="flex items-center gap-2.5 cursor-pointer select-none">
						<input type="checkbox" checked={abono} onChange={function (e) { setAbono(e.target.checked); }} className="rounded" />
						<span className="text-sm font-medium">Incluir abono mensual de firmas</span>
						{abono && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activo</Badge>}
					</label>
					{abono && (
						<div className="pl-6 border-l-2 border-muted ml-1 flex items-center gap-2">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">Descuento del abono</Label>
							<div className="flex items-center gap-1">
								<Input type="number" min={0} max={100} value={abonoDescPct} onChange={function (e) { setAbonoDescPct(e.target.value === "" ? "" : Number(e.target.value)); }} className="h-8 w-20 text-sm tabular-nums" />
								<span className="text-sm text-muted-foreground">%</span>
							</div>
						</div>
					)}
					{abono && hasVolume && (
						<div className="pl-6 border-l-2 border-muted ml-1 text-sm text-muted-foreground space-y-1">
							<p>Repone la bolsa de firmas cada mes con un descuento del {(descAbono * 100).toFixed(0)}% sobre el precio de firma.</p>
							<p className="text-xs">{firmasTotales.toLocaleString("es-AR")} firmas × USD {precioFirmaAbono.toFixed(3)}/firma = <span className="font-semibold text-foreground">{fMoney(revAbonoMes)}/mes</span></p>
						</div>
					)}
				</div>

				<Separator />

				{/* Ajuste de precios personalizado (por componente) */}
				<div className="flex flex-col gap-3">
					<label className="flex items-center gap-2.5 cursor-pointer select-none">
						<input type="checkbox" checked={showOverrides} onChange={function (e) { setShowOverrides(e.target.checked); }} className="rounded" />
						<span className="text-sm font-medium">Ajuste de precios personalizado</span>
						{overrideActive && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activo</Badge>}
					</label>
					{!showOverrides && <p className="text-[11px] text-muted-foreground pl-6">Opcional. Fijá a mano el precio de certificado o de firma para esta cotización; lo que dejes vacío usa el precio del segmento.</p>}
					{showOverrides && (
						<div className="space-y-2">
							<p className="text-[11px] text-muted-foreground">Completá el precio que quieras fijar a mano. El campo que dejes vacío usa el precio normal (segmento {seg.label}).</p>
							<div className="grid grid-cols-2 gap-3 max-w-sm">
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio cert. <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
									<div className="flex items-center gap-1">
										<Input type="number" value={overridePrecioCert} onChange={function (e) { setOverridePrecioCert(e.target.value); }} placeholder={segPrice.precioIDC.toFixed(3)} className="h-8 text-sm" />
										{overridePrecioCert !== "" && <button onClick={function () { setOverridePrecioCert(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
									</div>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Precio firma <span className="normal-case tracking-normal font-normal">(USD)</span></Label>
									<div className="flex items-center gap-1">
										<Input type="number" value={overridePrecioFirma} onChange={function (e) { setOverridePrecioFirma(e.target.value); }} placeholder={segPrice.precioFirmaExtra.toFixed(3)} className="h-8 text-sm" />
										{overridePrecioFirma !== "" && <button onClick={function () { setOverridePrecioFirma(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
									</div>
								</div>
							</div>
							<p className="text-[10px] text-muted-foreground">Precio efectivo: IDC {fMoney2(precioIDC)}{overridePrecioCert !== "" ? " · manual" : " · segmento"} · firma sobre el cupo {fMoney2(precioFirmaExtraEff)}{overridePrecioFirma !== "" ? " · manual" : " · segmento"}.</p>
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
