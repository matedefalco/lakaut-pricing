import { useState, useMemo, useEffect, useRef } from "react";
import { Home, ScrollText, Users, ChartColumn, ArrowLeftRight, Tags, Blocks, Receipt, Boxes, BadgeDollarSign, SlidersHorizontal } from "lucide-react";
import { useDolarTC, DOLAR_SOURCES } from "./lib/useDolarTC";
import { loadConfig, subscribeConfig } from "./lib/supabase";
import { BLUE, GRAY, BLACK, WHITE, os } from "./theme/tokens";
import { FIXED_ITEMS, ASSET_ITEMS, CV_CERT_ITEMS, CV_FIRMA_ITEMS, CAPACIDAD_FIRMAS_ANUAL } from "./data/costs";
import { CHANNELS, resolveChannel, channelMeta } from "./data/channelMeta";
import { exportProposal } from "./utils/exportProposal";
import { ModelsProvider, useModels } from "./context/ModelsContext";
import { useDeals } from "./lib/useDeals";
import { useClients } from "./lib/useClients";
import { DiscountProvider } from "./context/DiscountContext";
import { ChannelConfigProvider, useChannelConfig } from "./context/ChannelConfigContext";
import { ToastProvider } from "./components/ui/Toaster";
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
		],
	},
];

// Canales que se pueden cotizar desde "Nueva cotización".
const QUOTABLE = [
	{ key: "web", label: CHANNELS.web.label, desc: CHANNELS.web.desc },
	// Distribuidores abre en su modalidad por defecto (Volumen); el toggle del canal
	// permite pasar a packs sin salir de la pantalla.
	{ key: "distribuidores_vol", label: CHANNELS.distribuidores.label, desc: CHANNELS.distribuidores_vol.desc },
	{ key: "b2b2c", label: CHANNELS.b2b2c.label, desc: CHANNELS.b2b2c.desc },
	{ key: "volumen", label: CHANNELS.volumen.label, desc: CHANNELS.volumen.desc },
];

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
};


