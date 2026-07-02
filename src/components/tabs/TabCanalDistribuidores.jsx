import { useState, useMemo, useEffect } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useModels } from "@/context/ModelsContext";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { getDistributorTier } from "@/lib/tiers";
import { CHANNELS } from "@/data/channelMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NumberField, StatCard } from "@/components/ui/field";
import { ClientSelector } from "@/components/ui/ClientSelector";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { SaveExportBar } from "@/components/ui/SaveExportBar";
import { QuoteSavedBanner } from "@/components/ui/QuoteSavedBanner";

const TIER_BADGE = { azul: "default", bronce: "warning", plata: "secondary", oro: "warning", platinum: "default" };
function margClass(pct) { return pct >= 0.4 ? "text-[var(--success)]" : pct >= 0.15 ? "text-[var(--warning)]" : "text-destructive"; }
function margAccent(pct) { return pct >= 0.4 ? "success" : pct >= 0.15 ? "warning" : "destructive"; }

export function TabCanalDistribuidores({ costs, currency, tc, dealsApi, clientsApi, onExport, onGoHistorial, onNewQuote, pendingEdit, onConsumeEdit }) {
	const { models: allModels } = useModels();
	const models = allModels.filter(function (m) { return m.activo !== false; });
	const { channelConfig } = useChannelConfig();
	const distributorTiers = channelConfig.distributorTiers;
	const { fMoney } = makeMoney(currency, tc);
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	const DESCUENTO_ABONO = 0.35;

	const [selectedClient, setSelectedClient] = useState(null);
	const [certsActivos, setCertsActivos] = useState(0);
	const [qtys, setQtys] = useState({});
	const [firmasAdic, setFirmasAdic] = useState(0);
	const [casosDeUso, setCasosDeUso] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [flash, setFlash] = useState(false);
	const [saved, setSaved] = useState(null);
	const [abono, setAbono] = useState(false);

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
		setAbono(i.abono || false);
		setEditingId(pendingEdit.id);
		setSaved(null);
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	function setQty(id, v) { setQtys(function (p) { return Object.assign({}, p, { [id]: v }); }); }

	const calc = useMemo(function () {
		let facturacionLista = 0, certsTotal = 0, firmasIncl = 0, ilimitadasUsadas = false;
		let weightedFirmaPrice = 0, totalQtyWithPrice = 0;
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
		});
		const precioFirmaAdic = totalQtyWithPrice > 0 ? weightedFirmaPrice / totalQtyWithPrice : 0;
		const firmasTotal = firmasIncl + Math.max(0, Number(firmasAdic) || 0);
		facturacionLista += Math.max(0, Number(firmasAdic) || 0) * precioFirmaAdic;
		return { facturacionLista, certsTotal, firmasIncl, firmasTotal, ilimitadasUsadas, precioFirmaAdic };
	}, [models, qtys, firmasAdic]);

	const abonoMes = useMemo(function () {
		return models.reduce(function (sum, p) {
			const q = Math.max(0, Number(qtys[p.id]) || 0);
			if (q <= 0 || !p.priceUSD) return sum;
			return sum + q * p.priceUSD * (1 - DESCUENTO_ABONO);
		}, 0);
	}, [models, qtys]);
	const abonoAnual = abonoMes * 12;

	const tier = getDistributorTier(calc.certsTotal, calc.facturacionLista, distributorTiers);
	const tierByCertsOnly = getDistributorTier(calc.certsTotal, 0, distributorTiers);
	const drivenBy = calc.facturacionLista > 0 && tier.id !== tierByCertsOnly.id ? "volumen cotizado" : (calc.certsTotal > 0 ? "certs cotizados" : "sin volumen");

	const netoLakaut = calc.facturacionLista * (1 - tier.descuento);
	const cvTotal = calc.certsTotal * cvCert + calc.firmasTotal * cvFirma;
	const margenLakaut = netoLakaut - cvTotal;
	const margenPct = netoLakaut > 0 ? margenLakaut / netoLakaut : 0;
	const facturacionAnio1 = netoLakaut + abonoMes * 11;
	const hasVolume = calc.facturacionLista > 0 || calc.certsTotal > 0 || Math.max(0, Number(firmasAdic) || 0) > 0;

	const cfAnual = costs.cfDirecto * 12;
	const coberturaPC = cfAnual > 0 ? margenLakaut / cfAnual : 0;

	function buildDeal(id, fecha) {
		return {
			id: id,
			channel: "distribuidores",
			fecha: fecha,
			updatedAt: editingId ? new Date().toISOString() : undefined,
			inputs: { certsActivos, qtys, firmasAdic, casosDeUso, abono },
			resumen: {
				tier: tier.label, certsActivos: calc.certsTotal, certsComprados: calc.certsTotal,
				facturacionLista: calc.facturacionLista, firmasTotal: calc.firmasTotal, netoLakaut, margenPct,
				...(abono && abonoMes > 0 ? { abonoMes, abonoAnual, facturacionAnio1 } : {}),
			},
		};
	}

	async function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? dealsApi.deals.find(function (d) { return d.id === editingId; }) : null;

		let client = selectedClient;
		if (!client && clientsApi) {
			client = await clientsApi.create("(sin nombre)", "distribuidores");
			setSelectedClient(client);
		}

		const deal = buildDeal(editingId || Date.now().toString(36), prev ? prev.fecha : now);
		if (prev?.resumen?.status) deal.resumen.status = prev.resumen.status;

		await dealsApi.save(deal, client?.id || null);

		setEditingId(null);
		setFlash(true);
		setSaved({ deal, client });
		setTimeout(function () { setFlash(false); }, 1500);
	}

	function exportNow() {
		const now = new Date().toISOString();
		const src = saved ? saved.deal : buildDeal(editingId || "preview", now);
		onExport && onExport(src, saved ? saved.client : selectedClient);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-heading text-xl font-semibold text-foreground">{CHANNELS.distribuidores.full}</h1>
				<p className="text-sm text-muted-foreground mt-1">El compromiso de facturación se calcula a precios de lista y, junto con los certificados activos, define el nivel (gana el mayor). El descuento aplica sobre toda la lista.</p>
			</div>

			{saved && (
				<QuoteSavedBanner
					clientName={(saved.client && saved.client.name) || (selectedClient && selectedClient.name) || ""}
					onExport={exportNow}
					onGoHistorial={onGoHistorial}
					onNew={function () { onNewQuote && onNewQuote(); }}
					onDismiss={function () { setSaved(null); }}
				/>
			)}

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
						<ClientSelector channel="distribuidores" clients={clientsApi?.clients || []} onCreate={clientsApi?.create} value={selectedClient} onChange={setSelectedClient} />
					</div>

					<Separator />

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<NumberField label="Firmas adicionales" value={firmasAdic} onChange={setFirmasAdic} min={0} />
					</div>

					<Separator />

					<div>
						<p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Packs cotizados</p>
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
									<TableHead className="text-right">Facturación lista</TableHead>
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
					</div>

					<Separator />

					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Casos de uso <span className="normal-case tracking-normal font-normal">(para propuesta comercial)</span></Label>
						<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: gestión de empleados, contratos de distribución, acuerdos comerciales..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
					</div>

					<Separator />

					{/* Abono mensual */}
					<div className="flex flex-col gap-3">
						<label className="flex items-center gap-2.5 cursor-pointer select-none">
							<input type="checkbox" checked={abono} onChange={function (e) { setAbono(e.target.checked); }} className="rounded" />
							<span className="text-sm font-medium">Incluir abono mensual de firmas</span>
							{abono && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activo</Badge>}
						</label>
						{abono && abonoMes > 0 && (
							<div className="pl-6 border-l-2 border-muted ml-1 text-sm text-muted-foreground space-y-1.5">
								<p>Precio de lista × {((1 - DESCUENTO_ABONO) * 100).toFixed(0)}% ({(DESCUENTO_ABONO * 100).toFixed(0)}% de descuento). El pack se abona completo cada mes.</p>
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
					</div>
				</CardContent>
			</Card>

			{/* ── Resultado (comercial) ── */}
			{hasVolume ? (
				<div className="flex flex-wrap gap-3">
					<StatCard label="Nivel asignado" value={tier.label} sub={"Por " + drivenBy} accent="primary" />
					<StatCard label="Descuento" value={(tier.descuento * 100).toFixed(0) + "%"} sub="Sobre lista web" accent="primary" />
					<StatCard label="Volumen cotizado" value={fMoney(calc.facturacionLista)} sub="Facturación a lista (derivada)" accent="muted" />
					<StatCard label="Firmas totales" value={calc.firmasTotal.toLocaleString("es-AR")} sub={calc.ilimitadasUsadas ? "Excl. ilimitados" : "Incluidas + adicionales"} accent="muted" />
					{!(abono && abonoMes > 0) && (
						<StatCard label="Ingreso neto Lakaut" value={fMoney(netoLakaut)} sub="Con descuento del nivel aplicado" accent="primary" />
					)}
					{abono && abonoMes > 0 && (
						<>
							<StatCard label="Mes 1" value={fMoney(netoLakaut)} sub={"Compra inicial · descuento " + (tier.descuento * 100).toFixed(0) + "% tier"} accent="primary" />
							<StatCard label="Mes 2 en adelante" value={fMoney(abonoMes) + "/mes"} sub={"Precio lista × " + ((1 - DESCUENTO_ABONO) * 100).toFixed(0) + "% · " + fMoney(abonoAnual) + "/año"} accent="success" />
							<StatCard label="Facturación año 1" value={fMoney(facturacionAnio1)} sub="Mes 1 + abono × 11" accent="success" />
						</>
					)}
				</div>
			) : (
				<Card><CardContent className="py-8 text-center">
					<p className="text-sm text-muted-foreground">Cargá al menos un producto para ver el nivel, el descuento y el ingreso de la cotización.</p>
				</CardContent></Card>
			)}

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
							<TableRow><TableCell>Facturación a lista (compromiso)</TableCell><TableCell className="text-right tabular-nums">{fMoney(calc.facturacionLista)}</TableCell></TableRow>
							<TableRow><TableCell>Descuento distribuidor ({(tier.descuento * 100).toFixed(0)}%)</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(calc.facturacionLista - netoLakaut)}</TableCell></TableRow>
							<TableRow><TableCell className="font-semibold">Ingreso neto Lakaut</TableCell><TableCell className="text-right tabular-nums font-semibold">{fMoney(netoLakaut)}</TableCell></TableRow>
							<TableRow><TableCell>Costo variable ({calc.certsTotal.toLocaleString("es-AR")} certs + {calc.firmasTotal.toLocaleString("es-AR")} firmas)</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(cvTotal)}</TableCell></TableRow>
							<TableRow className="bg-success/5"><TableCell className="font-semibold text-[var(--success)]">Contribución marginal</TableCell><TableCell className={"text-right tabular-nums font-semibold " + margClass(margenPct)}>{fMoney(margenLakaut)} ({(margenPct * 100).toFixed(0)}%)</TableCell></TableRow>
							<TableRow className="bg-muted/30"><TableCell className="font-semibold text-muted-foreground">CF anual Lakaut</TableCell><TableCell className="text-right tabular-nums text-muted-foreground">−{fMoney(cfAnual)} ({(coberturaPC * 100).toFixed(0)}% cubierto por este deal)</TableCell></TableRow>
						</TableBody>
					</Table>
				</CollapsibleSection>
			)}

			{/* ── Referencia: matriz de niveles (abierta por defecto: da contexto del nivel) ── */}
			<CollapsibleSection title="Matriz de niveles" subtitle="El nivel asignado marca la fila activa." defaultOpen>
				<Table>
					<TableHeader><TableRow><TableHead>Nivel</TableHead><TableHead className="text-right">Certificados activos</TableHead><TableHead className="text-right">Descuento</TableHead><TableHead className="text-right">Volumen cotizado (USD)</TableHead></TableRow></TableHeader>
					<TableBody>
						{distributorTiers.map(function (t) {
							const act = hasVolume && t.id === tier.id;
							return (
								<TableRow key={t.id} className={act ? "bg-accent" : ""}>
									<TableCell className="font-semibold">{t.label}{act && <Badge variant={TIER_BADGE[t.id] || "default"} className="ml-2">actual</Badge>}</TableCell>
									<TableCell className="text-right tabular-nums">{t.certsMin.toLocaleString("es-AR")}{t.certsMax == null ? "+" : "–" + t.certsMax.toLocaleString("es-AR")}</TableCell>
									<TableCell className="text-right tabular-nums font-semibold">{(t.descuento * 100).toFixed(0)}%</TableCell>
									<TableCell className="text-right tabular-nums">{t.compromisoMax == null ? "> " + t.compromisoMin.toLocaleString("es-AR") : t.compromisoMin.toLocaleString("es-AR") + "–" + t.compromisoMax.toLocaleString("es-AR")}</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</CollapsibleSection>

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
		</div>
	);
}
