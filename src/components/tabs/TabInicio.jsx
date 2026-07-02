import { useMemo } from "react";
import { ArrowRight, Plus, Clock } from "lucide-react";
import { makeMoney } from "@/utils/useMoney";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
						<button key={c.key} onClick={function () { onNewQuote(c.key); }} className="group text-left rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary hover:bg-primary/5">
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
			<div className="grid grid-cols-3 gap-3">
				<Card className="py-4"><CardContent className="px-4">
					<div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Cotizaciones</div>
					<div className="font-heading text-2xl font-semibold mt-1 tabular-nums">{totalCotizaciones}</div>
				</CardContent></Card>
				<Card className="py-4"><CardContent className="px-4">
					<div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Pendientes</div>
					<div className="font-heading text-2xl font-semibold mt-1 tabular-nums">{pendientes}</div>
				</CardContent></Card>
				<Card className="py-4"><CardContent className="px-4">
					<div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Clock className="size-3" /> Tipo de cambio</div>
					<div className="font-heading text-2xl font-semibold mt-1 tabular-nums">$ {tc}</div>
					{tcLastUpdated && <div className="text-[11px] text-muted-foreground mt-0.5">Actualizado {fDate(tcLastUpdated)}</div>}
				</CardContent></Card>
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
										<button key={d.id} onClick={function () { onEditQuote(d); }} className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40">
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="font-semibold text-sm truncate">{name}</span>
													<Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{channelShort(d.channel)}</Badge>
												</div>
												<div className="text-[11px] text-muted-foreground mt-0.5">{fDate(d.fecha)}</div>
											</div>
											<span className={"shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium " + meta.className}>{meta.label}</span>
											<span className="shrink-0 tabular-nums text-sm font-semibold w-24 text-right">{dealValue(d, fMoney)}</span>
										</button>
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
