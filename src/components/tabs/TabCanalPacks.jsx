import { useState, useMemo, useEffect, useRef } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useModels } from "@/context/ModelsContext";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { getDistributorTier, distributorTierDriver, webFirmaExtraUnitARS } from "@/lib/tiers";
import { dealStatus } from "@/lib/dealStatus";
import { tierMaterialInList } from "@/lib/tierMaterial";
import { useTierUp } from "@/utils/useTierUp";
import { CHANNELS, resolveChannel, channelLabel } from "@/data/channelMeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NumberField } from "@/components/ui/field";
import { ClientSelector } from "@/components/ui/ClientSelector";
import { CommercialLevers } from "@/components/ui/CommercialLevers";
import { resolveLevers, defaultLeverSelection } from "@/lib/commercialLevers";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { SaveExportBar } from "@/components/ui/SaveExportBar";
import { QuoteLayout, FieldGroup } from "@/components/ui/QuoteLayout";
import { TierBadge, TierTrophy } from "@/components/ui/TierBadge";
import { SwitchField } from "@/components/ui/SwitchField";
import { ResultPanel, ResultRow, ResultItem, AnimatedNumber } from "@/components/ui/ResultPanel";
import { ExtraCard } from "./b2b2c/ConditionBlock";
import { CalendarClock, MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";
import { TierHint } from "@/components/ui/TierHint";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useToast, notifyQuoteSaved, notifyTierUp } from "@/components/ui/Toaster";

function margClass(pct) { return pct >= 0.4 ? "text-[var(--success)]" : pct >= 0.15 ? "text-[var(--warning)]" : "text-destructive"; }
function margAccent(pct) { return pct >= 0.4 ? "success" : pct >= 0.15 ? "warning" : "destructive"; }
function margWord(pct) { return pct >= 0.4 ? "saludable" : pct >= 0.15 ? "ajustado" : "a revisar"; }

