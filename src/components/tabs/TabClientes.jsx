import { useState, useMemo } from "react";
import { Pencil, Trash2, Check, X, ExternalLink, ArrowLeft, ChevronRight } from "lucide-react";
import { makeMoney } from "@/utils/useMoney";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { DEAL_STATUSES, DEAL_STATUS_META, dealStatus } from "@/lib/dealStatus";
import { getDistributorTier } from "@/lib/tiers";
import { channelShort, channelEmoji, resolveChannel, isPacks, isUnit, isVolumenLike } from "@/data/channelMeta";
import { dealRevenue } from "@/lib/dealMetrics";
import { TierBadge } from "@/components/ui/TierBadge";
import { ChannelBadge } from "@/components/ui/ChannelBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/field";
import { cn } from "@/lib/utils";

function fDate(iso) {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

// Paleta de avatares. Derivada de los tonos del sistema, con contraste suficiente
// sobre su propio fondo claro.
const AVATAR_COLORS = [
	{ bg: "#eef0fb", fg: "#2532a8" }, // azul marca
	{ bg: "#e8f6fa", fg: "#0b6a85" }, // cyan
	{ bg: "#f1ecfe", fg: "#5b21b6" }, // violeta
	{ bg: "#e6f7ef", fg: "#046c4e" }, // verde
	{ bg: "#fdf1e3", fg: "#8a4d12" }, // ámbar
	{ bg: "#fdecf1", fg: "#9d174d" }, // rosa
	{ bg: "#e9f0f7", fg: "#41506a" }, // pizarra
];

function avatarColor(name) {
	const s = String(name || "?");
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 100000;
	return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function ClientAvatar({ name }) {
	const initials = name
		? name.split(" ").slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase()
		: "?";
	const c = avatarColor(name);
	return (
		<div
			className="size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
			style={{ background: c.bg, color: c.fg }}
		>
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
			if (channelFilter !== "all" && resolveChannel(c.channel) !== channelFilter) return false;
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
			// Revenue año 1 homogéneo entre canales (fuente única, ver dealRevenue).
			const rev = dealRevenue(d);
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
			const rev = dealRevenue(d);
			totalRevenue += rev;
			if (dealStatus(d) === "confirmada") confirmedRevenue += rev;
		});
		const byChannel = {
			web: clients.filter(function (c) { return resolveChannel(c.channel) === "web"; }).length,
			distribuidores: clients.filter(function (c) { return resolveChannel(c.channel) === "distribuidores"; }).length,
			b2b2c: clients.filter(function (c) { return c.channel === "b2b2c"; }).length,
			volumen: clients.filter(function (c) { return c.channel === "volumen"; }).length,
		};
		return { totalClients, totalDeals, totalRevenue, confirmedRevenue, byChannel };
	}, [clients, deals]);

	function clientRevenue(clientId) {
		let rev = 0;
		deals.filter(function (d) { return d.client_id === clientId; }).forEach(function (d) {
			rev += dealRevenue(d);
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
							<ChannelBadge channel={selected.channel} />
							<span className="text-xs text-muted-foreground">Desde {fDate(selected.created_at)}</span>
						</div>
					</div>
					<button onClick={function () { deleteClient(selected.id); }} className="text-muted-foreground hover:text-destructive transition-colors mt-8">
						<Trash2 className="size-4" />
					</button>
				</div>

				{/* Base instalada y nivel · solo para socios del canal Distribuidores, que
				    es donde el nivel se negocia. En Web el precio es la lista, sin nivel. */}
				{resolveChannel(selected.channel) === "distribuidores" && (function () {
					const certsTotal = clientDeals.reduce(function (s, d) { return s + (d.resumen?.certsComprados || 0); }, 0);
					// Mayor compromiso anual declarado en las cotizaciones del socio: es la
					// otra variable que define el nivel.
					const compromisoMax = clientDeals.reduce(function (m, d) { return Math.max(m, (d.resumen && d.resumen.compromisoAnual) || 0); }, 0);
					return (
						<Card>
							<CardContent className="pt-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-xs text-muted-foreground uppercase tracking-wide">Certificados activos administrados</p>
										<p className="text-[10px] text-muted-foreground mt-0.5">Suma de las cotizaciones del socio en la app</p>
										<span className="text-xl font-semibold tabular-nums mt-1 block">{certsTotal.toLocaleString("es-AR")}</span>
										{compromisoMax > 0 && (
											<p className="text-[10px] text-muted-foreground mt-1.5">Mayor compromiso anual declarado: {fMoney(compromisoMax)}</p>
										)}
									</div>
									{(certsTotal > 0 || compromisoMax > 0) && (
										<div className="text-right">
											<p className="text-xs text-muted-foreground mb-1">Nivel actual</p>
											<TierBadge tier={getDistributorTier(certsTotal, compromisoMax, distributorTiers)} tiers={distributorTiers} size="lg" />
											<p className="text-[10px] text-muted-foreground mt-1">Gana el mayor de las dos variables</p>
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
										{isUnit(selected.channel) && <TableHead className="text-right">{isVolumenLike(selected.channel) ? "Certs" : "IDC"}</TableHead>}
										{isPacks(selected.channel) && <TableHead className="text-right">Certs</TableHead>}
										<TableHead className="text-right">Revenue</TableHead>
										<TableHead></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{clientDeals.map(function (d) {
										const rev = dealRevenue(d);
										return (
											<TableRow key={d.id}>
												<TableCell className="text-sm tabular-nums">{fDate(d.fecha)}</TableCell>
												<TableCell><ChannelBadge channel={d.channel} size="sm" /></TableCell>
												<TableCell className="text-sm text-muted-foreground">
													{isPacks(d.channel)
														? (d.resumen?.tier ? <TierBadge tier={d.resumen.tier} tiers={distributorTiers} size="sm" /> : "a lista")
														: (d.resumen?.segmento ? <TierBadge tier={d.resumen.segmento} size="sm" /> : "—")}
												</TableCell>
												<TableCell>
													<Select value={dealStatus(d)} onValueChange={function (v) { dealsApi.updateStatus(d.id, v); }}>
														<SelectTrigger className={cn("h-7 w-[148px] text-xs border font-semibold", DEAL_STATUS_META[dealStatus(d)].className)}>
															{(function () {
																const Icon = DEAL_STATUS_META[dealStatus(d)].Icon;
																return Icon ? <Icon className="size-3.5 shrink-0" /> : null;
															})()}
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															{DEAL_STATUSES.map(function (s) { return <SelectItem key={s} value={s}>{DEAL_STATUS_META[s].label}</SelectItem>; })}
														</SelectContent>
													</Select>
												</TableCell>
												{isUnit(selected.channel) && <TableCell className="text-right tabular-nums text-sm">{(d.resumen?.idcMensuales || 0).toLocaleString("es-AR")}</TableCell>}
												{isPacks(selected.channel) && <TableCell className="text-right tabular-nums text-sm">{(d.resumen?.certsComprados || d.resumen?.certsActivos || 0).toLocaleString("es-AR")}</TableCell>}
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
					<StatCard label="Revenue" sub="acumulado" value={fMoney(globalStats.totalRevenue)} accent="primary" />
				)}
				{globalStats.confirmedRevenue > 0 && (
					<StatCard label="Facturado" sub="confirmado" value={fMoney(globalStats.confirmedRevenue)} accent="success" valueClass="text-[var(--success)]" />
				)}
				{["web", "distribuidores", "b2b2c", "volumen"].map(function (ch) {
					if (!globalStats.byChannel[ch]) return null;
					return <StatCard key={ch} label={channelEmoji(ch) + " " + channelShort(ch)} value={globalStats.byChannel[ch]} accent="muted" />;
				})}
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
					{["all", "web", "distribuidores", "b2b2c", "volumen"].map(function (ch) {
						return (
							<button
								key={ch}
								onClick={function () { setChannelFilter(ch); }}
								className={"px-2.5 py-1 rounded-md transition-colors " + (channelFilter === ch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
							>
								{ch === "all" ? "Todos" : channelShort(ch)}
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
								<TableCell colSpan={6} className="p-0">
									{search || channelFilter !== "all" ? (
										<EmptyState tone="filter" glyph="🔍" title="Ningún cliente coincide" description="Probá con otro nombre o quitá el filtro de canal." />
									) : (
										<EmptyState glyph="🤝" title="Todavía no hay clientes" description="Se crean solos cuando guardás una cotización a nombre de un cliente nuevo, o desde el selector de cliente en cualquier cotizador." />
									)}
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
										<ChannelBadge channel={c.channel} size="sm" />
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
