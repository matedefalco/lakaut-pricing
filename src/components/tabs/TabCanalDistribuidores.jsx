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

const TIER_BADGE = { azul: "default", bronce: "warning", plata: "secondary", oro: "warning", platinum: "default" };
function margClass(pct) { return pct >= 0.4 ? "text-[var(--success)]" : pct >= 0.15 ? "text-[var(--warning)]" : "text-destructive"; }
function margAccent(pct) { return pct >= 0.4 ? "success" : pct >= 0.15 ? "warning" : "destructive"; }

export function TabCanalDistribuidores({ costs, currency, tc, quotesApi, pendingEdit, onConsumeEdit }) {
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	const [clientName, setClientName] = useState("");
	const [certsActivos, setCertsActivos] = useState(200);
	const [qtys, setQtys] = useState({});
	const [firmasAdic, setFirmasAdic] = useState(0);
	const [precioFirmaUSD, setPrecioFirmaUSD] = useState(1);
	const [editingId, setEditingId] = useState(null);
	const [flash, setFlash] = useState(false);

	useEffect(function () {
		if (!pendingEdit) return;
		const i = pendingEdit.inputs || {};
		setClientName(pendingEdit.clientName === "(sin nombre)" ? "" : pendingEdit.clientName);
		setCertsActivos(i.certsActivos || 0);
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
	const hasVolume = calc.facturacionLista > 0 || calc.certsTotal > 0 || (Number(firmasAdic) || 0) > 0 || (Number(certsActivos) || 0) > 0;

	function saveQuote() {
		const now = new Date().toISOString();
		const prev = editingId ? quotesApi.quotes.find(function (q) { return q.id === editingId; }) : null;
		quotesApi.save({
			id: editingId || Date.now().toString(36),
			channel: "distribuidores",
			fecha: prev ? prev.fecha : now,
			updatedAt: editingId ? now : undefined,
			clientName: clientName || "(sin nombre)",
			inputs: { certsActivos, qtys, firmasAdic, precioFirmaUSD },
			resumen: { tier: tier.label, certsActivos, facturacionLista: calc.facturacionLista, firmasTotal: calc.firmasTotal, netoLakaut, margenPct },
		});
		setEditingId(null);
		setFlash(true);
		setTimeout(function () { setFlash(false); }, 1500);
	}

	return (
		<div className="space-y-6">

			{/* Card principal de cotización */}
			<Card className="bg-card border-border">
				<CardHeader className="pb-3">
					<CardTitle className="font-heading text-base font-semibold">Canal Distribuidores e Integradores</CardTitle>
					<p className="text-sm text-muted-foreground">Cargá el volumen anual comprometido. El compromiso de facturación se <strong>calcula</strong> a precios de lista y, junto con los certificados activos, define el nivel (gana el mayor). El descuento aplica sobre toda la lista.</p>
				</CardHeader>
				<CardContent className="space-y-5">
					{/* Nombre del cliente — al inicio */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">
							Nombre del cliente
							{editingId && <span className="ml-1.5 text-[var(--success)] font-semibold normal-case tracking-normal">· editando</span>}
						</Label>
						<Input placeholder="Ej: Distribuidora Mendoza S.A." value={clientName} onChange={function (e) { setClientName(e.target.value); }} />
					</div>

					<Separator />

					{/* Parámetros */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<NumberField label="Certificados activos administrados" value={certsActivos} onChange={setCertsActivos} note="Define el nivel por cartera actual" />
						<NumberField label="Firmas adicionales / año" value={firmasAdic} onChange={setFirmasAdic} />
						<NumberField label="Precio firma adicional" value={precioFirmaUSD} onChange={setPrecioFirmaUSD} prefix="USD" />
					</div>

					<Separator />

					{/* Guardar — al final */}
					<div className="flex justify-end gap-2">
						{editingId && <Button variant="outline" onClick={function () { setEditingId(null); }}>Cancelar</Button>}
						<Button onClick={saveQuote} disabled={!hasVolume} className={flash ? "bg-[var(--success)] hover:bg-[var(--success)]" : ""}>
							{flash ? <><Check className="size-4" /> Guardada</> : editingId ? "Actualizar cotización" : "Guardar cotización"}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Volumen comprometido */}
			<Card>
				<CardContent>
					<div className="mb-3 text-sm font-semibold">Volumen anual comprometido</div>
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
						</TableBody>
					</Table>
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
