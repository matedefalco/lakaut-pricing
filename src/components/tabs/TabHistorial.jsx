import { useMemo, useState, useEffect } from "react";
import { Pencil, Trash2, Download, FileText, ChevronDown, X, CopyPlus } from "lucide-react";
import { formatCotId } from "@/lib/cotId";
import { exportProposal } from "@/utils/exportProposal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { makeMoney } from "@/utils/useMoney";
import { cn } from "@/lib/utils";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { useModels } from "@/context/ModelsContext";
import { DEAL_STATUSES, DEAL_STATUS_META, dealStatus } from "@/lib/dealStatus";
import { channelShort, resolveChannel, isPacks, packsConDescuento } from "@/data/channelMeta";
import { PageHeader } from "@/components/ui/PageHeader";
import { TierBadge } from "@/components/ui/TierBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChannelBadge } from "@/components/ui/ChannelBadge";

// Las cotizaciones se agrupan por canal vigente: los ex canales web y
// distribuidores caen los dos en Packs (ver resolveChannel).
const CHANNELS = {
	packs: { label: channelShort("packs") },
	b2b2c: { label: channelShort("b2b2c") },
};

const FILTER_DEFS = [
	{ key: "canal", label: "Canal" },
	{ key: "estado", label: "Estado" },
	{ key: "mes", label: "Mes" },
	{ key: "cliente", label: "Cliente" },
	{ key: "certs", label: "Certs activos" },
	{ key: "idc", label: "IDC" },
];

function summaryCols(channel, fMoney) {
	if (channel === "packs") {
		return [
			// Con descuento muestra el nivel; a lista, que no lleva ninguno.
			{ label: "Descuento", get: function (q) { return packsConDescuento(q) ? (q.resumen.tier ? <TierBadge tier={q.resumen.tier} size="sm" /> : "—") : <span className="text-muted-foreground">a lista</span>; } },
			{ label: "Certs", get: function (q) { return (q.resumen.certsComprados || q.resumen.certsActivos || 0).toLocaleString("es-AR"); } },
			{ label: "Firmas", get: function (q) { return (q.resumen.firmasTotal || 0).toLocaleString("es-AR"); } },
			{ label: "Precio de lista", get: function (q) { return fMoney(q.resumen.facturacionLista || 0); } },
			{ label: "Neto", get: function (q) { return fMoney(q.resumen.netoLakaut != null ? q.resumen.netoLakaut : (q.resumen.facturacionLista || 0)); } },
			{ label: "Margen", get: function (q) { return Math.round((q.resumen.margenPct || 0) * 100) + "%"; } },
		];
	}
	return [
		{ label: "Segmento", get: function (q) { return q.resumen.segmento ? <TierBadge tier={q.resumen.segmento} size="sm" /> : "—"; } },
		{ label: "IDC", get: function (q) { return (q.resumen.idcMensuales || 0).toLocaleString("es-AR"); } },
		{ label: "Firmas/mes", get: function (q) { return (q.resumen.firmasMes || 0).toLocaleString("es-AR"); } },
		{ label: "Rev/mes", get: function (q) { return fMoney(q.resumen.revMesTotal || 0); } },
		{ label: "Rev año 1", get: function (q) { return fMoney(q.resumen.revAnual || 0); } },
		{ label: "Margen", get: function (q) { return Math.round((q.resumen.margenPct || 0) * 100) + "%"; } },
	];
}

