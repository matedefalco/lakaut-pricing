import { useState, useMemo, useEffect, useRef } from "react";
import { Home, ScrollText, Users, ChartColumn, ArrowLeftRight, Tags, Blocks, Receipt, Boxes, BadgeDollarSign, SlidersHorizontal, LogOut, BookOpen, Plus, FileText, Clock3, Settings } from "lucide-react";
import { dealStatus, dealStatusMeta, dealsPorVencer, diasParaVencer } from "./lib/dealStatus";
import { useDolarTC, DOLAR_SOURCES } from "./lib/useDolarTC";
import { loadConfig, subscribeConfig } from "./lib/supabase";
import { FIXED_ITEMS, ASSET_ITEMS, CV_CERT_ITEMS, CV_FIRMA_ITEMS, CAPACIDAD_FIRMAS_ANUAL } from "./data/costs";
import { CHANNELS, resolveChannel, channelMeta } from "./data/channelMeta";
import { exportProposal } from "./utils/exportProposal";
import { ModelsProvider, useModels } from "./context/ModelsContext";
import { useDeals } from "./lib/useDeals";
import { useClients } from "./lib/useClients";
import { useAuth } from "./lib/useAuth";
import { DiscountProvider } from "./context/DiscountContext";
import { ChannelConfigProvider, useChannelConfig } from "./context/ChannelConfigContext";
import { ToastProvider } from "./components/ui/Toaster";
import { ConfirmProvider } from "./components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { TabConfig } from "./components/tabs/TabConfig";
import { TabCanalesConfig } from "./components/tabs/TabCanalesConfig";
import { TabGeneral } from "./components/tabs/TabGeneral";
import { TabGuardados } from "./components/tabs/TabGuardados";
import { TabComparacion } from "./components/tabs/TabComparacion";
import { TabCanalWeb } from "./components/tabs/TabCanalWeb";
import { TabCanalPacks } from "./components/tabs/TabCanalPacks";
import { TabCanalB2B2C } from "./components/tabs/TabCanalB2B2C";
import { TabHistorial } from "./components/tabs/TabHistorial";
import { TabClientes } from "./components/tabs/TabClientes";
import { TabInicio } from "./components/tabs/TabInicio";
import { TabReportes } from "./components/tabs/TabReportes";
import { TabDocumentacion } from "./components/tabs/TabDocumentacion";


// ── Estructura de navegación · agrupada por tarea del usuario ──────────────────
// Cotizar (lo que más se hace) primero, después seguimiento, análisis y config.
// Cada grupo tiene su acento y cada ítem su icono: la sidebar era el chrome más
// visible de la app y a la vez su elemento más anónimo (14 líneas de texto plano).
const NAV_GROUPS = [
	{
		groupKey: "cotizar", groupLabel: "COTIZAR", accent: "var(--primary)",
		items: [
			{ key: "web", label: CHANNELS.web.label, Icon: CHANNELS.web.Icon, color: CHANNELS.web.color },
			{ key: "distribuidores", label: CHANNELS.distribuidores.label, Icon: CHANNELS.distribuidores.Icon, color: CHANNELS.distribuidores.color },
			{ key: "b2b2c", label: CHANNELS.b2b2c.label, Icon: CHANNELS.b2b2c.Icon, color: CHANNELS.b2b2c.color },
			{ key: "volumen", label: CHANNELS.volumen.label, Icon: CHANNELS.volumen.Icon, color: CHANNELS.volumen.color },
		],
	},
	{
		groupKey: "seguimiento", groupLabel: "SEGUIMIENTO", accent: "#0d9488",
		items: [
			{ key: "historial", label: "Cotizaciones", Icon: ScrollText },
			{ key: "clientes", label: "Clientes", Icon: Users },
		],
	},
	{
		groupKey: "analisis", groupLabel: "ANÁLISIS", accent: "var(--accent-analysis)",
		items: [
			{ key: "reportes", label: "Reportes", Icon: ChartColumn },
			{ key: "comparación", label: "Comparación de canales", Icon: ArrowLeftRight },
			{ key: "web-precios", label: "Precios de lista", Icon: Tags },
			{ key: "web-simulador", label: "Simulador de portfolio", Icon: Blocks },
		],
	},
	{
		groupKey: "configuracion", groupLabel: "CONFIGURACIÓN", accent: "var(--accent-config)",
		items: [
			{ key: "cfg-costos", label: "Costos", Icon: Receipt },
			{ key: "cfg-modelos", label: "Modelos y packs", Icon: Boxes },
			{ key: "cfg-precios", label: "Precios por canal", Icon: BadgeDollarSign },
			{ key: "cfg-general", label: "General · tipo de cambio", Icon: SlidersHorizontal },
			{ key: "docs", label: "Documentación", Icon: BookOpen },
		],
	},
];

