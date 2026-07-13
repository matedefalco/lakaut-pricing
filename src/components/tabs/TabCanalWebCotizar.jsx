import { useState, useMemo, useEffect } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useModels } from "@/context/ModelsContext";
import { CHANNELS } from "@/data/channelMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { NumberField, StatCard } from "@/components/ui/field";
import { ClientSelector } from "@/components/ui/ClientSelector";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PageHeader } from "@/components/ui/PageHeader";
import { SaveExportBar } from "@/components/ui/SaveExportBar";
import { useToast, notifyQuoteSaved } from "@/components/ui/Toaster";

function margClass(pct) { return pct >= 0.4 ? "text-[var(--success)]" : pct >= 0.15 ? "text-[var(--warning)]" : "text-destructive"; }
function margAccent(pct) { return pct >= 0.4 ? "success" : pct >= 0.15 ? "warning" : "destructive"; }

// Canal Web como cotizador: mismos packs que "Precio de lista con descuento",
// pero a precio de lista puro (sin descuento por nivel ni abono). Es la venta
// directa por tarjeta, sin intermediación. El neto de Lakaut es la lista completa.
export function TabCanalWebCotizar({ costs, currency, tc, dealsApi, clientsApi, onExport, onGoHistorial, pendingEdit, onConsumeEdit }) {
	const { models: allModels } = useModels();
	const models = allModels.filter(function (m) { return m.activo !== false; });
	const { fMoney } = makeMoney(currency, tc);
	const { toast } = useToast();
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	const [selectedClient, setSelectedClient] = useState(null);
	const [qtys, setQtys] = useState({});
	const [firmasAdic, setFirmasAdic] = useState(0);
	const [casosDeUso, setCasosDeUso] = useState("");
	const [editingId, setEditingId] = useState(null);
	const [flash, setFlash] = useState(false);
	const [saved, setSaved] = useState(null);

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

	// Sin descuento: el neto es la lista completa.
	const neto = calc.facturacionLista;
	const cvTotal = calc.certsTotal * cvCert + calc.firmasTotal * cvFirma;
	const margenLakaut = neto - cvTotal;
	const margenPct = neto > 0 ? margenLakaut / neto : 0;
	const hasVolume = calc.facturacionLista > 0 || Math.max(0, Number(firmasAdic) || 0) > 0;

	const cfAnual = costs.cfDirecto * 12;
	const coberturaPC = cfAnual > 0 ? margenLakaut / cfAnual : 0;

	function buildDeal(id, fecha) {
		return {
			id: id,
			channel: "web",
			fecha: fecha,
			updatedAt: editingId ? new Date().toISOString() : undefined,
			inputs: { qtys, firmasAdic, casosDeUso },
			resumen: {
				certsComprados: calc.certsTotal, certsActivos: calc.certsTotal,
				facturacionLista: calc.facturacionLista, firmasTotal: calc.firmasTotal,
				precioFirmaAdic: calc.precioFirmaAdic, netoLakaut: neto, margenPct,
			},
		};
	}

	async function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? dealsApi.deals.find(function (d) { return d.id === editingId; }) : null;

		let client = selectedClient;
		if (!client && clientsApi) {
			client = await clientsApi.create("(sin nombre)", "web");
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

	return (
		<div className="space-y-6">
			<PageHeader
				title={CHANNELS.web.full}
				description="Venta directa sin intermediación: los packs se cotizan a precio de lista web, sin descuento por nivel ni abono. El cliente abona con tarjeta."
			/>

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
						<ClientSelector channel="web" clients={clientsApi?.clients || []} onCreate={clientsApi?.create} value={selectedClient} onChange={setSelectedClient} />
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
					</div>

					<Separator />

					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Casos de uso <span className="normal-case tracking-normal font-normal">(para propuesta comercial)</span></Label>
						<textarea value={casosDeUso} onChange={function (e) { setCasosDeUso(e.target.value); }} rows={2} placeholder="Ej: firma de contratos, recibos, onboarding de clientes..." className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground" />
					</div>
				</CardContent>
			</Card>

			{/* ── Resultado (comercial) ── */}
			{hasVolume ? (
				<div className="flex flex-wrap gap-3">
					<StatCard label="Precio de lista" value={fMoney(calc.facturacionLista)} sub="Sin descuento (precio web)" accent="primary" />
					<StatCard label="Firmas totales" value={calc.firmasTotal.toLocaleString("es-AR")} sub={calc.ilimitadasUsadas ? "Excl. ilimitados" : "Incluidas + adicionales"} accent="muted" />
					<StatCard label="Certificados" value={calc.certsTotal.toLocaleString("es-AR")} sub="Total cotizado" accent="muted" />
					<StatCard label="Total a pagar" value={fMoney(neto)} sub="Precio de lista web, sin descuento" accent="primary" />
				</div>
			) : (
				<Card><CardContent className="py-8 text-center">
					<p className="text-sm text-muted-foreground">Cargá al menos un producto para ver el precio de lista de la cotización.</p>
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
							<TableRow><TableCell className="font-semibold">Precio de lista (sin descuento)</TableCell><TableCell className="text-right tabular-nums font-semibold">{fMoney(neto)}</TableCell></TableRow>
							<TableRow><TableCell>Costo variable ({calc.certsTotal.toLocaleString("es-AR")} certs + {calc.firmasTotal.toLocaleString("es-AR")} firmas)</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(cvTotal)}</TableCell></TableRow>
							<TableRow className="bg-success/5"><TableCell className="font-semibold text-[var(--success)]">Contribución marginal</TableCell><TableCell className={"text-right tabular-nums font-semibold " + margClass(margenPct)}>{fMoney(margenLakaut)} ({(margenPct * 100).toFixed(0)}%)</TableCell></TableRow>
							<TableRow className="bg-muted/30"><TableCell className="font-semibold text-muted-foreground">CF anual Lakaut</TableCell><TableCell className="text-right tabular-nums text-muted-foreground">−{fMoney(cfAnual)} ({(coberturaPC * 100).toFixed(0)}% cubierto por este deal)</TableCell></TableRow>
						</TableBody>
					</Table>
				</CollapsibleSection>
			)}

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
