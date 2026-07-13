import { useMemo } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { makeMoney } from "@/utils/useMoney";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/field";
import { DEAL_STATUS_META, dealStatus } from "@/lib/dealStatus";
import { CHANNELS, channelShort } from "@/data/channelMeta";

function fDate(iso) {
	if (!iso) return "—";
	try { return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }); }
	catch (e) { return "—"; }
}

// Cifra representativa por canal, para la lista de últimas cotizaciones.
function dealValue(deal, fMoney) {
	const r = deal.resumen || {};
	if (deal.channel === "web") return r.facturacionLista != null ? fMoney(r.facturacionLista) : "—";
	if (deal.channel === "distribuidores") return r.netoLakaut != null ? fMoney(r.netoLakaut) : "—";
	if (deal.channel === "b2b2c") return r.revAnual != null ? fMoney(r.revAnual) : (r.revMesTotal != null ? fMoney(r.revMesTotal) : "—");
	return "—";
}

export function TabInicio({ dealsApi, clientsApi, currency, tc, tcLastUpdated, onNewQuote, onOpenHistorial, onEditQuote }) {
	const { fMoney } = makeMoney(currency, tc);
	const deals = (dealsApi && dealsApi.deals) || [];
	const clients = (clientsApi && clientsApi.clients) || [];
	const clientsById = useMemo(function () {
		const m = {};
		clients.forEach(function (c) { m[c.id] = c; });
		return m;
	}, [clients]);

	const recientes = useMemo(function () {
		return deals.slice(0, 6);
	}, [deals]);

	const totalCotizaciones = deals.length;
	const pendientes = deals.filter(function (d) { return dealStatus(d) === "pendiente"; }).length;

	const channelCards = [
		{ key: "web", label: CHANNELS.web.label, desc: CHANNELS.web.desc },
		{ key: "distribuidores", label: CHANNELS.distribuidores.label, desc: CHANNELS.distribuidores.desc },
		{ key: "b2b2c", label: CHANNELS.b2b2c.label, desc: CHANNELS.b2b2c.desc },
	];

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h1 className="font-heading text-2xl font-semibold text-foreground">Empezá una cotización</h1>
				<p className="text-sm text-muted-foreground mt-1">Elegí el canal, cargá el volumen y exportá la propuesta. Tus cotizaciones quedan guardadas y sincronizadas con el equipo.</p>
			</div>

			{/* Acción primaria: elegir canal */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{channelCards.map(function (c) {
					return (
						<button key={c.key} onClick={function () { onNewQuote(c.key); }} className="group shadow-card text-left rounded-2xl border border-white/70 bg-card p-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-float">
							<div className="flex items-center justify-between gap-3">
								<span className="font-heading text-base font-semibold text-foreground">{c.label}</span>
								<span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
									<Plus className="size-4" />
								</span>
							</div>
							<p className="text-xs text-muted-foreground mt-2 leading-relaxed">{c.desc}</p>
						</button>
					);
				})}
			</div>

			{/* Resumen rápido */}
			<div className="flex flex-wrap gap-3">
				<StatCard label="Cotizaciones" value={totalCotizaciones} accent="muted" />
				<StatCard label="Pendientes" value={pendientes} accent={pendientes > 0 ? "warning" : "muted"} />
				<StatCard label="Tipo de cambio" value={"$ " + tc} sub={tcLastUpdated ? "Actualizado " + fDate(tcLastUpdated) : null} accent="primary" />
			</div>

			{/* Últimas cotizaciones */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<h2 className="font-heading text-sm font-semibold text-foreground uppercase tracking-wide">Últimas cotizaciones</h2>
					{totalCotizaciones > 0 && (
						<button onClick={onOpenHistorial} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
							Ver todas <ArrowRight className="size-3" />
						</button>
					)}
				</div>
				<Card>
					<CardContent className="p-0">
						{recientes.length === 0 ? (
							<div className="px-5 py-10 text-center">
								<p className="text-sm text-muted-foreground">Todavía no hay cotizaciones.</p>
								<p className="text-xs text-muted-foreground mt-1">Empezá con una de las opciones de arriba.</p>
							</div>
						) : (
							<div className="divide-y divide-border">
								{recientes.map(function (d) {
									const client = (d.client_id && clientsById[d.client_id]) || d.clients || null;
									const name = (client && client.name) || d.clientName || "(sin nombre)";
									const st = dealStatus(d);
									const meta = DEAL_STATUS_META[st] || DEAL_STATUS_META.pendiente;
									return (
										<div key={d.id} role="button" tabIndex={0} onClick={function () { onEditQuote(d); }} onKeyDown={function (e) { if (e.key === "Enter") onEditQuote(d); }} className="group flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="font-semibold text-sm truncate">{name}</span>
													<Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{channelShort(d.channel)}</Badge>
												</div>
												<div className="text-[11px] text-muted-foreground mt-0.5">{fDate(d.fecha)}</div>
											</div>
											<span className={"shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium " + meta.className}>{meta.label}</span>
											<span className="shrink-0 tabular-nums text-sm font-semibold w-24 text-right">{dealValue(d, fMoney)}</span>
											<button
												onClick={function (e) {
													e.stopPropagation();
													if (window.confirm("¿Borrar la cotización de " + name + "?")) dealsApi.remove(d.id);
												}}
												className="shrink-0 text-muted-foreground/40 transition-colors hover:text-destructive group-hover:text-muted-foreground"
												title="Borrar cotización"
											>
												<Trash2 className="size-3.5" />
											</button>
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