// Canales que se pueden cotizar desde "Nueva cotización".
const QUOTABLE = [
	{ key: "web", label: CHANNELS.web.label, desc: CHANNELS.web.desc },
	// Distribuidores cotiza siempre por Volumen (la modalidad packs se descartó).
	{ key: "distribuidores_vol", label: CHANNELS.distribuidores.label, desc: CHANNELS.distribuidores_vol.desc },
	{ key: "b2b2c", label: CHANNELS.b2b2c.label, desc: CHANNELS.b2b2c.desc },
	{ key: "volumen", label: CHANNELS.volumen.label, desc: CHANNELS.volumen.desc },
];

// ── Riel de navegación (escritorio) ───────────────────────────────────────────
// La sidebar mostraba 17 entradas siempre abiertas. El riel deja a la vista solo
// los destinos (Inicio + un botón por grupo) y cada grupo abre su panel al lado:
// lo que no estás usando no ocupa lugar ni atención. Configuración, que se toca
// poco, baja al pie del riel.
const GROUP_TITLE = { cotizar: "Cotizar", seguimiento: "Seguimiento", analisis: "Análisis", configuracion: "Configuración" };
const RAIL_ICON = { cotizar: FileText, seguimiento: Clock3, analisis: ChartColumn, configuracion: Settings };
// Bajada corta por canal para el panel Cotizar (la desc completa vive en Inicio).
const CHANNEL_SHORT = {
	web: "Packs a precio de lista",
	distribuidores: "Socios por nivel, por volumen",
	b2b2c: "Identidades con firmas incluidas",
	volumen: "Certificados y firmas sueltos",
};

// ── Sección visual de cada pantalla ───────────────────────────────────────────
// Alimenta el `data-section` del fondo (ver `.app-bg[data-section]` en index.css),
// para que cotizar, hacer seguimiento, analizar y configurar tengan temperatura
// propia. Los dos cotizadores tienen su sección para heredar el color del canal.
const SECTION_BY_ITEM = {
	inicio: "inicio",
	web: "web",
	distribuidores: "distribuidores",
	b2b2c: "b2b2c",
	volumen: "volumen",
	historial: "seguimiento",
	clientes: "seguimiento",
	reportes: "analisis",
	"comparación": "analisis",
	"web-precios": "analisis",
	"web-simulador": "analisis",
	"cfg-costos": "config",
	"cfg-modelos": "config",
	"cfg-precios": "config",
	"cfg-general": "config",
	docs: "config",
};


