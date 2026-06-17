import { useState, useMemo, useEffect } from "react";
import { Check } from "lucide-react";
import { makeMoney } from "@/utils/useMoney";
import { WEB_PRODUCTS, DISTRIBUTOR_TIERS, getDistributorTier } from "@/data/channels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { NumberField, StatCard } from "@/components/ui/field";
import { ClientSelector } from "@/components/ui/ClientSelector";

const TIER_BADGE = { azul: "default", bronce: "warning", plata: "secondary", oro: "warning", platinum: "default" };
function margClass(pct) { return pct >= 0.4 ? "text-[var(--success)]" : pct >= 0.15 ? "text-[var(--warning)]" : "text-destructive"; }
function margAccent(pct) { return pct >= 0.4 ? "success" : pct >= 0.15 ? "warning" : "destructive"; }

export function TabCanalDistribuidores({ costs, currency, tc, dealsApi, clientsApi, pendingEdit, onConsumeEdit }) {
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	const [selectedClient, setSelectedClient] = useState(null);
	const [certsActivos, setCertsActivos] = useState(0);
	const [qtys, setQtys] = useState({});
	const [firmasAdic, setFirmasAdic] = useState(0);
	const [precioFirmaUSD, setPrecioFirmaUSD] = useState(1);
	const [editingId, setEditingId] = useState(null);
	const [flash, setFlash] = useState(false);

	// Auto-fill certsActivos from sum of past deals for this client
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
		if (pendingEdit.clients) setSelectedClient(pendingEdit.clients);
		setQtys(i.qtys || {});
		setFirmasAdic(i.firmasAdic || 0);
		setPrecioFirmaUSD(i.precioFirmaUSD != null ? i.precioFirmaUSD : 1);
		setEditingId(pendingEdit.id);
		onConsumeEdit && onConsumeEdit();
	}, [pendingEdit]);

	function setQty(id, v) { setQtys(function (p) { return Object.assign({}, p, { [id]: v }); }); }

	const calc = useMemo(function () {
		let facturacionLista = 0, certsTotal = 0, firmasIncl = 0, ilimitadasUsadas = false;
		WEB_PRODUCTS.forEach(function (p) {
			const q = Number(qtys[p.id]) || 0;
			if (q <= 0 || p.precioARS == null) return;
			facturacionLista += q * (p.precioARS / tc);
			certsTotal += q * (p.certs || 1);
			if (p.ilimitadas) ilimitadasUsadas = true;
			else firmasIncl += q * (p.firmas || 0);
		});
		const firmasTotal = firmasIncl + (Number(firmasAdic) || 0);
		facturacionLista += (Number(firmasAdic) || 0) * (Number(precioFirmaUSD) || 0);
		return { facturacionLista, certsTotal, firmasIncl, firmasTotal, ilimitadasUsadas };
	}, [qtys, firmasAdic, precioFirmaUSD, tc]);

	const tier = getDistributorTier(certsActivos, calc.facturacionLista);
	const tierByCertsOnly = getDistributorTier(certsActivos, 0);
	const drivenBy = calc.facturacionLista > 0 && tier.id !== tierByCertsOnly.id ? "compromiso anual" : (calc.facturacionLista > 0 ? "certs y compromiso" : "certificados activos");

	const netoLakaut = calc.facturacionLista * (1 - tier.descuento);
	const cvTotal = calc.certsTotal * cvCert + calc.firmasTotal * cvFirma;
	const margenLakaut = netoLakaut - cvTotal;
	const margenPct = netoLakaut > 0 ? margenLakaut / netoLakaut : 0;
	const hasVolume = calc.facturacionLista > 0 || calc.certsTotal > 0 || (Number(firmasAdic) || 0) > 0;

	async function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? dealsApi.deals.find(function (d) { return d.id === editingId; }) : null;

		let client = selectedClient;
		if (!client && clientsApi) {
			client = await clientsApi.create("(sin nombre)", "distribuidores");
			setSelectedClient(client);
		}

		await dealsApi.save({
			id: editingId || Date.now().toString(36),
			channel: "distribuidores",
			fecha: prev ? prev.fecha : now,
			updatedAt: editingId ? now : undefined,
			inputs: { certsActivos, qtys, firmasAdic, precioFirmaUSD },
			resumen: { tier: tier.label, certsActivos, certsComprados: calc.certsTotal, facturacionLista: calc.facturacionLista, firmasTotal: calc.firmasTotal, netoLakaut, margenPct },
		}, client?.id || null);

		setEditingId(null);
		setFlash(true);
		setTimeout(function () { setFlash(false); }, 1500);
	}

	return (
		<div className="space-y-6">

			{/* Card principal de cotización */}
			<Card className="bg-card border-border">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between gap-4">
						<div>
							<CardTitle className="font-heading text-base font-semibold">Canal Distribuidores e Integradores</CardTitle>
							<p className="text-sm text-muted-foreground mt-1">El compromiso de facturación se <strong>calcula</strong> a precios de lista y, junto con los certificados activos, define el nivel (gana el mayor). El descuento aplica sobre toda la lista.</p>
						</div>
						{editingId && <span className="shrink-0 text-xs font-semibold text-[var(--success)] bg-[var(--success)]/10 px-2 py-1 rounded-md">Editando</span>}
					</div>
				</CardHeader>
				<CardContent className="space-y-5">
					{/* Cliente */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Cliente</Label>
						<ClientSelector
							channel="distribuidores"
							clients={clientsApi?.clients || []}
							onCreate={clientsApi?.create}
							value={selectedClient}
							onChange={setSelectedClient}
						/>
					</div>

					<Separator />

					{/* Parámetros adicionales */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<NumberField label="Firmas adicionales / año" value={firmasAdic} onChange={setFirmasAdic} />
						<NumberField label="Precio firma adicional" value={precioFirmaUSD} onChange={setPrecioFirmaUSD} prefix="USD" />
					</div>

					<Separator />

					{/* Tabla de packs */}
					<div>
						<p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Volumen anual comprometido</p>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Producto</TableHead>
									<TableHead className="text-right">Lista USD</TableHead>
									<TableHead className="text-right">Certs / u</TableHead>
									<TableHead className="text-right">Firmas / u</TableHead>
									<TableHead className="text-right">Cant. / año</TableHead>
									<TableHead className="text-right">Certs total</TableHead>
									<TableHead className="text-right">Firmas total</TableHead>
									<TableHead className="text-right">Facturación lista</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{WEB_PRODUCTS.filter(function (p) { return p.precioARS != null; }).map(function (p) {
									const q = Number(qtys[p.id]) || 0;
									const listaUSD = p.precioARS / tc;
									const firmasU = p.ilimitadas ? "ilim." : (p.firmas || 0);
									return (
										<TableRow key={p.id}>
											<TableCell className="font-semibold">{p.label}</TableCell>
											<TableCell className="text-right tabular-nums">{fMoney(listaUSD)}</TableCell>
											<TableCell className="text-right tabular-nums text-muted-foreground">{p.certs || 1}</TableCell>
											<TableCell className="text-right tabular-nums text-muted-foreground">{firmasU}</TableCell>
											<TableCell className="text-right">
												<Input type="number" min={0} value={qtys[p.id] || ""} placeholder="0" onChange={function (e) { setQty(p.id, e.target.value); }} className="ml-auto h-8 w-24 text-right tabular-nums" />
											</TableCell>
											<TableCell className="text-right tabular-nums">{q > 0 ? (q * (p.certs || 1)).toLocaleString("es-AR") : "—"}</TableCell>
											<TableCell className="text-right tabular-nums">{q > 0 ? (p.ilimitadas ? "ilim." : (q * (p.firmas || 0)).toLocaleString("es-AR")) : "—"}</TableCell>
											<TableCell className={"text-right tabular-nums " + (q > 0 ? "font-semibold" : "text-muted-foreground")}>{q > 0 ? fMoney(q * listaUSD) : "—"}</TableCell>
										</TableRow>
									);
								})}
								{/* Fila de totales */}
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

					{/* Footer: nivel derivado + acción */}
					<div className="flex items-center justify-between gap-4">
						{hasVolume ? (
							<div className="flex items-center gap-3 text-sm">
								<span className="text-muted-foreground">Nivel:</span>
								<Badge variant={TIER_BADGE[tier.id] || "default"} className="text-sm px-2.5 py-0.5">{tier.label}</Badge>
								<span className="text-muted-foreground">·</span>
								<span className="text-muted-foreground">Descuento</span>
								<span className="font-semibold">{(tier.descuento * 100).toFixed(0)}%</span>
								<span className="text-muted-foreground">·</span>
								<span className="text-muted-foreground">Neto Lakaut</span>
								<span className="font-semibold">{fMoney(netoLakaut)}</span>
							</div>
						) : (
							<p className="text-sm text-muted-foreground">Cargá al menos un producto para guardar la cotización.</p>
						)}
						<div className="flex gap-2 shrink-0">
							{editingId && <Button variant="outline" onClick={function () { setEditingId(null); }}>Cancelar</Button>}
							<Button onClick={saveQuote} disabled={!hasVolume} className={flash ? "bg-[var(--success)] hover:bg-[var(--success)]" : ""}>
								{flash ? <><Check className="size-4 mr-1.5" /> Guardada</> : editingId ? "Actualizar cotización" : "Guardar cotización"}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* KPIs */}
			<div className="flex flex-wrap gap-3">
				<StatCard label="Nivel asignado" value={tier.label} sub={"Por " + drivenBy} accent="primary" />
				<StatCard label="Descuento" value={(tier.descuento * 100).toFixed(0) + "%"} sub="Sobre lista web" accent="primary" />
				<StatCard label="Compromiso anual" value={hasVolume ? fMoney(calc.facturacionLista) : "—"} sub="Facturación a lista (derivada)" accent="muted" />
				<StatCard label="Firmas / año" value={hasVolume ? calc.firmasTotal.toLocaleString("es-AR") : "—"} sub={calc.ilimitadasUsadas ? "Excl. ilimitados" : "Incluidas + adicionales"} accent="muted" />
				<StatCard label="Ingreso neto Lakaut" value={hasVolume ? fMoney(netoLakaut) : "—"} sub={hasVolume ? "Margen " + (margenPct * 100).toFixed(0) + "%" : "Cargá volumen"} accent={hasVolume ? margAccent(margenPct) : "muted"} valueClass={hasVolume ? margClass(margenPct) : ""} />
			</div>

			{hasVolume && (
				<Card>
					<CardContent>
						<Table>
							<TableHeader><TableRow><TableHead>Concepto</TableHead><TableHead className="text-right">Anual</TableHead></TableRow></TableHeader>
							<TableBody>
								<TableRow><TableCell>Facturación a lista (compromiso)</TableCell><TableCell className="text-right tabular-nums">{fMoney(calc.facturacionLista)}</TableCell></TableRow>
								<TableRow><TableCell>Descuento distribuidor ({(tier.descuento * 100).toFixed(0)}%)</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(calc.facturacionLista - netoLakaut)}</TableCell></TableRow>
								<TableRow><TableCell className="font-semibold">Ingreso neto Lakaut</TableCell><TableCell className="text-right tabular-nums font-semibold">{fMoney(netoLakaut)}</TableCell></TableRow>
								<TableRow><TableCell>Costo variable ({calc.certsTotal.toLocaleString("es-AR")} certs + {calc.firmasTotal.toLocaleString("es-AR")} firmas)</TableCell><TableCell className="text-right tabular-nums text-destructive">−{fMoney(cvTotal)}</TableCell></TableRow>
								<TableRow className="bg-success/5"><TableCell className="font-semibold text-[var(--success)]">Margen Lakaut</TableCell><TableCell className={"text-right tabular-nums font-semibold " + margClass(margenPct)}>{fMoney(margenLakaut)} ({(margenPct * 100).toFixed(0)}%)</TableCell></TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* Matriz de niveles */}
			<Card>
				<CardContent>
					<div className="mb-3 text-sm font-semibold">Matriz de niveles</div>
					<Table>
						<TableHeader><TableRow><TableHead>Nivel</TableHead><TableHead className="text-right">Certificados activos</TableHead><TableHead className="text-right">Descuento</TableHead><TableHead className="text-right">Compromiso anual USD</TableHead></TableRow></TableHeader>
						<TableBody>
							{DISTRIBUTOR_TIERS.map(function (t) {
								const act = t.id === tier.id;
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
				</CardContent>
			</Card>
		</div>
	);
}
