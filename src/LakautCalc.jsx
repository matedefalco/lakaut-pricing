import { useState, useMemo, useEffect, useRef } from "react";
import { useDolarTC } from "./lib/useDolarTC";
import { loadConfig, subscribeConfig } from "./lib/supabase";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, BG, OK, WN, ER, os, mont } from "./theme/tokens";
import { fD2, fP, fK } from "./utils/formatters";
import { makeMoney } from "./utils/useMoney";
import { FIXED_ITEMS, ASSET_ITEMS, CV_CERT_ITEMS, CV_FIRMA_ITEMS, CAPACIDAD_FIRMAS_ANUAL, SERVICES_DEF } from "./data/costs";
import { PACKS } from "./data/packs";
import { engine } from "./engine/engine";
import { modelToInp } from "./utils/modelToInp";
import { ModelsProvider, useModels } from "./context/ModelsContext";
import { useDeals } from "./lib/useDeals";
import { useClients } from "./lib/useClients";
import { DiscountProvider } from "./context/DiscountContext";
import { ChannelConfigProvider, useChannelConfig } from "./context/ChannelConfigContext";
import { InfoTooltip } from "./components/ui/InfoTooltip";
import { Sec } from "./components/ui/Sec";
import { PackFields } from "./components/ui/PackFields";
import { NumInput } from "./components/ui/NumInput";
import { Toggle } from "./components/ui/Toggle";
import { TabCostos } from "./components/tabs/TabCostos";
import { TabPrecios } from "./components/tabs/TabPrecios";
import { TabProyeccion } from "./components/tabs/TabProyeccion";
import { TabBreakEven } from "./components/tabs/TabBreakEven";
import { TabConfig } from "./components/tabs/TabConfig";
import { TabCanalesConfig } from "./components/tabs/TabCanalesConfig";
import { TabGeneral } from "./components/tabs/TabGeneral";
import { TabGuardados } from "./components/tabs/TabGuardados";
import { TabSuscripcion } from "./components/tabs/TabSuscripcion";
import { TabComparacion } from "./components/tabs/TabComparacion";
import { TabCanalWeb } from "./components/tabs/TabCanalWeb";
import { TabCanalDistribuidores } from "./components/tabs/TabCanalDistribuidores";
import { TabCanalB2B2C } from "./components/tabs/TabCanalB2B2C";
import { TabHistorial } from "./components/tabs/TabHistorial";
import { TabClientes } from "./components/tabs/TabClientes";
import { DEFAULT_VOLUME_TIERS } from "./data/volumeTiers";

