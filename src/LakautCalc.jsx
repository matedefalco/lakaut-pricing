import { useState, useMemo, useEffect } from "react";
import { useDolarTC } from "./lib/useDolarTC";
import { loadConfig, subscribeConfig } from "./lib/supabase";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, BG, os, mont } from "./theme/tokens";
import { FIXED_ITEMS, ASSET_ITEMS, CV_CERT_ITEMS, CV_FIRMA_ITEMS, CAPACIDAD_FIRMAS_ANUAL } from "./data/costs";
import { ModelsProvider, useModels } from "./context/ModelsContext";
import { useDeals } from "./lib/useDeals";
import { useClients } from "./lib/useClients";
import { DiscountProvider } from "./context/DiscountContext";
import { ChannelConfigProvider, useChannelConfig } from "./context/ChannelConfigContext";
import { TabConfig } from "./components/tabs/TabConfig";
import { TabCanalesConfig } from "./components/tabs/TabCanalesConfig";
import { TabGeneral } from "./components/tabs/TabGeneral";
import { TabGuardados } from "./components/tabs/TabGuardados";
import { TabComparacion } from "./components/tabs/TabComparacion";
import { TabCanalWeb } from "./components/tabs/TabCanalWeb";
import { TabCanalDistribuidores } from "./components/tabs/TabCanalDistribuidores";
import { TabCanalB2B2C } from "./components/tabs/TabCanalB2B2C";
import { TabHistorial } from "./components/tabs/TabHistorial";
import { TabClientes } from "./components/tabs/TabClientes";


