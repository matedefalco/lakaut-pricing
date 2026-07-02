import { useState, useMemo } from "react";
import { Pencil, Trash2, Check, X, ExternalLink, ArrowLeft, ChevronRight } from "lucide-react";
import { makeMoney } from "@/utils/useMoney";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { DEAL_STATUSES, DEAL_STATUS_META, dealStatus } from "@/lib/dealStatus";
import { getDistributorTier } from "@/lib/tiers";
import { CHANNELS, channelLabel, channelShort } from "@/data/channelMeta";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const CHANNEL_LABEL = { web: channelLabel("web"), distribuidores: channelLabel("distribuidores"), b2b2c: channelLabel("b2b2c") };
const CHANNEL_SHORT = { web: channelShort("web"), distribuidores: channelShort("distribuidores"), b2b2c: channelShort("b2b2c") };
const CHANNEL_BADGE = { web: CHANNELS.web.badgeVariant, distribuidores: CHANNELS.distribuidores.badgeVariant, b2b2c: CHANNELS.b2b2c.badgeVariant };

function fDate(iso) {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

function ClientAvatar({ name }) {
	const initials = name
		? name.split(" ").slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase()
		: "?";
	return (
		<div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
			{initials}
		</div>
	);
}

export function TabClientes({ clientsApi, dealsApi, currency, tc, onEditDeal }) {
	const { channelConfig } = useChannelConfig();
	const distributorTiers = channelConfig.distributorTiers;
	const { fMoney } = makeMoney(currency, tc);

	const [search, setSearch] = useState("");
	const [channelFilter, setChannelFilter] = useState("all");
	const [selectedId, setSelectedId] = useState(null);
	const [editingName, setEditingName] = useState(false);
	const [nameInput, setNameInput] = useState("");

	const clients = clientsApi?.clients || [];
	const deals = dealsApi?.deals || [];

	const filtered = useMemo(function () {
		return clients.filter(function (c) {
			if (channelFilter !== "all" && c.channel !== channelFilter) return false;
			if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
			return true;
		});
	}, [clients, channelFilter, search]);

	const selected = clients.find(function (c) { return c.id === selectedId; });

	const clientDeals = useMemo(function () {
		if (!selectedId) return [];
		return deals.filter(function (d) { return d.client_id === selectedId; })
			.sort(function (a, b) { return (b.fecha || "").localeCompare(a.fecha || ""); });
	}, [selectedId, deals]);

	const stats = useMemo(function () {
		if (!selectedId) return null;
		let revenue = 0;
		let confirmedRevenue = 0;
		clientDeals.forEach(function (d) {
			const rev = d.resumen?.revMesTotal || d.resumen?.netoLakaut || 0;
			revenue += rev;
			if (dealStatus(d) === "confirmada") confirmedRevenue += rev;
		});
		return { total: clientDeals.length, revenue, confirmedRevenue };
	}, [clientDeals, selectedId]);

	const globalStats = useMemo(function () {
		const totalClients = clients.length;
		const totalDeals = deals.length;
		let totalRevenue = 0;
		let confirmedRevenue = 0;
		deals.forEach(function (d) {
			const rev = d.resumen?.revMesTotal || d.resumen?.revAnual || d.resumen?.netoLakaut || 0;
			totalRevenue += rev;
			if (dealStatus(d) === "confirmada") confirmedRevenue += rev;
		});
		const byChannel = {
			web: clients.filter(function (c) { return c.channel === "web"; }).length,
			distribuidores: clients.filter(function (c) { return c.channel === "distribuidores"; }).length,
			b2b2c: clients.filter(function (c) { return c.channel === "b2b2c"; }).length,
		};
		return { totalClients, totalDeals, totalRevenue, confirmedRevenue, byChannel };
	}, [clients, deals]);

	function clientRevenue(clientId) {
		let rev = 0;
		deals.filter(function (d) { return d.client_id === clientId; }).forEach(function (d) {
			rev += d.resumen?.revMesTotal || d.resumen?.revAnual || d.resumen?.netoLakaut || 0;
		});
		return rev;
	}

	function lastDeal(clientId) {
		const cd = deals.filter(function (d) { return d.client_id === clientId; }).sort(function (a, b) {
			return (b.fecha || "").localeCompare(a.fecha || "");
		});
		return cd[0]?.fecha || null;
	}

	async function saveName() {
		if (!nameInput.trim() || !selected) return;
		await clientsApi.update(selected.id, { name: nameInput.trim() });
		setEditingName(false);
		// Los deals guardan el nombre embebido en el join hecho al cargar la página;
		// hay que refrescarlos para que reflejen el nuevo nombre sin recargar.
		dealsApi?.refetch && dealsApi.refetch();
	}

	async function deleteClient(id) {
		if (!window.confirm("¿Eliminar este cliente y desvincular sus deals?")) return;
		await clientsApi.remove(id);
		if (selectedId === id) setSelectedId(null);
	}

	// ── Profile view ─────────────────────────────────────────────────────────
	if (selected) {
		return (
			<div className="space-y-5">
				{/* Back + header */}
				<div className="flex items-start justify-between gap-4">
					<div className="space-y-2">
						<button
							onClick={function () { setSelectedId(null); setEditingName(false); }}
							className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							<ArrowLeft className="size-3.5" />
							Volver a clientes
						</button>
						<div className="flex items-center gap-3">
							<ClientAvatar name={selected.name} />
							{editingName ? (
								<div className="flex items-center gap-2">
									<Input
										autoFocus
										value={nameInput}
										onChange={function (e) { setNameInput(e.target.value); }}
										onKeyDown={function (e) { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
										className="h-8 text-sm max-w-xs"
									/>
									<button onClick={saveName} className="text-green-600"><Check className="size-4" /></button>
									<button onClick={function () { setEditingName(false); }} className="text-muted-foreground"><X className="size-4" /></button>
								</div>
							) : (
								<div className="flex items-center gap-2">
									<h2 className="text-xl font-semibold font-heading">{selected.name}</h2>
									<button onClick={function () { setNameInput(selected.name); setEditingName(true); }} className="text-muted-foreground hover:text-foreground">
										<Pencil className="size-3.5" />
									</button>
								</div>
							)}
						</div>
						<div className="flex items-center gap-2 pl-11">
							<Badge variant={CHANNEL_BADGE[selected.channel] || "secondary"}>{CHANNEL_LABEL[selected.channel] || selected.channel}</Badge>
							<span className="text-xs text-muted-foreground">Desde {fDate(selected.created_at)}</span>
						</div>
					</div>
					<button onClick={function () { deleteClient(selected.id); }} className="text-muted-foreground hover:text-destructive transition-colors mt-8">
						<Trash2 className="size-4" />
					</button>
				</div>

				{/* Certs activos (distribuidores) */}
				{selected.channel === "distribuidores" && (function () {
					const certsTotal = clientDeals.reduce(function (s, d) { return s + (d.resumen?.certsComprados || 0); }, 0);
					return (
						<Card>
							<CardContent className="pt-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs text-muted-foreground uppercase tracking-wide">Certificados activos administrados</p>
										<p className="text-[10px] text-muted-foreground mt-0.5">Calculado de todos los deals del cliente</p>
										<span className="text-xl font-semibold tabular-nums mt-1 block">{certsTotal.toLocaleString("es-AR")}</span>
									</div>
									{certsTotal > 0 && (
										<div className="text-right">
											<p className="text-xs text-muted-foreground">Nivel actual</p>
											<p className="text-sm font-semibold">{getDistributorTier(certsTotal, 0, distributorTiers).label}</p>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					);
				})()}

				{/* KPIs */}
				{stats && (
					<div className="flex gap-3 flex-wrap">
						<div className="flex flex-col gap-0.5 bg-muted/40 rounded-md px-4 py-3 min-w-[100px]">
							<span className="text-[11px] text-muted-foreground uppercase tracking-wide">Deals</span>
							<span className="text-xl font-semibold tabular-nums">{stats.total}</span>
						</div>
						{stats.revenue > 0 && (
							<div className="flex flex-col gap-0.5 bg-muted/40 rounded-md px-4 py-3 min-w-[140px]">
								<span className="text-[11px] text-muted-foreground uppercase tracking-wide">Revenue acumulado</span>
								<span className="text-xl font-semibold tabular-nums">{fMoney(stats.revenue)}</span>
							</div>
						)}
						{stats.confirmedRevenue > 0 && (
							<div className="flex flex-col gap-0.5 bg-success/10 rounded-md px-4 py-3 min-w-[140px]">
								<span className="text-[11px] text-success uppercase tracking-wide">Facturado (confirmado)</span>
								<span className="text-xl font-semibold tabular-nums text-success">{fMoney(stats.confirmedRevenue)}</span>
							</div>
						)}
					</div>
				)}

				{/* Historial de deals */}
				{clientDeals.length > 0 ? (
					<Card>
						<CardHeader className="py-3"><CardTitle className="text-sm">Historial de cotizaciones</CardTitle></CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Fecha</TableHead>
										<TableHead>Canal</TableHead>
										<TableHead>Resumen</TableHead>
										<TableHead>Estado</TableHead>
										{selected.channel === "b2b2c" && <TableHead className="text-right">IDC</TableHead>}
										{selected.channel === "distribuidores" && <TableHead className="text-right">Certs</TableHead>}
										<TableHead className="text-right">Revenue</TableHead>
										<TableHead></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{clientDeals.map(function (d) {
										const rev = d.resumen?.revMesTotal || d.resumen?.revAnual || d.resumen?.netoLakaut || 0;
										return (
											<TableRow key={d.id}>
												<TableCell className="text-sm tabular-nums">{fDate(d.fecha)}</TableCell>
												<TableCell><Badge variant="secondary" className="text-[10px]">{CHANNEL_LABEL[d.channel] || d.channel}</Badge></TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{d.channel === "distribuidores" ? (d.resumen?.tier || "—") : (d.resumen?.segmento || "—")}
												</TableCell>
												<TableCell>
													<Select value={dealStatus(d)} onValueChange={function (v) { dealsApi.updateStatus(d.id, v); }}>
														<SelectTrigger className={cn("h-7 w-[120px] text-xs border", DEAL_STATUS_META[dealStatus(d)].className)}>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{DEAL_STATUSES.map(function (s) { return <SelectItem key={s} value={s}>{DEAL_STATUS_META[s].label}</SelectItem>; })}
														</SelectContent>
													</Select>
												</TableCell>
												{selected.channel === "b2b2c" && <TableCell className="text-right tabular-nums text-sm">{(d.resumen?.idcMensuales || 0).toLocaleString("es-AR")}</TableCell>}
												{selected.channel === "distribuidores" && <TableCell className="text-right tabular-nums text-sm">{(d.resumen?.certsActivos || 0).toLocaleString("es-AR")}</TableCell>}
												<TableCell className="text-right tabular-nums text-sm font-medium">{rev ? fMoney(rev) : "—"}</TableCell>
												<TableCell>
													<div className="flex gap-1 justify-end">
														{d.slide_url && <a href={d.slide_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="size-3.5" /></a>}
														{onEditDeal && (
															<button onClick={function () { onEditDeal(d); }} className="text-muted-foreground hover:text-foreground" title="Editar"><Pencil className="size-3.5" /></button>
														)}
														<button
															onClick={function () {
																if (window.confirm("¿Borrar esta cotización de " + (selected.name || "(sin nombre)") + "?")) dealsApi.remove(d.id);
															}}
															className="text-muted-foreground hover:text-destructive"
															title="Borrar cotización"
														>
															<Trash2 className="size-3.5" />
														</button>
													</div>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				) : (
					<p className="text-sm text-muted-foreground">Este cliente no tiene cotizaciones registradas.</p>
				)}
			</div>
		);
	}

	// ── List view ─────────────────────────────────────────────────────────────
	return (
		<div className="space-y-5">
			<PageHeader
				title="Clientes"
				description="Master de clientes con su historial de cotizaciones y revenue acumulado."
			/>

			{/* KPI summary */}
			<div className="flex gap-3 flex-wrap">
				<StatCard label="Clientes" value={globalStats.totalClients} accent="muted" />
				<StatCard label="Cotizaciones" value={globalStats.totalDeals} accent="muted" />
				{globalStats.totalRevenue > 0 && (
					<StatCard label="Revenue acumulado" value={fMoney(globalStats.totalRevenue)} accent="primary" />
				)}
				{globalStats.confirmedRevenue > 0 && (
					<StatCard label="Facturado (confirmado)" value={fMoney(globalStats.confirmedRevenue)} accent="success" valueClass="text-[var(--success)]" />
				)}
				{globalStats.byChannel.distribuidores > 0 && (
					<StatCard label={channelShort("distribuidores")} value={globalStats.byChannel.distribuidores} accent="muted" />
				)}
				{globalStats.byChannel.b2b2c > 0 && (
					<StatCard label={channelShort("b2b2c")} value={globalStats.byChannel.b2b2c} accent="muted" />
				)}
			</div>

			{/* Filters */}
			<div className="flex items-center gap-3">
				<Input
					placeholder="Buscar cliente..."
					value={search}
					onChange={function (e) { setSearch(e.target.value); }}
					className="h-8 text-sm max-w-xs"
				/>
				<div className="flex gap-1 text-xs">
					{["all", "distribuidores", "b2b2c"].map(function (ch) {
						return (
							<button
								key={ch}
								onClick={function () { setChannelFilter(ch); }}
								className={"px-2.5 py-1 rounded-md transition-colors " + (channelFilter === ch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
							>
								{ch === "all" ? "Todos" : ch === "distribuidores" ? "Lista c/desc." : "Volumen"}
							</button>
						);
					})}
				</div>
				<span className="text-xs text-muted-foreground ml-auto">{filtered.length} cliente{filtered.length !== 1 ? "s" : ""}</span>
			</div>

			{/* Table */}
			<div className="rounded-md border border-border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/30">
							<TableHead className="w-[280px]">Cliente</TableHead>
							<TableHead>Canal</TableHead>
							<TableHead className="text-right">Cotizaciones</TableHead>
							<TableHead className="text-right">Revenue acumulado</TableHead>
							<TableHead>Última cotización</TableHead>
							<TableHead className="w-16"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.length === 0 && (
							<TableRow>
								<TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
									{search || channelFilter !== "all" ? "Sin resultados para los filtros aplicados." : "No hay clientes registrados."}
								</TableCell>
							</TableRow>
						)}
						{filtered.map(function (c) {
							const dealCount = deals.filter(function (d) { return d.client_id === c.id; }).length;
							const rev = clientRevenue(c.id);
							const last = lastDeal(c.id);
							return (
								<TableRow
									key={c.id}
									className="group cursor-pointer hover:bg-muted/40 transition-colors"
									onClick={function () { setSelectedId(c.id); setEditingName(false); }}
								>
									<TableCell>
										<div className="flex items-center gap-3">
											<ClientAvatar name={c.name} />
											<span className="font-medium text-sm">{c.name}</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant={CHANNEL_BADGE[c.channel] || "secondary"} className="text-[10px]">
											{CHANNEL_SHORT[c.channel] || c.channel}
										</Badge>
									</TableCell>
									<TableCell className="text-right tabular-nums text-sm text-muted-foreground">{dealCount}</TableCell>
									<TableCell className="text-right tabular-nums text-sm font-medium">{rev ? fMoney(rev) : <span className="text-muted-foreground">—</span>}</TableCell>
									<TableCell className="text-sm text-muted-foreground">{fDate(last)}</TableCell>
									<TableCell>
										<div className="flex items-center justify-end gap-1">
											<button
												onClick={function (e) { e.stopPropagation(); deleteClient(c.id); }}
												className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
											>
												<Trash2 className="size-3.5" />
											</button>
											<ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
										</div>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