// ─── Archive mapping arch → pack key for strategy text ─────────────────────────
const ARCH_TO_PACK = { bolsa: "A", sub: "B", ppu: "C", anual: "D", free: "E", hibrido: "F" };

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



	// Selected model id in análisis mode
	const [selectedModelId, setSelectedModelId] = useState(function () {
		return models.length > 0 ? models[0].id : null;
	});

	// Analysis state (sandbox — loaded from model, editable locally)
	const [family, setFamily] = useState("B");
	const [users, setUsers] = useState(20000);
	const [tab, setTab] = useState("costos");
	const [currency, setCurrency] = useState("USD");
	const { tc, setTc, source, setSource, loading: tcLoading, error: tcError, lastUpdated: tcLastUpdated, refresh: tcRefresh } = useDolarTC();
	const [svc, setSvc] = useState({ cloudStorage: false, mailCert: false, paywall: false });
	const [inp, setInp] = useState(PACKS.B.defaults);
	const [projParams, setProjParams] = useState({ usersM1: 1000, growthRate: 10, churnRate: 5 });
	const [margenDeseado, setMargenDeseado] = useState(null); // null = desactivado
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

	const [volumeTiers, setVolumeTiers] = useState(function () {
		try {
			const saved = localStorage.getItem("lakaut_volumeTiers");
			if (saved) return JSON.parse(saved);
		} catch (e) {}
		return DEFAULT_VOLUME_TIERS;
	});

	function updateVolumeTiers(tiers) {
		setVolumeTiers(tiers);
		try { localStorage.setItem("lakaut_volumeTiers", JSON.stringify(tiers)); } catch (e) {}
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

	// Sync analysis sandbox from selected model
	useEffect(function () {
		if (!selectedModelId) return;
		const model = models.find(function (m) { return m.id === selectedModelId; });
		if (!model) return;
		const arch = model.arch || "bolsa";
		const packKey = ARCH_TO_PACK[arch] || "A";
		setFamily(packKey);
		setInp(modelToInp(model));
		setSvc(model.services || { cloudStorage: false, mailCert: false, paywall: false });
	}, [selectedModelId, models]);

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

	const cfg = PACKS[family] || PACKS.A;

	function updInp(k, v) {
		setInp(function (prev) { return Object.assign({}, prev, { [k]: v }); });
	}
	function updSvc(k, v) {
		setSvc(function (prev) { return Object.assign({}, prev, { [k]: v }); });
	}

	const { fMoney, fMoney2 } = makeMoney(currency, tc);

	const calcs = useMemo(function () {
		return engine({ arch: cfg.arch, inp, svc, users, costs, projConfig: projParams });
	}, [cfg.arch, inp, svc, users, costs, projParams]);

	const ec = calcs.ebitda > 0 ? OK : calcs.ebitda > -10000 ? WN : ER;
	const mc = calcs.margenPct > 30 ? OK : calcs.margenPct > 0 ? WN : ER;
	const bc = isFinite(calcs.beUsuarios) ? OK : WN;

	// Precio sugerido para lograr margen deseado: p = cvMes * periodo / (1 - m/100)
	const precioSugerido = useMemo(function () {
		if (margenDeseado === null || margenDeseado >= 100) return null;
		const periodo = inp.periodo || 24;
		return Math.round((calcs.cvMes * periodo / (1 - margenDeseado / 100)) * 100) / 100;
	}, [margenDeseado, calcs.cvMes, inp.periodo]);

	const scaleLabels = {
		sub: "Suscripciones activas",
		bolsa: "Clientes activos",
		ppu: "Certificados activos",
		anual: "Contratos anuales activos",
		free: "Usuarios activos",
		hibrido: "Clientes activos",
	};
	const scaleLabel = scaleLabels[cfg.arch] || "Usuarios activos";

	const ANALYSIS_TABS = ["costos", "break-even", "precios", "proyección"];

	const ALL_NAV = [
		{
			groupKey: "canales", groupLabel: "CANALES",
			items: [
				{
					key: "web", label: "Canal Web",
					children: [
						{ key: "web-precios", label: "Tabla de precios" },
						{ key: "web-simulador", label: "Simulador de portfolio" },
					],
				},
				{ key: "distribuidores", label: "Distribuidores" },
				{ key: "b2b2c", label: "B2B2C (IDC)" },
				{ key: "sep-coti" },
				{ key: "historial", label: "Historial" },
				{ key: "clientes", label: "Clientes" },
			],
		},
		{
			groupKey: "analisis", groupLabel: "ANÁLISIS",
			items: [
				{ key: "análisis", label: "Simulador de modelos" },
				{ key: "suscripción", label: "Suscripción" },
				{ key: "comparación", label: "Comparación" },
			],
		},
		{
			groupKey: "configuracion", groupLabel: "CONFIGURACIÓN",
			items: [
				{ key: "cfg-general", label: "General" },
				{ key: "cfg-costos", label: "Costos" },
				{ key: "cfg-precios", label: "Precios" },
				{ key: "cfg-modelos", label: "Modelos" },
			],
		},
	];

	const selectedModel = models.find(function (m) { return m.id === selectedModelId; });

	const strategyText = selectedModel && activeNavItem === "análisis"
		? (selectedModel.tagline || cfg.strategy)
		: cfg.strategy;

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
								<div key={group.groupKey} style={{ marginBottom: 4 }}>
									<div style={Object.assign({}, os(9, 700, GRAY), { padding: "8px 14px 4px", textTransform: "uppercase", letterSpacing: "0.6px" })}>
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
					{activeNavItem === "análisis" && (
						<div>
							{/* Model selector strip */}
							<div className="no-print" style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
								<span style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginRight: 4 })}>Modelo:</span>
								{models.map(function (m) {
									const act = selectedModelId === m.id;
									return (
										<button key={m.id} onClick={function () { setSelectedModelId(m.id); }} style={{ padding: "5px 14px", borderRadius: 20, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: act ? 700 : 400, color: act ? WHITE : GRAY, background: act ? (m.color || BLUE) : WHITE, border: "1.5px solid " + (act ? (m.color || BLUE) : BORD), cursor: "pointer" }}>
											{m.label}
										</button>
									);
								})}
								{models.length === 0 && <span style={os(12, 400, GRAY)}>Sin modelos guardados · creá uno en "Configuración › Modelos pre-cargados"</span>}
							</div>

							{/* Strategy banner */}
							<div style={{ background: BLUEL, border: "1px solid " + BORD, borderRadius: 10, padding: "10px 16px", marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
								<div style={Object.assign({}, mont(13), { color: selectedModel ? (selectedModel.color || BLUE) : BLUE, flexShrink: 0, marginTop: 1 })}>{selectedModel ? selectedModel.label : "Estrategia"}</div>
								<div style={os(12, 400, BLACK)}>{strategyText}</div>
							</div>

							{/* Body */}
							<div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
								{/* Left panel */}
								<div className="no-print" style={{ width: "clamp(200px, 20vw, 248px)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
									{selectedModel && (
										<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: 16, borderLeft: "3px solid " + (selectedModel.color || BLUE) }}>
											<Sec title={selectedModel.label} />
											<div style={Object.assign({}, os(10, 400, GRAY), { marginBottom: 8 })}>{selectedModel.segment === "persona" ? "Persona" : "Empresa"} · {selectedModel.arch || "bolsa"} · {selectedModel.vigencia || 24}m</div>
											<div style={Object.assign({}, os(9, 400, GRAY), { background: BLUEL, borderRadius: 6, padding: "6px 8px" })}>Editando en modo sandbox. Los cambios aquí no modifican el modelo guardado.</div>
										</div>
									)}
									<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: 16 }}>
										<Sec title="Parámetros (sandbox)" />
										<PackFields arch={cfg.arch} inp={inp} update={updInp} currency={currency} tc={tc} />
										<NumInput label={scaleLabel} value={users} onChange={setUsers} suffix="usu" />
										{cfg.arch === "free" && (
											<div style={{ background: "#fee2e2", border: "1px solid " + ER + "44", borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
												<div style={Object.assign({}, os(10, 700, ER), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 })}>Costo asumido / usuario / mes</div>
												<div style={Object.assign({}, mont(20), { color: ER })}>{fMoney2(calcs.cvMes)}</div>
												<div style={Object.assign({}, os(11, 400, ER), { marginTop: 3, opacity: 0.85 })}>{users.toLocaleString()} usuarios → {fMoney(calcs.cvTotal)} / mes sin revenue</div>
											</div>
										)}
										<div style={{ borderTop: "1px solid " + BORD, marginTop: 12, paddingTop: 12 }}>
											<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: margenDeseado !== null ? 10 : 0 }}>
												<span style={os(11, 400, GRAY)}>Margen objetivo</span>
												<label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
													<input type="checkbox" checked={margenDeseado !== null} onChange={function (e) { setMargenDeseado(e.target.checked ? 40 : null); }} />
													<span style={os(11, 400, GRAY)}>{margenDeseado !== null ? "Activo" : "Activar"}</span>
												</label>
											</div>
											{margenDeseado !== null && <NumInput value={margenDeseado} onChange={setMargenDeseado} suffix="%" />}
										</div>
									</div>
									<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: 16 }}>
										<Sec title="Servicios opcionales" />
										{Object.entries(SERVICES_DEF).map(function (entry) {
											var k = entry[0], s = entry[1];
											return <Toggle key={k} label={s.label} cost={s.cost} costType={s.costType} checked={svc[k]} onChange={function (v) { updSvc(k, v); }} />;
										})}
									</div>
								</div>

								{/* Right panel: analysis tabs */}
								<div style={{ flex: "1 1 320px", minWidth: 0 }}>
									<div className="no-print" style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: "12px 12px 0 0", display: "flex", overflowX: "auto" }}>
										{ANALYSIS_TABS.map(function (t) {
											return (
												<button key={t} onClick={function () { setTab(t); }} style={{ padding: "12px 18px", fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: tab === t ? 700 : 400, color: tab === t ? BLUE : GRAY, background: "transparent", border: "none", cursor: "pointer", whiteSpace: "nowrap", borderBottom: "3px solid " + (tab === t ? BLUE : "transparent"), textTransform: "capitalize" }}>
													{t}
												</button>
											);
										})}
									</div>
									<div style={{ background: WHITE, border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 12px 12px", padding: 20 }}>
										{tab === "costos" && <TabCostos calcs={calcs} users={users} costConfig={costConfig} costs={costs} currency={currency} tc={tc} />}
										{tab === "precios" && <TabPrecios calcs={calcs} users={users} costs={costs} currency={currency} tc={tc} arch={cfg.arch} inp={inp} />}
										{tab === "proyección" && <TabProyeccion proj={calcs.proj} beMes={calcs.beMes} calcs={calcs} costs={costs} currency={currency} tc={tc} projParams={projParams} setProjParams={setProjParams} arch={cfg.arch} />}
										{tab === "break-even" && <TabBreakEven arch={cfg.arch} inp={inp} svc={svc} currentUsers={users} costs={costs} />}
									</div>
								</div>

								{/* KPI panel */}
								<div className="no-print" style={{ width: 188, flexShrink: 0, background: WHITE, border: "1px solid " + BORD, borderRadius: 12, overflow: "hidden", position: "sticky", top: 16 }}>
									{(function () {
										var costoTotal = costs.cfDirecto + calcs.cvMes * users + (calcs.cvExtras || 0);
										var hasExtras = (calcs.extraRevMes || 0) > 0;
										var ingresoRows = [{ label: "Revenue / mes", value: fMoney(calcs.revTotal), color: BLUE, big: true }];
										if (hasExtras) {
											ingresoRows.push({ label: "Packs", value: fMoney(calcs.revPackTotal), color: BLUE });
											ingresoRows.push({ label: "Firmas extra", value: fMoney(calcs.extraRevMes), color: "#15803d" });
										} else {
											ingresoRows.push({ label: "por usuario", value: fMoney2(calcs.revMes) + " / usu", color: GRAY });
										}
										var kpiSections = [
											{ title: "Ingresos", color: BLUE, rows: ingresoRows },
											{ title: "Rentabilidad", color: ec, rows: [
												{ label: "EBITDA / mes", value: fMoney(calcs.ebitda), color: ec, big: true },
												{ label: "Margen EBITDA", value: fP(calcs.ebitdaPct), color: ec },
												{ label: "Margen unitario", value: fP(calcs.margenPct), color: mc },
												{ label: "por usuario", value: fMoney2(calcs.margenUnit) + " / usu", color: GRAY },
											]},
											{ title: "Costos", color: GRAY, rows: [
												{ label: "CF directo / mes", value: fMoney(costs.cfDirecto), color: BLUE },
												{ label: "CV por usuario", value: fMoney2(calcs.cvMes) + " / usu", color: WN },
												{ label: "Costo total / mes", value: fMoney(costoTotal), color: BLACK, big: true },
												{ label: "por usuario", value: fMoney2(users > 0 ? costoTotal / users : 0) + " / usu", color: GRAY },
											]},
											{ title: "Break-even", color: bc, rows: [
												{ label: "Usuarios necesarios", value: isFinite(calcs.beUsuarios) ? fK(calcs.beUsuarios) + " usu." : "∞", color: bc, big: true },
												{ label: "Alcance", value: calcs.beMes ? "Mes " + calcs.beMes : "No en 24M", color: bc },
											]},
										];
										if (precioSugerido !== null) {
											kpiSections.push({ title: "Precio " + margenDeseado + "% margen", color: OK, rows: [
												{ label: "Precio sugerido", value: fMoney2(precioSugerido), color: OK, big: true },
												{ label: "vs. actual", value: "Δ " + fMoney2(precioSugerido - (inp.precio || 0)), color: GRAY },
											]});
										}
										return kpiSections.map(function (sec, si) {
											return (
												<div key={sec.title} style={{ borderTop: si > 0 ? "1px solid " + BORD : "none" }}>
													<div style={Object.assign({}, os(8, 700, WHITE), { background: sec.color, padding: "4px 12px", textTransform: "uppercase", letterSpacing: "0.6px", opacity: 0.92 })}>{sec.title}</div>
													<div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
														{sec.rows.map(function (row) {
															return (
																<div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
																	<span style={os(9, 400, GRAY)}>{row.label}</span>
																	<span style={Object.assign({}, os(row.big ? 12 : 10, 700, row.color), { fontFamily: "Courier New,monospace", whiteSpace: "nowrap" })}>{row.value}</span>
																</div>
															);
														})}
													</div>
												</div>
											);
										});
									})()}
								</div>
							</div>
						</div>
					)}
					{activeNavItem === "suscripción" && <TabSuscripcion costs={costs} currency={currency} tc={tc} users={users} />}
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
