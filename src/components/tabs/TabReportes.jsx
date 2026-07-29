import { useMemo, useState } from "react";
import { makeMoney } from "@/utils/useMoney";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/field";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { dealStatus } from "@/lib/dealStatus";
import { channelShort, isPacks, resolveChannel } from "@/data/channelMeta";
import { STATUS_COLORS } from "@/theme/tokens";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

// ─── Reportes: facturación y métricas de cotizaciones ─────────────────────────
// Lee los deals guardados y arma la vista de resultados: cuánto se cotizó,
// cuánto se confirmó, cómo se reparte por canal y mes, y qué volumen de items
// (certificados, IDC, firmas) hay detrás de esos números.

const PERIODS = [
	{ id: "all", label: "Todo" },
	{ id: "m1", label: "Este mes", months: 1 },
	{ id: "m3", label: "3 meses", months: 3 },
	{ id: "m6", label: "6 meses", months: 6 },
	{ id: "y", label: "Este año" },
];



// Valor "revenue año 1" homogéneo entre canales: neto (+ abono si hay) en packs,
// revenue anual en volumen. Es la misma cifra que muestra cada cotizadora.
function dealRevenue(d) {
	const r = d.resumen || {};
	if (isPacks(d.channel)) return r.facturacionAnio1 || r.netoLakaut || r.facturacionLista || 0;
	if (d.channel === "b2b2c") return r.revAnual || (r.revMesTotal || 0) * 12 || 0;
	return 0;
}

function dealItems(d) {
	const r = d.resumen || {};
	return {
		certs: isPacks(d.channel) ? (r.certsComprados || r.certsActivos || 0) : 0,
		idc: d.channel === "b2b2c" ? (r.idcMensuales || 0) : 0,
		firmas: r.firmasTotal || r.firmasTotales || 0,
	};
}

function monthKey(iso) { return (iso || "").slice(0, 7); }
function monthLabel(key) {
	const [y, m] = key.split("-");
	const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
	return (names[Number(m) - 1] || m) + " " + y.slice(2);
}

