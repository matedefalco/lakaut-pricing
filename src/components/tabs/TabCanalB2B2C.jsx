import { useState, useEffect, useRef, useMemo } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { getB2B2CSegment, b2b2cSegmentDriver, b2b2cSegmentsPuntual, getVolumenSegment, volumenSegmentDriver, getDistributorVolTier, distributorVolTierDriver, facturacionAtBase, segmentPricing, segmentViability, markupOf } from "@/lib/tiers";
import { dealStatus } from "@/lib/dealStatus";
import { tierMaterialInList } from "@/lib/tierMaterial";
import { useTierUp } from "@/utils/useTierUp";
import { buildProyeccion, buildEscalonadoFirmas, DEFAULT_PROYECCION_STEPS } from "@/lib/proyeccion";
import { CHANNELS, isDistribVol, resolveChannel, channelLabel } from "@/data/channelMeta";
import { slaGanadoPorFacturacion } from "@/data/channels";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ProyeccionSection } from "./b2b2c/ProyeccionSection";
import { SegmentoSection } from "./b2b2c/SegmentoSection";
import { ConditionBlock, ExtraCard } from "./b2b2c/ConditionBlock";
import { Handshake, Wallet, Gift, CalendarClock, SlidersHorizontal, TrendingUp, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { NumberField, SelectField } from "@/components/ui/field";
import { ClientSelector } from "@/components/ui/ClientSelector";
import { CommercialLevers } from "@/components/ui/CommercialLevers";
import { resolveLevers, defaultLeverSelection, leverValue } from "@/lib/commercialLevers";
import { DESC_OPCIONES, DESC_OPCION_DEFAULT, DESC_OPCION_LEGACY, descOpcion, descOpcionId, resolveDescLiquidacion } from "@/lib/descLiquidacion";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { SaveExportBar } from "@/components/ui/SaveExportBar";
import { QuoteLayout, FieldGroup } from "@/components/ui/QuoteLayout";
import { TierBadge } from "@/components/ui/TierBadge";
import { ResultPanel, ResultRow, AnimatedNumber } from "@/components/ui/ResultPanel";
import { TierHint } from "@/components/ui/TierHint";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useToast, notifyQuoteSaved, notifyTierUp } from "@/components/ui/Toaster";
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
const SEG_FALLBACK = { precioIDC: 0.65, precioFirma: 0.2313, precioFirmaExtra: 0.5 };
const FIRMAS_BIENVENIDA_FALLBACK = 3;
// Vigencia del certificado de una IDC (meses desde la emisión). Define si un cliente
// tiene identidades activas para cotizar recompra. Mismo valor que el PDF.
const IDC_VIGENCIA_MESES = 24;
const MARKUP_MIN_FALLBACK = 1.2;
const VOLUMEN_BASE_FALLBACK = { cert: 0.65, firma: 0.5 };

// Escalonado de Distribuidores-Volumen: se DERIVA de los niveles (una fila por nivel),
// no de una tabla aparte. Cada fila es el umbral de firmas del nivel con su descuento,
// así el escalonado que va a la propuesta y el descuento del nivel cotizado quedan
// siempre alineados (el tramo "actual" que resalta buildEscalonadoFirmas coincide con
// el nivel asignado por el volumen). Reusa el formato { firmas, descuento } del
// escalonado de Volumen para no tocar el motor ni el export.
function distribVolEscalonadoSteps(tiers) {
	return (Array.isArray(tiers) ? tiers : [])
		.map(function (t) { return { firmas: Math.max(1, Math.round(Number(t.firmasMin) || 0)), descuento: Math.round((Number(t.descuento) || 0) * 100) }; })
		.filter(function (s) { return s.firmas > 0; })
		.sort(function (a, b) { return a.firmas - b.firmas; });
}