function NuevaCotizacionButton({ onPick }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useEffect(function () {
		function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
		function onKey(e) { if (e.key === "Escape") setOpen(false); }
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return function () {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, []);
	return (
		<div ref={ref} className="relative px-3.5 pt-3.5 pb-1.5">
			<button
				type="button"
				aria-expanded={open}
				aria-haspopup="true"
				onClick={function () { setOpen(function (o) { return !o; }); }}
				className="shadow-float flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border-none bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground outline-none transition-all duration-150 hover:-translate-y-px hover:brightness-110 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-0"
			>
				<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>
				Nueva cotización
			</button>
			{open && (
				<div className="glass-strong shadow-float absolute top-full right-3.5 left-3.5 z-[60] mt-1.5 overflow-hidden rounded-[18px] border border-[var(--glass-border)]">
					<div className="px-3.5 pt-3 pb-1.5 text-xs font-bold tracking-[0.5px] text-muted-foreground uppercase">¿Qué querés cotizar?</div>
					{QUOTABLE.map(function (q) {
						const meta = channelMeta(q.key);
						const Icon = meta.Icon;
						return (
							<button
								key={q.key}
								type="button"
								onClick={function () { setOpen(false); onPick(q.key); }}
								className="group flex w-full cursor-pointer gap-2.5 border-none bg-transparent px-3.5 py-2.5 text-left outline-none transition-colors hover:bg-white/60 focus-visible:bg-white/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset"
							>
								<span
									className="mt-px flex size-7 shrink-0 items-center justify-center rounded-[9px] border"
									style={{ background: meta.gradient, borderColor: meta.glow, color: meta.colorFg }}
								>
									{Icon && <Icon size={15} strokeWidth={2.2} />}
								</span>
								<span className="min-w-0">
									<span className="block text-sm font-bold text-foreground">{q.label}</span>
									<span className="mt-0.5 block text-xs leading-normal text-muted-foreground">{q.desc}</span>
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}


function LakautCalcInner() {
	const { models } = useModels();
	const { channelConfig, update: updateChannelConfig } = useChannelConfig();
	const dealsApi = useDeals();
	const clientsApi = useClients();

	// Las fuentes ahora se importan en index.css desde @fontsource (ver ahí el por
	// qué): la inyección por JS desde unpkg hacía que el primer render fuera con
	// system-ui.

	const [selectedModelId, setSelectedModelId] = useState(function () {
		return models.length > 0 ? models[0].id : null;
	});

	const [currency, setCurrency] = useState("USD");
	const { tc, setTc, source, setSource, loading: tcLoading, error: tcError, lastUpdated: tcLastUpdated, refresh: tcRefresh } = useDolarTC();
	const [costConfig, setCostConfig] = useState(function () {
		try {
			const saved = localStorage.getItem("lakaut_costConfig");
			if (saved) return JSON.parse(saved);
		} catch (e) {}
		return {
			fixedItems: FIXED_ITEMS,
			assetItems: ASSET_ITEMS,
			cvCertItems: CV_CERT_ITEMS,
			cvFirmaItems: CV_FIRMA_ITEMS,
			capacidadFirmasAnual: CAPACIDAD_FIRMAS_ANUAL,
		};
	});

	const { signOut } = useAuth();
	const [activeNavItem, setActiveNavItem] = useState("inicio");
	// Arranca abierto en escritorio y cerrado abajo de lg, donde es un drawer que
	// tapa el contenido. `lg` = 1024px, el mismo breakpoint que usa el layout.
	// En escritorio navega el riel; la sidebar completa queda como drawer abajo de lg.
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [pendingEdit, setPendingEdit] = useState(null);
	// Panel abierto al lado del riel: "nueva", o la clave de un grupo del nav.
	const [flyout, setFlyout] = useState(null);
	// Al ir a Cotizaciones desde el toast de guardado, resaltamos y hacemos scroll
	// a esa fila. Se limpia sola tras el flash (ver TabHistorial).
	const [historialHighlight, setHistorialHighlight] = useState(null);
	// Nonce por canal: al pedir "nueva cotización" se incrementa y fuerza el
	// remonte del componente (key) para arrancar con un lienzo en blanco.
	const [quoteNonce, setQuoteNonce] = useState({ web: 0, distribuidores: 0, distribuidores_vol: 0, b2b2c: 0, volumen: 0 });
	// Modalidad activa del canal Distribuidores: "volumen" (certificados y firmas
	// sueltos, la modalidad por defecto) o "packs" (lista con descuento). Los dos
	// modos conviven bajo la misma entrada del nav y son ids de canal distintos.
	const [distribMode, setDistribMode] = useState("volumen");

	function navTo(key) {
		setActiveNavItem(key);
		setFlyout(null);
		// En mobile el drawer tapa el contenido, así que elegir una sección lo cierra.
		if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
			setSidebarOpen(false);
		}
	}

	// Escape cierra el drawer, como cualquier capa que tapa la pantalla.
	useEffect(function () {
		function onKey(e) {
			if (e.key !== "Escape") return;
			setFlyout(null);
			if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) return;
			setSidebarOpen(false);
		}
		document.addEventListener("keydown", onKey);
		return function () { document.removeEventListener("keydown", onKey); };
	}, []);

	// Los dos modos de Distribuidores viven bajo la misma entrada del nav
	// ("distribuidores"). Este mapa traduce el id de canal a esa entrada.
	function navKeyForChannel(channel) {
		return channel === "distribuidores_vol" ? "distribuidores" : channel;
	}

	// Abre una cotización guardada en su cotizador. `resolveChannel` cubre los ids de
	// canal históricos (ver CHANNEL_ALIASES en channelMeta). En Distribuidores además
	// selecciona la modalidad (packs vs volumen) según el canal del deal.
	function editQuote(deal) {
		setPendingEdit(deal);
		const ch = resolveChannel(deal.channel);
		if (ch === "distribuidores_vol") setDistribMode("volumen");
		else if (ch === "distribuidores") setDistribMode("packs");
		navTo(navKeyForChannel(ch));
	}

	function newQuote(channel) {
		// Las cotizaciones nuevas de Distribuidores son siempre por Volumen: el id
		// "distribuidores" (packs) solo sobrevive para abrir deals viejos vía editQuote.
		if (channel === "distribuidores") channel = "distribuidores_vol";
		setPendingEdit(null);
		setQuoteNonce(function (prev) { return Object.assign({}, prev, { [channel]: (prev[channel] || 0) + 1 }); });
		if (channel === "distribuidores_vol") setDistribMode("volumen");
		navTo(navKeyForChannel(channel));
	}

	function goHistorial(dealId) {
		setHistorialHighlight(dealId || null);
		navTo("historial");
	}

	// Metadata del tipo de cambio para la nota de referencia en propuestas USD.
	const tcMeta = useMemo(function () {
		const srcMeta = DOLAR_SOURCES.find(function (s) { return s.k === source; });
		return { sourceLabel: srcMeta ? srcMeta.label : "Oficial", lastUpdated: tcLastUpdated };
	}, [source, tcLastUpdated]);

	function exportDeal(deal, client, overrideCurrency) {
		exportProposal(deal, client, overrideCurrency || currency, tc, channelConfig, models, tcMeta);
	}

	// Load costConfig from Supabase on mount; subscribe to remote changes
	useEffect(function () {
		loadConfig("costConfig").then(function (remote) {
			if (!remote) return;
			setCostConfig(remote);
			try { localStorage.setItem("lakaut_costConfig", JSON.stringify(remote)); } catch (e) {}
		});
		return subscribeConfig("costConfig", function (remote) {
			setCostConfig(remote);
			try { localStorage.setItem("lakaut_costConfig", JSON.stringify(remote)); } catch (e) {}
		});
	}, []);

	const costs = useMemo(function () {
		const rowTot = function (r) { return (r.qty || 1) * r.v * (r.frecuencia === "anual" ? 1 / 12 : 1); };
		const cfOps = costConfig.fixedItems.reduce(function (s, r) { return s + rowTot(r); }, 0);
		const cfAmort = costConfig.assetItems.reduce(function (s, r) { return s + r.amort; }, 0);
		const cfTotal = cfOps + cfAmort;
		const cfSegmento = costConfig.fixedItems.filter(function (r) { return r.cat === "RRHH"; }).reduce(function (s, r) { return s + rowTot(r); }, 0);
		const cfDirecto = costConfig.fixedItems.filter(function (r) { return r.tipo === "directo"; }).reduce(function (s, r) { return s + rowTot(r); }, 0)
			+ costConfig.assetItems.filter(function (r) { return r.tipo === "directo"; }).reduce(function (s, r) { return s + r.amort; }, 0);
		const cvCertBase = costConfig.cvCertItems.filter(function (r) { return r.tipo !== "indirecto"; }).reduce(function (s, r) { return s + r.v; }, 0);
		const cvFirmaBase = (costConfig.cvFirmaItems || []).filter(function (r) { return r.tipo !== "indirecto"; }).reduce(function (s, r) { return s + r.v; }, 0);
		const activosTotal = cfAmort;
		const capacidadFirmasAnual = costConfig.capacidadFirmasAnual || CAPACIDAD_FIRMAS_ANUAL;
		const capacidadNegocio = costConfig.capacidadNegocio || 4_000_000;
		return { cfTotal, cfSegmento, cfDirecto, cvCertBase, cvFirmaBase, activosTotal, capacidadFirmasAnual, capacidadNegocio };
	}, [costConfig]);


	// Item de navegación estilo pill: activo = pill blanca con sombra suave, icono
	// teñido con el acento del grupo (o el color del canal en los cotizadores).
	function NavPill({ label, itemKey, bold, Icon, accent }) {
		const isActive = activeNavItem === itemKey;
		const tint = accent || "var(--primary)";
		return (
			<button
				type="button"
				aria-current={isActive ? "page" : undefined}
				onClick={function () {
					// Entrar a Distribuidores desde el nav arranca en Volumen, aunque antes
					// se haya abierto un deal legacy de packs.
					if (itemKey === "distribuidores") setDistribMode("volumen");
					navTo(itemKey);
				}}
				className={cn(
					"mx-2 my-px flex w-[calc(100%-16px)] cursor-pointer items-center gap-2.5 rounded-[10px] border-none px-3 py-1.5 text-left text-sm leading-snug outline-none transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50",
					isActive ? "shadow-card bg-white/90 font-bold" : cn("bg-transparent text-foreground hover:bg-white/50", bold ? "font-semibold" : "font-normal")
				)}
				style={isActive ? { color: tint } : undefined}
			>
				{Icon && (
					<Icon
						size={15}
						strokeWidth={isActive ? 2.4 : 1.9}
						aria-hidden="true"
						className="shrink-0 transition-colors duration-150"
						style={{ color: isActive ? tint : "var(--muted-foreground)" }}
					/>
				)}
				<span className="min-w-0 truncate">{label}</span>
			</button>
		);
	}

	const section = SECTION_BY_ITEM[activeNavItem] || "inicio";

	// Grupo e ítem activos: marcan el botón del riel y arman la miga de pan.
	const activeGroup = NAV_GROUPS.find(function (g) { return g.items.some(function (i) { return i.key === activeNavItem; }); });
	const activeItem = activeGroup ? activeGroup.items.find(function (i) { return i.key === activeNavItem; }) : null;

	const allDeals = useMemo(function () { return (dealsApi && dealsApi.deals) || []; }, [dealsApi]);
	const porVencer = useMemo(function () { return dealsPorVencer(allDeals); }, [allDeals]);
	const recientes = useMemo(function () { return allDeals.slice(0, 3); }, [allDeals]);
	const clientsById = useMemo(function () {
		const m = {};
		((clientsApi && clientsApi.clients) || []).forEach(function (c) { m[c.id] = c; });
		return m;
	}, [clientsApi]);

	function dealClientName(d) {
		const c = (d.client_id && clientsById[d.client_id]) || d.clients || null;
		return (c && c.name) || d.clientName || "(sin nombre)";
	}

	function toggleFlyout(key) {
		setFlyout(function (f) { return f === key ? null : key; });
	}

	// Botón del riel: icono arriba, nombre abajo. Activo = pill blanca teñida.
	function railButton({ key, label, Icon, active, open, onClick, badge, badgeLabel }) {
		return (
			<button
				key={key}
				type="button"
				onClick={onClick}
				aria-expanded={open === undefined ? undefined : open}
				aria-current={active ? "page" : undefined}
				className={cn(
					"relative flex w-[76px] cursor-pointer flex-col items-center gap-1 rounded-xl border-none px-0 py-2 text-xs leading-tight outline-none transition-all duration-150 focus-visible:ring-[3px] focus-visible:ring-ring/50",
					active || open ? "shadow-card bg-white/90 font-bold text-primary" : "bg-transparent font-semibold text-muted-foreground hover:bg-white/60 hover:text-foreground"
				)}
			>
				<Icon size={21} strokeWidth={active || open ? 2.3 : 1.9} aria-hidden="true" />
				<span>{label}</span>
				{badge > 0 && (
					<span className="absolute top-1 right-3 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--warning)] px-1 text-xs font-bold text-white tabular-nums" aria-label={badgeLabel}>{badge}</span>
				)}
			</button>
		);
	}

	// Fila del panel lateral: icono en caja, nombre y bajada opcional.
	function flyoutLink({ key, itemKey, label, Icon, accent, desc, badge, onClick }) {
		const isActive = itemKey && activeNavItem === itemKey;
		const tint = accent || "var(--primary)";
		return (
			<button
				key={key}
				type="button"
				onClick={onClick || function () {
					if (itemKey === "distribuidores") setDistribMode("volumen");
					navTo(itemKey);
				}}
				aria-current={isActive ? "page" : undefined}
				className={cn(
					"flex w-full cursor-pointer items-center gap-3 rounded-xl border-none px-2.5 py-2 text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
					isActive ? "shadow-card bg-white/90" : "bg-transparent hover:bg-white/60"
				)}
			>
				{Icon && (
					<span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/80" style={{ color: tint }}>
						<Icon size={18} strokeWidth={2.1} aria-hidden="true" />
					</span>
				)}
				<span className="min-w-0 flex-1">
					<span className={cn("block truncate text-[15px] text-foreground", isActive ? "font-bold" : "font-semibold")}>{label}</span>
					{desc && <span className="block truncate text-xs text-muted-foreground">{desc}</span>}
				</span>
				{badge}
			</button>
		);
	}

	// Cotización en una fila del panel: punto del canal, cliente y estado/vencimiento.
	function dealLink({ deal, onClick, showVence }) {
		const meta = channelMeta(resolveChannel(deal.channel));
		const dias = diasParaVencer(deal);
		const sub = showVence
			? (dias === 0 ? "vence hoy" : "vence en " + dias + " día" + (dias === 1 ? "" : "s"))
			: (meta.label || "") + " · " + dealStatusMeta(dealStatus(deal)).label.toLowerCase();
		return (
			<button
				key={deal.id}
				type="button"
				onClick={onClick}
				className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-none bg-white/50 px-3 py-2.5 text-left outline-none transition-colors hover:bg-white/90 focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				<span className="size-2 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden="true" />
				<span className="min-w-0 flex-1">
					<span className="block truncate text-sm font-bold text-foreground">{dealClientName(deal)}</span>
					<span className={cn("block truncate text-xs", showVence ? "font-semibold text-[var(--warning)]" : "text-muted-foreground")}>{sub}</span>
				</span>
			</button>
		);
	}

	function flyoutContent(key) {
		if (key === "nueva") {
			return {
				title: "Nueva cotización",
				sub: "Elegí el canal y arrancás de cero.",
				body: (
					<div className="flex flex-col gap-1">
						{QUOTABLE.map(function (q) {
							const meta = channelMeta(q.key);
							return flyoutLink({ key: q.key, label: q.label, Icon: meta.Icon, accent: meta.color, desc: CHANNEL_SHORT[q.key === "distribuidores_vol" ? "distribuidores" : q.key], onClick: function () { setFlyout(null); newQuote(q.key); } });
						})}
					</div>
				),
			};
		}
		const group = NAV_GROUPS.find(function (g) { return g.groupKey === key; });
		if (!group) return null;
		const links = (
			<div className="flex flex-col gap-1">
				{group.items.map(function (item) {
					const badge = item.key === "historial" && porVencer.length > 0
						? <span className="shrink-0 rounded-full bg-[var(--warning)]/10 px-2 py-0.5 text-xs font-bold text-[var(--warning)]">{porVencer.length} por vencer</span>
						: null;
					return flyoutLink({ key: item.key, itemKey: item.key, label: item.label, Icon: item.Icon, accent: item.color || group.accent, desc: key === "cotizar" ? CHANNEL_SHORT[item.key] : null, badge: badge });
				})}
			</div>
		);
		let extra = null;
		if (key === "cotizar" && recientes.length > 0) {
			extra = (
				<div className="flex flex-col gap-1.5">
					<div className="px-1 text-xs font-bold tracking-[0.6px] text-muted-foreground uppercase">Seguí donde quedaste</div>
					{recientes.map(function (d) { return dealLink({ deal: d, onClick: function () { editQuote(d); } }); })}
				</div>
			);
		}
		if (key === "seguimiento" && porVencer.length > 0) {
			extra = (
				<div className="flex flex-col gap-1.5">
					<div className="px-1 text-xs font-bold tracking-[0.6px] text-muted-foreground uppercase">Por vencer</div>
					{porVencer.slice(0, 5).map(function (d) { return dealLink({ deal: d, showVence: true, onClick: function () { goHistorial(d.id); } }); })}
				</div>
			);
		}
		return {
			title: GROUP_TITLE[key],
			sub: key === "cotizar" ? "Seguí con el canal abierto o retomá una cotización." : null,
			body: <>{links}{extra}</>,
		};
	}
	const flyoutData = flyout ? flyoutContent(flyout) : null;

	return (
		<div className="app-bg flex min-h-svh font-sans" data-section={section}>

			{/* ── Riel (escritorio) ── */}
			<div className="no-print glass sticky top-0 z-40 hidden h-screen w-[88px] shrink-0 flex-col items-center gap-1 border-r border-[var(--glass-border)] py-4 lg:flex">
				<button
					type="button"
					onClick={function () { navTo("inicio"); }}
					aria-label="FID by Lakaut · Inicio"
					className="mb-3 cursor-pointer border-none bg-transparent font-display text-xl leading-none text-primary outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
				>FID</button>
				<button
					type="button"
					aria-label="Nueva cotización"
					aria-expanded={flyout === "nueva"}
					onClick={function () { toggleFlyout("nueva"); }}
					className="shadow-float mb-3 flex size-[52px] cursor-pointer items-center justify-center rounded-2xl border-none bg-primary text-primary-foreground outline-none transition-all duration-150 hover:-translate-y-px hover:brightness-110 focus-visible:ring-[3px] focus-visible:ring-ring/50 active:translate-y-0"
				>
					<Plus size={24} strokeWidth={2.4} aria-hidden="true" />
				</button>
				{railButton({ key: "inicio", label: "Inicio", Icon: Home, active: activeNavItem === "inicio" && !flyout, onClick: function () { navTo("inicio"); } })}
				{["cotizar", "seguimiento", "analisis"].map(function (key) {
					return railButton({
						key: key,
						label: GROUP_TITLE[key],
						Icon: RAIL_ICON[key],
						active: !!activeGroup && activeGroup.groupKey === key && !flyout,
						open: flyout === key,
						onClick: function () { toggleFlyout(key); },
						badge: key === "seguimiento" ? porVencer.length : 0,
						badgeLabel: porVencer.length + " cotizaciones por vencer",
					});
				})}
				<div className="flex-1" />
				{railButton({
					key: "configuracion",
					label: "Ajustes",
					Icon: Settings,
					active: !!activeGroup && activeGroup.groupKey === "configuracion" && !flyout,
					open: flyout === "configuracion",
					onClick: function () { toggleFlyout("configuracion"); },
				})}
				<button
					type="button"
					onClick={signOut}
					aria-label="Cerrar sesión"
					className="mt-1 flex size-11 cursor-pointer items-center justify-center rounded-xl border-none bg-transparent text-muted-foreground outline-none transition-colors hover:bg-white/60 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
				>
					<LogOut size={18} aria-hidden="true" />
				</button>
			</div>

			{/* Panel del riel: se abre al lado, sobre el contenido, y se cierra al elegir,
			    al tocar afuera o con Escape. */}
			{flyoutData && (
				<>
					<div className="no-print fixed inset-y-0 right-0 left-[88px] z-30 hidden bg-black/10 lg:block" onClick={function () { setFlyout(null); }} aria-hidden="true" />
					<div
						role="dialog"
						aria-label={flyoutData.title}
						className="no-print glass-strong shadow-float fixed inset-y-0 left-[88px] z-40 hidden w-[300px] flex-col gap-5 overflow-y-auto border-r border-[var(--glass-border)] px-3.5 py-6 lg:flex"
					>
						<div className="px-1">
							<div className="font-heading text-lg font-bold text-foreground">{flyoutData.title}</div>
							{flyoutData.sub && <p className="mt-0.5 text-sm text-muted-foreground">{flyoutData.sub}</p>}
						</div>
						{flyoutData.body}
					</div>
				</>
			)}

			{/* ── Sidebar (mobile) ──
			    Abajo de lg es un drawer sobre el contenido con backdrop: la columna fija
			    dejaba la app inusable en un celular, que es donde el vendedor la abre en
			    la calle. En escritorio navega el riel. */}
			{sidebarOpen && (
				<div
					className="no-print fixed inset-0 z-30 bg-black/30 lg:hidden"
					onClick={function () { setSidebarOpen(false); }}
					aria-hidden="true"
				/>
			)}
			<div
				id="sidebar-nav"
				className={cn(
					"no-print glass fixed inset-y-0 left-0 z-40 flex w-[264px] shrink-0 flex-col overflow-y-auto border-r border-[var(--glass-border)] transition-transform duration-200 lg:hidden",
					sidebarOpen ? "translate-x-0" : "-translate-x-full"
				)}
			>
					{/* Brand header. Firma con la misma marca que el PDF que recibe el
					    cliente ("FID by Lakaut"), en lugar del "Pricing Calculator" en gris
					    que era un subtítulo de utilidad y no un nombre. */}
					<button
						type="button"
						onClick={function () { navTo("inicio"); }}
						className="block shrink-0 cursor-pointer border-none bg-transparent px-4.5 pt-4.5 pb-2 text-left outline-none transition-opacity hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50"
					>
						<span className="flex items-baseline gap-1.5">
							<span className="font-display text-xl leading-none text-primary">FID</span>
							<span className="text-xs leading-none font-semibold text-muted-foreground">by Lakaut</span>
						</span>
						<span className="mt-1.5 block text-xs tracking-[0.3px] text-muted-foreground">Cotizador comercial</span>
					</button>

					{/* Nueva cotización — acción primaria */}
					<NuevaCotizacionButton onPick={newQuote} />

					{/* Nav groups. El label del grupo lleva una barrita con su acento, para
					    que la sidebar tenga estructura visible sin sumar ruido. */}
					<nav className="flex-1 overflow-y-auto pt-1.5 pb-4" aria-label="Navegación principal">
						<div className="pt-1.5">
							<NavPill label="Inicio" itemKey="inicio" bold Icon={Home} />
						</div>
						{NAV_GROUPS.map(function (group) {
							return (
								<div key={group.groupKey} className="mb-1.5">
									<div className="flex items-center gap-1.5 px-4.5 pt-3.5 pb-1">
										<span className="h-2.5 w-[3px] shrink-0 rounded-sm opacity-75" style={{ background: group.accent }} aria-hidden="true" />
										<span className="text-xs font-bold tracking-[0.6px] text-muted-foreground uppercase">
											{group.groupLabel}
										</span>
									</div>
									{group.items.map(function (item) {
										return <NavPill key={item.key} label={item.label} itemKey={item.key} Icon={item.Icon} accent={item.color || group.accent} />;
									})}
								</div>
							);
						})}
					</nav>
			</div>

			{/* ── Content ── */}
			<div className="flex min-w-0 flex-1 flex-col">
				{/* Top bar · vidrio */}
				<div className="no-print glass sticky top-0 z-30 flex min-h-[52px] shrink-0 items-center gap-3 border-b border-[var(--glass-border)] px-5 py-2 lg:px-6">
					<button
						type="button"
						aria-expanded={sidebarOpen}
						aria-controls="sidebar-nav"
						aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
						onClick={function () { setSidebarOpen(function (o) { return !o; }); }}
						className="flex cursor-pointer items-center rounded-md border-none bg-transparent p-1.5 text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 lg:hidden"
					>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
							<line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />
						</svg>
					</button>
					{/* Miga de pan: dónde estás, sin tener que abrir el nav. */}
					<nav aria-label="Ubicación" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
						{activeGroup ? (
							<>
								<span className="hidden sm:inline">{GROUP_TITLE[activeGroup.groupKey]}</span>
								<span className="hidden sm:inline" aria-hidden="true">/</span>
								<span className="truncate font-semibold text-foreground">{activeItem ? activeItem.label : ""}</span>
							</>
						) : <span className="font-semibold text-foreground">Inicio</span>}
					</nav>
					<div className="flex-1" />
					<div className="flex items-center gap-1.5" role="group" aria-label="Moneda">
						{["USD", "ARS"].map(function (c) {
							return (
								<button
									key={c}
									type="button"
									aria-pressed={currency === c}
									onClick={function () { setCurrency(c); }}
									className={cn(
										"cursor-pointer rounded-full border-[1.5px] px-3 py-1 text-xs font-bold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
										currency === c
											? "border-primary bg-primary text-primary-foreground"
											: "border-transparent bg-white/60 text-muted-foreground"
									)}
								>{c}</button>
							);
						})}
						{currency === "ARS" && <span className="text-xs text-muted-foreground tabular-nums">TC: {tcLoading ? "..." : tc}</span>}
					</div>
					<button
						type="button"
						onClick={signOut}
						aria-label="Cerrar sesión"
						className="flex cursor-pointer lg:hidden items-center gap-1.5 rounded-md border-none bg-transparent p-1.5 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
					>
						<LogOut size={15} aria-hidden="true" />
					</button>
				</div>

				{/* Content area · el scroll lo maneja el documento (no este div): así el
				    panel de resultado sticky de la cotizadora se ancla al viewport. Un
				    overflow:auto acá rompería el sticky (se ligaría a un contenedor que no
				    scrollea). */}
				<main className="mx-auto w-full max-w-[1280px] flex-1 p-4 lg:p-6">

					{/* ── INICIO ── */}
					{activeNavItem === "inicio" && <TabInicio dealsApi={dealsApi} clientsApi={clientsApi} currency={currency} tc={tc} tcLastUpdated={tcLastUpdated} onNewQuote={newQuote} onOpenHistorial={function () { navTo("historial"); }} onEditQuote={editQuote} />}

					{/* ── COTIZAR ── */}
					{activeNavItem === "web" && <TabCanalPacks channel="web" key={"web-" + quoteNonce.web} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNavChannel={newQuote} onNewQuote={function () { newQuote("web"); }} pendingEdit={pendingEdit && resolveChannel(pendingEdit.channel) === "web" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />}
					{activeNavItem === "distribuidores" && (
						// La modalidad packs (lista con descuento por nivel) se descartó del canal
						// (ago 2026): Distribuidores cotiza siempre por Volumen. El branch de packs
						// se conserva SOLO para abrir cotizaciones ya guardadas en ese canal
						// (editQuote pone distribMode="packs"); no hay forma de crear nuevas.
						distribMode === "packs"
							? <TabCanalPacks channel="distribuidores" key={"distribuidores-" + quoteNonce.distribuidores} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNavChannel={newQuote} onNewQuote={function () { newQuote("distribuidores_vol"); }} pendingEdit={pendingEdit && resolveChannel(pendingEdit.channel) === "distribuidores" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />
							: <TabCanalB2B2C channel="distribuidores_vol" key={"distribuidores_vol-" + quoteNonce.distribuidores_vol} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNavChannel={newQuote} onNewQuote={function () { newQuote("distribuidores_vol"); }} pendingEdit={pendingEdit && resolveChannel(pendingEdit.channel) === "distribuidores_vol" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />
					)}
					{activeNavItem === "web-precios" && <TabCanalWeb costs={costs} currency={currency} tc={tc} view="precios" />}
					{activeNavItem === "b2b2c" && <TabCanalB2B2C channel="b2b2c" key={"b2b2c-" + quoteNonce.b2b2c} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNavChannel={newQuote} onNewQuote={function () { newQuote("b2b2c"); }} pendingEdit={pendingEdit && pendingEdit.channel === "b2b2c" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />}
					{activeNavItem === "volumen" && <TabCanalB2B2C channel="volumen" key={"volumen-" + quoteNonce.volumen} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNavChannel={newQuote} onNewQuote={function () { newQuote("volumen"); }} pendingEdit={pendingEdit && pendingEdit.channel === "volumen" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />}

					{/* ── SEGUIMIENTO ── */}
					{activeNavItem === "historial" && <TabHistorial dealsApi={dealsApi} clientsApi={clientsApi} currency={currency} tc={tc} tcMeta={tcMeta} highlightId={historialHighlight} onEditQuote={editQuote} />}
					{activeNavItem === "clientes" && <TabClientes clientsApi={clientsApi} dealsApi={dealsApi} currency={currency} tc={tc} onEditDeal={editQuote} />}

					{/* ── ANÁLISIS ── */}
					{activeNavItem === "reportes" && <TabReportes dealsApi={dealsApi} clientsApi={clientsApi} currency={currency} tc={tc} />}
					{activeNavItem === "comparación" && <TabComparacion costs={costs} currency={currency} tc={tc} />}
					{activeNavItem === "web-simulador" && <TabCanalWeb costs={costs} currency={currency} tc={tc} view="simulador" />}

					{/* ── CONFIGURACIÓN ── */}
					{activeNavItem === "cfg-general" && <TabGeneral tc={tc} setTc={setTc} tcSource={source} setTcSource={setSource} tcLoading={tcLoading} tcError={tcError} tcLastUpdated={tcLastUpdated} tcRefresh={tcRefresh} />}
					{activeNavItem === "cfg-costos" && <TabConfig costConfig={costConfig} setCostConfig={setCostConfig} channelConfig={channelConfig} updateChannelConfig={updateChannelConfig} />}
					{activeNavItem === "cfg-precios" && <TabCanalesConfig channelConfig={channelConfig} updateChannelConfig={updateChannelConfig} costs={costs} />}
					{activeNavItem === "cfg-modelos" && <TabGuardados selectedId={selectedModelId} onSelect={function (id) { setSelectedModelId(id); }} currency={currency} tc={tc} />}
					{activeNavItem === "docs" && <TabDocumentacion tc={tc} />}
				</main>
			</div>
		</div>
	);
}

export default function LakautCalc() {
	return (
		<ModelsProvider>
			<DiscountProvider>
				<ChannelConfigProvider>
					<ToastProvider>
						<ConfirmProvider>
							<LakautCalcInner />
						</ConfirmProvider>
					</ToastProvider>
				</ChannelConfigProvider>
			</DiscountProvider>
		</ModelsProvider>
	);
}
