import { useState, useMemo, useEffect } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useModels } from "@/context/ModelsContext";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { getDistributorTier, distributorTierDriver } from "@/lib/tiers";
import { dealStatus } from "@/lib/dealStatus";
import { tierMaterialInList } from "@/lib/tierMaterial";
import { useTierUp } from "@/utils/useTierUp";
import { CHANNELS } from "@/data/channelMeta";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NumberField, StatCard } from "@/components/ui/field";
import { ClientSelector } from "@/components/ui/ClientSelector";
import { CommercialLevers } from "@/components/ui/CommercialLevers";
import { resolveLevers, defaultLeverSelection } from "@/lib/commercialLevers";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { SaveExportBar } from "@/components/ui/SaveExportBar";
import { QuoteLayout, FieldGroup } from "@/components/ui/QuoteLayout";
import { TierBadge, TierTrophy } from "@/components/ui/TierBadge";
import { SwitchField } from "@/components/ui/SwitchField";
import { ResultPanel, ResultHero, ResultRow, ResultItem, StatusPill, AnimatedNumber } from "@/components/ui/ResultPanel";
import { TierHint } from "@/components/ui/TierHint";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useToast, notifyQuoteSaved, notifyQuoteExported, notifyTierUp } from "@/components/ui/Toaster";

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
export function TabCanalPacks({ channel, costs, currency, tc, dealsApi, clientsApi, onExport, onGoHistorial, pendingEdit, onConsumeEdit }) {
	const canal = channel === "distribuidores" ? "distribuidores" : "web";
	const esDistribuidor = canal === "distribuidores";
	const meta = CHANNELS[canal];
	const { models: allModels } = useModels();
	const models = allModels.filter(function (m) { return m.activo !== false; });
	const { channelConfig } = useChannelConfig();
	const distributorTiers = channelConfig.distributorTiers;
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
	const [flash, setFlash] = useState(false);
	const [saved, setSaved] = useState(null);
	// En Web el descuento es una excepción que el vendedor habilita a mano; en
	// Distribuidores es la regla del canal y no se puede apagar.
	const [excepcionWeb, setExcepcionWeb] = useState(false);
	const [abono, setAbono] = useState(false);
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
		const precioFirmaAdic = totalQtyWithPrice > 0 ? weightedFirmaPrice / totalQtyWithPrice : 0;
		const firmasTotal = firmasIncl + Math.max(0, Number(firmasAdic) || 0);
		facturacionLista += Math.max(0, Number(firmasAdic) || 0) * precioFirmaAdic;
		return { facturacionLista, certsTotal, firmasIncl, firmasTotal, ilimitadasUsadas, precioFirmaAdic, items };
	}, [models, qtys, firmasAdic]);

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

		let client = selectedClient;
		if (!client && clientsApi) {
			client = await clientsApi.create("(sin nombre)", canal, esDistribuidor ? "DIS" : undefined);
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
			onExport: function () { onExport && onExport(savedDeal, client); },
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

	const result = (
		<ResultPanel channel={canal} eyebrow={hasVolume ? "Resumen de la cotización" : "Resumen · sin datos"}>
			<ResultHero
				label={conAbono ? "Mes 1 · compra inicial" : (aplicaDescuento ? "Ingreso neto Lakaut" : "Total a pagar")}
				value={hasVolume ? <AnimatedNumber value={netoLakaut} format={fMoney2} /> : "—"}
				sub={esDistribuidor ? "Con descuento de nivel aplicado" : (excepcionWeb ? "Precio de lista · condiciones ofrecidas aparte" : "Precio de lista, sin descuento")}
				empty={!hasVolume}
				pill={hasVolume ? <StatusPill tone={margAccent(margenPct)}>Margen {(margenPct * 100).toFixed(0)}% · {margWord(margenPct)}</StatusPill> : null}
			/>

			{/* Nivel + acceso contextual a la matriz. Solo con descuento aplicado.
			    El nivel se muestra con su material (bronce, plata, oro, platinum) en
			    lugar de texto plano: es el momento en que el vendedor descubre cuánto
			    puede negociar, así que se lee como logro y no como dato. */}
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

			{hasVolume ? (
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
					<div className="flex items-center justify-between border-t-2 border-border pt-2">
						<span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{conAbono ? "Mes 1 · compra inicial" : (aplicaDescuento ? "Ingreso neto Lakaut" : "Total a pagar")}</span>
						<span className="font-heading text-lg font-semibold tabular-nums"><AnimatedNumber value={netoLakaut} format={fMoney2} /></span>
					</div>

					{/* Condiciones comerciales OFRECIDAS: incentivos que el vendedor pone sobre la
					    mesa, sin restarse del total. */}
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

					{conAbono && (
						<div className="pt-1">
							<ResultRow label="Mes 2 en adelante" value={<><AnimatedNumber value={abonoMes} format={fMoney2} />/mes</>} accent="success" />
							<ResultRow label="Facturación año 1" value={<AnimatedNumber value={facturacionAnio1} format={fMoney2} />} accent="success" />
						</div>
					)}
				</div>
			) : (
				<p className="text-[11px] text-muted-foreground">Cargá al menos un producto para ver el precio.</p>
			)}
		</ResultPanel>
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
					<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: firma de contratos, recibos, onboarding de clientes..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
				</div>
			</FieldGroup>

			{/* ── 2 · Qué cotizás ── */}
			<FieldGroup step={2} channel={canal} done={hasVolume} title="Qué cotizás" subtitle="Cargá los packs a precio de lista. El total se actualiza a la derecha.">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Producto</TableHead>
							<TableHead className="text-right">Lista USD</TableHead>
							<TableHead className="text-right">Certs / u</TableHead>
							<TableHead className="text-right">Firmas / u</TableHead>
							<TableHead className="text-right">Cantidad</TableHead>
							<TableHead className="text-right">Certs total</TableHead>
							<TableHead className="text-right">Firmas total</TableHead>
							<TableHead className="text-right">Precio de lista</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{models.filter(function (p) { return p.priceUSD > 0; }).map(function (p) {
							const q = Math.max(0, Number(qtys[p.id]) || 0);
							const firmasU = p.ilimitadas ? "ilim." : (p.firmas || 0);
							return (
								<TableRow key={p.id}>
									<TableCell className="font-semibold">
										<span>{p.label}</span>
										{p.segment && (
											<span className={"ml-2 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded " + (p.segment === "empresa" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700")}>
												{p.segment === "empresa" ? "Jurídica" : "Física"}
											</span>
										)}
									</TableCell>
									<TableCell className="text-right tabular-nums">{fMoney(p.priceUSD)}</TableCell>
									<TableCell className="text-right tabular-nums text-muted-foreground">{p.certs || 1}</TableCell>
									<TableCell className="text-right tabular-nums text-muted-foreground">{firmasU}</TableCell>
									<TableCell className="text-right">
										<Input type="number" min={0} value={qtys[p.id] || ""} placeholder="0" onChange={function (e) { setQty(p.id, e.target.value); }} className="ml-auto h-8 w-24 text-right tabular-nums" />
									</TableCell>
									<TableCell className="text-right tabular-nums">{q > 0 ? (q * (p.certs || 1)).toLocaleString("es-AR") : "—"}</TableCell>
									<TableCell className="text-right tabular-nums">{q > 0 ? (p.ilimitadas ? "ilim." : (q * (p.firmas || 0)).toLocaleString("es-AR")) : "—"}</TableCell>
									<TableCell className={"text-right tabular-nums " + (q > 0 ? "font-semibold" : "text-muted-foreground")}>{q > 0 ? fMoney(q * p.priceUSD) : "—"}</TableCell>
								</TableRow>
							);
						})}
						{hasVolume && (
							<TableRow className="border-t-2 bg-muted/30">
								<TableCell className="font-semibold text-sm" colSpan={4}>Total</TableCell>
								<TableCell className="text-right tabular-nums text-muted-foreground text-xs">—</TableCell>
								<TableCell className="text-right tabular-nums font-semibold">{calc.certsTotal.toLocaleString("es-AR")}</TableCell>
								<TableCell className="text-right tabular-nums font-semibold">{calc.ilimitadasUsadas ? "ilim." : calc.firmasTotal.toLocaleString("es-AR")}</TableCell>
								<TableCell className="text-right tabular-nums font-semibold">{fMoney(calc.facturacionLista)}</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>

				<Separator />

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<NumberField label="Firmas adicionales" value={firmasAdic} onChange={setFirmasAdic} min={0} />
				</div>
			</FieldGroup>

			{/* ── 3 · Condiciones comerciales ── */}
			<FieldGroup
				step={3}
				channel={canal}
				done={esDistribuidor ? tieneDeclarado : hasVolume}
				title="Condiciones comerciales"
				subtitle={esDistribuidor
					? "Nivel del socio + condiciones ofrecidas" + (conAbono ? " · abono mensual activo" : "")
					: (excepcionWeb
						? "Excepción habilitada: condiciones ofrecidas" + (conAbono ? " · abono mensual activo" : "")
						: "Precio de lista puro: sin descuento ni abono")}
				action={descTotal > 0
					? <Badge variant="secondary" className="text-[10px] px-1.5 py-0">−{((descTotal) * 100).toFixed(0)}% nivel</Badge>
					: <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">a lista</Badge>}
			>
				{/* ── Variables del socio (solo Distribuidores) ── */}
				{esDistribuidor && (
					<>
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium">Nivel del socio</span>
							<p className="text-[11px] text-muted-foreground">
								El nivel es el mayor entre los certificados activos y el compromiso anual. Los certificados activos se calculan solos; el compromiso lo declarás vos.
							</p>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Certificados activos <span className="normal-case tracking-normal font-normal">(calculado)</span></Label>
									<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
										<span className="font-semibold tabular-nums">{certsActivosNum.toLocaleString("es-AR")}</span>
										<span className="ml-2 text-[11px] text-muted-foreground truncate">{certsHistoricos.toLocaleString("es-AR")} ya adquiridos + {calc.certsTotal.toLocaleString("es-AR")} de esta cotización</span>
									</div>
									<span className="text-[11px] text-muted-foreground">Base de cotizaciones confirmadas del cliente más los certificados de esta cotización.</span>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label className="text-xs text-muted-foreground uppercase tracking-wide">Compromiso anual de facturación</Label>
									<div className="relative flex items-center">
										<span className="absolute left-3 text-sm text-muted-foreground">USD</span>
										<Input type="number" min={0} value={compromisoAnual} onChange={function (e) { setCompromisoAnual(e.target.value); }} placeholder="0" className="tabular-nums pl-11" />
									</div>
									<span className="text-[11px] text-muted-foreground">Facturación anual que el socio se compromete a generar por certificados y firmas.</span>
								</div>
							</div>
							{!tieneDeclarado && (
								<p className="text-[11px] text-[var(--warning)]">
									Sin certificados activos ni compromiso, el socio queda en {distributorTiers[0] ? distributorTiers[0].label : "el primer nivel"} ({((distributorTiers[0] ? distributorTiers[0].descuento : 0) * 100).toFixed(0)}% de descuento).
								</p>
							)}
							{tieneDeclarado && (
								<p className="text-[11px] text-muted-foreground">
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
							<p className="text-[11px] text-muted-foreground">Se listan en la propuesta como incentivos que el cliente puede aprovechar. No modifican el total cotizado.</p>
							<CommercialLevers levers={commercialLevers} value={levers} onChange={setLevers} />
						</div>

						<Separator />

						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<input type="checkbox" checked={abono} onChange={function (e) { setAbono(e.target.checked); }} className="rounded" />
							<span className="text-sm font-medium">Incluir abono mensual de firmas</span>
							{abono && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)] border-[var(--success)]">abono activo</Badge>}
						</label>
						{abono && (
							<div className="pl-6 border-l-2 border-muted ml-1 flex items-center gap-2">
								<Label className="text-xs text-muted-foreground uppercase tracking-wide">Descuento del abono</Label>
								<div className="flex items-center gap-1">
									<Input type="number" min={0} max={100} value={abonoDescPct} onChange={function (e) { setAbonoDescPct(e.target.value === "" ? "" : Number(e.target.value)); }} className="h-8 w-20 text-right tabular-nums" />
									<span className="text-sm text-muted-foreground">%</span>
								</div>
							</div>
						)}
						{conAbono && (
							<div className="pl-6 border-l-2 border-muted ml-1 text-sm text-muted-foreground space-y-1.5">
								<p>Precio de lista × {((1 - descAbono) * 100).toFixed(0)}% ({(descAbono * 100).toFixed(0)}% de descuento). El pack se abona completo cada mes.</p>
								<div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
									<span className="text-muted-foreground">Mes 1 (compra inicial)</span>
									<span className="font-semibold text-foreground">{fMoney(netoLakaut)} <span className="font-normal text-muted-foreground">· descuento total {(descTotal * 100).toFixed(0)}%</span></span>
									<span className="text-muted-foreground">Mes 2 en adelante</span>
									<span className="font-semibold text-foreground">{fMoney(abonoMes)}/mes <span className="font-normal text-muted-foreground">· {fMoney(abonoAnual)}/año</span></span>
									<span className="text-muted-foreground">Facturación año 1</span>
									<span className="font-semibold text-foreground">{fMoney(facturacionAnio1)} <span className="font-normal text-muted-foreground">(mes 1 + abono × 11)</span></span>
								</div>
							</div>
						)}
						{abono && abonoMes === 0 && <p className="pl-6 text-xs text-muted-foreground">Cargá packs con firmas finitas para calcular el abono.</p>}
					</>
				)}
			</FieldGroup>

			{/* ── Rentabilidad (interno) ── */}
			{hasVolume && (
				<CollapsibleSection tone="internal" title="Rentabilidad · uso interno" subtitle="Costo variable, contribución marginal y cobertura de costos fijos. No aparece en la propuesta del cliente.">
					<div className="flex flex-wrap gap-3 mb-4">
						<StatCard label="Contribución marginal" value={fMoney(margenLakaut)} sub={(margenPct * 100).toFixed(0) + "% sobre neto"} accent={margAccent(margenPct)} valueClass={margClass(margenPct)} />
						<StatCard label="Cobertura CF anual" value={(coberturaPC * 100).toFixed(0) + "%"} sub={"de " + fMoney(cfAnual)} accent="muted" />
					</div>
					<Table>
						<TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">Total cotizado</TableHead></TableRow></TableHeader>
						<TableBody>
							{aplicaDescuento ? (
								<>
									<TableRow><TableCell>Facturación a lista</TableCell><TableCell className="text-right tabular-nums">{fMoney(calc.facturacionLista)}</TableCell></TableRow>
									{aplicaNivel && <TableRow><TableCell>Descuento por nivel {tier.label} ({(tier.descuento * 100).toFixed(0)}%)</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(descNivelMonto)}</TableCell></TableRow>}
									<TableRow><TableCell className="font-semibold">Ingreso neto Lakaut</TableCell><TableCell className="text-right tabular-nums font-semibold">{fMoney(netoLakaut)}</TableCell></TableRow>
								</>
							) : (
								<TableRow><TableCell className="font-semibold">Precio de lista (sin descuento)</TableCell><TableCell className="text-right tabular-nums font-semibold">{fMoney(netoLakaut)}</TableCell></TableRow>
							)}
							<TableRow><TableCell>Costo variable ({calc.certsTotal.toLocaleString("es-AR")} certs + {calc.firmasTotal.toLocaleString("es-AR")} firmas)</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(cvTotal)}</TableCell></TableRow>
							<TableRow className="bg-success/5"><TableCell className="font-semibold text-[var(--success)]">Contribución marginal</TableCell><TableCell className={"text-right tabular-nums font-semibold " + margClass(margenPct)}>{fMoney(margenLakaut)} ({(margenPct * 100).toFixed(0)}%)</TableCell></TableRow>
							<TableRow className="bg-muted/30"><TableCell className="font-semibold text-muted-foreground">CF anual Lakaut</TableCell><TableCell className="text-right tabular-nums text-muted-foreground">−{fMoney(cfAnual)} ({(coberturaPC * 100).toFixed(0)}% cubierto por este deal)</TableCell></TableRow>
						</TableBody>
					</Table>
				</CollapsibleSection>
			)}

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
										<TableCell><span className="inline-flex items-center gap-2"><TierBadge tier={t} tiers={distributorTiers} size="sm" />{act && <span className="text-[10px] font-bold uppercase tracking-wide text-primary">actual</span>}</span></TableCell>
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