export function TabHistorial({ dealsApi, currency, tc, tcMeta, onEditQuote, clientsApi, highlightId }) {
	const { channelConfig } = useChannelConfig();
	const { models } = useModels();
	const { fMoney } = makeMoney(currency, tc);

	// Al llegar desde el toast de "cotización guardada": scroll a esa fila y flash
	// de resaltado por unos segundos.
	const [flashId, setFlashId] = useState(null);
	useEffect(function () {
		if (!highlightId) return;
		setFlashId(highlightId);
		const raf = requestAnimationFrame(function () {
			const el = document.querySelector('[data-deal-id="' + highlightId + '"]');
			if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
		});
		const timer = setTimeout(function () { setFlashId(null); }, 2800);
		return function () { cancelAnimationFrame(raf); clearTimeout(timer); };
	}, [highlightId]);

	const [openFilter, setOpenFilter] = useState(null);
	const [selectedChannels, setSelectedChannels] = useState(new Set());
	const [selectedStatuses, setSelectedStatuses] = useState(new Set());
	const [month, setMonth] = useState("all");
	const [search, setSearch] = useState("");
	const [certsMin, setCertsMin] = useState("");
	const [certsMax, setCertsMax] = useState("");
	const [idcMin, setIdcMin] = useState("");
	const [idcMax, setIdcMax] = useState("");

	// clientName viene del join hecho al cargar los deals; puede quedar desactualizado
	// si el cliente se renombró después. Se resuelve contra clientsApi.clients (siempre vivo).
	const clientsById = useMemo(function () {
		const map = {};
		(clientsApi?.clients || []).forEach(function (c) { map[c.id] = c; });
		return map;
	}, [clientsApi?.clients]);

	const quotes = useMemo(function () {
		return (dealsApi?.deals || []).map(function (q) {
			const live = q.client_id && clientsById[q.client_id];
			return live ? Object.assign({}, q, { clientName: live.name }) : q;
		});
	}, [dealsApi?.deals, clientsById]);

	const months = useMemo(function () {
		const set = new Set(quotes.map(function (q) { return q.fecha.slice(0, 7); }));
		return Array.from(set).sort().reverse();
	}, [quotes]);

	function toggleChannel(key) {
		setSelectedChannels(function (prev) {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key); else next.add(key);
			return next;
		});
	}

	function toggleStatus(key) {
		setSelectedStatuses(function (prev) {
			const next = new Set(prev);
			if (next.has(key)) next.delete(key); else next.add(key);
			return next;
		});
	}

	function isActive(key) {
		if (key === "canal") return selectedChannels.size > 0;
		if (key === "estado") return selectedStatuses.size > 0;
		if (key === "mes") return month !== "all";
		if (key === "cliente") return search !== "";
		if (key === "certs") return certsMin !== "" || certsMax !== "";
		if (key === "idc") return idcMin !== "" || idcMax !== "";
		return false;
	}

	function getSummary(key) {
		if (key === "canal" && selectedChannels.size > 0)
			return Array.from(selectedChannels).map(function (k) { return CHANNELS[k] ? CHANNELS[k].label : k; }).join(", ");
		if (key === "estado" && selectedStatuses.size > 0)
			return Array.from(selectedStatuses).map(function (k) { return DEAL_STATUS_META[k] ? DEAL_STATUS_META[k].label : k; }).join(", ");
		if (key === "mes" && month !== "all") return month;
		if (key === "cliente" && search) return '"' + search + '"';
		if (key === "certs") {
			if (certsMin && certsMax) return certsMin + "–" + certsMax;
			if (certsMin) return "≥ " + certsMin;
			if (certsMax) return "≤ " + certsMax;
		}
		if (key === "idc") {
			if (idcMin && idcMax) return idcMin + "–" + idcMax;
			if (idcMin) return "≥ " + idcMin;
			if (idcMax) return "≤ " + idcMax;
		}
		return null;
	}

	function clearFilter(key) {
		if (key === "canal") setSelectedChannels(new Set());
		if (key === "estado") setSelectedStatuses(new Set());
		if (key === "mes") setMonth("all");
		if (key === "cliente") setSearch("");
		if (key === "certs") { setCertsMin(""); setCertsMax(""); }
		if (key === "idc") { setIdcMin(""); setIdcMax(""); }
		if (openFilter === key) setOpenFilter(null);
	}

	function clearAll() {
		setSelectedChannels(new Set());
		setSelectedStatuses(new Set());
		setMonth("all");
		setSearch("");
		setCertsMin(""); setCertsMax("");
		setIdcMin(""); setIdcMax("");
		setOpenFilter(null);
	}

	const hasActiveFilters = FILTER_DEFS.some(function (f) { return isActive(f.key); });

	const filtered = useMemo(function () {
		return quotes.filter(function (q) {
			if (selectedChannels.size > 0 && !selectedChannels.has(resolveChannel(q.channel))) return false;
			if (selectedStatuses.size > 0 && !selectedStatuses.has(dealStatus(q))) return false;
			if (month !== "all" && q.fecha.slice(0, 7) !== month) return false;
			if (search && !(q.clientName || "").toLowerCase().includes(search.toLowerCase())) return false;
			if (isPacks(q.channel)) {
				const certs = q.resumen.certsActivos || q.resumen.certsComprados || 0;
				if (certsMin !== "" && certs < Number(certsMin)) return false;
				if (certsMax !== "" && certs > Number(certsMax)) return false;
			}
			if (q.channel === "b2b2c") {
				const idc = q.resumen.idcMensuales || 0;
				if (idcMin !== "" && idc < Number(idcMin)) return false;
				if (idcMax !== "" && idc > Number(idcMax)) return false;
			}
			return true;
		});
	}, [quotes, selectedChannels, selectedStatuses, month, search, certsMin, certsMax, idcMin, idcMax]);

	const groups = useMemo(function () {
		const byCh = {};
		filtered.forEach(function (q) { const ch = resolveChannel(q.channel); (byCh[ch] = byCh[ch] || []).push(q); });
		return byCh;
	}, [filtered]);

	function exportCsv() {
		const lines = [];
		Object.keys(groups).forEach(function (ch) {
			const cols = summaryCols(ch, fMoney);
			lines.push((CHANNELS[ch] ? CHANNELS[ch].label : ch).toUpperCase());
			lines.push(["fecha", "cliente", "estado"].concat(cols.map(function (c) { return c.label; })).join(","));
			groups[ch].forEach(function (q) {
				lines.push([q.fecha.slice(0, 10), '"' + (q.clientName || "").replace(/"/g, '""') + '"', DEAL_STATUS_META[dealStatus(q)].label].concat(cols.map(function (c) { return '"' + String(c.get(q)).replace(/"/g, '""') + '"'; })).join(","));
			});
			lines.push("");
		});
		const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "cotizaciones" + (month === "all" ? "" : "-" + month) + ".csv";
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function del(q) {
		if (window.confirm("¿Borrar la cotización de " + (q.clientName || "(sin nombre)") + "?")) dealsApi.remove(q.id);
	}

	// Clona la cotización como versión nueva (mismo correlativo, v+1) y la abre para
	// editar. La anterior queda intacta como historial. Ver [[cotId]].
	async function newVersion(q) {
		const client = (q.client_id && clientsById[q.client_id]) || q.clients || null;
		const tipo = client?.tipo || (q.inputs?.cot?.tipo) || null;
		const nv = await dealsApi.newVersion(q, q.client_id || null, tipo);
		if (nv) onEditQuote(nv);
	}

	const orderedChannels = Object.keys(groups).sort();

	return (
		<div className="space-y-6">
			<PageHeader
				title="Cotizaciones"
				description="Todas las cotizaciones guardadas, sincronizadas para el equipo."
				actions={
					<Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
						<Download /> Exportar CSV
					</Button>
				}
			/>

			{/* Panel de filtros estilo Notion */}
			<Card className="bg-card border-border">
				<CardContent className="space-y-3 pt-4">
					{/* Fila de pills */}
					<div className="flex flex-wrap items-center gap-2">
						{FILTER_DEFS.map(function (f) {
							const active = isActive(f.key);
							const open = openFilter === f.key;
							const summary = getSummary(f.key);
							return (
								<div key={f.key} className="relative inline-flex">
									<button
										type="button"
										onClick={function () { setOpenFilter(open ? null : f.key); }}
										className={cn(
											"inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer select-none",
											active
												? "bg-primary/10 border-primary/40 text-primary"
												: open
												? "bg-muted border-border text-foreground"
												: "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
										)}
									>
										<span>{f.label}</span>
										{summary && <span className="font-normal opacity-70">: {summary}</span>}
										<ChevronDown className={cn("size-3 transition-transform opacity-50", open && "rotate-180")} />
									</button>
									{active && (
										<button
											type="button"
											onClick={function (e) { e.stopPropagation(); clearFilter(f.key); }}
											title="Quitar filtro"
											className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/80"
										>
											<X className="size-2.5" />
										</button>
									)}
								</div>
							);
						})}
						{hasActiveFilters && (
							<button
								type="button"
								onClick={clearAll}
								className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer ml-1"
							>
								Limpiar todo
							</button>
						)}
					</div>

					{/* Panel inline del filtro abierto */}
					{openFilter && (
						<>
							<Separator />
							<div className="pt-1 pb-0.5">
								{openFilter === "canal" && (
									<div className="space-y-1.5">
										<span className="text-[11px] text-muted-foreground uppercase tracking-wide">Seleccionar canales</span>
										<div className="flex gap-2">
											{Object.entries(CHANNELS).map(function (entry) {
												const key = entry[0], meta = entry[1];
												const checked = selectedChannels.has(key);
												return (
													<button
														key={key}
														type="button"
														onClick={function () { toggleChannel(key); }}
														className={cn(
															"inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
															checked
																? "bg-primary text-primary-foreground border-primary"
																: "bg-background border-border text-muted-foreground hover:text-foreground"
														)}
													>
														{checked && <svg className="size-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
														{meta.label}
													</button>
												);
											})}
										</div>
									</div>
								)}
								{openFilter === "estado" && (
									<div className="space-y-1.5">
										<span className="text-[11px] text-muted-foreground uppercase tracking-wide">Seleccionar estado</span>
										<div className="flex gap-2">
											{DEAL_STATUSES.map(function (key) {
												const meta = DEAL_STATUS_META[key];
												const checked = selectedStatuses.has(key);
												return (
													<button
														key={key}
														type="button"
														onClick={function () { toggleStatus(key); }}
														className={cn(
															"inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
															checked
																? "bg-primary text-primary-foreground border-primary"
																: "bg-background border-border text-muted-foreground hover:text-foreground"
														)}
													>
														{checked && <svg className="size-3" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
														{meta.label}
													</button>
												);
											})}
										</div>
									</div>
								)}
								{openFilter === "mes" && (
									<div className="space-y-1.5">
										<span className="text-[11px] text-muted-foreground uppercase tracking-wide">Seleccionar mes</span>
										<Select value={month} onValueChange={function (v) { setMonth(v); }}>
											<SelectTrigger className="w-48 bg-background h-8"><SelectValue /></SelectTrigger>
											<SelectContent>
												<SelectItem value="all">Todos los meses</SelectItem>
												{months.map(function (m) { return <SelectItem key={m} value={m}>{m}</SelectItem>; })}
											</SelectContent>
										</Select>
									</div>
								)}
								{openFilter === "cliente" && (
									<div className="space-y-1.5">
										<span className="text-[11px] text-muted-foreground uppercase tracking-wide">Buscar por nombre</span>
										<Input className="max-w-xs h-8 bg-background text-sm" placeholder="Nombre del cliente…" value={search} onChange={function (e) { setSearch(e.target.value); }} autoFocus />
									</div>
								)}
								{openFilter === "certs" && (
									<div className="space-y-1.5">
										<span className="text-[11px] text-muted-foreground uppercase tracking-wide">Certs cotizados (canal Packs)</span>
										<div className="flex items-center gap-2">
											<Input className="w-28 h-8 bg-background text-sm" type="number" placeholder="Mín" value={certsMin} onChange={function (e) { setCertsMin(e.target.value); }} />
											<span className="text-muted-foreground text-sm">—</span>
											<Input className="w-28 h-8 bg-background text-sm" type="number" placeholder="Máx" value={certsMax} onChange={function (e) { setCertsMax(e.target.value); }} />
										</div>
									</div>
								)}
								{openFilter === "idc" && (
									<div className="space-y-1.5">
										<span className="text-[11px] text-muted-foreground uppercase tracking-wide">Volumen de IDC (canal Volumen)</span>
										<div className="flex items-center gap-2">
											<Input className="w-28 h-8 bg-background text-sm" type="number" placeholder="Mín" value={idcMin} onChange={function (e) { setIdcMin(e.target.value); }} />
											<span className="text-muted-foreground text-sm">—</span>
											<Input className="w-28 h-8 bg-background text-sm" type="number" placeholder="Máx" value={idcMax} onChange={function (e) { setIdcMax(e.target.value); }} />
										</div>
									</div>
								)}
							</div>
						</>
					)}

					<Separator />
					<div className="flex items-center justify-between">
						<Badge variant="outline" className="h-6 px-2 text-xs">{filtered.length} {filtered.length === 1 ? "cotización" : "cotizaciones"}</Badge>
					</div>
				</CardContent>
			</Card>

			{dealsApi?.loading ? (
				<p className="text-sm text-muted-foreground">Cargando historial…</p>
			) : filtered.length === 0 ? (
				<Card><CardContent className="p-0">
					{quotes.length === 0 ? (
						<EmptyState
							glyph="🗂️"
							title="Todavía no hay cotizaciones guardadas"
							description="Cuando guardes una cotización en Packs o Volumen, va a aparecer acá para seguirla con el equipo."
						/>
					) : (
						<EmptyState
							tone="filter"
							glyph="🔍"
							title="Ninguna coincide con el filtro"
							description="Probá aflojar los filtros de canal, estado, mes o volumen para ver más resultados."
						/>
					)}
				</CardContent></Card>
			) : (
				orderedChannels.map(function (ch) {
					const cols = summaryCols(ch, fMoney);
					return (
						<Card key={ch}>
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-base">
									<ChannelBadge channel={ch} />
									<span className="text-sm font-normal text-muted-foreground">{groups[ch].length} {groups[ch].length === 1 ? "cotización" : "cotizaciones"}</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Fecha</TableHead>
											<TableHead>Cliente</TableHead>
											<TableHead>Cotización</TableHead>
											<TableHead>Estado</TableHead>
											{cols.map(function (c) { return <TableHead key={c.label} className="text-right">{c.label}</TableHead>; })}
											<TableHead className="text-right">Acciones</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{groups[ch].map(function (q) {
											return (
												<TableRow key={q.id} data-deal-id={q.id} className={cn("transition-colors", flashId === q.id && "bg-success/15 ring-2 ring-[var(--success)]/60")}>
													<TableCell className="text-muted-foreground">{q.fecha.slice(0, 10)}{q.updatedAt && <span className="block text-[10px]">editada</span>}</TableCell>
													<TableCell className="font-medium">
														{q.clientName || "(sin nombre)"}
														{q.channel === "b2b2c" && (
															<Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 font-normal text-muted-foreground">
																{q.inputs?.integracion === "sin_api" ? "sin API" : "API"}
															</Badge>
														)}
													</TableCell>
													<TableCell className="tabular-nums text-xs text-muted-foreground whitespace-nowrap">
														{formatCotId(q.inputs?.cot, ((q.client_id && clientsById[q.client_id]) || {}).tipo) || "—"}
													</TableCell>
													<TableCell>
														<Select value={dealStatus(q)} onValueChange={function (v) { dealsApi.updateStatus(q.id, v); }}>
															<SelectTrigger className={cn("h-7 w-[148px] text-xs border font-semibold", DEAL_STATUS_META[dealStatus(q)].className)}>
																{(function () {
																	const Icon = DEAL_STATUS_META[dealStatus(q)].Icon;
																	return Icon ? <Icon className="size-3.5 shrink-0" /> : null;
																})()}
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{DEAL_STATUSES.map(function (s) { return <SelectItem key={s} value={s}>{DEAL_STATUS_META[s].label}</SelectItem>; })}
															</SelectContent>
														</Select>
													</TableCell>
													{cols.map(function (c) { return <TableCell key={c.label} className="text-right tabular-nums">{c.get(q)}</TableCell>; })}
													<TableCell className="text-right">
														<Button variant="ghost" size="icon" className="size-8" onClick={function () { exportProposal(q, (q.client_id && clientsById[q.client_id]) || q.clients || null, "ARS", tc, channelConfig, models, tcMeta); }} title="Exportar propuesta PDF"><FileText className="size-4 text-muted-foreground" /></Button>
														<Button variant="ghost" size="icon" className="size-8" onClick={function () { onEditQuote(q); }} title="Editar"><Pencil className="size-4 text-primary" /></Button>
														<Button variant="ghost" size="icon" className="size-8" onClick={function () { newVersion(q); }} title="Nueva versión (clona subiendo la versión)"><CopyPlus className="size-4 text-muted-foreground" /></Button>
														<Button variant="ghost" size="icon" className="size-8" onClick={function () { del(q); }} title="Borrar"><Trash2 className="size-4 text-muted-foreground" /></Button>
													</TableCell>
												</TableRow>
											);
										})}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					);
				})
			)}
		</div>
	);
}