function LakautCalcInner() {
	const { models } = useModels();
	const { channelConfig, update: updateChannelConfig } = useChannelConfig();
	const dealsApi = useDeals();
	const clientsApi = useClients();

	useEffect(function () {
		var urls = [
			"https://unpkg.com/@fontsource/montserrat/600.css",
			"https://unpkg.com/@fontsource/open-sans/400.css",
			"https://unpkg.com/@fontsource/open-sans/700.css",
		];
		urls.forEach(function (href) {
			if (!document.querySelector('link[href="' + href + '"]')) {
				var l = document.createElement("link");
				l.rel = "stylesheet";
				l.href = href;
				document.head.appendChild(l);
			}
		});
	}, []);



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

	const [activeNavItem, setActiveNavItem] = useState("web-precios");
	const [sidebarOpen, setSidebarOpen] = useState(true);
	const [expandedGroups, setExpandedGroups] = useState(function () { return new Set(["web"]); });
	const [pendingEdit, setPendingEdit] = useState(null);

	function toggleGroup(key) {
		setExpandedGroups(function (prev) {
			const next = new Set(prev);
			if (next.has(key)) { next.delete(key); } else { next.add(key); }
			return next;
		});
	}

	function navTo(key) {
		setActiveNavItem(key);
		// Auto-expand parent group if item is a child
		ALL_NAV.forEach(function (group) {
			group.items.forEach(function (item) {
				if (item.children && item.children.some(function (c) { return c.key === key; })) {
					setExpandedGroups(function (prev) { const next = new Set(prev); next.add(item.key); return next; });
				}
			});
		});
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


	const ALL_NAV = [
		{
			groupKey: "cotizadora", groupLabel: "📋 COTIZADORA",
			items: [
				{ key: "distribuidores", label: "Distribuidores" },
				{ key: "b2b2c", label: "B2B2C (IDC)" },
			],
		},
		{
			groupKey: "canales", groupLabel: "🌐 CANALES",
			items: [
				{
					key: "web", label: "Canal Web",
					children: [
						{ key: "web-precios", label: "Tabla de precios" },
						{ key: "web-simulador", label: "Simulador de portfolio" },
					],
				},
				{ key: "comparación", label: "Comparación" },
			],
		},
		{
			groupKey: "bases", groupLabel: "🗄️ BASES DE DATOS",
			items: [
				{ key: "historial", label: "Historial" },
				{ key: "clientes", label: "Clientes" },
			],
		},
		{
			groupKey: "configuracion", groupLabel: "⚙️ CONFIGURACIÓN",
			items: [
				{ key: "cfg-general", label: "General" },
				{ key: "cfg-costos", label: "Costos" },
				{ key: "cfg-precios", label: "Precios" },
				{ key: "cfg-modelos", label: "Modelos" },
			],
		},
	];


	return (
		<div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Open Sans',sans-serif" }}>

			{/* ── Sidebar ── */}
			{sidebarOpen && (
				<div className="no-print" style={{ width: 220, flexShrink: 0, borderRight: "1px solid " + BORD, background: WHITE, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
					{/* Brand header */}
					<div style={{ background: BLUE, padding: "16px 16px 14px", flexShrink: 0 }}>
						<div style={Object.assign({}, mont(18), { color: WHITE })}>LAKAUT</div>
						<div style={Object.assign({}, os(11, 400, WHITE), { opacity: 0.7, marginTop: 2 })}>Pricing Calculator</div>
					</div>
					{/* Nav groups */}
					<nav style={{ flex: 1, overflowY: "auto", paddingTop: 8, paddingBottom: 16 }}>
						{ALL_NAV.map(function (group) {
							return (
								<div key={group.groupKey} style={{ marginBottom: 8 }}>
									<div style={Object.assign({}, os(9, 700, GRAY), { padding: "16px 14px 6px", textTransform: "uppercase", letterSpacing: "0.6px" })}>
										{group.groupLabel}
									</div>
									{group.items.map(function (item) {
										if (item.key === "sep-coti") {
											return <div key="sep-coti" style={{ height: 1, background: BORD, margin: "4px 10px" }} />;
										}
										const isActive = activeNavItem === item.key;
										const isGroup = item.children && item.children.length > 0;
										const expanded = expandedGroups.has(item.key);
										if (isGroup) {
											return (
												<div key={item.key}>
													<button onClick={function () { toggleGroup(item.key); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 600, color: expanded ? BLUE : BLACK, textAlign: "left" }}>
														<span>{item.label}</span>
														<span style={{ fontSize: 9, color: GRAY, display: "inline-block", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>▶</span>
													</button>
													{expanded && (
														<div style={{ paddingLeft: 8 }}>
															{item.children.map(function (child) {
																const childActive = activeNavItem === child.key;
																return (
																	<button key={child.key} onClick={function () { navTo(child.key); }} style={{ width: "100%", display: "block", padding: "6px 12px 6px 18px", background: childActive ? BLUEL : "none", border: "none", borderLeft: "2px solid " + (childActive ? BLUE : "transparent"), cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: childActive ? 700 : 400, color: childActive ? BLUE : GRAY, textAlign: "left" }}>
																		{child.label}
																	</button>
																);
															})}
														</div>
													)}
												</div>
											);
										}
										return (
											<button key={item.key} onClick={function () { navTo(item.key); }} style={{ width: "100%", display: "block", padding: "7px 14px", background: isActive ? BLUEL : "none", border: "none", borderLeft: "2px solid " + (isActive ? BLUE : "transparent"), cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: isActive ? 700 : 400, color: isActive ? BLUE : BLACK, textAlign: "left" }}>
												{item.label}
											</button>
										);
									})}
								</div>
							);
						})}
					</nav>
				</div>
			)}

			{/* ── Content ── */}
			<div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: BG }}>
				{/* Top bar */}
				<div className="no-print" style={{ background: WHITE, borderBottom: "1px solid " + BORD, padding: "8px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
					<button onClick={function () { setSidebarOpen(function (o) { return !o; }); }} style={{ background: "none", border: "none", cursor: "pointer", color: GRAY, padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center" }} title={sidebarOpen ? "Cerrar menú" : "Abrir menú"}>
						<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
							<line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="8" x2="14" y2="8" /><line x1="2" y1="12" x2="14" y2="12" />
						</svg>
					</button>
					<div style={{ flex: 1 }} />
					<div style={{ display: "flex", alignItems: "center", gap: 6 }}>
						{["USD", "ARS"].map(function (c) {
							return (
								<button key={c} onClick={function () { setCurrency(c); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid " + (currency === c ? BLUE : BORD), background: currency === c ? BLUE : WHITE, color: currency === c ? WHITE : GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c}</button>
							);
						})}
						{currency === "ARS" && <span style={os(11, 400, GRAY)}>TC: {tcLoading ? "..." : tc}</span>}
					</div>
					<div style={Object.assign({}, os(11, 400, GRAY), { opacity: 0.7 })}>
						{new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
					</div>
				</div>

				{/* Content area */}
				<div style={{ flex: 1, padding: 24, overflowY: "auto" }}>

					{/* ── CANALES ── */}
					{activeNavItem === "web-precios" && <TabCanalWeb costs={costs} currency={currency} tc={tc} view="precios" />}
					{activeNavItem === "web-simulador" && <TabCanalWeb costs={costs} currency={currency} tc={tc} view="simulador" />}
					{activeNavItem === "distribuidores" && <TabCanalDistribuidores costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} pendingEdit={pendingEdit && pendingEdit.channel === "distribuidores" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />}
					{activeNavItem === "b2b2c" && <TabCanalB2B2C costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} pendingEdit={pendingEdit && pendingEdit.channel === "b2b2c" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} />}
					{activeNavItem === "historial" && <TabHistorial dealsApi={dealsApi} clientsApi={clientsApi} currency={currency} tc={tc} onEditQuote={function (q) { setPendingEdit(q); navTo(q.channel); }} />}
					{activeNavItem === "clientes" && <TabClientes clientsApi={clientsApi} dealsApi={dealsApi} currency={currency} tc={tc} onEditDeal={function (d) { setPendingEdit(d); navTo(d.channel); }} />}

					{/* ── ANÁLISIS ── */}
					{activeNavItem === "comparación" && <TabComparacion costs={costs} currency={currency} tc={tc} />}

					{/* ── CONFIGURACIÓN ── */}
					{activeNavItem === "cfg-general" && <TabGeneral tc={tc} setTc={setTc} tcSource={source} setTcSource={setSource} tcLoading={tcLoading} tcError={tcError} tcLastUpdated={tcLastUpdated} tcRefresh={tcRefresh} />}
					{activeNavItem === "cfg-costos" && <TabConfig costConfig={costConfig} setCostConfig={setCostConfig} channelConfig={channelConfig} updateChannelConfig={updateChannelConfig} />}
					{activeNavItem === "cfg-precios" && <TabCanalesConfig channelConfig={channelConfig} updateChannelConfig={updateChannelConfig} />}
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
					<LakautCalcInner />
				</ChannelConfigProvider>
			</DiscountProvider>
		</ModelsProvider>
	);
}
