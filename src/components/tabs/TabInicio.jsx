import { useMemo } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { makeMoney } from "@/utils/useMoney";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChannelBadge } from "@/components/ui/ChannelBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { dealStatus } from "@/lib/dealStatus";
import { CHANNELS, channelMeta, isPacks, isUnit } from "@/data/channelMeta";

function fDate(iso) {
	if (!iso) return "—";
	try { return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short" }); }
	catch (e) { return "—"; }
}

// Cifra representativa por canal, para la lista de últimas cotizaciones.
function dealValue(deal, fMoney) {
	const r = deal.resumen || {};
	if (isPacks(deal.channel)) return r.netoLakaut != null ? fMoney(r.netoLakaut) : (r.facturacionLista != null ? fMoney(r.facturacionLista) : "—");
	if (isUnit(deal.channel)) return r.revAnual != null ? fMoney(r.revAnual) : (r.revMesTotal != null ? fMoney(r.revMesTotal) : "—");
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
		{ key: "volumen", label: CHANNELS.volumen.label, desc: CHANNELS.volumen.desc },
	];

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h1 className="font-display text-2xl text-foreground">Empezá una cotización</h1>
				<p className="text-sm text-muted-foreground mt-1">Elegí el canal, cargá el volumen y exportá la propuesta. Tus cotizaciones quedan guardadas y sincronizadas con el equipo.</p>
			</div>

			{/* Acción primaria: elegir canal. Cada card toma el color, el gradiente y el
			    icono de su canal (ver channelMeta): eran dos cards blancas idénticas para
			    dos negocios distintos. */}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{channelCards.map(function (c) {
					const meta = channelMeta(c.key);
					const Icon = meta.Icon;
					return (
						<button
							key={c.key}
							onClick={function () { onNewQuote(c.key); }}
							className="group shadow-card relative overflow-hidden text-left rounded-2xl border border-white/70 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-float"
						>
							{/* Lavado de color del canal en la esquina: da identidad sin
							    comprometer la legibilidad del texto sobre la card. */}
							<span
								aria-hidden
								className="pointer-events-none absolute -right-10 -top-14 size-40 rounded-full opacity-60 transition-opacity duration-200 group-hover:opacity-100"
								style={{ background: "radial-gradient(circle, " + meta.glow + " 0%, transparent 70%)" }}
							/>
							<span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: meta.color, opacity: 0.85 }} />
							<div className="relative flex items-center justify-between gap-3">
								<span className="flex items-center gap-2.5 min-w-0">
									<span
										className="flex size-9 shrink-0 items-center justify-center rounded-xl"
										style={{ background: meta.gradient, border: "1px solid " + meta.glow, color: meta.colorFg }}
									>
										{Icon && <Icon className="size-[18px]" strokeWidth={2.2} />}
									</span>
									<span className="font-display text-lg truncate" style={{ color: meta.colorFg }}>{c.label}</span>
								</span>
								<span
									className="flex size-7 shrink-0 items-center justify-center rounded-full transition-colors"
									style={{ background: meta.colorSoft, color: meta.color }}
								>
									<Plus className="size-4" strokeWidth={2.6} />
								</span>
							</div>
							<p className="relative text-xs text-muted-foreground mt-2.5 leading-relaxed">{c.desc}</p>
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
							<EmptyState
								glyph="✍️"
								title="Todavía no hay cotizaciones"
								description="Elegí un canal arriba, cargá el volumen y en segundos tenés la propuesta lista para exportar."
								action={{ label: "Cotizar en Web", icon: Plus, onClick: function () { onNewQuote("web"); } }}
								secondaryAction={{ label: "Cotizar en IDC", icon: Plus, onClick: function () { onNewQuote("b2b2c"); } }}
							/>
						) : (
							<div className="divide-y divide-border">
								{recientes.map(function (d) {
									const client = (d.client_id && clientsById[d.client_id]) || d.clients || null;
									const name = (client && client.name) || d.clientName || "(sin nombre)";
									const st = dealStatus(d);
									return (
										<div key={d.id} role="button" tabIndex={0} onClick={function () { onEditQuote(d); }} onKeyDown={function (e) { if (e.key === "Enter") onEditQuote(d); }} className="group flex w-full cursor-pointer items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
											<div className="min-w-0 flex-1">
												<div className="flex items-center gap-2">
													<span className="font-semibold text-sm truncate">{name}</span>
													<ChannelBadge channel={d.channel} size="sm" />
												</div>
												<div className="text-[11px] text-muted-foreground mt-0.5">{fDate(d.fecha)}</div>
											</div>
											<StatusBadge status={st} />
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