// ─── Cotizador de packs · Web y Distribuidores ────────────────────────────────
// Los dos canales venden el mismo catálogo con el mismo cálculo, así que comparten
// este componente y se distinguen por la prop `channel`. Lo que cambia es la
// política de precios, no la aritmética:
//
//   · web            → el precio es la lista. El descuento existe solo como
//                      EXCEPCIÓN explícita (palancas y abono, nunca nivel por
//                      volumen), y la cotización queda marcada como tal.
//   · distribuidores → el descuento es la regla del canal. El nivel sale de dos
//                      variables declaradas del socio (certificados activos y
//                      compromiso anual de facturación), no del volumen cotizado.
export function TabCanalPacks({ channel, costs, currency, tc, dealsApi, clientsApi, onExport, onGoHistorial, onNavChannel, pendingEdit, onConsumeEdit }) {
	const canal = channel === "distribuidores" ? "distribuidores" : "web";
	const esDistribuidor = canal === "distribuidores";
	const meta = CHANNELS[canal];
	const { models: allModels } = useModels();
	const models = allModels.filter(function (m) { return m.activo !== false; });
	const { channelConfig } = useChannelConfig();
	const distributorTiers = channelConfig.distributorTiers;
	// Escala por volumen del precio de firma adicional (ARS). Misma para Web y
	// Distribuidores; sobre ella, Distribuidores aplica su descuento de nivel.
	const webFirmaExtraTiers = channelConfig.webFirmaExtraTiers;
	const commercialLevers = channelConfig.commercialLevers;
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const { toast } = useToast();
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;
	const ABONO_DESC_FALLBACK = 10;

	const [selectedClient, setSelectedClient] = useState(null);
	// Moneda del PDF exportado. Independiente del toggle global de visualización:
	// arranca en ARS (moneda de facturación histórica) y se puede pasar a USD por
	// cotización desde la barra de exportar.
	const [exportCurrency, setExportCurrency] = useState("ARS");
	const [loadToken, setLoadToken] = useState(0);
	// ── Variables declaradas del socio (solo Distribuidores) ──
	// Definen el nivel de descuento y son datos de la RELACIÓN comercial. Los
	// certificados activos NO se cargan a mano: se calculan como la base ya adquirida
	// (cotizaciones confirmadas del cliente) más los certificados de esta cotización.
	// El compromiso anual de facturación sí es un dato declarado. Gana el mayor de los dos.
	const [compromisoAnual, setCompromisoAnual] = useState("");
	const [qtys, setQtys] = useState({});
	const [firmasAdic, setFirmasAdic] = useState(0);
	const [casosDeUso, setCasosDeUso] = useState("");
	const [editingId, setEditingId] = useState(null);
	// Id de la versión creada en esta sesión de edición: mientras se siga trabajando
	// sobre ella, los guardados la pisan en vez de crear más versiones. Ver saveQuote.
	const sessionVersionId = useRef(null);
	const [flash, setFlash] = useState(false);
	const [saved, setSaved] = useState(null);
	// En Web el descuento es una excepción que el vendedor habilita a mano; en
	// Distribuidores es la regla del canal y no se puede apagar.
	const [excepcionWeb, setExcepcionWeb] = useState(false);
	const [abono, setAbono] = useState(false);
	// Pestaña del panel: "cliente" (lo que va a la propuesta) o "interno" (rentabilidad).
	const [panelTab, setPanelTab] = useState("cliente");
	// Extra "Casos de uso": abierto a mano o porque ya hay texto (deal reabierto).
	const [showCasos, setShowCasos] = useState(false);
	// Descuento del abono mensual (%): default de la config, editable por cotización.
	const [abonoDescPct, setAbonoDescPct] = useState(function () { return channelConfig.abonoDescuentoPct != null ? channelConfig.abonoDescuentoPct : ABONO_DESC_FALLBACK; });
	// Palancas de descuento por condiciones (se suman al descuento de nivel).
	const [levers, setLevers] = useState(function () { return defaultLeverSelection(channelConfig.commercialLevers); });

	// Base ya adquirida por el cliente: la suma de certificados de sus cotizaciones
	// CONFIRMADAS (lo que efectivamente compró), excluyendo la que se está editando
	// para no contarla dos veces con el volumen en curso. Es la mitad "histórica" de
	// los certificados activos; la otra mitad son los certificados de esta cotización.
	const certsHistoricos = useMemo(function () {
		if (!selectedClient) return 0;
		return (dealsApi?.deals || [])
			.filter(function (d) { return d.client_id === selectedClient.id && d.id !== editingId && dealStatus(d) === "confirmada"; })
			.reduce(function (s, d) { return s + ((d.resumen && d.resumen.certsComprados) || 0); }, 0);
	}, [selectedClient, dealsApi, editingId]);

	useEffect(function () {
		if (!pendingEdit) return;
		const i = pendingEdit.inputs || {};
		if (pendingEdit.client_id) {
			const live = (clientsApi?.clients || []).find(function (c) { return c.id === pendingEdit.client_id; });
			setSelectedClient(live || pendingEdit.clients || null);
		} else if (pendingEdit.clients) {
			setSelectedClient(pendingEdit.clients);
		}
		setQtys(i.qtys || {});
		setFirmasAdic(i.firmasAdic || 0);
		setCasosDeUso(i.casosDeUso || "");
		// Compromiso anual del socio. Los certificados activos ya no se cargan: se
		// recalculan (base confirmada + volumen de esta cotización). Las cotizaciones
		// del modelo anterior no declaraban el compromiso; se aproxima con la
		// facturación a lista que en ese modelo hacía de compromiso.
		setCompromisoAnual(
			i.compromisoAnual != null ? String(i.compromisoAnual)
				: (pendingEdit.resumen && pendingEdit.resumen.facturacionLista ? String(Math.round(pendingEdit.resumen.facturacionLista)) : "")
		);
		// En Web el flag guardado marca la excepción. Las cotizaciones del ex canal
		// unificado guardaban el mismo `aplicaDescuento`.
		setExcepcionWeb(!!i.aplicaDescuento);
		setAbono(i.abono || false);
		setAbonoDescPct(i.abonoDescuentoPct != null ? i.abonoDescuentoPct : (channelConfig.abonoDescuentoPct != null ? channelConfig.abonoDescuentoPct : ABONO_DESC_FALLBACK));
		setLevers(i.levers || defaultLeverSelection(commercialLevers));
		setEditingId(pendingEdit.id);
		// Cotización recién cargada del listado: el próximo guardado crea una versión
		// nueva (no pisa la que se abrió). Ver saveQuote.
		sessionVersionId.current = null;
		setSaved(null);
		setLoadToken(function (n) { return n + 1; });
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	function setQty(id, v) { setQtys(function (p) { return Object.assign({}, p, { [id]: v }); }); }

	const calc = useMemo(function () {
		let facturacionLista = 0, certsTotal = 0, firmasIncl = 0, ilimitadasUsadas = false;
		let weightedFirmaPrice = 0, totalQtyWithPrice = 0;
		const items = [];
		models.forEach(function (p) {
			const q = Math.max(0, Number(qtys[p.id]) || 0);
			if (q <= 0 || !p.priceUSD) return;
			facturacionLista += q * p.priceUSD;
			certsTotal += q * (p.certs || 1);
			if (p.ilimitadas) ilimitadasUsadas = true;
			else firmasIncl += q * (p.firmas || 0);
			if (p.extraFirmaPrice != null) {
				weightedFirmaPrice += q * p.extraFirmaPrice;
				totalQtyWithPrice += q;
			}
			items.push({ id: p.id, label: p.label, segment: p.segment, qty: q, certs: q * (p.certs || 1), firmas: p.ilimitadas ? null : q * (p.firmas || 0), ilimitadas: !!p.ilimitadas, subtotal: q * p.priceUSD });
		});
		const qAdic = Math.max(0, Number(firmasAdic) || 0);
		// Precio por firma adicional: sale de la escala por volumen del catálogo web (ARS,
		// la misma para todos los planes) según la cantidad comprada. Se convierte a USD
		// con el TC porque el cálculo del canal es USD-native. Si no hay escala cargada,
		// cae al precio ponderado por plan que traen los modelos.
		const precioFirmaAdicModelo = totalQtyWithPrice > 0 ? weightedFirmaPrice / totalQtyWithPrice : 0;
		const precioFirmaAdicARS = webFirmaExtraUnitARS(qAdic, webFirmaExtraTiers);
		const precioFirmaAdic = (precioFirmaAdicARS != null && tc > 0) ? precioFirmaAdicARS / tc : precioFirmaAdicModelo;
		const firmasTotal = firmasIncl + qAdic;
		facturacionLista += qAdic * precioFirmaAdic;
		return { facturacionLista, certsTotal, firmasIncl, firmasTotal, ilimitadasUsadas, precioFirmaAdic, precioFirmaAdicARS, items };
	}, [models, qtys, firmasAdic, webFirmaExtraTiers, tc]);

	// Descuento del abono configurable (default de la config, editable por cotización).
	const descAbono = Math.min(1, Math.max(0, Number(abonoDescPct) || 0) / 100);
	const abonoMes = useMemo(function () {
		return models.reduce(function (sum, p) {
			const q = Math.max(0, Number(qtys[p.id]) || 0);
			if (q <= 0 || !p.priceUSD) return sum;
			return sum + q * p.priceUSD * (1 - descAbono);
		}, 0);
	}, [models, qtys, descAbono]);
	const abonoAnual = abonoMes * 12;

	// ── Nivel del distribuidor ──
	// Sale de las dos variables declaradas del socio, nunca del volumen de esta
	// cotización: es lo que permite que un integrador con pocos certificados activos
	// pero un compromiso anual grande entre directo en un nivel alto. En Web no hay
	// nivel: el precio es la lista, con o sin excepción.
	// Certificados activos = base ya adquirida (confirmadas) + certificados de esta
	// cotización. Es un dato calculado, no editable: comprar más certificados sube la
	// base instalada y puede mover el nivel del socio.
	const certsActivosNum = certsHistoricos + calc.certsTotal;
	const compromisoAnualNum = Math.max(0, Number(compromisoAnual) || 0);
	const tier = getDistributorTier(certsActivosNum, compromisoAnualNum, distributorTiers) || distributorTiers[0];
	const tierDriver = distributorTierDriver(certsActivosNum, compromisoAnualNum, distributorTiers);
	const tieneDeclarado = certsActivosNum > 0 || compromisoAnualNum > 0;
	const drivenBy = !tieneDeclarado ? "sin datos del socio"
		: tierDriver === "compromiso" ? "compromiso anual"
			: tierDriver === "certificados" ? "certificados activos"
				: "certificados y compromiso";

	// Qué descuentos aplican. En Distribuidores el nivel es la regla del canal; en Web
	// solo hay descuento si se habilitó la excepción, y nunca por nivel.
	const aplicaDescuento = esDistribuidor || excepcionWeb;
	const aplicaNivel = esDistribuidor;
	// Palancas por condiciones: se OFRECEN al cliente como incentivos, pero NO se
	// contemplan en el total. El único descuento que baja el precio es el de nivel.
	const leverRes = resolveLevers(commercialLevers, levers);
	const descNivelPct = aplicaNivel ? tier.descuento : 0;
	// % ofrecido por condiciones (informativo, no entra al cálculo).
	const condOfrecidaPct = aplicaDescuento ? leverRes.cappedPts : 0;
	const hayCondOfrecidas = condOfrecidaPct > 0 && leverRes.items.length > 0;
	const descTotal = Math.min(0.95, descNivelPct);
	const descNivelMonto = calc.facturacionLista * descNivelPct;
	const netoLakaut = calc.facturacionLista * (1 - descTotal);
	const cvTotal = calc.certsTotal * cvCert + calc.firmasTotal * cvFirma;
	const margenLakaut = netoLakaut - cvTotal;
	const margenPct = netoLakaut > 0 ? margenLakaut / netoLakaut : 0;
	const conAbono = aplicaDescuento && abono && abonoMes > 0;
	const facturacionAnio1 = netoLakaut + abonoMes * 11;
	const hasVolume = calc.facturacionLista > 0 || calc.certsTotal > 0 || Math.max(0, Number(firmasAdic) || 0) > 0;

	const tierActive = aplicaNivel && tieneDeclarado ? tier.id : null;
	useTierUp(tierActive, distributorTiers, function (next) {
		const mat = tierMaterialInList(next, distributorTiers);
		notifyTierUp(toast, { label: next.label, emoji: mat.emoji, material: mat, discountPct: Math.round((next.descuento || 0) * 100) });
	}, loadToken);

	const cfAnual = costs.cfDirecto * 12;
	const coberturaPC = cfAnual > 0 ? margenLakaut / cfAnual : 0;

	// Distancia al siguiente nivel: convierte la matriz en herramienta de upselling.
	// Se mide contra las variables declaradas, que son las que mueven el nivel.
	const tierIdx = distributorTiers.findIndex(function (t) { return t.id === tier.id; });
	const nextTier = tierIdx >= 0 && tierIdx < distributorTiers.length - 1 ? distributorTiers[tierIdx + 1] : null;
	let nextHint = null;
	if (nextTier) {
		const certsFaltan = Math.max(0, nextTier.certsMin - certsActivosNum);
		const compFaltan = Math.max(0, nextTier.compromisoMin - compromisoAnualNum);
		nextHint = "Con " + certsFaltan.toLocaleString("es-AR") + " certificados activos más (o " + fMoney(compFaltan) + " de compromiso anual) pasa a " + nextTier.label + " · " + (nextTier.descuento * 100).toFixed(0) + "% de descuento.";
	} else {
		nextHint = "Es el nivel máximo: " + (tier.descuento * 100).toFixed(0) + "% de descuento.";
	}
	const tierRows = distributorTiers.map(function (t) {
		return {
			id: t.id,
			cells: [
				<TierBadge key="tier" tier={t} tiers={distributorTiers} size="sm" />,
				t.certsMin.toLocaleString("es-AR") + (t.certsMax == null ? "+" : "–" + t.certsMax.toLocaleString("es-AR")),
				(t.descuento * 100).toFixed(0) + "%",
			],
		};
	});

	function buildDeal(id, fecha) {
		return {
			id: id,
			channel: canal,
			fecha: fecha,
			updatedAt: editingId ? new Date().toISOString() : undefined,
			inputs: {
				qtys, firmasAdic, casosDeUso,
				// Variables declaradas del socio que definieron el nivel. Se guardan como
				// número para que el nivel sea reproducible al reabrir la cotización.
				...(esDistribuidor ? { certsActivos: certsActivosNum, compromisoAnual: compromisoAnualNum } : {}),
				// En Web marca la venta con descuento por excepción. En Distribuidores el
				// descuento es la regla del canal, pero se guarda igual para que quien lea
				// el deal no dependa de conocer la política del canal.
				aplicaDescuento, abono,
				abonoDescuentoPct: Number(abonoDescPct) || 0,
				levers,
				// Modelo de condiciones "ofrecido": las palancas se ofrecen como incentivos
				// pero no bajan el total. El flag distingue estos deals de los del modelo
				// anterior (donde el descuento por condiciones sí se restaba del neto), para
				// que el export y los reportes los lean con la política correcta.
				condOfrecidas: true,
				// Snapshot resuelto de las condiciones OFRECIDAS: estable ante cambios
				// posteriores de la config de tramos. Alimenta el apartado "condiciones que
				// podés aprovechar" de la propuesta; no interviene en el total.
				...(hayCondOfrecidas ? { descCond: { pct: leverRes.pct, cappedPts: leverRes.cappedPts, cap: leverRes.cap, rawPct: leverRes.rawPct, capped: leverRes.capped, items: leverRes.items } } : {}),
			},
			resumen: {
				certsActivos: certsActivosNum, certsComprados: calc.certsTotal,
				facturacionLista: calc.facturacionLista, firmasTotal: calc.firmasTotal,
				precioFirmaAdic: calc.precioFirmaAdic, netoLakaut, margenPct,
				...(esDistribuidor ? { compromisoAnual: compromisoAnualNum, tierDriver } : {}),
				...(aplicaNivel ? { tier: tier.label } : {}),
				// descTotal ya no incluye condiciones: es solo el nivel (0 = precio de lista).
				...(aplicaDescuento ? {
					descNivelPct: descNivelPct, descTotal, descNivelMonto,
				} : {}),
				// % de condiciones ofrecidas (informativo para reportes, no aplicado).
				...(hayCondOfrecidas ? { condOfrecidaPct } : {}),
				...(conAbono ? { abonoMes, abonoAnual, facturacionAnio1 } : {}),
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
	}

	const header = (
		<PageHeader
			title={meta.full + (selectedClient ? " · " + selectedClient.name : "")}
			description={
				esDistribuidor ? (
					<>
						El nivel de descuento sale de los certificados activos del socio y de su compromiso anual de facturación: gana el mayor de los dos.
						<InfoTooltip text="Las dos variables son datos declarados de la relación comercial, no del volumen de esta cotización. Un integrador con 200 certificados que compromete USD 40.000 anuales entra como Plata. El nivel queda sujeto al cumplimiento efectivo del compromiso." />
					</>
				) : excepcionWeb ? (
					<>
						Venta directa con descuento por excepción: se aplica por condiciones comerciales, sin nivel por volumen.
						<InfoTooltip text="El canal web es precio de lista. Esta cotización queda marcada como excepción para poder seguirla aparte en Reportes. Si el cliente es un socio que revende, corresponde cotizar en Distribuidores." />
					</>
				) : (
					<>
						Precio de lista. El cliente abona con tarjeta, sin intermediación.
						<InfoTooltip text="El neto de Lakaut es la lista completa. Para un socio que revende, cotizá en el canal Distribuidores; para un descuento puntual en venta directa, habilitá la excepción en Condiciones comerciales." />
					</>
				)
			}
		/>
	);

	const totalLabel = conAbono ? "Mes 1 · compra inicial" : (aplicaDescuento ? "Ingreso neto Lakaut" : "Total a pagar");
	const result = (
		<>
		<div role="tablist" aria-label="Vista del resumen" className="flex rounded-xl bg-muted p-1">
			{[{ id: "cliente", label: "Cliente" }, { id: "interno", label: hasVolume ? "Interno · " + (margenPct * 100).toFixed(0) + "%" : "Interno" }].map(function (t) {
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
							t.id === "interno" && hasVolume && !active && margAccent(margenPct) !== "success" && "text-[var(--warning)]"
						)}
					>{t.label}</button>
				);
			})}
		</div>

		{panelTab === "cliente" ? (
		<ResultPanel channel={canal} eyebrow="Lo que ve el cliente">
			{/* Total una sola vez, en bloque de color (antes: héroe arriba + fila abajo). */}
			<div className="rounded-xl bg-primary px-5 py-4 text-primary-foreground">
				<div className="text-xs font-bold uppercase tracking-wide opacity-80">{totalLabel} · sin IVA</div>
				<div className="mt-1.5 font-display text-4xl leading-none tabular-nums [overflow-wrap:anywhere]">
					{hasVolume ? <AnimatedNumber value={netoLakaut} format={fMoney2} /> : "—"}
				</div>
				<div className="mt-2 text-sm opacity-90">
					{hasVolume
						? "Con IVA 21%: " + fMoney2(netoLakaut * 1.21) + (esDistribuidor ? " · descuento de nivel aplicado" : excepcionWeb ? " · condiciones aparte" : " · precio de lista")
						: "Cargá al menos un producto para ver el precio"}
				</div>
			</div>

			{aplicaNivel && (
				<div className="space-y-2 border-t border-border/60 pt-3">
					<TierTrophy
						tier={tier}
						tiers={distributorTiers}
						discountPct={(tier.descuento * 100).toFixed(0)}
						note={"por " + drivenBy}
						empty={!tieneDeclarado}
					/>
					<div className="flex justify-end">
						<TierHint columns={["Nivel", "Certs activos", "Desc."]} rows={tierRows} activeId={tier.id} nextHint={nextHint} />
					</div>
				</div>
			)}

			{hasVolume && (
				<div className="space-y-2">
					{/* Packs cotizados a precio de lista */}
					<div className={aplicaDescuento ? "max-h-[40vh] overflow-y-auto" : "max-h-[46vh] overflow-y-auto"}>
						{calc.items.map(function (it) {
							return (
								<ResultItem
									key={it.id}
									title={it.label + (it.segment ? " · " + (it.segment === "empresa" ? "jurídica" : "física") : "")}
									detail={it.qty.toLocaleString("es-AR") + " u · " + it.certs.toLocaleString("es-AR") + " certs · " + (it.ilimitadas ? "firmas ilim." : it.firmas.toLocaleString("es-AR") + " firmas")}
									value={<AnimatedNumber value={it.subtotal} format={fMoney2} />}
								/>
							);
						})}
						{Math.max(0, Number(firmasAdic) || 0) > 0 && (
							<ResultItem
								title="Firmas adicionales"
								detail={Math.max(0, Number(firmasAdic) || 0).toLocaleString("es-AR") + " firmas × " + fMoney2(calc.precioFirmaAdic)}
								value={<AnimatedNumber value={Math.max(0, Number(firmasAdic) || 0) * calc.precioFirmaAdic} format={fMoney2} />}
								accent="muted"
							/>
						)}
					</div>

					{/* Lista → descuento de nivel → neto. Las condiciones NO entran acá. */}
					{aplicaNivel && descNivelPct > 0 && (
						<>
							<ResultRow label="Facturación a lista" value={<AnimatedNumber value={calc.facturacionLista} format={fMoney2} />} />
							<ResultRow label={"Descuento " + tier.label + " (" + (tier.descuento * 100).toFixed(0) + "%)"} value={<>−<AnimatedNumber value={descNivelMonto} format={fMoney2} /></>} accent="destructive" valueClass="text-destructive" />
						</>
					)}
					{/* Condiciones comerciales OFRECIDAS: incentivos que el vendedor pone sobre la
					    mesa, sin restarse del total. */}
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

					{conAbono && (
						<div className="pt-1">
							<ResultRow label="Mes 2 en adelante" value={<><AnimatedNumber value={abonoMes} format={fMoney2} />/mes</>} accent="success" />
							<ResultRow label="Facturación año 1" value={<AnimatedNumber value={facturacionAnio1} format={fMoney2} />} accent="success" />
						</div>
					)}
				</div>
			)}
		</ResultPanel>
		) : (
			<div className="rounded-xl border border-border bg-card p-4 shadow-float">
				<div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rentabilidad · uso interno</div>
				{hasVolume ? (
					<>
						<div className="mb-3 grid grid-cols-2 gap-3">
							<div>
								<div className="text-xs text-muted-foreground">Contribución marginal</div>
								<div className={"font-heading text-base font-semibold tabular-nums " + margClass(margenPct)}>{fMoney(margenLakaut)}</div>
								<div className="text-xs text-muted-foreground">{(margenPct * 100).toFixed(0)}% sobre neto · {margWord(margenPct)}</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Cobertura CF anual</div>
								<div className="font-heading text-base font-semibold tabular-nums">{(coberturaPC * 100).toFixed(0)}%</div>
								<div className="text-xs text-muted-foreground">de {fMoney(cfAnual)}</div>
							</div>
						</div>
						<div className="space-y-1 border-t border-border/60 pt-2">
							{aplicaDescuento && <ResultRow label="Facturación a lista" value={fMoney(calc.facturacionLista)} />}
							{aplicaNivel && <ResultRow label={"Descuento nivel " + tier.label} value={<span className="text-destructive">−{fMoney(descNivelMonto)}</span>} />}
							<ResultRow label={aplicaDescuento ? "Ingreso neto Lakaut" : "Precio de lista"} value={fMoney(netoLakaut)} accent="primary" />
							<ResultRow label={"Costo variable (" + calc.certsTotal.toLocaleString("es-AR") + " certs + " + calc.firmasTotal.toLocaleString("es-AR") + " firmas)"} value={<span className="text-destructive">−{fMoney(cvTotal)}</span>} />
						</div>
					</>
				) : (
					<p className="text-sm text-muted-foreground">Cargá productos para ver contribución y costos.</p>
				)}
			</div>
		)}
		</>
	);

	const footer = (
		<SaveExportBar
			hint={hasVolume ? "" : "Cargá al menos un producto para guardar o exportar."}
			canSave={hasVolume}
			canExport={hasVolume}
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

			{/* ── 2 · Qué cotizás ── */}
			<FieldGroup channel={canal} done={hasVolume} title="Packs" subtitle="Cantidades a precio de lista; el total se arma a la derecha.">
				{/* Tabla de packs en 4 columnas: lo que incluye cada pack va bajo su nombre
				    (antes eran 3 columnas numéricas aparte) y la cantidad es el campo grande. */}
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Pack</TableHead>
							<TableHead className="text-right">Lista</TableHead>
							<TableHead className="text-right">Cantidad</TableHead>
							<TableHead className="text-right">Subtotal</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{models.filter(function (p) { return p.priceUSD > 0; }).map(function (p) {
							const q = Math.max(0, Number(qtys[p.id]) || 0);
							const firmasU = p.ilimitadas ? "firmas ilimitadas" : (p.firmas || 0).toLocaleString("es-AR") + " firmas";
							return (
								<TableRow key={p.id} className={q > 0 ? "bg-primary/5" : ""}>
									<TableCell>
										<span className="flex items-center gap-2">
											<span className="text-sm font-semibold">{p.label}</span>
											{p.segment && (
												<span className={"inline-block rounded px-1.5 py-0.5 text-xs font-medium " + (p.segment === "empresa" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700")}>
													{p.segment === "empresa" ? "Jurídica" : "Física"}
												</span>
											)}
										</span>
										<span className="mt-0.5 block text-xs text-muted-foreground">{(p.certs || 1) + " cert · " + firmasU + " por pack"}</span>
									</TableCell>
									<TableCell className="text-right tabular-nums">{fMoney(p.priceUSD)}</TableCell>
									<TableCell className="text-right">
										<Input type="number" min={0} value={qtys[p.id] || ""} placeholder="0" aria-label={"Cantidad de " + p.label} onChange={function (e) { setQty(p.id, e.target.value); }} className="ml-auto h-10 w-24 text-right text-base font-semibold tabular-nums" />
									</TableCell>
									<TableCell className={"text-right tabular-nums " + (q > 0 ? "font-semibold" : "text-muted-foreground")}>{q > 0 ? fMoney(q * p.priceUSD) : "—"}</TableCell>
								</TableRow>
							);
						})}
						{hasVolume && (
							<TableRow className="border-t-2 bg-muted/30">
								<TableCell className="text-sm font-semibold">
									Total
									<span className="ml-2 text-xs font-normal text-muted-foreground">{calc.certsTotal.toLocaleString("es-AR")} certs · {calc.ilimitadasUsadas ? "firmas ilimitadas" : calc.firmasTotal.toLocaleString("es-AR") + " firmas"}</span>
								</TableCell>
								<TableCell />
								<TableCell />
								<TableCell className="text-right font-semibold tabular-nums">{fMoney(calc.facturacionLista)}</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>

				<Separator />

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<NumberField label="Firmas adicionales" value={firmasAdic} onChange={setFirmasAdic} min={0}
						note={(function () {
							const q = Math.max(0, Number(firmasAdic) || 0);
							if (!Array.isArray(webFirmaExtraTiers) || webFirmaExtraTiers.length === 0 || !(tc > 0)) return "precio por firma según el plan";
							if (q <= 0) return "Escala por volumen: " + webFirmaExtraTiers.map(function (t) { return t.firmas + "→" + fMoney(t.precioARS / tc); }).join(" · ");
							const next = webFirmaExtraTiers.find(function (t) { return t.firmas > q; });
							const unidad = fMoney(calc.precioFirmaAdic) + " c/u";
							return next
								? unidad + " · con " + (next.firmas - q).toLocaleString("es-AR") + " firmas más baja a " + fMoney(next.precioARS / tc)
								: unidad + " · mejor precio de la escala";
						}())}
					/>
				</div>
			</FieldGroup>

			{/* ── 3 · Condiciones comerciales ── */}
			<FieldGroup
				channel={canal}
				done={esDistribuidor ? tieneDeclarado : hasVolume}
				title="Condiciones"
				subtitle={esDistribuidor
					? "Nivel del socio + condiciones ofrecidas" + (conAbono ? " · abono mensual activo" : "")
					: (excepcionWeb
						? "Excepción habilitada: condiciones ofrecidas" + (conAbono ? " · abono mensual activo" : "")
						: "Precio de lista puro: sin descuento ni abono")}
				action={descTotal > 0
					? <Badge variant="secondary" className="text-xs px-1.5 py-0">−{((descTotal) * 100).toFixed(0)}% nivel</Badge>
					: <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">a lista</Badge>}
			>
				{/* ── Variables del socio (solo Distribuidores) ── */}
				{esDistribuidor && (
					<>
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium">Nivel del socio</span>
							<p className="text-xs text-muted-foreground">
								El nivel es el mayor entre los certificados activos y el compromiso anual. Los certificados activos se calculan solos; el compromiso lo declarás vos.
							</p>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Certificados activos <span className="normal-case tracking-normal font-normal">(calculado)</span></Label>
									<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
										<span className="font-semibold tabular-nums">{certsActivosNum.toLocaleString("es-AR")}</span>
										<span className="ml-2 text-xs text-muted-foreground truncate">{certsHistoricos.toLocaleString("es-AR")} ya adquiridos + {calc.certsTotal.toLocaleString("es-AR")} de esta cotización</span>
									</div>
									<span className="text-xs text-muted-foreground">Base de cotizaciones confirmadas del cliente más los certificados de esta cotización.</span>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Compromiso anual de facturación</Label>
									<div className="relative flex items-center">
										<span className="absolute left-3 text-sm text-muted-foreground">USD</span>
										<Input type="number" min={0} value={compromisoAnual} onChange={function (e) { setCompromisoAnual(e.target.value); }} placeholder="0" className="tabular-nums pl-11" />
									</div>
									<span className="text-xs text-muted-foreground">Facturación anual que el socio se compromete a generar por certificados y firmas.</span>
								</div>
							</div>
							{!tieneDeclarado && (
								<p className="text-xs text-[var(--warning)]">
									Sin certificados activos ni compromiso, el socio queda en {distributorTiers[0] ? distributorTiers[0].label : "el primer nivel"} ({((distributorTiers[0] ? distributorTiers[0].descuento : 0) * 100).toFixed(0)}% de descuento).
								</p>
							)}
							{tieneDeclarado && (
								<p className="text-xs text-muted-foreground">
									Nivel <strong>{tier.label}</strong> por {drivenBy} · {(tier.descuento * 100).toFixed(0)}% de descuento sobre la lista.
								</p>
							)}
						</div>

						<Separator />
					</>
				)}

				{/* ── Excepción de descuento (solo Web) ── */}
				{!esDistribuidor && (
					<SwitchField
						label="Descuento por excepción"
						description="El canal web es precio de lista. Habilitá esto solo para un descuento puntual en venta directa: aplica las palancas por condiciones y el abono, nunca el nivel por volumen. La cotización queda marcada como excepción."
						checked={excepcionWeb}
						onChange={setExcepcionWeb}
					/>
				)}

				{aplicaDescuento && (
					<>
						{!esDistribuidor && <Separator />}

						{/* Condiciones comerciales OFRECIDAS: se listan en la propuesta como
						    incentivos que el cliente puede aprovechar. No bajan el total. */}
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium">Condiciones comerciales que ofrecés</span>
							<p className="text-xs text-muted-foreground">Se listan en la propuesta como incentivos que el cliente puede aprovechar. No modifican el total cotizado.</p>
							<CommercialLevers levers={commercialLevers} value={levers} onChange={setLevers} />
						</div>

					</>
				)}
			</FieldGroup>

			{/* Extras: opcionales, como tarjetas con interruptor. La rentabilidad pasó a
			    la pestaña Interno del panel. */}
			<section aria-labelledby="extras-title" className="space-y-3">
				<h3 id="extras-title" className="px-1 font-heading text-sm font-semibold text-foreground">Extras</h3>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					{aplicaDescuento && (
						<ExtraCard
							icon={CalendarClock}
							title="Abono mensual"
							desc="Repone las firmas del pack cada mes"
							checked={abono}
							onChange={function (e) { setAbono(e.target.checked); }}
							badge={abono ? <Badge variant="secondary" className="text-xs px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activo</Badge> : null}
						>
						<div className="space-y-2">
							<div className="flex items-center gap-2">
								<Label className="text-xs text-muted-foreground uppercase tracking-wide">Descuento del abono</Label>
								<div className="flex items-center gap-1">
									<Input type="number" min={0} max={100} value={abonoDescPct} onChange={function (e) { setAbonoDescPct(e.target.value === "" ? "" : Number(e.target.value)); }} className="h-9 w-20 text-right tabular-nums" />
									<span className="text-sm text-muted-foreground">%</span>
								</div>
							</div>
							{conAbono && (
								<div className="space-y-1.5 text-sm text-muted-foreground">
									<p>Precio de lista × {((1 - descAbono) * 100).toFixed(0)}% ({(descAbono * 100).toFixed(0)}% de descuento). El pack se abona completo cada mes.</p>
									<div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm">
										<span>Mes 1 (compra inicial)</span>
										<span className="font-semibold text-foreground">{fMoney(netoLakaut)}</span>
										<span>Mes 2 en adelante</span>
										<span className="font-semibold text-foreground">{fMoney(abonoMes)}/mes <span className="font-normal text-muted-foreground">· {fMoney(abonoAnual)}/año</span></span>
										<span>Facturación año 1</span>
										<span className="font-semibold text-foreground">{fMoney(facturacionAnio1)}</span>
									</div>
								</div>
							)}
							{abono && abonoMes === 0 && <p className="text-sm text-muted-foreground">Cargá packs con firmas finitas para calcular el abono.</p>}
						</div>
						</ExtraCard>
					)}
					<ExtraCard
						icon={MessageSquareText}
						title="Casos de uso"
						desc="Texto para la propuesta"
						checked={showCasos || casosDeUso !== ""}
						onChange={function (e) { setShowCasos(e.target.checked); if (!e.target.checked) setCasosDeUso(""); }}
					>
						<label className="flex flex-col gap-1.5">
							<span className="sr-only">Casos de uso</span>
							<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: firma de contratos, recibos, onboarding de clientes..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
						</label>
					</ExtraCard>
				</div>
			</section>

			{/* ── Referencia: matriz completa de niveles ── */}
			{aplicaNivel && (
				<CollapsibleSection title="Matriz de niveles" subtitle="Tabla completa del Borrador v5. El nivel asignado se resalta. Gana el mayor entre las dos columnas de umbral.">
					<Table>
						<TableHeader><TableRow><TableHead>Nivel</TableHead><TableHead className="text-right">Certificados activos</TableHead><TableHead className="text-right">Descuento</TableHead><TableHead className="text-right">Compromiso anual (USD)</TableHead></TableRow></TableHeader>
						<TableBody>
							{distributorTiers.map(function (t) {
								const act = tieneDeclarado && t.id === tier.id;
								return (
									<TableRow key={t.id} className={act ? "bg-accent" : ""}>
										<TableCell><span className="inline-flex items-center gap-2"><TierBadge tier={t} tiers={distributorTiers} size="sm" />{act && <span className="text-xs font-bold uppercase tracking-wide text-primary">actual</span>}</span></TableCell>
										<TableCell className="text-right tabular-nums">{t.certsMin.toLocaleString("es-AR")}{t.certsMax == null ? "+" : "–" + t.certsMax.toLocaleString("es-AR")}</TableCell>
										<TableCell className="text-right tabular-nums font-semibold">{(t.descuento * 100).toFixed(0)}%</TableCell>
										<TableCell className="text-right tabular-nums">{t.compromisoMax == null ? "> " + t.compromisoMin.toLocaleString("es-AR") : t.compromisoMin.toLocaleString("es-AR") + "–" + t.compromisoMax.toLocaleString("es-AR")}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CollapsibleSection>
			)}
		</QuoteLayout>
	);
}