export function TabReportes({ dealsApi, clientsApi, currency, tc }) {
	const { fMoney } = makeMoney(currency, tc);
	const [period, setPeriod] = useState("m6");
	const allDeals = (dealsApi && dealsApi.deals) || [];
	const clients = (clientsApi && clientsApi.clients) || [];
	const clientsById = useMemo(function () {
		const m = {};
		clients.forEach(function (c) { m[c.id] = c; });
		return m;
	}, [clients]);

	// ── Filtro por período ──
	const deals = useMemo(function () {
		if (period === "all") return allDeals;
		const now = new Date();
		let from;
		if (period === "y") from = new Date(now.getFullYear(), 0, 1);
		else {
			const p = PERIODS.find(function (x) { return x.id === period; });
			from = new Date(now.getFullYear(), now.getMonth() - ((p.months || 1) - 1), 1);
		}
		return allDeals.filter(function (d) { return d.fecha && new Date(d.fecha) >= from; });
	}, [allDeals, period]);

	// ── Agregados ──
	const agg = useMemo(function () {
		let cotizado = 0, confirmado = 0, pendiente = 0, rechazado = 0;
		let nConf = 0, nPend = 0, nRech = 0;
		const items = { certs: 0, idc: 0, firmas: 0, certsConf: 0, idcConf: 0, firmasConf: 0 };
		const byChannel = {};
		const byMonth = {};
		const byClient = {};

		deals.forEach(function (d) {
			const rev = dealRevenue(d);
			const st = dealStatus(d);
			const it = dealItems(d);
			cotizado += rev;
			if (st === "confirmada") { confirmado += rev; nConf++; items.certsConf += it.certs; items.idcConf += it.idc; items.firmasConf += it.firmas; }
			else if (st === "rechazada") { rechazado += rev; nRech++; }
			else { pendiente += rev; nPend++; }
			items.certs += it.certs; items.idc += it.idc; items.firmas += it.firmas;

			const ch = resolveChannel(d.channel);
			if (!byChannel[ch]) byChannel[ch] = { canal: ch, n: 0, nConf: 0, cotizado: 0, confirmado: 0, certs: 0, idc: 0, firmas: 0 };
			byChannel[ch].n++;
			byChannel[ch].cotizado += rev;
			byChannel[ch].certs += it.certs; byChannel[ch].idc += it.idc; byChannel[ch].firmas += it.firmas;
			if (st === "confirmada") { byChannel[ch].nConf++; byChannel[ch].confirmado += rev; }

			const mk = monthKey(d.fecha);
			if (mk) {
				if (!byMonth[mk]) byMonth[mk] = { mes: mk, confirmada: 0, pendiente: 0, rechazada: 0 };
				byMonth[mk][st] = (byMonth[mk][st] || 0) + rev;
			}

			const clientName = (d.client_id && clientsById[d.client_id] && clientsById[d.client_id].name) || d.clientName || "(sin nombre)";
			if (!byClient[clientName]) byClient[clientName] = { name: clientName, n: 0, cotizado: 0, confirmado: 0 };
			byClient[clientName].n++;
			byClient[clientName].cotizado += rev;
			if (st === "confirmada") byClient[clientName].confirmado += rev;
		});

		const conversion = nConf + nRech > 0 ? nConf / (nConf + nRech) : null;
		const months = Object.values(byMonth).sort(function (a, b) { return a.mes.localeCompare(b.mes); });
		const channels = Object.values(byChannel).sort(function (a, b) { return b.cotizado - a.cotizado; });
		const topClients = Object.values(byClient).sort(function (a, b) { return (b.confirmado || b.cotizado) - (a.confirmado || a.cotizado); }).slice(0, 8);
		return { cotizado, confirmado, pendiente, rechazado, nConf, nPend, nRech, conversion, items, months, channels, topClients };
	}, [deals, clientsById]);

	const hasData = deals.length > 0;
	const chartData = agg.months.map(function (m) {
		return { name: monthLabel(m.mes), Confirmada: Math.round(m.confirmada), Pendiente: Math.round(m.pendiente), Rechazada: Math.round(m.rechazada) };
	});

	return (
		<div className="space-y-6">
			<PageHeader
				title="Reportes"
				description="Resultados de facturación sobre las cotizaciones guardadas: totales, evolución por mes, desglose por canal y volumen de items."
				actions={
					<div className="flex gap-1 flex-wrap">
						{PERIODS.map(function (p) {
							const active = period === p.id;
							return (
								<button key={p.id} onClick={function () { setPeriod(p.id); }} className={"px-3 py-1.5 rounded-md text-xs font-medium transition-colors " + (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>
									{p.label}
								</button>
							);
						})}
					</div>
				}
			/>

			{!hasData ? (
				<Card><CardContent className="p-0">
					<EmptyState tone="filter" glyph="📊" title="Sin datos en este período" description="No hay cotizaciones en el rango elegido. Probá con un período más amplio o creá una cotización nueva." />
				</CardContent></Card>
			) : (
				<>
					{/* KPIs */}
					<div className="flex flex-wrap gap-3">
						<StatCard label="Cotizado (rev. año 1)" value={fMoney(agg.cotizado)} sub={deals.length + " cotizaciones"} accent="primary" />
						<StatCard label="Confirmado" value={fMoney(agg.confirmado)} sub={agg.nConf + (agg.nConf === 1 ? " cotización" : " cotizaciones")} accent="success" valueClass="text-[var(--success)]" />
						<StatCard label="Pendiente" value={fMoney(agg.pendiente)} sub={agg.nPend + " en pipeline"} accent="warning" />
						<StatCard label="Tasa de conversión" value={agg.conversion == null ? "—" : Math.round(agg.conversion * 100) + "%"} sub={agg.conversion == null ? "Sin cotizaciones cerradas" : agg.nConf + " ganadas · " + agg.nRech + " perdidas"} accent="muted" />
					</div>

					{/* Evolución mensual */}
					<SectionCard title="Facturación por mes" description="Revenue año 1 de las cotizaciones creadas en cada mes, por estado.">
						<div style={{ width: "100%", height: 280 }}>
							<ResponsiveContainer>
								<BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
									<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
									<XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
									<YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={function (v) { return v >= 1000 ? Math.round(v / 1000) + "k" : v; }} />
									<Tooltip formatter={function (v) { return fMoney(v); }} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
									<Legend wrapperStyle={{ fontSize: 12 }} />
									<Bar dataKey="Confirmada" stackId="a" fill={STATUS_COLORS.confirmada} radius={[0, 0, 0, 0]} />
									<Bar dataKey="Pendiente" stackId="a" fill={STATUS_COLORS.pendiente} />
									<Bar dataKey="Rechazada" stackId="a" fill={STATUS_COLORS.rechazada} radius={[4, 4, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					</SectionCard>

					{/* Por canal */}
					<SectionCard title="Desglose por canal" description="Cotizaciones, revenue e items por canal en el período.">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Canal</TableHead>
									<TableHead className="text-right">Cotizaciones</TableHead>
									<TableHead className="text-right">Confirmadas</TableHead>
									<TableHead className="text-right">Cotizado</TableHead>
									<TableHead className="text-right">Confirmado</TableHead>
									<TableHead className="text-right">Items</TableHead>
									<TableHead className="text-right">Firmas</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{agg.channels.map(function (c) {
									return (
										<TableRow key={c.canal}>
											<TableCell><Badge variant="secondary" className="text-[10px]">{channelShort(c.canal)}</Badge></TableCell>
											<TableCell className="text-right tabular-nums">{c.n}</TableCell>
											<TableCell className="text-right tabular-nums">{c.nConf}</TableCell>
											<TableCell className="text-right tabular-nums">{fMoney(c.cotizado)}</TableCell>
											<TableCell className={"text-right tabular-nums font-semibold " + (c.confirmado > 0 ? "text-[var(--success)]" : "text-muted-foreground")}>{c.confirmado > 0 ? fMoney(c.confirmado) : "—"}</TableCell>
											<TableCell className="text-right tabular-nums text-muted-foreground">{c.canal === "b2b2c" ? c.idc.toLocaleString("es-AR") + " IDC" : c.certs.toLocaleString("es-AR") + " certs"}</TableCell>
											<TableCell className="text-right tabular-nums text-muted-foreground">{c.firmas.toLocaleString("es-AR")}</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</SectionCard>

					{/* Volumen de items + top clientes */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
						<SectionCard title="Volumen de items" description="Total cotizado en el período (confirmado entre paréntesis).">
							<div className="space-y-3">
								{[
									{ label: "Certificados (packs)", tot: agg.items.certs, conf: agg.items.certsConf },
									{ label: "IDC (volumen)", tot: agg.items.idc, conf: agg.items.idcConf },
									{ label: "Firmas", tot: agg.items.firmas, conf: agg.items.firmasConf },
								].map(function (row) {
									return (
										<div key={row.label} className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
											<span className="text-sm text-muted-foreground">{row.label}</span>
											<span className="tabular-nums text-sm font-semibold">
												{row.tot.toLocaleString("es-AR")}
												{row.conf > 0 && <span className="ml-1.5 font-normal text-[var(--success)]">({row.conf.toLocaleString("es-AR")})</span>}
											</span>
										</div>
									);
								})}
							</div>
						</SectionCard>

						<SectionCard title="Top clientes" description="Ordenados por revenue confirmado (o cotizado si no hay confirmado).">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Cliente</TableHead>
										<TableHead className="text-right">Cotiz.</TableHead>
										<TableHead className="text-right">Cotizado</TableHead>
										<TableHead className="text-right">Confirmado</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{agg.topClients.map(function (c) {
										return (
											<TableRow key={c.name}>
												<TableCell className="font-medium">{c.name}</TableCell>
												<TableCell className="text-right tabular-nums">{c.n}</TableCell>
												<TableCell className="text-right tabular-nums">{fMoney(c.cotizado)}</TableCell>
												<TableCell className={"text-right tabular-nums " + (c.confirmado > 0 ? "font-semibold text-[var(--success)]" : "text-muted-foreground")}>{c.confirmado > 0 ? fMoney(c.confirmado) : "—"}</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</SectionCard>
					</div>

					<p className="text-[11px] text-muted-foreground">Revenue año 1 por cotización: en lista con descuento es el neto Lakaut (más abono × 11 si aplica); en volumen es el revenue anual (IDC + firmas + SLA + fee). Es la misma cifra que muestra cada cotizadora al guardar.</p>
				</>
			)}
		</div>
	);
}
