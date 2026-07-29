import { useState, useMemo, useEffect } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useModels } from "@/context/ModelsContext";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { getDistributorTier } from "@/lib/tiers";
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

// ─── Cotizador de Packs ───────────────────────────────────────────────────────
// Unifica los ex canales Web y "Precio de lista con descuento": son los mismos
// packs y el mismo cálculo. La diferencia es una condición comercial, no un canal:
// el interruptor "Aplicar descuento comercial" habilita nivel por volumen,
// palancas por condiciones y abono mensual. Apagado, el neto es la lista completa
// (venta directa por tarjeta, sin intermediación).
export function TabCanalPacks({ costs, currency, tc, dealsApi, clientsApi, onExport, onGoHistorial, pendingEdit, onConsumeEdit }) {
	const { models: allModels } = useModels();
	const models = allModels.filter(function (m) { return m.activo !== false; });
	const { channelConfig } = useChannelConfig();
	const distributorTiers = channelConfig.distributorTiers;
	const commercialLevers = channelConfig.commercialLevers;
	const { fMoney } = makeMoney(currency, tc);
	const { toast } = useToast();
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;
	const ABONO_DESC_FALLBACK = 10;

	const [selectedClient, setSelectedClient] = useState(null);
	const [loadToken, setLoadToken] = useState(0);
	const [certsActivos, setCertsActivos] = useState(0);
	const [qtys, setQtys] = useState({});
	const [firmasAdic, setFirmasAdic] = useState(0);
	const [casosDeUso, setCasosDeUso] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [flash, setFlash] = useState(false);
	const [saved, setSaved] = useState(null);
	// Interruptor maestro de los descuentos comerciales. Arranca apagado: el
	// descuento es una decisión explícita del vendedor, no el default.
	const [aplicaDescuento, setAplicaDescuento] = useState(false);
	const [abono, setAbono] = useState(false);
	// Descuento del abono mensual (%): default de la config, editable por cotización.
	const [abonoDescPct, setAbonoDescPct] = useState(function () { return channelConfig.abonoDescuentoPct != null ? channelConfig.abonoDescuentoPct : ABONO_DESC_FALLBACK; });
	// Palancas de descuento por condiciones (se suman al descuento de nivel).
	const [levers, setLevers] = useState(function () { return defaultLeverSelection(channelConfig.commercialLevers); });

	// Auto-completar certs activos desde la suma de deals previos del cliente
	useEffect(function () {
		if (selectedClient && !pendingEdit) {
			const past = (dealsApi?.deals || []).filter(function (d) { return d.client_id === selectedClient.id; });
			const sum = past.reduce(function (s, d) { return s + (d.resumen?.certsComprados || 0); }, 0);
			setCertsActivos(sum);
		}
	}, [selectedClient]);

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
		// Cotizaciones viejas: el canal decía si había descuento (distribuidores sí,
		// web no). Ver packsConDescuento() en channelMeta.
		setAplicaDescuento(i.aplicaDescuento != null ? !!i.aplicaDescuento : pendingEdit.channel === "distribuidores");
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

	const tier = getDistributorTier(calc.certsTotal, calc.facturacionLista, distributorTiers);
	const tierByCertsOnly = getDistributorTier(calc.certsTotal, 0, distributorTiers);
	const drivenBy = calc.facturacionLista > 0 && tier.id !== tierByCertsOnly.id ? "volumen cotizado" : (calc.certsTotal > 0 ? "certs cotizados" : "sin volumen");

	// Con el interruptor apagado no hay nivel, ni condiciones, ni abono: el neto es
	// la lista completa. Encendido, el descuento por condiciones se suma al de nivel
	// (aditivo), con un piso de seguridad para no pasar de 95% de descuento total.
	const leverRes = resolveLevers(commercialLevers, levers);
	const descNivelPct = aplicaDescuento ? tier.descuento : 0;
	const descCondPct = aplicaDescuento ? leverRes.pct : 0;
	const descTotal = Math.min(0.95, descNivelPct + descCondPct);
	const descNivelMonto = calc.facturacionLista * descNivelPct;
	const descCondMonto = calc.facturacionLista * Math.max(0, descTotal - descNivelPct);
	const netoLakaut = calc.facturacionLista * (1 - descTotal);
	const cvTotal = calc.certsTotal * cvCert + calc.firmasTotal * cvFirma;
	const margenLakaut = netoLakaut - cvTotal;
	const margenPct = netoLakaut > 0 ? margenLakaut / netoLakaut : 0;
	const conAbono = aplicaDescuento && abono && abonoMes > 0;
	const facturacionAnio1 = netoLakaut + abonoMes * 11;
	const hasVolume = calc.facturacionLista > 0 || calc.certsTotal > 0 || Math.max(0, Number(firmasAdic) || 0) > 0;

	const tierActive = aplicaDescuento && hasVolume ? tier.id : null;
	useTierUp(tierActive, distributorTiers, function (next) {
		const mat = tierMaterialInList(next, distributorTiers);
		notifyTierUp(toast, { label: next.label, emoji: mat.emoji, material: mat, discountPct: Math.round((next.descuento || 0) * 100) });
	}, loadToken);

	const cfAnual = costs.cfDirecto * 12;
	const coberturaPC = cfAnual > 0 ? margenLakaut / cfAnual : 0;

	// Distancia al siguiente nivel: convierte la matriz en herramienta de upselling.
	const tierIdx = distributorTiers.findIndex(function (t) { return t.id === tier.id; });
	const nextTier = tierIdx >= 0 && tierIdx < distributorTiers.length - 1 ? distributorTiers[tierIdx + 1] : null;
	let nextHint = null;
	if (hasVolume && nextTier) {
		const certsFaltan = Math.max(0, nextTier.certsMin - calc.certsTotal);
		const volFaltan = Math.max(0, nextTier.compromisoMin - calc.facturacionLista);
		nextHint = "Te faltan " + certsFaltan.toLocaleString("es-AR") + " certs (o " + fMoney(volFaltan) + " de volumen) para " + nextTier.label + " · " + (nextTier.descuento * 100).toFixed(0) + "% de descuento.";
	} else if (hasVolume) {
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
			channel: "packs",
			fecha: fecha,
			updatedAt: editingId ? new Date().toISOString() : undefined,
			inputs: {
				certsActivos, qtys, firmasAdic, casosDeUso,
				// Interruptor de descuentos. Las selecciones de abono y palancas se
				// guardan siempre (aunque esté apagado) para no perderlas al reabrir.
				aplicaDescuento, abono,
				abonoDescuentoPct: Number(abonoDescPct) || 0,
				levers,
				// Snapshot resuelto del descuento por condiciones: estable ante cambios
				// posteriores de la config de tramos.
				...(aplicaDescuento ? { descCond: { pct: descCondPct, cappedPts: leverRes.cappedPts, cap: leverRes.cap, rawPct: leverRes.rawPct, capped: leverRes.capped, items: leverRes.items } } : {}),
			},
			resumen: {
				certsActivos: calc.certsTotal, certsComprados: calc.certsTotal,
				facturacionLista: calc.facturacionLista, firmasTotal: calc.firmasTotal,
				precioFirmaAdic: calc.precioFirmaAdic, netoLakaut, margenPct,
				...(aplicaDescuento ? {
					tier: tier.label,
					descNivelPct: descNivelPct, descCondPct, descTotal, descNivelMonto, descCondMonto,
				} : {}),
				...(conAbono ? { abonoMes, abonoAnual, facturacionAnio1 } : {}),
			},
		};
	}

	async function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? dealsApi.deals.find(function (d) { return d.id === editingId; }) : null;

		let client = selectedClient;
		if (!client && clientsApi) {
			client = await clientsApi.create("(sin nombre)", "packs");
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
		onExport && onExport(src, client);
		notifyQuoteExported(toast, {
			clientName: client && client.name,
			channelLabel: CHANNELS.packs.emoji + " " + CHANNELS.packs.label,
			onGoHistorial: (saved && onGoHistorial) ? function () { onGoHistorial(src.id); } : null,
		});
	}

	const header = (
		<PageHeader
			title={CHANNELS.packs.full + (selectedClient ? " · " + selectedClient.name : "")}
			description={
				aplicaDescuento ? (
					<>
						Con descuento comercial: el nivel se asigna por certificados y compromiso de facturación, y aplica sobre toda la lista.
						<InfoTooltip text="El compromiso se calcula a precios de lista. Junto con los certificados cotizados define el nivel: gana el mayor de los dos." />
					</>
				) : (
					<>
						A precio de lista, sin descuento por nivel ni abono.
						<InfoTooltip text="Venta directa: el cliente abona con tarjeta y el neto de Lakaut es la lista completa. Activá el descuento en Condiciones comerciales para cotizar a un distribuidor." />
					</>
				)
			}
		/>
	);

	const result = (
		<ResultPanel channel="packs" eyebrow={hasVolume ? "Resumen de la cotización" : "Resumen · sin datos"}>
			<ResultHero
				label={conAbono ? "Mes 1 · compra inicial" : (aplicaDescuento ? "Ingreso neto Lakaut" : "Total a pagar")}
				value={hasVolume ? <AnimatedNumber value={netoLakaut} format={fMoney} /> : "—"}
				sub={aplicaDescuento ? "Con descuento comercial aplicado" : "Precio de lista, sin descuento"}
				empty={!hasVolume}
				pill={hasVolume ? <StatusPill tone={margAccent(margenPct)}>Margen {(margenPct * 100).toFixed(0)}% · {margWord(margenPct)}</StatusPill> : null}
			/>

			{/* Nivel + acceso contextual a la matriz. Solo con descuento aplicado.
			    El nivel se muestra con su material (bronce, plata, oro, platinum) en
			    lugar de texto plano: es el momento en que el vendedor descubre cuánto
			    puede negociar, así que se lee como logro y no como dato. */}
			{aplicaDescuento && (
				<div className="space-y-2 border-t border-border/60 pt-3">
					<TierTrophy
						tier={tier}
						tiers={distributorTiers}
						discountPct={(tier.descuento * 100).toFixed(0)}
						note={"por " + drivenBy}
						empty={!hasVolume}
					/>
					{hasVolume && (
						<div className="flex justify-end">
							<TierHint columns={["Nivel", "Certs", "Desc."]} rows={tierRows} activeId={tier.id} nextHint={nextHint} />
						</div>
					)}
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
									value={<AnimatedNumber value={it.subtotal} format={fMoney} />}
								/>
							);
						})}
						{Math.max(0, Number(firmasAdic) || 0) > 0 && (
							<ResultItem
								title="Firmas adicionales"
								detail={Math.max(0, Number(firmasAdic) || 0).toLocaleString("es-AR") + " firmas × " + fMoney(calc.precioFirmaAdic)}
								value={<AnimatedNumber value={Math.max(0, Number(firmasAdic) || 0) * calc.precioFirmaAdic} format={fMoney} />}
								accent="muted"
							/>
						)}
					</div>

					{/* Lista → descuento → neto */}
					{aplicaDescuento && (
						<>
							<ResultRow label="Facturación a lista" value={<AnimatedNumber value={calc.facturacionLista} format={fMoney} />} />
							<ResultRow label={"Descuento " + tier.label + " (" + (tier.descuento * 100).toFixed(0) + "%)"} value={<>−<AnimatedNumber value={descNivelMonto} format={fMoney} /></>} accent="destructive" valueClass="text-destructive" />
							{descCondPct > 0 && <ResultRow label={"Descuento por condiciones (−" + leverRes.cappedPts + "%)"} value={<>−<AnimatedNumber value={descCondMonto} format={fMoney} /></>} accent="destructive" valueClass="text-destructive" />}
						</>
					)}
					<div className="flex items-center justify-between border-t-2 border-border pt-2">
						<span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{conAbono ? "Mes 1 · compra inicial" : (aplicaDescuento ? "Ingreso neto Lakaut" : "Total a pagar")}</span>
						<span className="font-heading text-lg font-semibold tabular-nums"><AnimatedNumber value={netoLakaut} format={fMoney} /></span>
					</div>

					{conAbono && (
						<div className="pt-1">
							<ResultRow label="Mes 2 en adelante" value={<><AnimatedNumber value={abonoMes} format={fMoney} />/mes</>} accent="success" />
							<ResultRow label="Facturación año 1" value={<AnimatedNumber value={facturacionAnio1} format={fMoney} />} accent="success" />
						</div>
					)}
				</div>
			) : (
				<p className="text-[11px] text-muted-foreground">Cargá al menos un producto para ver el precio{aplicaDescuento ? " y el nivel" : ""}.</p>
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
		/>
	);

	return (
		<QuoteLayout header={header} result={result} footer={footer}>
			{/* ── 1 · Para la propuesta ── */}
			<FieldGroup step={1} channel="packs" done={!!selectedClient} title="Para la propuesta" subtitle="Empezá por el cliente. Estos datos van al documento final; no cambian el cálculo.">
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">
						Cliente
						{editingId && <span className="ml-1.5 text-[var(--success)] font-semibold normal-case tracking-normal">· editando</span>}
					</Label>
					<ClientSelector channel="packs" clients={clientsApi?.clients || []} onCreate={clientsApi?.create} onSetTipo={clientsApi?.setTipo} value={selectedClient} onChange={setSelectedClient} />
					{!selectedClient && <p className="text-[11px] text-[var(--warning)]">Indicá el cliente antes de guardar o exportar la cotización.</p>}
				</div>

				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">Casos de uso <span className="normal-case tracking-normal font-normal">(para propuesta comercial)</span></Label>
					<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: firma de contratos, recibos, onboarding de clientes..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
				</div>
			</FieldGroup>

			{/* ── 2 · Qué cotizás ── */}
			<FieldGroup step={2} channel="packs" done={hasVolume} title="Qué cotizás" subtitle="Cargá los packs a precio de lista. El total se actualiza a la derecha.">
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
				channel="packs"
				done={hasVolume}
				title="Condiciones comerciales"
				subtitle={aplicaDescuento
					? "Nivel por volumen + palancas por condiciones" + (conAbono ? " · abono mensual activo" : "")
					: "Precio de lista puro: sin descuento por nivel, condiciones ni abono"}
				action={aplicaDescuento
					? <Badge variant="secondary" className="text-[10px] px-1.5 py-0">−{((descTotal) * 100).toFixed(0)}% total</Badge>
					: <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">a lista</Badge>}
			>
				<SwitchField
					label="Aplicar descuento comercial"
					description="Habilita el descuento por nivel (certificados y compromiso), las palancas por condiciones y el abono mensual de firmas. Apagado, se cotiza a precio de lista."
					checked={aplicaDescuento}
					onChange={setAplicaDescuento}
				/>

				{aplicaDescuento && (
					<>
						<Separator />

						{/* Descuento por condiciones comerciales (se suma al descuento de nivel) */}
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium">Descuento por condiciones</span>
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
									<span className="font-semibold text-foreground">{fMoney(netoLakaut)} <span className="font-normal text-muted-foreground">· descuento {(tier.descuento * 100).toFixed(0)}% tier</span></span>
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
									<TableRow><TableCell>Facturación a lista (compromiso)</TableCell><TableCell className="text-right tabular-nums">{fMoney(calc.facturacionLista)}</TableCell></TableRow>
									<TableRow><TableCell>Descuento por nivel ({(tier.descuento * 100).toFixed(0)}%)</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(descNivelMonto)}</TableCell></TableRow>
									{descCondPct > 0 && <TableRow><TableCell>Descuento por condiciones (−{leverRes.cappedPts}%)</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(descCondMonto)}</TableCell></TableRow>}
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
			{aplicaDescuento && (
				<CollapsibleSection title="Matriz de niveles" subtitle="Tabla completa. El nivel asignado se resalta.">
					<Table>
						<TableHeader><TableRow><TableHead>Nivel</TableHead><TableHead className="text-right">Certificados activos</TableHead><TableHead className="text-right">Descuento</TableHead><TableHead className="text-right">Volumen cotizado (USD)</TableHead></TableRow></TableHeader>
						<TableBody>
							{distributorTiers.map(function (t) {
								const act = hasVolume && t.id === tier.id;
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
