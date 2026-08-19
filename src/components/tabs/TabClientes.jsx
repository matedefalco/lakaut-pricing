import { useState, useMemo } from "react";
import { Pencil, Trash2, Check, X, ExternalLink, ArrowLeft, ChevronRight, ChevronDown, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toaster";

// Fila de un error de importación: motivo claro arriba y, plegado, el motivo
// técnico crudo (el que devuelve Postgres/Supabase) por si hace falta debug.
function ImportErrorRow({ err }) {
	const [showTech, setShowTech] = useState(false);
	return (
		<li className="rounded-md border border-border/70 bg-background px-2.5 py-2">
			<div className="flex items-baseline gap-2">
				<span className="text-xs font-semibold text-foreground">{err.empresa || "(sin nombre)"}</span>
				{err.empresa_id && <span className="text-[10px] tabular-nums text-muted-foreground opacity-70">{err.empresa_id}</span>}
			</div>
			<div className="mt-0.5 text-xs text-muted-foreground">{err.motivo || "No se pudo guardar el registro"}</div>
			{err.motivo_tecnico && (
				<div className="mt-1">
					<button
						onClick={function () { setShowTech(function (v) { return !v; }); }}
						className="text-[10px] font-medium text-muted-foreground/80 hover:text-foreground transition-colors"
					>
						{showTech ? "Ocultar técnico" : "Detalle técnico"}
					</button>
					{showTech && (
						<pre className="mt-1 whitespace-pre-wrap break-words rounded bg-muted/60 p-1.5 text-[10px] leading-snug text-muted-foreground">{err.motivo_tecnico}</pre>
					)}
				</div>
			)}
		</li>
	);
}

function ImportErrorList({ errores }) {
	if (!errores || !errores.length) return null;
	return (
		<ul className="space-y-1.5">
			{errores.map(function (e, i) { return <ImportErrorRow key={i} err={e} />; })}
		</ul>
	);
}

// Próximo empresa_id libre a partir de los ya importados. Reusa el prefijo del
// mayor (ej. "LK-E-2026-") y sigue el correlativo. Se usa para sugerir el id que
// hay que ponerle en el Sheet a un cliente viejo sin sincronizar.
function nextEmpresaSeq(clients) {
	let prefix = "LK-E-2026-";
	let width = 4;
	let max = 0;
	clients.forEach(function (c) {
		const m = /^(.*?)(\d+)$/.exec(c.empresa_id || "");
		if (m) {
			prefix = m[1];
			width = m[2].length;
			const n = parseInt(m[2], 10);
			if (n > max) max = n;
		}
	});
	return function (offset) { return prefix + String(max + 1 + offset).padStart(width, "0"); };
}
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
	const { toast } = useToast();

	// Importa el master de empresas desde el Sheet "DB Empresas" (Sales Pipeline).
	// Ver useClients.importFromSheet y docs/sync-pipeline-sheet.md.
	async function importSheet() {
		if (!clientsApi?.importFromSheet) return;
		const res = await clientsApi.importFromSheet();
		if (res && res.error) {
			toast({ variant: "error", title: "No se pudo importar", description: res.error, duration: 9000 });
			return;
		}
		const nuevos = res.insertados || 0;
		const act = (res.actualizados || 0) + (res.adoptados || 0);
		const errores = res.errores || [];
		// Reaparece el panel (si estaba oculto) y abre el detalle cuando hubo errores.
		setImportPanelDismissed(false);
		setImportPanelOpen(errores.length > 0);
		const parts = [];
		if (nuevos) parts.push(nuevos + " nuevo" + (nuevos !== 1 ? "s" : ""));
		if (act) parts.push(act + " actualizado" + (act !== 1 ? "s" : ""));
		toast({
			variant: errores.length ? "info" : "success",
			emoji: "📇",
			title: "Sheet importado",
			description: (parts.length ? parts.join(" · ") : "Sin cambios") +
				(errores.length ? " · " + errores.length + " con error" : ""),
			duration: 7000,
			expandable: errores.length
				? { label: "Ver detalle (" + errores.length + ")", node: <ImportErrorList errores={errores} /> }
				: null,
		});
	}

	const [search, setSearch] = useState("");
	const [channelFilter, setChannelFilter] = useState("all");
	const [selectedId, setSelectedId] = useState(null);
	const [editingName, setEditingName] = useState(false);
	const [nameInput, setNameInput] = useState("");
	// Panel "Última importación": abierto = lista de errores desplegada;
	// dismissed = ocultado por el usuario en esta sesión.
	const [importPanelOpen, setImportPanelOpen] = useState(false);
	const [importPanelDismissed, setImportPanelDismissed] = useState(false);
	const [unsyncedOpen, setUnsyncedOpen] = useState(false);

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

	// Clientes viejos sin vincular al Sheet (sin empresa_id). Los que tienen
	// cotizaciones van primero: son los que conviene cargar en el Sheet para que la
	// próxima importación los adopte conservando su historial.
	const unsynced = useMemo(function () {
		const dealCountOf = function (id) { return deals.filter(function (d) { return d.client_id === id; }).length; };
		const nextId = nextEmpresaSeq(clients);
		return clients
			.filter(function (c) { return !c.empresa_id; })
			.map(function (c) { return { client: c, deals: dealCountOf(c.id) }; })
			.sort(function (a, b) {
				if (b.deals !== a.deals) return b.deals - a.deals;
				return a.client.name.localeCompare(b.client.name);
			})
			.map(function (row, i) { return Object.assign({ empresaIdSugerido: nextId(i) }, row); });
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
						<div className="flex flex-wrap items-center gap-2 pl-11">
							<ChannelBadge channel={selected.channel} />
							{selected.tipo && <span className="rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{selected.tipo}</span>}
							{selected.etapa && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{selected.etapa}</span>}
							{selected.industria && <span className="text-xs text-muted-foreground">{selected.industria}</span>}
							<span className="text-xs text-muted-foreground">Desde {fDate(selected.created_at)}</span>
						</div>
						{(selected.razon_social || selected.cuit || selected.empresa_id) && (
							<div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-11 text-xs text-muted-foreground">
								{selected.razon_social && <span>Razón social: <span className="text-foreground">{selected.razon_social}</span></span>}
								{selected.cuit && <span>CUIT: <span className="text-foreground tabular-nums">{selected.cuit}</span></span>}
								{selected.empresa_id && <span className="tabular-nums opacity-70">{selected.empresa_id}</span>}
							</div>
						)}
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
				actions={clientsApi?.importFromSheet && (
					<Button variant="outline" size="sm" onClick={importSheet} disabled={clientsApi.importing}>
						<RefreshCw className={"size-4" + (clientsApi.importing ? " animate-spin" : "")} />
						{clientsApi.importing ? "Importando…" : "Importar del Sheet"}
					</Button>
				)}
			/>

			{/* Panel de la última importación del Sheet. Persiste entre recargas (se
			    guarda en app_config) y muestra el detalle de las empresas que fallaron. */}
			{clientsApi?.lastImport && !importPanelDismissed && (function () {
				const li = clientsApi.lastImport;
				const errores = li.errores || [];
				const hasErr = errores.length > 0;
				const nuevos = li.insertados || 0;
				const act = (li.actualizados || 0) + (li.adoptados || 0);
				const chips = [];
				if (nuevos) chips.push(nuevos + " nuevo" + (nuevos !== 1 ? "s" : ""));
				if (act) chips.push(act + " actualizado" + (act !== 1 ? "s" : ""));
				if (li.omitidos) chips.push(li.omitidos + " omitido" + (li.omitidos !== 1 ? "s" : ""));
				return (
					<div className={cn(
						"rounded-lg border px-3.5 py-3",
						hasErr ? "border-warning/40 bg-warning/5" : "border-success/40 bg-success/5"
					)}>
						<div className="flex items-start gap-2.5">
							{hasErr
								? <AlertTriangle className="size-4 shrink-0 text-warning mt-0.5" />
								: <CheckCircle2 className="size-4 shrink-0 text-success mt-0.5" />}
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
									<span className="text-sm font-semibold text-foreground">Última importación</span>
									<span className="text-xs text-muted-foreground">{fDate(li.at)}</span>
								</div>
								<p className="mt-0.5 text-xs text-muted-foreground">
									{chips.length ? chips.join(" · ") : "Sin cambios"}
									{hasErr && <span className="text-warning font-medium"> · {errores.length} con error</span>}
								</p>
								{hasErr && (
									<div className="mt-2">
										<button
											onClick={function () { setImportPanelOpen(function (v) { return !v; }); }}
											className="flex items-center gap-1 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
										>
											<ChevronDown className={cn("size-3.5 transition-transform", importPanelOpen && "rotate-180")} />
											{importPanelOpen ? "Ocultar detalle" : "Ver qué empresas fallaron"}
										</button>
										{importPanelOpen && (
											<div className="mt-2 max-h-72 overflow-y-auto pr-1">
												<ImportErrorList errores={errores} />
											</div>
										)}
									</div>
								)}
							</div>
							<button
								onClick={function () { setImportPanelDismissed(true); }}
								className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
								title="Ocultar"
							>
								<X className="size-4" />
							</button>
						</div>
					</div>
				);
			})()}

			{/* Clientes viejos sin vincular al Sheet. Para "los agrego al Sheet": se
			    listan con un empresa_id sugerido para copiar en el Sheet; en la próxima
			    importación se adoptan (conservando sus cotizaciones). */}
			{unsynced.length > 0 && (
				<div className="rounded-lg border border-border bg-muted/20 px-3.5 py-3">
					<button
						onClick={function () { setUnsyncedOpen(function (v) { return !v; }); }}
						className="flex w-full items-center gap-2 text-left"
					>
						<ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", unsyncedOpen && "rotate-180")} />
						<span className="text-sm font-semibold text-foreground">Sin sincronizar con el Sheet</span>
						<span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{unsynced.length}</span>
						<span className="ml-auto text-[11px] text-muted-foreground">clientes que no vienen del Sheet</span>
					</button>
					{unsyncedOpen && (
						<div className="mt-3 space-y-2">
							<p className="text-xs text-muted-foreground">
								Para vincularlos, cargá cada uno en el Sheet con el <span className="font-medium text-foreground">empresa_id sugerido</span> y volvé a tocar “Importar del Sheet”. Los que tienen cotizaciones se adoptan conservando su historial.
							</p>
							<div className="overflow-hidden rounded-md border border-border">
								<Table>
									<TableHeader>
										<TableRow className="bg-muted/30">
											<TableHead>Cliente</TableHead>
											<TableHead className="text-right">Cotizaciones</TableHead>
											<TableHead>Canal actual</TableHead>
											<TableHead>empresa_id sugerido</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{unsynced.map(function (row) {
											return (
												<TableRow key={row.client.id}>
													<TableCell className="text-sm font-medium">{row.client.name}</TableCell>
													<TableCell className="text-right tabular-nums text-sm text-muted-foreground">{row.deals || "—"}</TableCell>
													<TableCell><ChannelBadge channel={row.client.channel} size="sm" /></TableCell>
													<TableCell className="tabular-nums text-sm text-foreground">{row.empresaIdSugerido}</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</div>
						</div>
					)}
				</div>
			)}

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
										<EmptyState glyph="🤝" title="Todavía no hay clientes" description="El master de clientes se llena desde el Sheet de pipeline. Cargá empresas en el Sheet y tocá 'Importar del Sheet' arriba." />
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