function NuevaCotizacionButton({ onPick }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useEffect(function () {
		function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
		document.addEventListener("mousedown", handler);
		return function () { document.removeEventListener("mousedown", handler); };
	}, []);
	return (
		<div ref={ref} style={{ position: "relative", padding: "14px 14px 6px" }}>
			<button
				onClick={function () { setOpen(function (o) { return !o; }); }}
				className="shadow-float transition-all duration-150 hover:-translate-y-px hover:brightness-110 active:translate-y-0"
				style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 12px", background: BLUE, color: WHITE, border: "none", borderRadius: 999, cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 700 }}
			>
				<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" /></svg>
				Nueva cotización
			</button>
			{open && (
				<div className="glass-strong shadow-float" style={{ position: "absolute", top: "calc(100% - 0px)", left: 14, right: 14, zIndex: 60, border: "1px solid var(--glass-border)", borderRadius: 18, overflow: "hidden", marginTop: 6 }}>
					<div style={Object.assign({}, os(10, 700, GRAY), { padding: "12px 14px 6px", textTransform: "uppercase", letterSpacing: "0.5px" })}>¿Qué querés cotizar?</div>
					{QUOTABLE.map(function (q) {
						const meta = channelMeta(q.key);
						const Icon = meta.Icon;
						return (
							<button key={q.key} onClick={function () { setOpen(false); onPick(q.key); }} className="group transition-colors hover:bg-white/60" style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", padding: "10px 14px", background: "none", border: "none", cursor: "pointer" }}>
								<span
									style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", background: meta.gradient, border: "1px solid " + meta.glow, color: meta.colorFg, marginTop: 1 }}
								>
									{Icon && <Icon size={15} strokeWidth={2.2} />}
								</span>
								<span style={{ minWidth: 0 }}>
									<div style={Object.assign({}, os(13, 700, BLACK))}>{q.label}</div>
									<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2, lineHeight: 1.4 })}>{q.desc}</div>
								</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}


// Selector de modalidad del canal Distribuidores. Los dos modos (Volumen y Packs)
// conviven bajo la misma entrada del nav; el vendedor elige por cotización. Volumen
// es la modalidad por defecto (certificados y firmas sueltos con nivel del socio).
function DistribModeSwitch({ mode, onChange }) {
	const accent = CHANNELS.distribuidores.color;
	const opts = [
		{ id: "volumen", label: "Volumen", sub: "certificados y firmas sueltos" },
		{ id: "packs", label: "Packs", sub: "lista con descuento por nivel" },
	];
	return (
		<div className="glass-strong shadow-float" style={{ display: "inline-flex", gap: 4, padding: 4, borderRadius: 14, border: "1px solid var(--glass-border)" }}>
			{opts.map(function (o) {
				const active = mode === o.id;
				return (
					<button
						key={o.id}
						onClick={function () { onChange(o.id); }}
						className="transition-all duration-150"
						style={{
							display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1,
							padding: "7px 14px", borderRadius: 11, border: "none", cursor: "pointer",
							background: active ? accent : "transparent",
							color: active ? WHITE : GRAY,
						}}
					>
						<span style={Object.assign({}, os(12.5, 700, active ? WHITE : BLACK))}>{o.label}</span>
						<span style={Object.assign({}, os(10, 400, active ? "rgba(255,255,255,0.85)" : GRAY))}>{o.sub}</span>
					</button>
				);
			})}
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

	const [activeNavItem, setActiveNavItem] = useState("inicio");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [pendingEdit, setPendingEdit] = useState(null);
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
	}

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
		setPendingEdit(null);
		setQuoteNonce(function (prev) { return Object.assign({}, prev, { [channel]: (prev[channel] || 0) + 1 }); });
		if (channel === "distribuidores_vol") setDistribMode("volumen");
		else if (channel === "distribuidores") setDistribMode("packs");
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
				onClick={function () { navTo(itemKey); }}
				className={"transition-all duration-150 " + (isActive ? "shadow-card" : "hover:bg-white/50")}
				style={{ width: "calc(100% - 16px)", display: "flex", alignItems: "center", gap: 9, margin: "1px 8px", padding: "7px 12px", background: isActive ? "rgba(255,255,255,0.9)" : "none", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: isActive ? 700 : (bold ? 600 : 400), color: isActive ? tint : BLACK, textAlign: "left", lineHeight: 1.35 }}
			>
				{Icon && (
					<Icon
						size={15}
						strokeWidth={isActive ? 2.4 : 1.9}
						style={{ flexShrink: 0, color: isActive ? tint : GRAY, transition: "color 150ms ease" }}
					/>
				)}
				<span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
			</button>
		);
	}

	const section = SECTION_BY_ITEM[activeNavItem] || "inicio";

	return (
		<div className="app-bg" data-section={section} style={{ display: "flex", minHeight: "100vh", fontFamily: "'Open Sans',sans-serif" }}>

			{/* ── Sidebar · vidrio ── */}
			{sidebarOpen && (
				<div className="no-print glass" style={{ width: 224, flexShrink: 0, borderRight: "1px solid var(--glass-border)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto", zIndex: 40 }}>
					{/* Brand header. Firma con la misma marca que el PDF que recibe el
					    cliente ("FID by Lakaut"), en lugar del "Pricing Calculator" en gris
					    que era un subtítulo de utilidad y no un nombre. */}
					<button onClick={function () { navTo("inicio"); }} className="transition-opacity hover:opacity-80" style={{ background: "none", padding: "18px 18px 8px", flexShrink: 0, border: "none", textAlign: "left", cursor: "pointer", display: "block" }}>
						<div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
							<span className="font-display" style={{ fontSize: 22, color: BLUE, lineHeight: 1 }}>FID</span>
							<span style={Object.assign({}, os(11, 600, GRAY), { lineHeight: 1 })}>by Lakaut</span>
						</div>
						<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 5, letterSpacing: "0.3px" })}>Cotizador comercial</div>
					</button>

					{/* Nueva cotización — acción primaria */}
					<NuevaCotizacionButton onPick={newQuote} />

					{/* Inicio */}
					<div style={{ padding: "6px 0 0" }}>
						<NavPill label="Inicio" itemKey="inicio" bold Icon={Home} />
					</div>

					{/* Nav groups. El label del grupo lleva una barrita con su acento, para
					    que la sidebar tenga estructura visible sin sumar ruido. */}
					<nav style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 16 }}>
						{NAV_GROUPS.map(function (group) {
							return (
								<div key={group.groupKey} style={{ marginBottom: 6 }}>
									<div style={{ display: "flex", alignItems: "center", gap: 6, padding: "14px 18px 5px" }}>
										<span style={{ width: 3, height: 10, borderRadius: 2, background: group.accent, flexShrink: 0, opacity: 0.75 }} />
										<span style={Object.assign({}, os(9, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.6px" })}>
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
			)}

			{/* ── Content ── */}
			<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
				{/* Top bar · vidrio */}
				<div className="no-print glass" style={{ borderBottom: "1px solid var(--glass-border)", padding: "8px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0, position: "sticky", top: 0, zIndex: 30 }}>
					<button onClick={function () { setSidebarOpen(function (o) { return !o; }); }} style={{ background: "none", border: "none", cursor: "pointer", color: GRAY, padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center" }} title={sidebarOpen ? "Cerrar menú" : "Abrir menú"}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
							<line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />
						</svg>
					</button>
					<div style={{ flex: 1 }} />
					<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
						{["USD", "ARS"].map(function (c) {
							return (
								<button key={c} onClick={function () { setCurrency(c); }} className="transition-colors" style={{ padding: "4px 12px", borderRadius: 999, border: "1.5px solid " + (currency === c ? BLUE : "transparent"), background: currency === c ? BLUE : "rgba(255,255,255,0.6)", color: currency === c ? WHITE : GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c}</button>
							);
						})}
						{currency === "ARS" && <span style={os(11, 400, GRAY)}>TC: {tcLoading ? "..." : tc}</span>}
					</div>
					<div style={Object.assign({}, os(11, 400, GRAY), { opacity: 0.7 })}>
						{new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
					</div>
				</div>

				{/* Content area · el scroll lo maneja el documento (no este div): así el
				    panel de resultado sticky de la cotizadora se ancla al viewport. Un
				    overflow:auto acá rompería el sticky (se ligaría a un contenedor que no
				    scrollea). */}
				<div style={{ flex: 1, padding: 24 }}>

					{/* ── INICIO ── */}
					{activeNavItem === "inicio" && <TabInicio dealsApi={dealsApi} clientsApi={clientsApi} currency={currency} tc={tc} tcLastUpdated={tcLastUpdated} onNewQuote={newQuote} onOpenHistorial={function () { navTo("historial"); }} onEditQuote={editQuote} />}

					{/* ── COTIZAR ── */}
					{activeNavItem === "web" && <TabCanalPacks channel="web" key={"web-" + quoteNonce.web} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNewQuote={function () { newQuote("web"); }} pendingEdit={pendingEdit && resolveChannel(pendingEdit.channel) === "web" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />}
					{activeNavItem === "distribuidores" && (
						<div className="space-y-4">
							<DistribModeSwitch mode={distribMode} onChange={setDistribMode} />
							{distribMode === "packs"
								? <TabCanalPacks channel="distribuidores" key={"distribuidores-" + quoteNonce.distribuidores} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNewQuote={function () { newQuote("distribuidores"); }} pendingEdit={pendingEdit && resolveChannel(pendingEdit.channel) === "distribuidores" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />
								: <TabCanalB2B2C channel="distribuidores_vol" key={"distribuidores_vol-" + quoteNonce.distribuidores_vol} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNewQuote={function () { newQuote("distribuidores_vol"); }} pendingEdit={pendingEdit && resolveChannel(pendingEdit.channel) === "distribuidores_vol" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />}
						</div>
					)}
					{activeNavItem === "web-precios" && <TabCanalWeb costs={costs} currency={currency} tc={tc} view="precios" />}
					{activeNavItem === "b2b2c" && <TabCanalB2B2C channel="b2b2c" key={"b2b2c-" + quoteNonce.b2b2c} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNewQuote={function () { newQuote("b2b2c"); }} pendingEdit={pendingEdit && pendingEdit.channel === "b2b2c" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />}
					{activeNavItem === "volumen" && <TabCanalB2B2C channel="volumen" key={"volumen-" + quoteNonce.volumen} costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} onExport={exportDeal} onGoHistorial={goHistorial} onNewQuote={function () { newQuote("volumen"); }} pendingEdit={pendingEdit && pendingEdit.channel === "volumen" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />}

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
				</div>
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
						<LakautCalcInner />
					</ToastProvider>
				</ChannelConfigProvider>
			</DiscountProvider>
		</ModelsProvider>
	);
}