export function TabCanalB2B2C({ channel, costs, currency, tc, dealsApi, clientsApi, onExport, onSaved, onGoHistorial, onNavChannel, pendingEdit, onConsumeEdit }) {
	// Los canales por elemento comparten este cotizador y se distinguen por la prop
	// `channel`. La diferencia es qué se vende y cómo se le pone precio:
	//   · b2b2c (IDC)         → IDC (identidad + certificado) y firmas por unidad, sin
	//                           cupo. El segmento sale de la cantidad de IDC y trae los
	//                           dos precios. Cada cotización bonifica 3 firmas en total.
	//   · volumen             → certificados y firmas como items sueltos, cantidades a
	//                           mano y sin cupo. El segmento sale del compromiso en USD y
	//                           aplica un descuento sobre los dos precios de lista.
	//   · distribuidores_vol  → igual que volumen (mismo precio base, mismo cálculo por
	//                           elemento), pero el segmento es el NIVEL del socio
	//                           (Azul→Platinum), asignado por sus variables declaradas
	//                           (base instalada + compromiso anual), no por el volumen.
	const esIDC = channel === "b2b2c";
	const esDistribVol = channel === "distribuidores_vol";
	const canal = esIDC ? "b2b2c" : esDistribVol ? "distribuidores_vol" : "volumen";
	const meta = CHANNELS[canal];
	const { channelConfig } = useChannelConfig();
	const b2b2cSegments = channelConfig.b2b2cSegments;
	// Escala de segmentos que aplica el descuento sobre la base por elemento: en Volumen
	// son los tramos por compromiso; en Distribuidores-Volumen, los niveles del socio.
	const volumenSegments = channelConfig.volumenSegments || [];
	const distribVolTiers = channelConfig.distribuidorVolTiers || [];
	const volumenBase = channelConfig.volumenBase || VOLUMEN_BASE_FALLBACK;
	// Precio base propio del canal Distribuidores-Volumen: certificado bonificado (0),
	// firma USD 1,00. No comparte volumenBase (que es del canal Volumen). El descuento
	// del nivel pega solo sobre la firma; el certificado ya es gratis.
	const distribVolBase = channelConfig.distribuidorVolBase || { cert: 0, firma: 1 };
	// Base efectiva del canal en curso: la propia en Distribuidores-Volumen, volumenBase
	// en Volumen. IDC no la usa (trae su propio precio por segmento).
	const baseCanal = esDistribVol ? distribVolBase : volumenBase;
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
	// arranca en USD (default comercial desde oct 2026) y se puede pasar a ARS por
	// cotización desde la barra de exportar.
	const [exportCurrency, setExportCurrency] = useState("USD");
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
	// Firmas sueltas (solo Volumen): firmas que se cotizan sin certificado asociado y
	// sin atribución de tipo. Permiten cotizar firmas sin certificados necesariamente.
	const [firmasSueltas, setFirmasSueltas] = useState("");
	const [fee, setFee] = useState(3250);
	// "auto" = el plan que se alcanza por facturación (incluido sin cargo). Un id puntual
	// fija el plan: si está por encima del alcanzado, se cobra a su precio.
	const [slaId, setSlaId] = useState("auto");
	const [slaBonificado, setSlaBonificado] = useState(false);
	// Palancas de descuento por condiciones (time-to-cash, duración, velocidad de cierre).
	const [levers, setLevers] = useState(function () { return defaultLeverSelection(channelConfig.commercialLevers); });
	// Descuento del abono mensual (%): arranca en el default de la config, editable por cotización.
	const [abonoDescPct, setAbonoDescPct] = useState(function () { return channelConfig.abonoDescuentoPct != null ? channelConfig.abonoDescuentoPct : ABONO_DESC_FALLBACK; });
	// Firmas bonificadas (opcional): firmas facturables que no se cobran, además de las
	// de bienvenida de IDC. No cambia el volumen ni el segmento, que salen de la
	// cantidad de IDC; solo descuenta su importe del subtotal.
	const [firmasBonificadas, setFirmasBonificadas] = useState("");
	const [showBonif, setShowBonif] = useState(false);
	// Forma de liquidación del descuento de nivel (solo Volumen y Distribuidores-Volumen).
	// Se elige de una lista plana de opciones (ver [[descLiquidacion]]); se guarda el id
	// plano y al persistir/exportar se traduce al modelo { forma, sub }. Default = B1
	// (pago anticipado con descuento aplicado), el comportamiento histórico del canal.
	const [descOpcionSel, setDescOpcionSel] = useState(DESC_OPCION_DEFAULT);
	// Modalidad de facturación (solo Distribuidores-Volumen): define la ventana de tiempo
	// con la que se mide la facturación que puede asignar el nivel. "anual" anualiza la
	// facturación del contrato (× meses de vinculación); "unico" mide solo la compra
	// puntual (× 1). En Volumen no cambia los totales, solo el eje de facturación del nivel.
	// En IDC define además el ingreso anual: "unico" = consumo puntual (sin × 12),
	// "anual" = compromiso anual (consumo mensual × 12). Default IDC: consumo único.
	const [modalidadFact, setModalidadFact] = useState(esIDC ? "unico" : "anual"); // "anual" | "unico"
	// IDC con compromiso anual: el consumo se carga por mes o por año. Por año se divide
	// por 12 para obtener el consumo mensual sobre el que se cotiza.
	const [idcEntrada, setIdcEntrada] = useState("mensual"); // "mensual" | "anual"
	// IDC: por defecto no se distingue el tipo (cuestan y cotizan igual). Se puede
	// activar para cargar físicas y jurídicas por separado (desglose de la propuesta).
	const [idcPorTipo, setIdcPorTipo] = useState(false);
	// Recompra IDC: el cliente ya tiene identidades activas (certificado vigente), así que
	// se cotizan firmas para esas identidades sin volver a cobrar el certificado. Se
	// sugiere sola por historial; el vendedor la puede forzar por cliente.
	const [recompraManual, setRecompraManual] = useState(null); // { clientId, value } | null
	const [firmasRecompra, setFirmasRecompra] = useState("");
	const [casosDeUso, setCasosDeUso] = useState("");
	const [editingId, setEditingId] = useState(null);
	// Base instalada del socio (solo Distribuidores-Volumen): certificados de sus
	// cotizaciones ya confirmadas en este canal. No se carga a mano; se le suma el
	// volumen de esta cotización para dar los certificados activos que asignan el nivel.
	const certsHistoricos = useMemo(function () {
		if (!esDistribVol || !selectedClient) return 0;
		return (dealsApi?.deals || [])
			.filter(function (d) { return d.client_id === selectedClient.id && d.id !== editingId && isDistribVol(d.channel) && dealStatus(d) === "confirmada"; })
			.reduce(function (s, d) { return s + ((d.resumen && d.resumen.idcMensuales) || 0); }, 0);
	}, [esDistribVol, selectedClient, dealsApi, editingId]);
	// Identidades IDC activas del cliente: las de sus cotizaciones IDC confirmadas dentro
	// de la vigencia del certificado (24 meses desde la emisión). Si hay, la cotización
	// se sugiere como recompra.
	const idcActivos = useMemo(function () {
		if (!esIDC || !selectedClient) return { n: 0, deals: [] };
		const limite = Date.now() - IDC_VIGENCIA_MESES * 30.44 * 86400000;
		const ds = (dealsApi?.deals || []).filter(function (d) {
			return d.client_id === selectedClient.id && d.id !== editingId && d.channel === "b2b2c" && dealStatus(d) === "confirmada"
				&& (!d.fecha || new Date(d.fecha).getTime() >= limite) && !(d.inputs && d.inputs.recompra && !((d.resumen && (d.resumen.certFisicos || d.resumen.certJuridicos)) > 0));
		});
		return { n: ds.reduce(function (s, d) { const r = d.resumen || {}; return s + ((Number(r.certFisicos) || 0) + (Number(r.certJuridicos) || 0) || Number(r.idcMensuales) || 0); }, 0), deals: ds };
	}, [esIDC, selectedClient, dealsApi, editingId]);
	const recompraSugerida = idcActivos.n > 0;
	const recompra = esIDC && (recompraManual && recompraManual.clientId === (selectedClient ? selectedClient.id : null) ? recompraManual.value : recompraSugerida);
	// Id de la versión creada en esta sesión de edición: mientras se siga trabajando
	// sobre ella, los guardados la pisan en vez de crear más versiones. Ver saveQuote.
	const sessionVersionId = useRef(null);
	const [flash, setFlash] = useState(false);
	const [saved, setSaved] = useState(null); // { deal, client } tras guardar
	// Ajuste de precios personalizado (por componente): cada campo que se complete
	// sobrescribe ese elemento; vacío = usa el precio normal (segmento/dinámico).
	const [showOverrides, setShowOverrides] = useState(false);
	const [overridePrecioCert, setOverridePrecioCert] = useState("");
	const [overridePrecioFirma, setOverridePrecioFirma] = useState("");
	const [abono, setAbono] = useState(false);
	// Proyección de crecimiento: siempre OPT-IN, en los dos canales. Sumar la tabla de
	// precios por rango a toda propuesta le da al cliente una escala de descuentos que
	// no pidió y que invita a negociar hacia abajo; se activa cuando la cotización
	// puntual la necesita.
	//   · Volumen → escalonado ESTÁNDAR por firmas absolutas (config), con override
	//     por propuesta (proyCustom lo marca).
	//   · IDC → proyección relativa (driver + % de crecimiento), como antes.
	const [proyEnabled, setProyEnabled] = useState(false);
	// Pestaña del panel de resumen: "cliente" (lo que va a la propuesta) o "interno"
	// (rentabilidad). Antes las dos vivían apiladas y el panel era una columna larga.
	const [panelTab, setPanelTab] = useState("cliente");
	// Extra "Casos de uso": abierto a mano o porque ya hay texto (deal reabierto).
	const [showCasos, setShowCasos] = useState(false);
	const [proyDriver, setProyDriver] = useState("packs");
	const [proyCustom, setProyCustom] = useState(false);
	const [proySteps, setProySteps] = useState(function () {
		if (esDistribVol) return distribVolEscalonadoSteps(channelConfig.distribuidorVolTiers || []);
		const src = !esIDC ? (channelConfig.volumenProyeccion || []) : DEFAULT_PROYECCION_STEPS;
		return src.map(function (s) { return { ...s }; });
	});

	const conApi = integracion !== "sin_api";
	// La integración es siempre por SDK (Lakaut no expone una API de integración).
	const intgTerm = "SDK";
	const api = b2b2cApiTiers.slice().reverse().find(function (t) { return (Number(fee) || 0) >= t.feeMin; }) || b2b2cApiTiers[0];

	// ── Cantidades ──
	// IDC con compromiso anual: se cotiza el AÑO completo (el cliente paga el total al
	// contado). La cantidad cotizada es la anual (cargada por año, o la mensual × 12) y
	// es también el eje del segmento. En consumo único lo ingresado es la cantidad que
	// se cotiza.
	const idcAnual = esIDC && modalidadFact === "anual";
	const idcPorAnio = idcAnual && idcEntrada === "anual";
	const conTipo = !esIDC || idcPorTipo;
	const nfIn = Math.max(0, Number(certFisicos) || 0);
	const njIn = conTipo ? Math.max(0, Number(certJuridicos) || 0) : 0;
	const nf = idcAnual && !idcPorAnio ? nfIn * 12 : nfIn;
	const nj = idcAnual && !idcPorAnio ? njIn * 12 : njIn;
	const ff = Math.max(0, Number(firmasPorCertFisico) || 0);
	const fj = Math.max(0, Number(firmasPorCertJuridico) || 0);
	// Firmas sueltas: solo aplican a Volumen (en IDC la firma va dentro del bundle).
	const fs = esIDC ? 0 : Math.max(0, Number(firmasSueltas) || 0);
	const idc = nf + nj; // total de certificados / IDC cotizados
	// Eje de cantidad del segmento IDC: la cantidad TOTAL contratada (el año completo con
	// compromiso anual, la compra puntual con consumo único). Los umbrales de la tabla se
	// leen como totales (oct 2026; antes eran IDC por mes).
	const idcEje = idc;
	// Firmas de recompra (identidades existentes): misma lógica de período que la IDC.
	const frIn = recompra ? Math.max(0, Number(firmasRecompra) || 0) : 0;
	const fr = idcAnual && !idcPorAnio ? frIn * 12 : frIn;
	const mesesVinculacion = Math.max(1, leverValue(commercialLevers, levers, "duracion") || 1);

	// Label y nota del campo de cantidad IDC según la modalidad y cómo se carga.
	const idcLabelCant = !idcAnual ? "Cantidad" : idcPorAnio ? "Cantidad / año" : "Cantidad / mes";
	function idcNoteCant(ingresado) {
		if (!idcAnual) return "IDC a consumir";
		if (idcPorAnio) return "≈ " + Math.round(ingresado / 12).toLocaleString("es-AR") + " / mes de consumo";
		return "= " + (ingresado * 12).toLocaleString("es-AR") + " en el año";
	}

	// ── Cantidad de firmas ──
	// En los dos canales las firmas se cargan por certificado y por tipo: cada tipo
	// lleva su propia cantidad de firmas por certificado (ej. 1 físico con 100 firmas
	// y 2 jurídicos con 1000 c/u). El total sale de multiplicar cantidad × firmas por
	// tipo. En los tres canales se factura cada firma; IDC suma solo las firmas de
	// bienvenida (3 en total por cotización, no por certificado).
	const firmasFisica = nf * ff;
	const firmasJuridica = nj * fj;
	// Las firmas sueltas suman al total (y al compromiso que define el segmento) igual
	// que las firmas por certificado. Cero en IDC.
	const firmasTotales = firmasFisica + firmasJuridica + fs;

	// ── Segmento ──
	// IDC: sale de la cantidad de IDC consumidas (umbrales del Borrador v5) y cada
	// segmento trae su propio PRECIO por IDC, no un descuento. Debajo del primer
	// umbral se cotiza como Start Up en lugar de quedar sin precio.
	// Volumen: sale del compromiso del contrato en USD medido a precio de lista, y
	// aplica un DESCUENTO igual sobre el precio del certificado y el de la firma.
	// Usar siempre el precio base rompe la circularidad precio↔segmento.
	const facturacionAtList = facturacionAtBase(idc, firmasTotales, baseCanal);

	const certsActivosNum = certsHistoricos + idc;
	// Condición comercial elegida (forma de pago): las formas A/B son "con compromiso
	// anual", la forma C es "sin compromiso anual". Define la ventana de la facturación que
	// asigna el nivel y si los certificados activos entran como segundo eje.
	const conCompromiso = descOpcion(descOpcionSel).forma !== "C";
	// Facturación a precio base que asigna el nivel (Distribuidores-Volumen). Se DERIVA de la
	// cotización (servicio mensual cotizado a precio base) y se windowea por la condición:
	// × 12 con compromiso anual (facturación anualizada), × 1 sin compromiso (facturación del
	// período). Siempre a precio base ("antes del descuento") para no morder la cola
	// precio↔nivel. Compite contra los certificados activos (solo con compromiso).
	const facturacionNivelDistrib = esDistribVol ? Math.round(facturacionAtList * (conCompromiso ? 12 : 1)) : 0;

	// Ventana de tiempo del eje de facturación: "anual" anualiza la facturación (× meses de
	// vinculación); "unico" mide solo la compra puntual (× 1). El toggle Consumo único /
	// Anual la controla en Volumen. En IDC, igual que en Distribuidores-Volumen: consumo
	// único mide la facturación de esa cantidad (× 1); compromiso anual la anualiza (× 12).
	const mesesVentanaFact = esIDC ? (idcAnual ? 12 : 1) : (modalidadFact === "unico" ? 1 : mesesVinculacion);

	// Facturación que puede asignar el segmento por el eje de facturación:
	//   · Volumen / Distribuidores-Volumen → facturación a lista del volumen cotizado, windoweada.
	//   · IDC → facturación de referencia medida a precio Start Up (rompe la circularidad
	//     precio↔segmento, porque los precios dependen del propio segmento): IDC y firmas
	//     cotizadas, cada una a su precio de lista (primer segmento).
	const facturacionNivel = facturacionAtList * mesesVentanaFact;
	const idcBaseSeg = b2b2cSegments[0] || {};
	const idcPrecioBase = Number(idcBaseSeg.precioIDC) || 0;
	const idcFirmaBase = Number(idcBaseSeg.precioFirma) || 0;
	// Las cantidades ya son las del período cotizado (el año con compromiso anual), así
	// que la facturación de referencia no se vuelve a multiplicar.
	const idcFacturacionRef = idc * idcPrecioBase + firmasTotales * idcFirmaBase;
	// Escala con la que se asigna el segmento IDC: con compromiso anual, los umbrales
	// anuales; en compra puntual, los de una compra del mes (anual ÷ 12 × factor).
	const idcFactorPuntual = Number(channelConfig.b2b2cFactorPuntual) || 1.25;
	const idcSegsEje = esIDC && !idcAnual ? b2b2cSegmentsPuntual(b2b2cSegments, idcFactorPuntual) : b2b2cSegments;
	// El eje de facturación efectivo por canal (para asignar segmento y para la UI).
	const facturacionEje = esIDC ? idcFacturacionRef : facturacionNivel;
	// Compromiso mostrado en Volumen = la facturación de la ventana (misma cifra que el eje).
	const compromiso = facturacionNivel;

	// El segmento/nivel:
	//   IDC → MAYOR entre cantidad de IDC y facturación ref · trae su precio por IDC.
	//   Volumen → MAYOR entre firmas y facturación/compromiso · trae su descuento.
	//   Distribuidores-Volumen → MAYOR entre la facturación (windoweada por la condición) y
	//     los certificados activos; los certs solo cuentan con compromiso anual.
	const seg = (esIDC
		? (function () { const p = getB2B2CSegment(idcEje, idcFacturacionRef, idcSegsEje); return p ? b2b2cSegments.find(function (s) { return s.id === p.id; }) || p : p; })()
		: esDistribVol
			? getDistributorVolTier(facturacionNivelDistrib, certsActivosNum, conCompromiso, distribVolTiers)
			: getVolumenSegment(firmasTotales, facturacionNivel, volumenSegments)) || {};
	// Qué eje definió el segmento/nivel, para explicarlo en la interfaz.
	const segDriver = esDistribVol
		? distributorVolTierDriver(facturacionNivelDistrib, certsActivosNum, conCompromiso, distribVolTiers)
		: esIDC
			? b2b2cSegmentDriver(idcEje, idcFacturacionRef, idcSegsEje)
			: volumenSegmentDriver(firmasTotales, facturacionNivel, volumenSegments);
	const segLabel = seg.label || "—";
	// Distribuidores-Volumen con compromiso anual (formas A/B): anualiza la facturación y
	// suma los certificados activos como eje del nivel. Sin compromiso (forma C) el nivel lo
	// da solo la facturación mensual, pero el descuento igual se aplica (directo). El
	// descuento de nivel se aplica siempre en Volumen y Distribuidores-Volumen; IDC no usa
	// descuento (es escala de precios).
	const distribConCompromiso = esDistribVol && conCompromiso;
	// Descuento EFECTIVO del nivel: el del tramo alcanzado. IDC no usa descuento.
	const segDesc = esIDC ? 0 : Math.min(1, Math.max(0, Number(seg.descuento) || 0));
	// Precios de lista del segmento. En IDC vienen del propio tramo; en Volumen y
	// Distribuidores-Volumen se derivan del precio base del canal menos el descuento
	// (en Distribuidores el certificado ya es 0, así que solo la firma tiene precio).
	const segPrice = esIDC
		? segmentPricing(seg, SEG_FALLBACK)
		: {
			precioIDC: (Number(baseCanal.cert) || 0) * (1 - segDesc),
			precioFirma: (Number(baseCanal.firma) || 0) * (1 - segDesc),
			precioFirmaExtra: (Number(baseCanal.firma) || 0) * (1 - segDesc),
		};

	// Firmas que se facturan por unidad: todas las cotizadas. No hay cupo por certificado
	// en ningún canal (IDC lo tuvo hasta oct 2026). Las sueltas son cero en IDC.
	const firmasExtra = firmasTotales;
	// Firmas de bienvenida (solo IDC): se bonifican N firmas en TOTAL por cotización, sin
	// importar cuántas IDC o firmas haya, para que la persona firme su primer documento sin
	// costo. Nunca más que las firmas cotizadas, y no aplican a las de recompra.
	const firmasBienvenidaCfg = esIDC ? Math.max(0, Math.round(Number(channelConfig.b2b2cFirmasBienvenida != null ? channelConfig.b2b2cFirmasBienvenida : FIRMAS_BIENVENIDA_FALLBACK) || 0)) : 0;
	const firmasBienvenida = Math.min(firmasBienvenidaCfg, firmasExtra);
	// Bonificación comercial (opcional): se suma a la de bienvenida, sobre las firmas que
	// quedan por facturar. El volumen no cambia, así que el costo variable de las firmas
	// bonificadas se paga igual y baja el markup.
	const firmasBonifMax = firmasExtra - firmasBienvenida;
	const firmasBonif = Math.min(firmasBonifMax, Math.max(0, Number(firmasBonificadas) || 0));
	const firmasCobradas = firmasExtra - firmasBienvenida - firmasBonif;

	const hasVolume = idc > 0 || firmasTotales > 0 || fr > 0;

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
		setFirmasSueltas(i.firmasSueltas != null ? String(i.firmasSueltas) : "");
		// El compromiso anual (Distribuidores-Volumen) se DERIVA de la cotización (servicio a
		// lista × 12) al recalcular; no se carga a mano. La base instalada tampoco se guarda
		// (se recalcula desde las cotizaciones confirmadas del cliente).
		// Modalidad de facturación del nivel: deals viejos (sin el dato) caen a "anual",
		// que reproduce el comportamiento del canal desde que existe el eje de facturación.
		setModalidadFact(i.modalidadFacturacion === "unico" ? "unico" : "anual");
		// IDC: consumo cargado por año. Se restaura lo ingresado (el deal guarda el
		// equivalente mensual en certFisicos/certJuridicos para export y reportes).
		// Deals con lo ingresado guardado (idcCantidadIngresada) lo restauran tal cual;
		// los anteriores tenían en certFisicos la cantidad mensual, que es lo que se carga.
		const entradaAnual = i.idcEntrada === "anual";
		setIdcEntrada(entradaAnual ? "anual" : "mensual");
		setIdcPorTipo(!!i.idcPorTipo || (Number(i.certJuridicos) || 0) > 0);
		setRecompraManual(i.recompra != null ? { clientId: pendingEdit.client_id || null, value: !!i.recompra } : null);
		setFirmasRecompra(i.firmasRecompraIngresada != null ? String(i.firmasRecompraIngresada) : "");
		if (i.idcCantidadIngresada) {
			setCertFisicos(i.idcCantidadIngresada.fis != null ? i.idcCantidadIngresada.fis : "");
			setCertJuridicos(i.idcCantidadIngresada.jur ? i.idcCantidadIngresada.jur : "");
		}
		setFee(i.fee != null ? i.fee : 3250);
		setSlaId(i.slaAuto ? "auto" : (i.slaId || "auto"));
		setSlaBonificado(i.slaBonificado || false);
		setLevers(i.levers || defaultLeverSelection(commercialLevers));
		setFirmasBonificadas(i.firmasBonificadas != null ? String(i.firmasBonificadas) : "");
		setShowBonif(i.firmasBonificadas != null);
		// Forma de liquidación del descuento. Un deal guardado sin el dato (o de IDC)
		// cae al LEGACY (B1), no al default de las cotizaciones nuevas: si cayera al
		// default, cambiar ese default reabriría las cotizaciones históricas en otro
		// nivel y con otro precio del que se envió.
		const dl = i.descLiquidacion;
		if (dl && (dl.forma === "A" || dl.forma === "B" || dl.forma === "C")) {
			setDescOpcionSel(descOpcionId(dl.forma, dl.sub));
		} else {
			setDescOpcionSel(DESC_OPCION_LEGACY);
		}
		setCasosDeUso(i.casosDeUso || "");
		setAbono(i.abono || false);
		setAbonoDescPct(i.abonoDescuentoPct != null ? i.abonoDescuentoPct : (channelConfig.abonoDescuentoPct != null ? channelConfig.abonoDescuentoPct : ABONO_DESC_FALLBACK));
		// Proyección de crecimiento.
		const p = i.proyeccion;
		if (!esIDC) {
			// Volumen · escalonado estándar por firmas. Si el deal se guardó con el modelo
			// nuevo (mode "firmas") se reabre su escalonado; si es un deal viejo (proyección
			// relativa) o sin datos, se cae al escalonado estándar de la config.
			setProyDriver("packs");
			if (p && p.mode === "firmas" && Array.isArray(p.steps) && p.steps.length) {
				setProyEnabled(p.enabled !== false);
				setProyCustom(!!p.custom);
				setProySteps(p.steps.map(function (s) { return { firmas: Number(s.firmas) || 0, descuento: Number(s.descuento) || 0 }; }));
			} else {
				setProyEnabled(!!p && p.enabled !== false);
				setProyCustom(false);
				setProySteps(esDistribVol ? distribVolEscalonadoSteps(channelConfig.distribuidorVolTiers || []) : (channelConfig.volumenProyeccion || []).map(function (s) { return { ...s }; }));
			}
		} else if (p && p.enabled) {
			// IDC · proyección relativa (driver + % de crecimiento), como antes.
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
		// Cotización recién cargada del listado: el próximo guardado crea una versión
		// nueva (no pisa la que se abrió). Ver saveQuote.
		sessionVersionId.current = null;
		setSaved(null);
		setLoadToken(function (n) { return n + 1; });
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	// Volumen · escalonado estándar: mientras no sea un override manual ni una edición,
	// el escalonado sigue a la config (así, si cambia el estándar, las cotizaciones
	// nuevas lo toman sin recargar). En IDC no aplica.
	useEffect(function () {
		if (esIDC || proyCustom || editingId) return;
		if (esDistribVol) { setProySteps(distribVolEscalonadoSteps(channelConfig.distribuidorVolTiers || [])); return; }
		setProySteps((channelConfig.volumenProyeccion || []).map(function (s) { return { ...s }; }));
	}, [channelConfig.volumenProyeccion, channelConfig.distribuidorVolTiers, esIDC, esDistribVol, proyCustom, editingId]);

	// Festejo al subir de segmento: sólo con volumen cargado y sólo al cambiar el
	// segmento efectivo (no en cada tecla). El loadToken evita festejar la carga de
	// una cotización guardada.
	const segmentList = esIDC ? b2b2cSegments : esDistribVol ? distribVolTiers : volumenSegments;
	useTierUp(hasVolume ? seg.id : null, segmentList, function (next) {
		const mat = tierMaterialInList(next, segmentList);
		notifyTierUp(toast, { label: next.label, emoji: mat.emoji, material: mat, discountPct: Math.round((next.descuento || 0) * 100) });
	}, loadToken);

	// ── Costos ──
	// El costo total se calcula sobre las firmas REALES cotizadas (bonificadas
	// incluidas): todas se emiten y todas se pagan.
	const costoCert = idc * cvCert;
	const costoFirmas = (firmasTotales + fr) * cvFirma;
	const costoTotal = costoCert + costoFirmas;

	// ── Precios efectivos ──
	// El precio de la IDC y el de la firma extra salen del segmento alcanzado. El
	// ajuste personalizado puede sobrescribir cualquiera de los dos; la IDC y la firma
	// nunca se mezclan en un mismo valor.
	const overrideActive = overridePrecioCert !== "" || overridePrecioFirma !== "";
	const precioIDC = overridePrecioCert !== "" ? Math.max(0, Number(overridePrecioCert) || 0) : segPrice.precioIDC;
	// IDC: las firmas se cotizan al precio de firma del segmento. El precioFirmaExtra de
	// la config (USD 0,50) es el precio del EXCEDENTE no planificado: va como condición
	// del contrato, no se cotiza.
	const precioFirmaSegmento = segPrice.precioFirma;
	const precioFirmaExcedente = segPrice.precioFirmaExtra;
	const precioFirmaExtraEff = overridePrecioFirma !== "" ? Math.max(0, Number(overridePrecioFirma) || 0) : precioFirmaSegmento;

	// ── Ingresos ──
	// Subtotal del período cotizado: IDC (o certificados) + cada firma por unidad.
	const revCertFisicos = nf * precioIDC;
	const revCertJuridicos = nj * precioIDC;
	const revIDC = idc * precioIDC;
	// Firmas por tipo, para el desglose del resumen.
	const firmasExtraFisica = nf * ff;
	const firmasExtraJuridica = nj * fj;
	// Vista del cliente (panel y propuesta): las firmas de bienvenida salen de la cantidad
	// cobrada (primero de las jurídicas) y van como línea "Incluido", no como descuento.
	const bienvJurPanel = Math.min(firmasBienvenida, firmasExtraJuridica);
	const firmasCobrarJuridica = firmasExtraJuridica - bienvJurPanel;
	const firmasCobrarFisica = firmasExtraFisica - (firmasBienvenida - bienvJurPanel);
	const revFirmasFisica = firmasCobrarFisica * precioFirmaExtraEff;
	const revFirmasJuridica = firmasCobrarJuridica * precioFirmaExtraEff;
	// Firmas sueltas: mismo precio de firma del segmento, sin atribución de tipo.
	const revFirmasSueltas = fs * precioFirmaExtraEff;
	const revFirmas = firmasExtra * precioFirmaExtraEff;
	// Recompra: firmas para identidades existentes a la lista de Volumen (firma suelta)
	// con el descuento del segmento de Volumen que alcanza esa cantidad.
	const recompraSeg = fr > 0 ? (getVolumenSegment(fr, facturacionAtBase(0, fr, volumenBase), volumenSegments) || {}) : {};
	const recompraDesc = Math.min(1, Math.max(0, Number(recompraSeg.descuento) > 1 ? Number(recompraSeg.descuento) / 100 : Number(recompraSeg.descuento) || 0));
	const precioFirmaRecompraLista = Number(volumenBase.firma) || 0;
	const precioFirmaRecompra = precioFirmaRecompraLista * (1 - recompraDesc);
	const revRecompra = fr * precioFirmaRecompra;
	const revServicioBruto = revIDC + revFirmas + revRecompra;

	// Bonificación de firmas (bienvenida + comercial): se resta del subtotal al precio de
	// firma cotizado. Va antes del descuento por condiciones para no descontar dos veces
	// sobre firmas que no se cobran.
	const bienvenidaMonto = firmasBienvenida * precioFirmaExtraEff;
	const bonifMonto = firmasBonif * precioFirmaExtraEff;
	const revServicioNeto = revServicioBruto - bienvenidaMonto - bonifMonto;

	// Condiciones comerciales (time-to-cash, duración, velocidad): se OFRECEN al
	// cliente como incentivos en la propuesta, pero NO se contemplan en el total. El
	// precio por segmento y la bonificación de firmas sí lo definen; las condiciones
	// se listan aparte. Snapshot en el deal para armar el apartado "ofrecido".
	const leverRes = resolveLevers(commercialLevers, levers);
	const condOfrecidaPct = leverRes.cappedPts;
	const hayCondOfrecidas = condOfrecidaPct > 0 && leverRes.items.length > 0;
	const revServicio = revServicioNeto;

	// Facturación que asignó el nivel (Distribuidores-Volumen): con compromiso anual es la
	// facturación anualizada (× 12); sin compromiso, la del período (× 1). Viaja a la
	// propuesta y a los reportes como referencia del nivel alcanzado.
	const compromisoAnualAuto = esDistribVol ? facturacionNivelDistrib : 0;

	// Fee de implementación: siempre configurable manualmente en todos los canales, más
	// allá de los lineamientos generales. No hay gate por nivel; el vendedor lo fija (o lo
	// deja en 0) según el caso.
	const feePermitido = true;
	// Recompra: el cliente ya está integrado, así que el fee de implementación no se
	// vuelve a cobrar.
	const feeAplicado = conApi && feePermitido && !recompra ? Math.max(0, Number(fee) || 0) : 0;
	// ── SLA por facturación ──
	// La facturación de la cotización (servicio del período: el año en IDC con compromiso
	// anual; en Distribuidores × 12 con compromiso; en Volumen la ventana de la modalidad)
	// alcanza un plan de soporte que va incluido sin cargo. Un plan igual o menor al
	// alcanzado también es sin cargo; uno superior se cobra.
	const slaFacturacion = esIDC ? revServicio : revServicio * (esDistribVol ? (conCompromiso ? 12 : 1) : mesesVentanaFact);
	const slaGanado = slaGanadoPorFacturacion(slaPlans, slaFacturacion) || slaPlans[0];
	const sla = (slaId === "auto" ? slaGanado : slaPlans.find(function (s) { return s.id === slaId; })) || slaGanado;
	const slaIncluido = slaPlans.indexOf(sla) <= slaPlans.indexOf(slaGanado);
	const slaSiguiente = slaPlans.filter(function (p) { return p.facturacionMin != null && Number(p.facturacionMin) > slaFacturacion; })
		.sort(function (a, b) { return a.facturacionMin - b.facturacionMin; })[0] || null;
	const slaMes = conApi && !slaBonificado && !slaIncluido ? (sla.precioMes || 0) : 0;
	// IDC con compromiso anual: el SLA se cotiza por los 12 meses del contrato.
	const slaMeses = idcAnual ? 12 : 1;
	const slaPeriodo = slaMes * slaMeses;
	const revSinFee = revServicio + slaPeriodo;
	const revTotal = revSinFee + feeAplicado;

	// ── Liquidación del descuento de nivel (solo Volumen y Distribuidores-Volumen) ──
	// El descuento de nivel se mide sobre el servicio a precio de lista base (sin el
	// descuento del segmento). El neto que se cobra sigue siendo revServicio; la forma
	// elegida define cómo se liquida ese descuento (ver [[descLiquidacion]]).
	const mostrarFormas = !esIDC;
	const revServicioLista = mostrarFormas ? (idc * (Number(baseCanal.cert) || 0) + firmasExtra * (Number(baseCanal.firma) || 0)) : 0;
	const descNivelMonto = mostrarFormas ? segDesc * revServicioLista : 0;
	const descOpcionActiva = descOpcion(descOpcionSel);
	const descForma = descOpcionActiva.forma;
	const descSub = descOpcionActiva.sub;
	const descLiq = resolveDescLiquidacion(
		{ forma: descForma, sub: descSub },
		{ descNivel: descNivelMonto, neto: revServicio, precioFirma: precioFirmaExtraEff, cvFirma: cvFirma }
	);
	// Forma A2: las firmas bonificadas al cierre tienen costo variable que baja el margen.
	const costoFormaA2 = mostrarFormas && descLiq.forma === "A" && descLiq.sub === "firmas" ? descLiq.costoFirmasCierre : 0;

	const margen = revServicio - costoTotal - costoFormaA2;
	const margenPct = revServicio > 0 ? margen / revServicio : 0;
	// Markup del deal: es la métrica del guardarraíl y la que se compara contra la
	// columna de margen del Borrador v5.
	const markup = markupOf(revServicio, costoTotal);
	// Viabilidad del precio de tabla del segmento (IDC): certificado y firma, cada uno
	// contra su costo variable. Dice si el precio configurado cierra antes de negociar.
	const segViab = esIDC ? segmentViability(seg, cvCert, cvFirma, markupMin, SEG_FALLBACK) : null;

	// Abono (opcional): repone la bolsa de firmas cada mes con un descuento configurable
	// (default de la config, editable por cotización).
	const descAbono = Math.min(1, Math.max(0, Number(abonoDescPct) || 0) / 100);
	const precioFirmaAbono = precioFirmaExtraEff * (1 - descAbono);
	// El abono repone la bolsa MENSUAL de firmas: con compromiso anual IDC la bolsa
	// cotizada es la del año, así que se toma su doceava parte.
	const revAbonoMes = (idcAnual ? firmasTotales / 12 : firmasTotales) * precioFirmaAbono;
	const revAbonoAnual = revAbonoMes * 12;

	// Guardarraíl de rentabilidad: se evalúa sobre el markup MEZCLADO (IDC + firmas),
	// no componente por componente, así una IDC con precio agresivo no dispara
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
			const faltan = Math.max(0, (Number(nextSeg.idcMin) || 0) - idcEje);
			const pNext = segmentPricing(nextSeg, SEG_FALLBACK);
			segHint = "Con " + faltan.toLocaleString("es-AR") + " IDC más entra en " + nextSeg.label + " · " + fMoney2(pNext.precioIDC) + " por IDC y " + fMoney2(pNext.precioFirma) + " por firma.";
		} else if (esDistribVol) {
			// El nivel sube por la facturación (windoweada por la condición) o, con compromiso,
			// por los certificados activos.
			const compFaltan = Math.max(0, (Number(nextSeg.compromisoMin) || 0) - facturacionNivelDistrib);
			const certsFaltan = Math.max(0, (Number(nextSeg.certsMin) || 0) - certsActivosNum);
			const descNext = Math.round((Number(nextSeg.descuento) || 0) * 100);
			segHint = distribConCompromiso
				? "Con " + fMoney(compFaltan) + " más de facturación anual, o " + certsFaltan.toLocaleString("es-AR") + " certificados activos más, pasa a " + nextSeg.label + " · " + descNext + "% sobre la firma."
				: "Con " + fMoney(compFaltan) + " más de facturación mensual pasa a " + nextSeg.label + " · " + descNext + "% sobre la firma. Con compromiso anual subís de nivel más rápido (facturación × 12 + certificados activos).";
		} else {
			// Volumen: el segmento sube por el eje más cercano, firmas o compromiso.
			const firmasFaltan = Math.max(0, (Number(nextSeg.firmasMin) || 0) - firmasTotales);
			const compFaltan = Math.max(0, (Number(nextSeg.compromisoMin) || 0) - compromiso);
			const descNext = Math.round((Number(nextSeg.descuento) || 0) * 100);
			segHint = compFaltan > 0 && (firmasFaltan <= 0 || compFaltan / Math.max(1, Number(nextSeg.compromisoMin) || 1) <= firmasFaltan / Math.max(1, Number(nextSeg.firmasMin) || 1))
				? "Con " + fMoney(compFaltan) + " más de compromiso entra en " + nextSeg.label + " · " + descNext + "% de descuento."
				: "Con " + firmasFaltan.toLocaleString("es-AR") + " firmas más entra en " + nextSeg.label + " · " + descNext + "% de descuento.";
		}
	} else if (hasVolume) {
		segHint = esDistribVol
			? "Es el nivel más alto."
			: "Es el segmento de mayor volumen.";
	}
	const segRows = segmentList.map(function (s, si) {
		if (esIDC) {
			// La facturación que se muestra es la de la escala vigente (anual o puntual).
			const sf = idcSegsEje[si] || s;
			const min = Number(s.idcMin) || 0;
			const p = segmentPricing(s, SEG_FALLBACK);
			return {
				id: s.id,
				cells: [
					<TierBadge key="seg" tier={s} tiers={segmentList} size="sm" />,
					min.toLocaleString("es-AR") + (s.idcMax == null ? "+" : "–" + (Number(s.idcMax) || 0).toLocaleString("es-AR")),
					(Number(sf.facturacionMin) || 0) === 0 && sf.facturacionMax != null ? "hasta " + fMoney(Number(sf.facturacionMax) || 0) : fMoney(Number(sf.facturacionMin) || 0) + (sf.facturacionMax == null ? "+" : "–" + fMoney(Number(sf.facturacionMax) || 0)),
					fMoney2(p.precioIDC),
					fMoney2(p.precioFirma),
				],
			};
		}
		if (esDistribVol) {
			// El nivel se alcanza por el mayor entre la facturación (rango de compromiso) y los
			// certificados activos (que cuentan solo con compromiso anual).
			const cMin = Number(s.compromisoMin) || 0;
			const certsMin = Number(s.certsMin) || 0;
			return {
				id: s.id,
				cells: [
					<TierBadge key="seg" tier={s} tiers={segmentList} size="sm" />,
					cMin === 0 && s.compromisoMax != null ? "hasta " + fMoney(Number(s.compromisoMax) || 0) : fMoney(cMin) + (s.compromisoMax == null ? "+" : "–" + fMoney(Number(s.compromisoMax) || 0)),
					certsMin.toLocaleString("es-AR") + (s.certsMax == null ? "+" : "–" + (Number(s.certsMax) || 0).toLocaleString("es-AR")),
					Math.round((Number(s.descuento) || 0) * 100) + "%",
				],
			};
		}
		const min = Number(s.compromisoMin) || 0;
		return {
			id: s.id,
			cells: [
				<TierBadge key="seg" tier={s} tiers={segmentList} size="sm" />,
				(Number(s.firmasMin) || 0).toLocaleString("es-AR") + (s.firmasMax == null ? "+" : "–" + (Number(s.firmasMax) || 0).toLocaleString("es-AR")),
				fMoney(min) + (s.compromisoMax == null ? "+" : "–" + fMoney(Number(s.compromisoMax) || 0)),
				Math.round((Number(s.descuento) || 0) * 100) + "%",
			],
		};
	});

	// Resumen de estado de las condiciones comerciales (subtítulo del grupo).
	const condResumen = [
		conApi ? api.label : "sin integración " + intgTerm,
		conApi ? (slaBonificado ? "SLA bonificado" : sla.label) : null,
		overrideActive ? "precio ajustado" : "precio de tabla",
		firmasBienvenida > 0 ? firmasBienvenida + " firma" + (firmasBienvenida === 1 ? "" : "s") + " de bienvenida" : null,
		firmasBonif > 0 ? firmasBonif.toLocaleString("es-AR") + " firmas bonificadas" : null,
		mostrarFormas && descNivelMonto > 0 ? descLiq.label : null,
		hayCondOfrecidas ? leverRes.cappedPts + "% condiciones ofrecidas" : null,
		abono ? "con abono mensual" : "sin abono",
	].filter(Boolean).join(" · ");

	// ── Proyección de crecimiento (preview) ──
	// IDC: proyección relativa (driver + % de crecimiento) sobre el volumen cotizado.
	// Volumen: escalonado ESTÁNDAR por firmas absolutas, precio de firma sobre el base
	// (el mismo para toda propuesta). Marca el tramo que alcanza el volumen actual.
	const proyBase = { idc: idc, firmas: firmasExtra, precioCert: precioIDC, precioFirma: precioFirmaExtraEff };
	const proyRows = esIDC && proyEnabled && hasVolume ? buildProyeccion(proyBase, proyDriver, proySteps) : [];
	const escalonadoRows = !esIDC && proyEnabled ? buildEscalonadoFirmas(proySteps, baseCanal.firma, firmasTotales) : [];

	// Al editar el escalonado de Volumen queda marcado como personalizado (deja de
	// seguir a la config).
	function markCustom() { if (!esIDC) setProyCustom(true); }
	function updateStep(i, patch) {
		markCustom();
		setProySteps(function (prev) { return prev.map(function (s, idx) { return idx === i ? { ...s, ...patch } : s; }); });
	}
	function addStep() {
		markCustom();
		setProySteps(function (prev) {
			const last = prev.length ? prev[prev.length - 1] : {};
			if (!esIDC) {
				const lastFirmas = Number(last.firmas) || 0;
				return prev.concat([{ firmas: lastFirmas > 0 ? lastFirmas * 2 : 10000, descuento: (Number(last.descuento) || 0) + 5 }]);
			}
			return prev.concat([{ pct: (Number(last.pct) || 0) + 10, descuento: (Number(last.descuento) || 0) + 3 }]);
		});
	}
	function removeStep(i) {
		markCustom();
		setProySteps(function (prev) { return prev.filter(function (_, idx) { return idx !== i; }); });
	}
	function resetSteps() {
		if (!esIDC) {
			setProyCustom(false);
			setProySteps(esDistribVol ? distribVolEscalonadoSteps(channelConfig.distribuidorVolTiers || []) : (channelConfig.volumenProyeccion || []).map(function (s) { return { ...s }; }));
			return;
		}
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
				// Firmas sueltas (Volumen): firmas sin certificado asociado ni tipo.
				...(fs > 0 ? { firmasSueltas: fs } : {}),
				idcMensuales: idcEje, // compat: consumido por historial/reportes/clientes
				firmasAdicPorIDC: 0,
				// Volumen: el compromiso en USD es lo que asignó el segmento. Las firmas
				// por tipo se guardan igual que en IDC (certFisicos/firmasPorCert…).
				...(esIDC || esDistribVol ? {} : { compromiso }),
				// Modalidad de facturación del segmento (los tres canales): se persiste para
				// restaurar el toggle Consumo único / Anual al reabrir la cotización.
				modalidadFacturacion: modalidadFact,
				// IDC: cómo se cargó el consumo. certFisicos/certJuridicos llevan siempre la
				// cantidad cotizada (mensual con compromiso anual); si se cargó por año, se
				// guarda también lo ingresado para reabrir la cotización tal cual.
				// idcCantidadAnual marca que certFisicos/certJuridicos son las cantidades del
				// año (compromiso anual): el export cotiza el total y el SLA × 12.
				...(esIDC ? { idcEntrada: idcPorAnio ? "anual" : "mensual", idcPorTipo, idcCantidadAnual: idcAnual, idcCantidadIngresada: { fis: nfIn, jur: njIn }, recompra, ...(recompra ? { firmasRecompraIngresada: frIn, firmasRecompra: fr } : {}) } : {}),
				// Distribuidores-Volumen: el nivel es el mayor entre firmas y facturación de la
				// ventana. `modalidadFacturacion` y `facturacionNivel` viajan para reproducir la
				// asignación; el compromiso anual se deriva de la cotización (no se declara) y
				// viaja para la propuesta; los certificados activos quedan como dato informativo.
				...(esDistribVol ? { compromisoAnual: compromisoAnualAuto, certsActivos: certsActivosNum, tierDriver: segDriver, modalidadFacturacion: modalidadFact, facturacionNivel } : {}),
				// Precio de la firma cotizada: viaja al deal para que la propuesta y los reportes
				// no dependan de la config viva. Cupo 0: ninguna firma va dentro del certificado
				// (las cotizaciones IDC anteriores a oct 2026 guardaban el cupo del bundle).
				firmasIncluidasPorIDC: 0,
				precioFirmaAdic: precioFirmaExtraEff,
				// IDC sin cupo: marca el modelo para la propuesta y guarda las firmas de bienvenida.
				...(esIDC ? { idcSinCupo: true, firmasBienvenida } : {}),
				// Firmas bonificadas: solo viaja al deal cuando hay bonificación.
				...(firmasBonif > 0 ? { firmasBonificadas: firmasBonif } : {}),
				// Forma de liquidación del descuento de nivel (solo Volumen/Distribuidores-Vol).
				...(mostrarFormas ? { descLiquidacion: { forma: descForma, sub: descSub } } : {}),
				// El fee solo viaja al deal cuando el nivel lo permite (Azul/Bronce en
				// Distribuidores-Volumen); si no, la propuesta lo lee como 0.
				// slaIncluido: el plan va sin cargo por la facturación alcanzada (el export no lo cobra).
				...(conApi ? { slaId: sla.id, slaAuto: slaId === "auto", slaIncluido, slaBonificado, ...(feePermitido ? { fee } : {}) } : {}),
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
					proyeccion: !esIDC ? {
						// Volumen · escalonado estándar por firmas absolutas. Se guarda el
						// precio base de la firma para que la propuesta sea estable ante
						// cambios de la config, y el flag `custom` marca los overrides.
						enabled: true,
						mode: "firmas",
						precioFirmaBase: Number(baseCanal.firma) || 0,
						custom: proyCustom,
						steps: proySteps.map(function (s) {
							return { firmas: Math.max(0, Math.round(Number(s.firmas) || 0)), descuento: Math.min(100, Math.max(0, Number(s.descuento) || 0)) };
						}).filter(function (s) { return s.firmas > 0; }),
					} : {
						// IDC · proyección relativa (driver + % de crecimiento), como antes.
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
				segmento: segLabel, idcMensuales: idcEje,
				// Volumen y Distribuidores-Volumen: el segmento es un descuento, así que se
				// guarda como tal para que Reportes y el export lo lean igual. En Volumen
				// viaja el compromiso del contrato; en Distribuidores-Volumen, las variables
				// declaradas del socio y qué variable definió el nivel.
				...(esIDC ? {} : { segmentoDescuento: segDesc }),
				...(esDistribVol ? { certsActivos: certsActivosNum, compromisoAnual: compromisoAnualAuto, tierDriver: segDriver, modalidadFacturacion: modalidadFact, facturacionNivel } : (esIDC ? {} : { compromiso })),
				certFisicos: nf, certJuridicos: nj,
				...(fs > 0 ? { firmasSueltas: fs } : {}),
				firmasTotales, firmasMes: firmasTotales,
				// Firmas facturadas por unidad (todas: no hay cupo). Reportes lee el precio por
				// elemento con estas cantidades.
				firmasEnCupo: 0, firmasExtra, firmasIncluidasPorIDC: 0,
				// precioIDC = precio realizado; precioIDCLista = precio de tabla del
				// segmento. Con los dos, el descuento negociado se deriva sin mirar la
				// config, que puede haber cambiado desde que se guardó la cotización.
				precioIDC, precioIDCLista: segPrice.precioIDC,
				// IDC: precios de lista (primer segmento) de la IDC y de la firma, contra los que
				// la propuesta tacha el precio del segmento alcanzado.
				...(esIDC ? { idcPrecioBase: idcPrecioBase, idcFirmaBase: idcFirmaBase, idcSegmentoBase: idcBaseSeg.label || null } : {}),
				...(fr > 0 ? { firmasRecompra: fr, precioFirmaRecompra, precioFirmaRecompraLista, recompraDescuento: recompraDesc, recompraSegmento: recompraSeg.label || null, revRecompra } : {}),
				precioFirma: precioFirmaExtraEff, precioFirmaExtra: precioFirmaExtraEff,
				// IDC: lista de la firma = precio de firma del primer segmento; el excedente no
				// planificado viaja aparte para Condiciones.
				precioFirmaExtraLista: esIDC ? idcFirmaBase : segPrice.precioFirmaExtra,
				...(esIDC ? { precioFirmaExcedente } : {}),
				revTotal, revMesTotal: idcAnual ? revSinFee / 12 : revSinFee,
				...(esIDC ? { modalidadFacturacion: modalidadFact } : {}),
				// Año 1: en IDC con compromiso anual el consumo es mensual recurrente
				// (× 12 + fee único); con consumo único es el total cotizado. En
				// Volumen es una COMPRA ÚNICA (revTotal, mes 1) y, si hay abono, se suman
				// los meses 2-12 de reposición de la bolsa de firmas (11 meses, mismo
				// criterio que Packs). No se multiplica el volumen × 12.
				revAnual: esIDC ? revTotal : revTotal + (abono ? revAbonoMes * 11 : 0),
				// Las condiciones ya no bajan el total; se guarda el % ofrecido como dato
				// informativo (reportes lo ignoran para el descuento efectivo).
				revServicioBruto,
				...(hayCondOfrecidas ? { condOfrecidaPct } : {}),
				...(firmasBienvenida > 0 ? { firmasBienvenida, bienvenidaMonto } : {}),
				...(firmasBonif > 0 || firmasBienvenida > 0 ? { firmasCobradas } : {}),
				...(firmasBonif > 0 ? { firmasBonificadas: firmasBonif, bonifMonto } : {}),
				// Liquidación del descuento de nivel: snapshot para propuesta y reportes. El
				// neto (revTotal/revAnual) no cambia; se guardan las cifras del cash flow.
				...(mostrarFormas && descNivelMonto > 0 ? {
					descLiquidacion: descLiq.id,
					descNivelMonto: descNivelMonto,
					descLiqCargoAnioFull: descLiq.cargoAnioFull,
					...(descLiq.firmasCierre > 0 ? { descLiqFirmasCierre: descLiq.firmasCierre, descLiqCostoFirmasCierre: descLiq.costoFirmasCierre } : {}),
				} : {}),
				margen, margenPct, markup, costoTotal,
				...(abono ? { revAbonoMes, revAbonoAnual } : {}),
			},
		};
	}

	async function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? dealsApi.deals.find(function (d) { return d.id === editingId; }) : null;

		// El alta de clientes vive solo en el Sheet. Si no hay cliente elegido, la
		// cotización se guarda sin cliente (client_id null); no se crea ninguno acá.
		const client = selectedClient;

		const deal = buildDeal(editingId || Date.now().toString(36), prev ? prev.fecha : now);
		if (prev?.resumen?.status) deal.resumen.status = prev.resumen.status;

		// Versionado automático: guardar sobre una cotización ya guardada (cargada del
		// listado) crea una versión nueva (v+1) y deja la anterior como historial. Los
		// guardados posteriores DENTRO de la misma sesión pisan esa versión nueva (no
		// generan v+2, v+3…). Una cotización nueva se guarda como v1 y se sigue pisando.
		const persisted = !!(prev && prev.inputs && prev.inputs.cot && prev.inputs.cot.number != null);
		const bump = persisted && editingId !== sessionVersionId.current;

		let savedDeal;
		if (bump) {
			const dealForVersion = { ...deal, inputs: { ...deal.inputs, cot: prev.inputs.cot } };
			const norm = await dealsApi.newVersion(dealForVersion, client?.id || null, client?.tipo || null);
			savedDeal = norm || dealForVersion;
		} else {
			// El deal normalizado que vuelve de save() ya trae el bloque cot (correlativo,
			// versión, tipo), que el export usa para el ID en la portada.
			const norm = await dealsApi.save(deal, client?.id || null, client?.tipo || null);
			savedDeal = norm || deal;
		}
		sessionVersionId.current = savedDeal.id;

		setEditingId(savedDeal.id);
		setFlash(true);
		setSaved({ deal: savedDeal, client });
		setTimeout(function () { setFlash(false); }, 1500);

		// Confirmación única: la ventana de cierre (con el botón para exportar). El toast
		// queda como respaldo si el cotizador se monta sin onSaved.
		if (onSaved) onSaved(savedDeal, client, exportCurrency);
		else notifyQuoteSaved(toast, {
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
	}

	const header = (
		<PageHeader
			title={meta.full + (selectedClient ? " · " + selectedClient.name : "")}
			description={
				<>
					{meta.desc}
					<InfoTooltip text={esIDC
						? "Se cotiza la cantidad de IDC que se consuma, sin distinguir persona física o jurídica (cuestan y cotizan igual). La IDC es la identidad con su certificado; las firmas se cobran por unidad. Cada cotización bonifica " + firmasBienvenidaCfg + " firmas en total, para que firme su primer documento sin costo. El segmento sale de la cantidad de IDC y define el precio de la IDC y de la firma."
						: esDistribVol
							? "El certificado va siempre bonificado; solo se cobra la firma, con precio base USD 1,00. El nivel del socio (Azul→Platinum) se alcanza por el mayor entre la facturación (con compromiso anual, servicio × 12; sin compromiso, el período mensual) y los certificados activos (que cuentan solo con compromiso). Ese nivel define el descuento sobre la firma, que se aplica en ambas condiciones: diferido con compromiso anual, o directo en factura sin compromiso."
							: "Certificados y firmas se cotizan como items independientes: se cargan las cantidades a mano, sin cupo de firmas incluidas. El segmento sale del compromiso del contrato en USD y aplica el mismo descuento sobre los dos precios de lista."} />
				</>
			}
		/>
	);

	// Avance hacia el próximo nivel/segmento: el mayor avance entre los ejes que lo
	// definen, medido desde el piso del nivel actual hasta el piso del siguiente.
	const segProgress = (function () {
		if (!hasVolume || !nextSeg) return null;
		function axis(x, curMin, nextMin) {
			const lo = Number(curMin) || 0;
			const hi = Number(nextMin) || 0;
			if (hi <= lo) return 0;
			return Math.min(1, Math.max(0, ((Number(x) || 0) - lo) / (hi - lo)));
		}
		if (esIDC) return axis(idcEje, seg.idcMin, nextSeg.idcMin);
		if (esDistribVol) return Math.max(axis(facturacionNivelDistrib, seg.compromisoMin, nextSeg.compromisoMin), distribConCompromiso ? axis(certsActivosNum, seg.certsMin, nextSeg.certsMin) : 0);
		return Math.max(axis(compromiso, seg.compromisoMin, nextSeg.compromisoMin), axis(firmasTotales, seg.firmasMin, nextSeg.firmasMin));
	})();

	// Panel de resultado = resumen de la cotización: segmento, cantidades y precios
	// por tipo, condiciones comerciales y total. Es lo que el vendedor lee para
	// entender qué está cotizando de un vistazo.
	const result = (
		<>
		<div role="tablist" aria-label="Vista del resumen" className="flex rounded-xl bg-muted p-1">
			{[{ id: "cliente", label: "Cliente" }, { id: "interno", label: hasVolume ? "Interno · " + fMarkup(markup) : "Interno" }].map(function (t) {
				const active = panelTab === t.id;
				return (
					<button
						key={t.id}
						type="button"
						role="tab"
						aria-selected={active}
						onClick={function () { setPanelTab(t.id); }}
						className={cn(
							"flex-1 rounded-[9px] border-none px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
							active ? "shadow-card bg-white font-bold text-foreground" : "bg-transparent font-semibold text-muted-foreground hover:text-foreground",
							t.id === "interno" && hasVolume && !active && markupAccent(markup, markupMin) !== "success" && "text-[var(--warning)]"
						)}
					>{t.label}</button>
				);
			})}
		</div>

		{/* El aviso de markup bloquea guardar y exportar: se ve en las dos pestañas. */}
		{hasVolume && markupBajoMin && (
			<div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3">
				<div className="text-sm font-semibold text-destructive">Markup bajo el mínimo ({markupMin.toFixed(2)}x)</div>
				<p className="text-sm text-muted-foreground mt-1">
					Esta cotización factura {fMarkup(markup)} su costo variable ({fMoney(costoTotal)}). Subí el precio, reducí las bonificaciones o ajustá las condiciones para poder guardar y exportar.
				</p>
				{segViab && !segViab.ok && (
					<p className="text-sm text-muted-foreground mt-1">
						El precio de tabla del segmento {segLabel} ya no cierra por sí solo: {!segViab.okCert ? "la IDC tiene que valer al menos " + fMoney2(segViab.minCert) : ""}{!segViab.okCert && !segViab.okFirma ? " y " : ""}{!segViab.okFirma ? "la firma al menos " + fMoney2(segViab.minFirma) : ""}.
					</p>
				)}
			</div>
		)}

		{panelTab === "cliente" && (
		<ResultPanel channel={canal} eyebrow="Lo que ve el cliente">
			{/* Total: el número que el vendedor vino a buscar, una sola vez y en bloque
			    de color. Antes aparecía arriba (héroe) y abajo (fila "Total") a la vez. */}
			<div className="rounded-xl bg-primary px-5 py-4 text-primary-foreground">
				<div className="text-xs font-bold uppercase tracking-wide opacity-80">{idcAnual ? "Total del año" : conApi && !esIDC ? "Total mes 1" : "Total"} · sin IVA</div>
				<div className="mt-1.5 font-display text-4xl leading-none tabular-nums [overflow-wrap:anywhere]">
					{hasVolume ? <AnimatedNumber value={revTotal} format={fMoney2} /> : "—"}
				</div>
				<div className="mt-2 text-sm opacity-90">
					{hasVolume
						? "Con IVA 21%: " + fMoney2(revTotal * 1.21)
						: (esIDC ? "Cargá IDC para ver el total" : "Cargá certificados o firmas para ver el total")}
				</div>
				{hasVolume && idcAnual && (
					<div className="mt-1 text-sm opacity-90">Pago único por el compromiso anual · {idc.toLocaleString("es-AR")} IDC en el año</div>
				)}
			</div>

			{/* Nivel / segmento con avance hacia el próximo: la barra convierte la tabla
			    de niveles en una meta visible ("te falta poco"). */}
			<div className="space-y-2.5 rounded-xl border border-border/60 bg-white/60 p-3.5">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{esIDC ? "Segmento" : esDistribVol ? "Nivel" : "Segmento"}</span>
					{hasVolume && <TierHint label={esDistribVol ? "ver niveles" : "ver segmentos"} columns={esIDC ? ["Segmento", "Cantidad", "Facturación", "IDC", "Firma"] : esDistribVol ? ["Nivel", "Compromiso anual", "Certs activos", "Desc."] : ["Segmento", "Firmas", "Compromiso", "Desc."]} rows={segRows} activeId={seg.id} nextHint={segHint} />}
				</div>
				{hasVolume ? (
					<>
						<div className="flex items-center justify-between gap-2">
							<TierBadge tier={seg} tiers={segmentList} size="sm" sub={!esIDC && segDesc > 0 ? "−" + Math.round(segDesc * 100) + "%" : null} />
							{nextSeg && <span className="text-xs text-muted-foreground">próximo: {nextSeg.label}</span>}
						</div>
						{segProgress != null && (
							<div
								role="progressbar"
								aria-label={"Avance hacia " + nextSeg.label}
								aria-valuemin={0}
								aria-valuemax={100}
								aria-valuenow={Math.round(segProgress * 100)}
								className="h-2 overflow-hidden rounded-full bg-muted"
							>
								<div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: Math.max(4, segProgress * 100) + "%", background: meta.color }} />
							</div>
						)}
						{segHint && <p className="text-sm leading-snug text-foreground/80">{segHint}</p>}
					</>
				) : (
					<p className="text-sm text-muted-foreground">Se define con el volumen que cargues.</p>
				)}
			</div>

			{/* Desglose por tipo de certificado */}
			{hasVolume ? (
				<div className="space-y-3">
					{nf > 0 && (
						<div className="rounded-lg bg-sky-50 px-3 py-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-sky-700">{esIDC ? (nj > 0 ? "IDC físicas" : "IDC") : "Certificados físicos"}</span>
								{ff > 0 && <span className="text-xs text-muted-foreground">{nf.toLocaleString("es-AR")} × {ff} firma{ff !== 1 ? "s" : ""}</span>}
							</div>
							<ResultRow label={(esIDC ? "IDC (" : "Certificados (") + nf.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revCertFisicos} format={fMoney2} />} accent="primary" />
							{firmasCobrarFisica > 0 && <ResultRow label={"Firmas (" + firmasCobrarFisica.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revFirmasFisica} format={fMoney2} />} />}
						</div>
					)}
					{nj > 0 && (
						<div className="rounded-lg bg-violet-50 px-3 py-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-violet-700">{esIDC ? "IDC jurídicas" : "Certificados jurídicos"}</span>
								{fj > 0 && <span className="text-xs text-muted-foreground">{nj.toLocaleString("es-AR")} × {fj} firma{fj !== 1 ? "s" : ""}</span>}
							</div>
							<ResultRow label={(esIDC ? "IDC (" : "Certificados (") + nj.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revCertJuridicos} format={fMoney2} />} accent="primary" />
							{firmasCobrarJuridica > 0 && <ResultRow label={"Firmas (" + firmasCobrarJuridica.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revFirmasJuridica} format={fMoney2} />} />}
						</div>
					)}
					{fr > 0 && (
						<div className="rounded-lg bg-amber-50 px-3 py-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-amber-700">Recompra · firmas</span>
								<span className="text-xs text-muted-foreground">identidades existentes</span>
							</div>
							<ResultRow label={"Firmas (" + fr.toLocaleString("es-AR") + (recompraDesc > 0 ? " · −" + Math.round(recompraDesc * 100) + "%" : "") + ")"} value={<AnimatedNumber value={revRecompra} format={fMoney2} />} accent="primary" />
						</div>
					)}
					{fs > 0 && (
						<div className="rounded-lg bg-amber-50 px-3 py-2">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold text-amber-700">Firmas sueltas</span>
								<span className="text-xs text-muted-foreground">sin certificado</span>
							</div>
							<ResultRow label={"Firmas (" + fs.toLocaleString("es-AR") + ")"} value={<AnimatedNumber value={revFirmasSueltas} format={fMoney2} />} accent="primary" />
						</div>
					)}

					{/* Condiciones comerciales. Las palancas ya no se restan del total: se
					    ofrecen aparte (bloque debajo del total). */}
					<div>
						{firmasBienvenida > 0 && <ResultRow label={"Tus primeras " + firmasBienvenida.toLocaleString("es-AR") + " firmas · de regalo"} value="Incluido" accent="success" valueClass="text-[var(--success)]" />}
						{firmasBonif > 0 && <ResultRow label={"Firmas bonificadas (" + firmasBonif.toLocaleString("es-AR") + ")"} value={<>−<AnimatedNumber value={bonifMonto} format={fMoney2} /></>} accent="success" valueClass="text-[var(--success)]" />}
						{conApi && <ResultRow label={"SLA · " + sla.label + (slaMeses > 1 && slaMes > 0 ? " · " + slaMeses + " meses" : "")} value={slaBonificado ? "bonificado" : slaMes > 0 ? <AnimatedNumber value={slaPeriodo} format={fMoney2} /> : (slaIncluido && sla.precioMes ? "incluido por facturación" : "incluido")} />}
						{conApi && <ResultRow label="Fee de implementación (única vez)" value={<AnimatedNumber value={feeAplicado} format={fMoney2} />} />}
						{abono && <ResultRow label="Abono mensual (firmas)" value={<><AnimatedNumber value={revAbonoMes} format={fMoney2} />/mes</>} accent="success" />}
					</div>

					{/* Liquidación del descuento de nivel: cómo se entrega el descuento
					    (mismo neto, distinto cash flow). Solo Volumen/Distribuidores-Vol. */}
					{mostrarFormas && descNivelMonto > 0 && (
						<div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 space-y-1">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold uppercase tracking-wide text-primary">Liquidación del descuento</span>
								<span className="text-xs text-muted-foreground">{descLiq.label}</span>
							</div>
							{descLiq.esFull ? (
								<>
									<div className="flex items-center justify-between text-xs">
										<span className="text-muted-foreground">Se factura durante el año (precio lista)</span>
										<span className="font-semibold tabular-nums">{fMoney2(descLiq.cargoAnioFull)}</span>
									</div>
									<div className="flex items-center justify-between text-xs">
										<span className="text-muted-foreground">{descLiq.sub === "firmas" ? "Bonificación a fin de año (" + descLiq.firmasCierre.toLocaleString("es-AR") + " firmas)" : "Descuento acreditado a fin de año"}</span>
										<span className="font-semibold tabular-nums text-[var(--success)]">−{fMoney2(descNivelMonto)}</span>
									</div>
									{descLiq.sub === "firmas" && descLiq.costoFirmasCierre > 0 && (
										<div className="flex items-center justify-between text-xs">
											<span className="text-muted-foreground">Costo de las firmas bonificadas (margen)</span>
											<span className="font-semibold tabular-nums text-destructive">−{fMoney2(descLiq.costoFirmasCierre)}</span>
										</div>
									)}
								</>
							) : (
								<div className="flex items-center justify-between text-xs">
									<span className="text-muted-foreground">{descForma === "C" ? "Descuento directo en cada factura" : descLiq.sub === "anticipado" ? "Pago anual anticipado (descuento aplicado)" : "Con seguro de caución ejecutable"}</span>
									<span className="font-semibold tabular-nums">{fMoney2(revServicio)}</span>
								</div>
							)}
							<div className="flex items-center justify-between text-xs border-t border-primary/20 pt-1">
								<span className="text-muted-foreground">Neto (mismo en todas las formas)</span>
								<span className="font-semibold tabular-nums text-primary">{fMoney2(revServicio)}</span>
							</div>
						</div>
					)}

					{/* Condiciones comerciales OFRECIDAS: incentivos que el cliente puede
					    aprovechar, sin restarse del total cotizado. */}
					{hayCondOfrecidas && (
						<div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 space-y-1">
							<div className="flex items-center justify-between">
								<span className="text-xs font-semibold uppercase tracking-wide text-primary">Condiciones que puede aprovechar</span>
								<span className="text-xs text-muted-foreground">no afectan el total</span>
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

					<p className="text-xs text-muted-foreground">
						{esIDC
							? "IDC " + fMoney2(precioIDC) + (overridePrecioCert !== "" ? " (manual)" : "") + " y firma " + fMoney2(precioFirmaExtraEff) + (overridePrecioFirma !== "" ? " (manual)" : "") + ", cada una por unidad · segmento " + segLabel + ". Se bonifican " + firmasBienvenidaCfg + " firmas en total por cotización. Excedente no planificado: " + fMoney2(precioFirmaExcedente) + " c/u (condición del contrato)."
							: esDistribVol
								? "Certificado bonificado y firma " + fMoney2(precioFirmaExtraEff) + " por unidad" + (overrideActive ? " · precio ajustado a mano" : " · nivel " + segLabel + (distribConCompromiso ? "" : " (descuento directo)")) + "."
								: "Certificado " + fMoney2(precioIDC) + " y firma " + fMoney2(precioFirmaExtraEff) + ", cada uno por unidad" + (overrideActive ? " · precio ajustado a mano" : " · segmento " + segLabel) + "."}
					</p>

				</div>
			) : (
				<p className="text-xs text-muted-foreground">Cargá certificados físicos o jurídicos para ver el desglose y el total.</p>
			)}
		</ResultPanel>
		)}

		{/* Rentabilidad · uso interno: su propia pestaña del panel. No se exporta a la
		    propuesta del cliente. */}
		{panelTab === "interno" && (hasVolume ? (
			<div className="rounded-xl border border-border bg-card p-4 shadow-float">
				<div className="mb-3">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rentabilidad · uso interno</span>
				</div>
				<div className="mb-3 grid grid-cols-3 gap-3">
					<div>
						<div className="text-xs text-muted-foreground">Markup sobre costo</div>
						<div className={"font-heading text-base font-semibold tabular-nums " + markupClass(markup, markupMin)}>{fMarkup(markup)}</div>
						<div className="text-xs text-muted-foreground">mín. {markupMin.toFixed(2)}x · {markupWord(markup, markupMin)}</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Contribución marginal</div>
						<div className="font-heading text-base font-semibold tabular-nums"><AnimatedNumber value={margen} format={fMoney2} /></div>
						<div className="text-xs text-muted-foreground">{(margenPct * 100).toFixed(0)}% sobre ingreso</div>
					</div>
					<div>
						<div className="text-xs text-muted-foreground">Costo variable total</div>
						<div className="font-heading text-base font-semibold tabular-nums"><AnimatedNumber value={costoTotal} format={fMoney2} /></div>
						<div className="text-xs text-muted-foreground">{idc.toLocaleString("es-AR")} {esIDC ? "IDC" : "certs"} + {firmasTotales.toLocaleString("es-AR")} firmas{firmasBonif > 0 ? " (" + firmasBonif.toLocaleString("es-AR") + " bonificadas)" : ""}</div>
					</div>
				</div>
				<div className="space-y-1 border-t border-border/60 pt-2">
					<ResultRow label={<>{esIDC ? "Ingreso IDC" : "Ingreso certificados"}<InfoTooltip text={idc.toLocaleString("es-AR") + (esIDC ? " IDC × " : " certificados × ") + fMoney2(precioIDC) + (esIDC ? " por IDC = " : " por certificado = ") + fMoney2(revIDC)} /></>} value={<AnimatedNumber value={revIDC} format={fMoney2} />} accent="primary" />
					<ResultRow label={<>Ingreso firmas<InfoTooltip text={firmasTotales.toLocaleString("es-AR") + " firmas × " + fMoney2(precioFirmaExtraEff) + " = " + fMoney2(revFirmas) + ". Todas se facturan por unidad: no hay cupo por certificado."} /></>} value={revFirmas ? <AnimatedNumber value={revFirmas} format={fMoney2} /> : "—"} />
					{firmasBienvenida > 0 && <ResultRow label={<>Firmas de bienvenida<InfoTooltip text={firmasBienvenida + " firmas × " + fMoney2(precioFirmaExtraEff) + " = " + fMoney2(bienvenidaMonto) + " que no se facturan (en total por cotización). Su costo variable se paga igual."} /></>} value={<span className="tabular-nums text-destructive">−{fMoney2(bienvenidaMonto)}</span>} />}
					{firmasBonif > 0 && <ResultRow label={<>Bonificación de firmas<InfoTooltip text={firmasBonif.toLocaleString("es-AR") + " firmas bonificadas × " + fMoney2(precioFirmaExtraEff) + " = " + fMoney(bonifMonto) + " que no se facturan. Su costo variable se paga igual."} /></>} value={<span className="tabular-nums text-destructive">−{fMoney(bonifMonto)}</span>} />}
					<ResultRow label={<>Costo certificados<InfoTooltip text={idc.toLocaleString("es-AR") + " certificados × " + fMoney2(cvCert) + " de costo variable c/u = " + fMoney(costoCert)} /></>} value={<span className="tabular-nums text-destructive">−{fMoney(costoCert)}</span>} />
					<ResultRow label={<>Costo firmas<InfoTooltip text={firmasTotales.toLocaleString("es-AR") + (esIDC ? " firmas emitidas (bonificadas incluidas) × " : " firmas × ") + fMoney2(cvFirma) + " de costo variable c/u = " + fMoney(costoFirmas)} /></>} value={<span className="tabular-nums text-destructive">−{fMoney(costoFirmas)}</span>} />
					{costoFormaA2 > 0 && <ResultRow label={<>Firmas bonificadas a fin de año<InfoTooltip text={descLiq.firmasCierre.toLocaleString("es-AR") + " firmas (equivalentes al descuento de nivel de " + fMoney(descNivelMonto) + ") × " + fMoney2(cvFirma) + " de costo variable = " + fMoney(costoFormaA2) + ". Se entregan sin cargo al cierre, su costo baja el margen."} /></>} value={<span className="tabular-nums text-destructive">−{fMoney(costoFormaA2)}</span>} />}
					{esIDC && segViab && <ResultRow label={<>Markup de tabla · IDC / firma<InfoTooltip text={"Precio de tabla del segmento " + segLabel + " contra su costo variable. IDC: " + fMoney2(segPrice.precioIDC) + " ÷ " + fMoney2(cvCert) + ". Firma: " + fMoney2(segPrice.precioFirma) + " ÷ " + fMoney2(cvFirma) + ". Mínimo " + markupMin.toFixed(2) + "x cada uno."} /></>} value={<span className="tabular-nums">{fMarkup(segViab.markupCert)} / {fMarkup(segViab.markupFirma)}</span>} />}
				</div>
			</div>
		) : (
			<div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-float">Cargá volumen para ver markup, contribución y costos.</div>
		))}
		</>
	);

	const footer = (
		<SaveExportBar
			hint={!hasVolume ? (esIDC ? "Cargá al menos una IDC para guardar o exportar." : "Cargá al menos un certificado para guardar o exportar.") : (markupBajoMin ? "Markup " + fMarkup(markup) + ", bajo el mínimo de " + markupMin.toFixed(2) + "x. Ajustá precio, bonificaciones o condiciones." : "")}
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
			{/* Lienzo de la cotización: Cliente → Volumen → Condiciones → Extras. Los
			    precios derivados (por certificado, por firma, descuento) ya no se repiten
			    en recuadros de solo lectura: viven en el panel de resumen. */}
			<FieldGroup channel={canal} done={!!selectedClient} title="Cliente">
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">
						Cliente
						{editingId && <span className="ml-1.5 text-[var(--success)] font-semibold normal-case tracking-normal">· editando</span>}
					</Label>
					<ClientSelector clients={clientsApi?.clients || []} value={selectedClient} onChange={setSelectedClient} />
					{!selectedClient && <p className="text-xs text-[var(--warning)]">Indicá el cliente antes de guardar o exportar la cotización.</p>}
					{selectedClient && selectedClient.channel && resolveChannel(selectedClient.channel) !== resolveChannel(canal) && (
						<p className="text-xs text-[var(--warning)]">
							Este cliente es del canal <span className="font-semibold">{channelLabel(selectedClient.channel)}</span>. Podés cotizarlo acá igual
							{onNavChannel && <> o <button type="button" onClick={function () { onNavChannel(resolveChannel(selectedClient.channel)); }} className="font-semibold underline underline-offset-2 hover:opacity-80">cotizar en {channelLabel(selectedClient.channel)}</button></>}.
						</p>
					)}
				</div>
			</FieldGroup>

			<FieldGroup channel={canal} done={hasVolume} title="Volumen" subtitle={esIDC ? "Cantidad de IDC; el segmento y el precio se calculan solos." : "Cantidades por tipo; el nivel y el precio se calculan solos."}>
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">Modalidad de integración</Label>
					<div className="flex gap-1 flex-wrap">
						{[
							{ id: "api", label: "Con integración " + intgTerm, sub: "fee de implementación + SLA" },
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
					{!conApi && <p className="text-xs text-muted-foreground">Sin integración {intgTerm}: se cotiza únicamente el volumen de certificados, sin fee de implementación ni plan de soporte.</p>}
				</div>

				{/* Volumen. En IDC es un solo bloque: la IDC no distingue persona física o
				    jurídica (mismo precio y costo) y se carga la cantidad que se consuma, sin
				    temporalidad. Se guarda en el slot físico (certFisicos), que el export
				    muestra sin desglose por tipo. Si una cotización vieja trae IDC jurídicas,
				    se muestra también ese bloque para no perder el dato. En Volumen se sigue
				    agrupando por tipo de certificado. */}
				{esIDC ? (
					<>
					{/* Modalidad IDC, como en Distribuidores: consumo único (la cantidad que se
					    consuma en ese momento) o compromiso anual (consumo mensual × 12), que se
					    puede cargar por mes o por año (÷ 12). */}
					<div className="flex flex-wrap items-end gap-x-4 gap-y-2">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">Modalidad</Label>
							<div className="inline-flex w-fit rounded-md border border-border bg-muted/30 p-0.5">
								{[{ id: "unico", label: "Consumo único" }, { id: "anual", label: "Compromiso anual" }].map(function (o) {
									const active = modalidadFact === o.id;
									return <button key={o.id} type="button" aria-pressed={active} onClick={function () { setModalidadFact(o.id); }} className={"px-3 py-1 rounded text-xs font-medium transition-colors " + (active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{o.label}</button>;
								})}
							</div>
						</div>
						{idcAnual && (
							<div className="flex flex-col gap-1.5">
								<Label className="text-xs text-muted-foreground uppercase tracking-wide">Cargo el consumo</Label>
								<div className="inline-flex w-fit rounded-md border border-border bg-muted/30 p-0.5">
									{[{ id: "mensual", label: "Por mes" }, { id: "anual", label: "Por año" }].map(function (o) {
										const active = idcEntrada === o.id;
										return <button key={o.id} type="button" aria-pressed={active} onClick={function () { setIdcEntrada(o.id); }} className={"px-3 py-1 rounded text-xs font-medium transition-colors " + (active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{o.label}</button>;
									})}
								</div>
							</div>
						)}
					</div>
					<p className="text-xs text-muted-foreground -mt-1">
						{!idcAnual
							? "Se cotiza la cantidad que se consuma en este momento. El segmento sale de esa cantidad y de su facturación."
							: idcPorAnio
								? "Cargás el consumo del año y se cotiza el total del año, a pagar de una vez. El segmento se mide por ese total de IDC y su facturación."
								: "Cargás el consumo mensual y se cotiza el total del año (× 12), a pagar de una vez. El segmento se mide por el total de IDC del año y su facturación."}
					</p>
					{/* Recompra: el cliente ya tiene identidades activas. Se cotizan firmas para
					    esas identidades (lista de Volumen con su descuento), sin certificado. Las IDC del bloque de abajo son identidades NUEVAS (opcional). */}
					<div className={"rounded-lg border p-3 " + (recompra ? "border-amber-200 bg-amber-50/60" : "border-border bg-muted/20")}>
						<label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
							<input type="checkbox" checked={recompra} onChange={function (e) { setRecompraManual({ clientId: selectedClient ? selectedClient.id : null, value: e.target.checked }); }} className="mt-0.5 size-4 accent-[var(--primary)]" />
							<span>
								<span className="font-semibold">Recompra · cliente con identidades activas</span>
								<span className="block text-xs text-muted-foreground">
									{recompraSugerida
										? (selectedClient ? selectedClient.name : "El cliente") + " tiene " + idcActivos.n.toLocaleString("es-AR") + " IDC activas de " + idcActivos.deals.length + (idcActivos.deals.length === 1 ? " cotización confirmada" : " cotizaciones confirmadas") + " (certificados vigentes). Se cotizan firmas sin volver a cobrar el certificado."
										: "Activalo si el cliente ya compró IDC: se cotizan firmas para sus identidades existentes, sin certificado."}
								</span>
							</span>
						</label>
						{recompra && (
							<div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
								<NumberField label={"Firmas · identidades existentes" + (idcAnual ? (idcPorAnio ? " / año" : " / mes") : "")} value={firmasRecompra} onChange={setFirmasRecompra} min={0} placeholder="0"
									note={fr > 0 ? (recompraSeg.label ? "Segmento Volumen " + recompraSeg.label + " · " : "") + (recompraDesc > 0 ? "−" + Math.round(recompraDesc * 100) + "% · " : "") + fMoney2(precioFirmaRecompra) + " por firma" + (idcAnual && !idcPorAnio ? " · " + fr.toLocaleString("es-AR") + " en el año" : "") : "a lista de Volumen (" + fMoney2(precioFirmaRecompraLista) + ") con su descuento"} />
								<p className="self-center text-xs text-muted-foreground">Si además suma identidades nuevas, cargalas abajo como IDC: esas sí llevan certificado.</p>
							</div>
						)}
					</div>
					<label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-foreground">
						<input type="checkbox" checked={idcPorTipo} onChange={function (e) { setIdcPorTipo(e.target.checked); }} className="size-4 accent-[var(--primary)]" />
						Distinguir persona física y jurídica
						<span className="text-xs text-muted-foreground">(opcional, mismo precio; solo cambia el desglose)</span>
					</label>
					<div className={"grid grid-cols-1 gap-3" + (idcPorTipo ? " sm:grid-cols-2" : "")}>
						<div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3">
							<div className="mb-2.5 flex items-center gap-1.5">
								<span className="inline-block size-2 rounded-full bg-sky-500" />
								<span className="text-xs font-semibold text-sky-700">{(recompra ? "IDC nuevas" : "IDC") + (idcPorTipo ? " físicas" : "")}</span>
								<span className="text-xs text-muted-foreground">· {idcPorTipo ? "personas" : "personas o empresas"}</span>
							</div>
							<div className="grid grid-cols-2 gap-2.5">
								<NumberField label={idcLabelCant} value={certFisicos} onChange={setCertFisicos} min={0} placeholder="0" note={idcNoteCant(nfIn)} />
								<NumberField label="Firmas c/u" value={firmasPorCertFisico} onChange={setFirmasPorCertFisico} min={0} note={ff > 0 ? (nf * ff).toLocaleString("es-AR") + " firmas · " + fMoney2(precioFirmaExtraEff) + " c/u" : "por IDC"} />
							</div>
						</div>
						{idcPorTipo && (
							<div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
								<div className="mb-2.5 flex items-center gap-1.5">
									<span className="inline-block size-2 rounded-full bg-violet-500" />
									<span className="text-xs font-semibold text-violet-700">IDC jurídicas</span>
									<span className="text-xs text-muted-foreground">· empresas</span>
								</div>
								<div className="grid grid-cols-2 gap-2.5">
									<NumberField label={idcLabelCant} value={certJuridicos} onChange={setCertJuridicos} min={0} placeholder="0" note={idcNoteCant(Math.max(0, Number(certJuridicos) || 0))} />
									<NumberField label="Firmas c/u" value={firmasPorCertJuridico} onChange={setFirmasPorCertJuridico} min={0} note={fj > 0 ? (nj * fj).toLocaleString("es-AR") + " firmas · " + fMoney2(precioFirmaExtraEff) + " c/u" : "por IDC"} />
								</div>
							</div>
						)}
					</div>
					</>
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div className="rounded-lg border border-sky-200 bg-sky-50/50 p-3">
							<div className="mb-2.5 flex items-center gap-1.5">
								<span className="inline-block size-2 rounded-full bg-sky-500" />
								<span className="text-xs font-semibold text-sky-700">Certificados físicos</span>
								<span className="text-xs text-muted-foreground">· personas</span>
							</div>
							<div className="grid grid-cols-2 gap-2.5">
								<NumberField label="Cantidad" value={certFisicos} onChange={setCertFisicos} min={0} placeholder="0" />
								<NumberField label="Firmas c/u" value={firmasPorCertFisico} onChange={setFirmasPorCertFisico} min={0} note={ff > 0 ? (nf * ff).toLocaleString("es-AR") + " firmas físicas" : "por certificado"} />
							</div>
						</div>
						<div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3">
							<div className="mb-2.5 flex items-center gap-1.5">
								<span className="inline-block size-2 rounded-full bg-violet-500" />
								<span className="text-xs font-semibold text-violet-700">Certificados jurídicos</span>
								<span className="text-xs text-muted-foreground">· empresas</span>
							</div>
							<div className="grid grid-cols-2 gap-2.5">
								<NumberField label="Cantidad" value={certJuridicos} onChange={setCertJuridicos} min={0} placeholder="0" />
								<NumberField label="Firmas c/u" value={firmasPorCertJuridico} onChange={setFirmasPorCertJuridico} min={0} note={fj > 0 ? (nj * fj).toLocaleString("es-AR") + " firmas jurídicas" : "por certificado"} />
							</div>
						</div>
					</div>
				)}

				{/* Firmas sueltas (solo Volumen): firmas sin certificado asociado ni tipo.
				    Permiten cotizar firmas sin certificados necesariamente. Se cobran al
				    precio de firma del segmento y suman al compromiso. */}
				{!esIDC && (
					<div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
						<div className="mb-2.5 flex items-center gap-1.5">
							<span className="inline-block size-2 rounded-full bg-amber-500" />
							<span className="text-xs font-semibold text-amber-700">Firmas sueltas</span>
							<span className="text-xs text-muted-foreground">· sin certificado</span>
						</div>
						<div className="grid grid-cols-2 gap-2.5">
							<NumberField
								label="Cantidad"
								value={firmasSueltas}
								onChange={setFirmasSueltas}
								min={0}
								placeholder="0"
								note={fs > 0 ? fs.toLocaleString("es-AR") + " firmas · " + fMoney2(precioFirmaExtraEff) + " c/u" : "firmas sin certificado asociado"}
							/>
						</div>
					</div>
				)}
			</FieldGroup>

			<FieldGroup channel={canal} done={hasVolume} title="Condiciones" subtitle={condResumen}>
				{conApi && (
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{feePermitido
							? recompra
								? <div className="flex flex-col gap-1.5"><Label className="text-xs text-muted-foreground uppercase tracking-wide">Fee de implementación</Label><div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm text-muted-foreground">No aplica · cliente ya integrado (recompra)</div></div>
								: <NumberField label="Fee de implementación" value={fee} onChange={setFee} prefix="USD" min={0} note={api.label + " · rango USD " + api.feeMin.toLocaleString("es-AR") + "–" + api.feeMax.toLocaleString("es-AR")} />
							: (
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Fee de implementación</Label>
									<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
										<span className="font-semibold tabular-nums">sin fee</span>
										<span className="ml-2 text-xs text-muted-foreground truncate">nivel {segLabel}</span>
									</div>
									<span className="text-xs text-muted-foreground">El fee de implementación solo aplica a los niveles Azul y Bronce.</span>
								</div>
							)}
						<div className="flex flex-col gap-1.5">
							<SelectField label="Plan de soporte / SLA" value={slaId} onValueChange={setSlaId}
								options={[{ value: "auto", label: "Según facturación · " + slaGanado.label + " incluido" }].concat(slaPlans.map(function (s) {
									const incl = slaPlans.indexOf(s) <= slaPlans.indexOf(slaGanado);
									return { value: s.id, label: s.label + (incl ? " · incluido" : s.precioMes ? " · USD " + s.precioMes.toLocaleString("es-AR") + "/mes" : " · a medida") };
								}))}
								note={(slaIncluido ? "Incluido por la facturación de la cotización (" + fMoney(slaFacturacion) + "). " : "Por encima del plan alcanzado (" + slaGanado.label + "): se cobra. ") + (slaSiguiente ? "Desde " + fMoney(slaSiguiente.facturacionMin) + " se incluye " + slaSiguiente.label + "." : "")} />
							{sla.precioMes > 0 && !slaIncluido && (
								<label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
									<input type="checkbox" checked={slaBonificado} onChange={function (e) { setSlaBonificado(e.target.checked); }} className="rounded" />
									Bonificar SLA para este cliente
									{slaBonificado && <Badge variant="secondary" className="text-xs px-1.5 py-0 text-[var(--success)] border-[var(--success)]">bonificado</Badge>}
								</label>
							)}
						</div>
					</div>
				)}

				{/* Forma de liquidación del descuento (Volumen y Distribuidores-Volumen), en
				    dos pasos: directo en factura o con compromiso anual. Las cuatro variantes
				    del compromiso aparecen solo si se elige compromiso. El neto no cambia. */}
				{mostrarFormas && (
					<ConditionBlock icon={Wallet} title="Cómo recibe el descuento del nivel">
						<div className="flex flex-col gap-2.5">
							<div role="radiogroup" aria-label="Forma de liquidación" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
								{[
									{ id: "directo", label: "Directo en factura", desc: "Sin compromiso anual. Se aplica en cada factura." },
									{ id: "compromiso", label: "Con compromiso anual", desc: "Anticipado, caución, rebate o firmas al cierre." },
								].map(function (o) {
									const active = o.id === "directo" ? descForma === "C" : descForma !== "C";
									return (
										<button
											key={o.id}
											type="button"
											role="radio"
											aria-checked={active}
											onClick={function () {
												if (o.id === "directo") setDescOpcionSel("C1");
												else if (descForma === "C") setDescOpcionSel("B1");
											}}
											className={cn(
												"flex flex-col gap-0.5 rounded-xl border px-3.5 py-3 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
												active ? "border-primary/60 bg-primary/10 ring-1 ring-primary/30" : "border-border bg-card hover:bg-muted/60"
											)}
										>
											<span className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>{o.label}</span>
											<span className="text-sm leading-snug text-muted-foreground">{o.desc}</span>
										</button>
									);
								})}
							</div>
							{descForma !== "C" && (
								<div role="radiogroup" aria-label="Variante con compromiso anual" className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
									{DESC_OPCIONES.filter(function (o) { return o.forma !== "C"; }).map(function (o) {
										const active = descOpcionSel === o.id;
										return (
											<button key={o.id} type="button" role="radio" aria-checked={active} onClick={function () { setDescOpcionSel(o.id); }} className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50", active ? "border-primary/50 bg-primary/5" : "border-transparent bg-muted/40 hover:bg-muted")}>
												<span className={cn("mt-0.5 size-3.5 shrink-0 rounded-full border-2 transition-colors", active ? "border-primary bg-primary" : "border-muted-foreground/40")} />
												<span className="flex flex-col gap-0.5">
													<span className={cn("text-sm font-medium", active ? "text-primary" : "text-foreground")}>{o.label}</span>
													<span className="text-xs leading-snug text-muted-foreground">{o.desc}</span>
												</span>
											</button>
										);
									})}
								</div>
							)}
							{hasVolume && descNivelMonto > 0 && (
								<p className="text-sm text-muted-foreground">
									{descLiq.esFull
										? "Se factura " + fMoney(descLiq.cargoAnioFull) + " a precio de lista durante el año" + (descLiq.sub === "firmas" ? "; al cierre se bonifican " + descLiq.firmasCierre.toLocaleString("es-AR") + " firmas (costo " + fMoney(descLiq.costoFirmasCierre) + ", baja el margen)." : "; al cierre se acredita " + fMoney(descLiq.rebate) + ".")
										: descForma === "C"
											? "Se factura " + fMoney(revServicio) + " con el descuento ya aplicado, en cada período y sin compromiso de permanencia anual."
											: (descSub === "anticipado" ? "Se cobra " + fMoney(revServicio) + " anticipado, con el descuento ya aplicado." : "Precio neto " + fMoney(revServicio) + " con seguro de caución ejecutable (solo cláusula en la propuesta).")}
								</p>
							)}
						</div>
					</ConditionBlock>
				)}

				<ConditionBlock
					icon={Handshake}
					title="Condiciones comerciales que ofrecés"
				>
					<p className="text-xs text-muted-foreground">Se listan en la propuesta como incentivos que el cliente puede aprovechar. No modifican el total cotizado.</p>
					<CommercialLevers levers={commercialLevers} value={levers} onChange={setLevers} />
				</ConditionBlock>

				<SegmentoSection
					esIDC={esIDC}
					esDistribVol={esDistribVol}
					hasVolume={hasVolume}
					seg={seg}
					segDesc={segDesc}
					segDriver={segDriver}
					segmentList={segmentList}
					segPrice={segPrice}
					distribConCompromiso={distribConCompromiso}
					certsActivosNum={certsActivosNum}
					certsHistoricos={certsHistoricos}
					facturacionAtList={facturacionAtList}
					facturacionEje={facturacionEje}
					facturacionNivelDistrib={facturacionNivelDistrib}
					firmasTotales={firmasTotales}
					feeAplicado={feeAplicado}
					idc={idcEje}
					revSinFee={revSinFee}
					mesesVentanaFact={mesesVentanaFact}
					mesesVinculacion={mesesVinculacion}
					modalidadFact={modalidadFact}
					setModalidadFact={setModalidadFact}
					fMoney={fMoney}
					fMoney2={fMoney2}
				/>
			</FieldGroup>

			{/* Extras: opcionales, como tarjetas con interruptor. Solo el que se usa se
			    expande; el resto queda como una celda de la grilla. */}
			<section aria-labelledby="extras-title" className="space-y-3">
				<h3 id="extras-title" className="px-1 font-heading text-sm font-semibold text-foreground">Extras</h3>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
					<ExtraCard
						icon={Gift}
						title="Bonificar firmas"
						desc={esIDC ? "Más allá de las " + firmasBienvenidaCfg + " de bienvenida" : "Firmas sin cargo"}
						checked={showBonif}
						onChange={function (e) { setShowBonif(e.target.checked); if (!e.target.checked) setFirmasBonificadas(""); }}
						badge={firmasBonif > 0 ? <Badge variant="secondary" className="text-xs px-1.5 py-0 text-[var(--success)] border-[var(--success)]">{firmasBonif.toLocaleString("es-AR")} bonificadas</Badge> : null}
					>
						<div className="space-y-2">
								<div className="max-w-xs">
									<NumberField label="Firmas bonificadas" value={firmasBonificadas} onChange={setFirmasBonificadas} min={0} max={firmasBonifMax} placeholder="0"
										note={hasVolume ? (firmasBonifMax > 0 ? "De las " + firmasBonifMax.toLocaleString("es-AR") + " firmas a facturar" + (firmasBienvenida > 0 ? " (después de las " + firmasBienvenida + " de bienvenida)." : ".") : "Este volumen no tiene firmas a facturar.") : "Cargá el volumen primero."} />
								</div>
								{firmasBonif > 0 && (
									<p className="text-sm text-muted-foreground">
										{firmasBonif.toLocaleString("es-AR")} firmas × {fMoney2(precioFirmaExtraEff)} = <span className="font-semibold text-[var(--success)]">−{fMoney(bonifMonto)}</span> · se facturan {firmasCobradas.toLocaleString("es-AR")} de {firmasExtra.toLocaleString("es-AR")} firmas.
									</p>
								)}
								{Number(firmasBonificadas) > firmasBonifMax && (
									<p className="text-xs text-[var(--warning)]">Solo se pueden bonificar las {firmasBonifMax.toLocaleString("es-AR")} firmas que quedan por facturar{firmasBienvenida > 0 ? "; las de bienvenida ya van sin cargo" : ""}.</p>
								)}
								<p className="text-xs text-muted-foreground">El segmento se sigue calculando sobre el volumen completo de IDC. El costo variable de las firmas bonificadas se paga igual, así que baja el markup.</p>
							</div>
					</ExtraCard>
					<ExtraCard
						icon={CalendarClock}
						title="Abono mensual"
						desc="Repone la bolsa de firmas cada mes"
						checked={abono}
						onChange={function (e) { setAbono(e.target.checked); }}
						badge={abono ? <Badge variant="secondary" className="text-xs px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activo</Badge> : null}
					>
						<div className="flex items-center gap-2">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">Descuento del abono</Label>
							<div className="flex items-center gap-1">
								<Input type="number" min={0} max={100} value={abonoDescPct} onChange={function (e) { setAbonoDescPct(e.target.value === "" ? "" : Number(e.target.value)); }} className="h-8 w-20 text-sm tabular-nums" />
								<span className="text-sm text-muted-foreground">%</span>
							</div>
						</div>
					{abono && hasVolume && (
						<div className="mt-2 text-sm text-muted-foreground space-y-1">
							<p>Repone la bolsa de firmas cada mes con un descuento del {(descAbono * 100).toFixed(0)}% sobre el precio de firma.</p>
							<p className="text-xs">{firmasTotales.toLocaleString("es-AR")} firmas × USD {precioFirmaAbono.toFixed(3)}/firma = <span className="font-semibold text-foreground">{fMoney(revAbonoMes)}/mes</span></p>
						</div>
					)}
					</ExtraCard>
					<ExtraCard
						icon={SlidersHorizontal}
						title="Precio a mano"
						desc="Pisa el precio del nivel"
						checked={showOverrides}
						onChange={function (e) { setShowOverrides(e.target.checked); if (!e.target.checked) { setOverridePrecioCert(""); setOverridePrecioFirma(""); } }}
						badge={overrideActive ? <Badge variant="secondary" className="text-xs px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activo</Badge> : null}
					>
						<div className="space-y-2">
								<p className="text-xs text-muted-foreground">Completá el precio que quieras fijar a mano. El campo que dejes vacío usa el precio normal (segmento {seg.label}).</p>
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
											<Input type="number" value={overridePrecioFirma} onChange={function (e) { setOverridePrecioFirma(e.target.value); }} placeholder={precioFirmaSegmento.toFixed(3)} className="h-8 text-sm" />
											{overridePrecioFirma !== "" && <button onClick={function () { setOverridePrecioFirma(""); }} className="text-muted-foreground hover:text-foreground text-xs shrink-0">✕</button>}
										</div>
									</div>
								</div>
								<p className="text-xs text-muted-foreground">Precio efectivo: IDC {fMoney2(precioIDC)}{overridePrecioCert !== "" ? " · manual" : " · segmento"} · firma {fMoney2(precioFirmaExtraEff)}{overridePrecioFirma !== "" ? " · manual" : " · segmento"}.</p>
						</div>
					</ExtraCard>
					<ExtraCard
						icon={TrendingUp}
						title={esIDC ? "Proyección de crecimiento" : "Escalonado en el PDF"}
						desc="Escala de precios por volumen en la propuesta"
						checked={proyEnabled}
						onChange={function (e) { setProyEnabled(e.target.checked); }}
					>
						<ProyeccionSection
							esIDC={esIDC} esDistribVol={esDistribVol} hasVolume={hasVolume}
							baseCanal={baseCanal} fMoney={fMoney} fMoney2={fMoney2}
							proyEnabled={proyEnabled} setProyEnabled={setProyEnabled}
							proyCustom={proyCustom} proyDriver={proyDriver} proySteps={proySteps}
							proyRows={proyRows} escalonadoRows={escalonadoRows}
							changeDriver={changeDriver} resetSteps={resetSteps}
							updateStep={updateStep} addStep={addStep} removeStep={removeStep}
							hideToggle
						/>
					</ExtraCard>
					<ExtraCard
						icon={MessageSquareText}
						title="Casos de uso"
						desc="Texto para la propuesta"
						checked={showCasos || casosDeUso !== ""}
						onChange={function (e) { setShowCasos(e.target.checked); if (!e.target.checked) setCasosDeUso(""); }}
					>
						<label className="flex flex-col gap-1.5">
							<span className="sr-only">Casos de uso</span>
							<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: recibos de haberes, contratos de RRHH, acuerdos comerciales..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
						</label>
					</ExtraCard>
				</div>
			</section>

			{/* ── Matriz de niveles (solo Distribuidores-Volumen) ── */}
			{esDistribVol && (
				<CollapsibleSection title="Matriz de niveles" subtitle="Niveles del canal. El nivel se alcanza por el mayor entre la facturación y los certificados activos (que cuentan solo con compromiso anual). El nivel de esta cotización se resalta.">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nivel</TableHead>
								<TableHead className="text-right">Certificados activos</TableHead>
								<TableHead className="text-right">Descuento firma</TableHead>
								<TableHead className="text-right">Compromiso anual (USD)</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{segmentList.map(function (t) {
								const act = hasVolume && t.id === seg.id;
								const certsMin = Number(t.certsMin) || 0;
								const cMin = Number(t.compromisoMin) || 0;
								return (
									<TableRow key={t.id} className={act ? "bg-accent" : ""}>
										<TableCell><span className="inline-flex items-center gap-2"><TierBadge tier={t} tiers={segmentList} size="sm" />{act && <span className="text-xs font-bold uppercase tracking-wide text-primary">actual</span>}</span></TableCell>
										<TableCell className="text-right tabular-nums">{certsMin.toLocaleString("es-AR")}{t.certsMax == null ? "+" : "–" + (Number(t.certsMax) || 0).toLocaleString("es-AR")}</TableCell>
										<TableCell className="text-right tabular-nums font-semibold">{Math.round((Number(t.descuento) || 0) * 100)}%</TableCell>
										<TableCell className="text-right tabular-nums">{cMin === 0 && t.compromisoMax != null ? "hasta " + fMoney(Number(t.compromisoMax) || 0) : fMoney(cMin) + (t.compromisoMax == null ? "+" : "–" + fMoney(Number(t.compromisoMax) || 0))}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CollapsibleSection>
			)}

			{/* ── Referencia ── (solo IDC: la tabla es la escala de segmentos IDC, el SDK y el SLA) */}
			{esIDC && (
				<CollapsibleSection title="Referencia · segmentos IDC, SDK y SLA" subtitle="Escala completa de precios del canal IDC.">
					<TabCanalB2B2CPrecios costs={costs} />
				</CollapsibleSection>
			)}
		</QuoteLayout>
	);
}
