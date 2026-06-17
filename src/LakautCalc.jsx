import { useState, useMemo, useEffect, useRef } from "react";
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
import { TabDescuentos } from "./components/tabs/TabDescuentos";
import { TabGuardados } from "./components/tabs/TabGuardados";
import { TabSuscripcion } from "./components/tabs/TabSuscripcion";
import { TabComparacion } from "./components/tabs/TabComparacion";
import { TabVolumen } from "./components/tabs/TabVolumen";
import { TabVolumenConfig } from "./components/tabs/TabVolumenConfig";
import { Cotizadora } from "./components/Cotizadora";
import { TabCanalWeb } from "./components/tabs/TabCanalWeb";
import { TabCanalDistribuidores } from "./components/tabs/TabCanalDistribuidores";
import { TabCanalB2B2C } from "./components/tabs/TabCanalB2B2C";
import { TabHistorial } from "./components/tabs/TabHistorial";
import { TabClientes } from "./components/tabs/TabClientes";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { DEFAULT_VOLUME_TIERS } from "./data/volumeTiers";

// ─── Archive mapping arch → pack key for strategy text ─────────────────────────
const ARCH_TO_PACK = { bolsa: "A", sub: "B", ppu: "C", anual: "D", free: "E", hibrido: "F" };

function LakautCalcInner() {
	const { models } = useModels();
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

	// Top-level navigation
	const [section, setSection] = useState("cotizadora");

	// Modelos sub-nav
	const [modTab, setModTab] = useState("análisis");

	// Configuración sub-nav
	const [cfgTab, setCfgTab] = useState("costos");


	// Selected model id in análisis mode
	const [selectedModelId, setSelectedModelId] = useState(function () {
		return models.length > 0 ? models[0].id : null;
	});

	// Analysis state (sandbox — loaded from model, editable locally)
	const [family, setFamily] = useState("B");
	const [users, setUsers] = useState(20000);
	const [tab, setTab] = useState("costos");
	const [currency, setCurrency] = useState("USD");
	const [tc, setTc] = useState(1410);
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

	const [cotizadoraMode, setCotizadoraMode] = useState("web");
	const [pendingEdit, setPendingEdit] = useState(null);

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
		const rowTot = function (r) { return (r.qty || 1) * r.v; };
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
		return { cfTotal, cfSegmento, cfDirecto, cvCertBase, cvFirmaBase, activosTotal, capacidadFirmasAnual };
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
	const SECTIONS = [
		{ k: "cotizadora", label: "Cotizadora" },
		{ k: "configuración", label: "Configuración" },
	];
	const MOD_TABS = [
		// Grupo gestión
		{ k: "análisis", label: "Simulador", group: "gestión" },
		// Grupo herramientas
		{ k: "suscripción", label: "Suscripción", group: "herramientas" },
		{ k: "comparación", label: "Comparación", group: "herramientas" },
	];
	const activeModTab = MOD_TABS.find(function (t) { return t.k === modTab; });
	const CFG_TABS = [
		{ k: "costos", label: "Costos" },
		{ k: "precios", label: "Precios" },
		{ k: "modelos", label: "Modelos pre-cargados" },
	];

	const selectedModel = models.find(function (m) { return m.id === selectedModelId; });

	// Description text: prefer model tagline, fallback to pack strategy
	const strategyText = selectedModel && modTab === "análisis"
		? (selectedModel.tagline || cfg.strategy)
		: cfg.strategy;

	return (
		<div style={{ background: BG, minHeight: "100vh", fontFamily: "'Open Sans',sans-serif", boxSizing: "border-box" }}>

			{/* ─── Header ────────────────────────────────────────────────────────── */}
			<div className="no-print" style={{ background: BLUE, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div>
					<div style={Object.assign({}, mont(22), { color: WHITE })}>LAKAUT</div>
					<div style={Object.assign({}, os(13, 400, WHITE), { opacity: 0.75, marginTop: 2 })}>
						Calculadora de Pricing · Modelos y Planes Comerciales
					</div>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
					<div style={Object.assign({}, os(12, 400, WHITE), { opacity: 0.6 })}>
						{new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
					</div>
					<button
						onClick={function () { window.print(); }}
						style={{ padding: "6px 14px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, color: WHITE, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
					>
						Exportar PDF
					</button>
				</div>
			</div>

			{/* ─── Top-level nav ──────────────────────────────────────────────────── */}
			<div className="no-print" style={{ background: WHITE, borderBottom: "2px solid " + BORD, padding: "0 24px", display: "flex", gap: 0, alignItems: "center" }}>
				<div style={{ display: "flex", flex: 1 }}>
					{SECTIONS.map(function (s) {
						const act = section === s.k;
						return (
							<button
								key={s.k}
								onClick={function () { setSection(s.k); }}
								style={{ padding: "14px 24px", fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: act ? 700 : 400, color: act ? BLUE : GRAY, background: "transparent", border: "none", cursor: "pointer", borderBottom: "3px solid " + (act ? BLUE : "transparent"), marginBottom: -2 }}
							>
								{s.label}
							</button>
						);
					})}
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
					{["USD", "ARS"].map(function (c) {
						return (
							<button key={c} onClick={function () { setCurrency(c); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid " + (currency === c ? BLUE : BORD), background: currency === c ? BLUE : WHITE, color: currency === c ? WHITE : GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{c}</button>
						);
					})}
					{currency === "ARS" && (
						<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
							<span style={os(11, 400, GRAY)}>TC:</span>
							<input type="number" value={tc} onChange={function (e) { setTc(Number(e.target.value) || 1); }} style={{ width: 72, padding: "3px 7px", border: "1px solid " + BORD, borderRadius: 6, fontFamily: "'Open Sans',sans-serif", fontSize: 12, color: BLACK }} />
						</div>
					)}
				</div>
			</div>

			{/* ════════════════════════════════════════════════════════════════════════
			    MODELOS
			    ════════════════════════════════════════════════════════════════════════ */}
			{section === "modelos" && (
				<div>
					{/* Modelos sub-nav */}
					<div className="no-print" style={{ background: WHITE, borderBottom: "1px solid " + BORD, padding: "0 24px", display: "flex", alignItems: "stretch", gap: 0 }}>
						{MOD_TABS.map(function (t, i) {
							const act = modTab === t.k;
							const prevGroup = i > 0 ? MOD_TABS[i - 1].group : t.group;
							const groupBreak = i > 0 && t.group !== prevGroup;
							return (
								<div key={t.k} style={{ display: "flex", alignItems: "stretch" }}>
									{groupBreak && (
										<div style={{ width: 1, background: BORD, margin: "8px 6px" }} />
									)}
									<button
										onClick={function () { setModTab(t.k); }}
										style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: act ? 700 : 400, color: act ? BLUE : GRAY, background: act ? BLUEL : "transparent", border: "none", cursor: "pointer", borderBottom: "2px solid " + (act ? BLUE : "transparent"), whiteSpace: "nowrap" }}
									>
										{t.label}
									</button>
								</div>
							);
						})}
					</div>
					{/* Breadcrumb */}
					<div style={{ background: "#f8fafc", borderBottom: "1px solid " + BORD, padding: "5px 24px" }}>
						<span style={os(10, 400, GRAY)}>Modelos</span>
						<span style={Object.assign({}, os(10, 400, GRAY), { margin: "0 5px" })}>·</span>
						<span style={os(10, 700, GRAY)}>{activeModTab ? activeModTab.label : ""}</span>
					</div>

					{/* ── Análisis ──────────────────────────────────────────────────────── */}
					{modTab === "análisis" && (
						<div>
							{/* Model selector strip */}
							<div className="no-print" style={{ background: WHITE, borderBottom: "1px solid " + BORD, padding: "10px 24px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
								<span style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginRight: 4 })}>
									Modelo:
								</span>
								{models.map(function (m) {
									const act = selectedModelId === m.id;
									return (
										<button
											key={m.id}
											onClick={function () { setSelectedModelId(m.id); }}
											style={{ padding: "5px 14px", borderRadius: 20, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: act ? 700 : 400, color: act ? WHITE : GRAY, background: act ? (m.color || BLUE) : WHITE, border: "1.5px solid " + (act ? (m.color || BLUE) : BORD), cursor: "pointer" }}
										>
											{m.label}
										</button>
									);
								})}
								{models.length === 0 && (
									<span style={os(12, 400, GRAY)}>Sin modelos guardados · creá uno en "Configuración › Modelos pre-cargados"</span>
								)}
							</div>

							{/* Strategy / tagline banner */}
							<div style={{ background: BLUEL, borderBottom: "1px solid " + BORD, padding: "10px 24px", display: "flex", gap: 12, alignItems: "flex-start" }}>
								<div style={Object.assign({}, mont(13), { color: selectedModel ? (selectedModel.color || BLUE) : BLUE, flexShrink: 0, marginTop: 1 })}>
									{selectedModel ? selectedModel.label : "Estrategia"}
								</div>
								<div style={os(12, 400, BLACK)}>{strategyText}</div>
							</div>

							{/* Body */}
							<div style={{ display: "flex", gap: 16, padding: "16px 24px", alignItems: "flex-start" }}>
								{/* Left panel */}
								<div className="no-print" style={{ width: "clamp(200px, 20vw, 248px)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
									{/* Model info */}
									{selectedModel && (
										<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: 16, borderLeft: "3px solid " + (selectedModel.color || BLUE) }}>
											<Sec title={selectedModel.label} />
											<div style={Object.assign({}, os(10, 400, GRAY), { marginBottom: 8 })}>
												{selectedModel.segment === "persona" ? "Persona" : "Empresa"} · {selectedModel.arch || "bolsa"} · {selectedModel.vigencia || 24}m
											</div>
											<div style={Object.assign({}, os(9, 400, GRAY), { background: BLUEL, borderRadius: 6, padding: "6px 8px" })}>
												Editando en modo sandbox. Los cambios aquí no modifican el modelo guardado.
											</div>
										</div>
									)}

									{/* Pack config (sandbox) */}
									<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: 16 }}>
										<Sec title="Parámetros (sandbox)" />
										<PackFields arch={cfg.arch} inp={inp} update={updInp} currency={currency} tc={tc} />
										<NumInput label={scaleLabel} value={users} onChange={setUsers} suffix="usu" />
										{cfg.arch === "free" && (
											<div style={{ background: "#fee2e2", border: "1px solid " + ER + "44", borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
												<div style={Object.assign({}, os(10, 700, ER), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 })}>
													Costo asumido / usuario / mes
												</div>
												<div style={Object.assign({}, mont(20), { color: ER })}>{fMoney2(calcs.cvMes)}</div>
												<div style={Object.assign({}, os(11, 400, ER), { marginTop: 3, opacity: 0.85 })}>
													{users.toLocaleString()} usuarios → {fMoney(calcs.cvTotal)} / mes sin revenue
												</div>
											</div>
										)}

										{/* Margen objetivo — dentro de parámetros */}
										<div style={{ borderTop: "1px solid " + BORD, marginTop: 12, paddingTop: 12 }}>
											<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: margenDeseado !== null ? 10 : 0 }}>
												<span style={os(11, 400, GRAY)}>Margen objetivo</span>
												<label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
													<input
														type="checkbox"
														checked={margenDeseado !== null}
														onChange={function (e) { setMargenDeseado(e.target.checked ? 40 : null); }}
													/>
													<span style={os(11, 400, GRAY)}>{margenDeseado !== null ? "Activo" : "Activar"}</span>
												</label>
											</div>
											{margenDeseado !== null && (
												<NumInput value={margenDeseado} onChange={setMargenDeseado} suffix="%" />
											)}
										</div>
									</div>

									{/* Optional services */}
									<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: 16 }}>
										<Sec title="Servicios opcionales" />
										{Object.entries(SERVICES_DEF).map(function (entry) {
											var k = entry[0], s = entry[1];
											return (
												<Toggle key={k} label={s.label} cost={s.cost} costType={s.costType} checked={svc[k]} onChange={function (v) { updSvc(k, v); }} />
											);
										})}
									</div>

								</div>

								{/* Right panel: analysis tabs */}
								<div style={{ flex: "1 1 320px", minWidth: 0 }}>
									<div className="no-print" style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: "12px 12px 0 0", display: "flex", overflowX: "auto" }}>
										{ANALYSIS_TABS.map(function (t) {
											return (
												<button
													key={t}
													onClick={function () { setTab(t); }}
													style={{ padding: "12px 18px", fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: tab === t ? 700 : 400, color: tab === t ? BLUE : GRAY, background: "transparent", border: "none", cursor: "pointer", whiteSpace: "nowrap", borderBottom: "3px solid " + (tab === t ? BLUE : "transparent"), textTransform: "capitalize" }}
												>
													{t}
												</button>
											);
										})}
									</div>
									<div style={{ background: WHITE, border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 12px 12px", padding: 20 }}>
										{tab === "costos" && <TabCostos calcs={calcs} users={users} costConfig={costConfig} costs={costs} currency={currency} tc={tc} />}
										{tab === "precios" && <TabPrecios calcs={calcs} users={users} costs={costs} currency={currency} tc={tc} arch={cfg.arch} inp={inp} />}
										{tab === "proyección" && (
											<TabProyeccion
												proj={calcs.proj} beMes={calcs.beMes} calcs={calcs} costs={costs}
												currency={currency} tc={tc} projParams={projParams}
												setProjParams={setProjParams} arch={cfg.arch}
											/>
										)}
										{tab === "break-even" && <TabBreakEven arch={cfg.arch} inp={inp} svc={svc} currentUsers={users} costs={costs} />}
										</div>
								</div>

								{/* Right KPI panel */}
								<div className="no-print" style={{ width: 188, flexShrink: 0, background: WHITE, border: "1px solid " + BORD, borderRadius: 12, overflow: "hidden", position: "sticky", top: 16 }}>
									{(function () {
										var costoTotal = costs.cfDirecto + calcs.cvMes * users + (calcs.cvExtras || 0);
										var hasExtras = (calcs.extraRevMes || 0) > 0;
										var ingresoRows = [
											{ label: "Revenue / mes", value: fMoney(calcs.revTotal), color: BLUE, big: true },
										];
										if (hasExtras) {
											ingresoRows.push({ label: "Packs", value: fMoney(calcs.revPackTotal), color: BLUE });
											ingresoRows.push({ label: "Firmas extra", value: fMoney(calcs.extraRevMes), color: "#15803d" });
										} else {
											ingresoRows.push({ label: "por usuario", value: fMoney2(calcs.revMes) + " / usu", color: GRAY });
										}
										var sections = [
											{
												title: "Ingresos",
												color: BLUE,
												rows: ingresoRows,
											},
											{
												title: "Rentabilidad",
												color: ec,
												rows: [
													{ label: "EBITDA / mes", value: fMoney(calcs.ebitda), color: ec, big: true },
													{ label: "Margen EBITDA", value: fP(calcs.ebitdaPct), color: ec },
													{ label: "Margen unitario", value: fP(calcs.margenPct), color: mc },
													{ label: "por usuario", value: fMoney2(calcs.margenUnit) + " / usu", color: GRAY },
												],
											},
											{
												title: "Costos",
												color: GRAY,
												rows: [
													{ label: "CF directo / mes", value: fMoney(costs.cfDirecto), color: BLUE },
													{ label: "CV por usuario", value: fMoney2(calcs.cvMes) + " / usu", color: WN },
													{ label: "Costo total / mes", value: fMoney(costoTotal), color: BLACK, big: true },
													{ label: "por usuario", value: fMoney2(users > 0 ? costoTotal / users : 0) + " / usu", color: GRAY },
												],
											},
											{
												title: "Break-even",
												color: bc,
												rows: [
													{ label: "Usuarios necesarios", value: isFinite(calcs.beUsuarios) ? fK(calcs.beUsuarios) + " usu." : "∞", color: bc, big: true },
													{ label: "Alcance", value: calcs.beMes ? "Mes " + calcs.beMes : "No en 24M", color: bc },
												],
											},
										];
										if (precioSugerido !== null) {
											sections.push({
												title: "Precio " + margenDeseado + "% margen",
												color: OK,
												rows: [
													{ label: "Precio sugerido", value: fMoney2(precioSugerido), color: OK, big: true },
													{ label: "vs. actual", value: "Δ " + fMoney2(precioSugerido - (inp.precio || 0)), color: GRAY },
												],
											});
										}
										return sections.map(function (sec, si) {
											return (
												<div key={sec.title} style={{ borderTop: si > 0 ? "1px solid " + BORD : "none" }}>
													<div style={Object.assign({}, os(8, 700, WHITE), { background: sec.color, padding: "4px 12px", textTransform: "uppercase", letterSpacing: "0.6px", opacity: 0.92 })}>
														{sec.title}
													</div>
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

					{/* ── Suscripción ───────────────────────────────────────────────── */}
					{modTab === "suscripción" && (
						<div style={{ padding: 24 }}>
							<TabSuscripcion costs={costs} currency={currency} tc={tc} users={users} />
						</div>
					)}

					{/* ── Comparación ───────────────────────────────────────────────── */}
					{modTab === "comparación" && (
						<div style={{ padding: 24 }}>
							<TabComparacion costs={costs} currency={currency} tc={tc} />
						</div>
					)}


					</div>
			)}

			{/* ════════════════════════════════════════════════════════════════════════
			    OTHER SECTIONS
			    ════════════════════════════════════════════════════════════════════════ */}
			{section === "cotizadora" && (
				<div>
					<Tabs value={cotizadoraMode} onValueChange={setCotizadoraMode}>
						<div className="no-print border-b bg-card px-6 pt-3 pb-3">
							<TabsList>
								<TabsTrigger value="web">Canal Web</TabsTrigger>
								<TabsTrigger value="distribuidores">Distribuidores</TabsTrigger>
								<TabsTrigger value="b2b2c">B2B2C (IDC)</TabsTrigger>
								<TabsTrigger value="historial">Historial</TabsTrigger>
								<TabsTrigger value="clientes">Clientes</TabsTrigger>
							</TabsList>
						</div>
						<div className="p-6">
							<TabsContent value="web"><TabCanalWeb costs={costs} currency={currency} tc={tc} /></TabsContent>
							<TabsContent value="distribuidores"><TabCanalDistribuidores costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} pendingEdit={pendingEdit && pendingEdit.channel === "distribuidores" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} /></TabsContent>
							<TabsContent value="b2b2c"><TabCanalB2B2C costs={costs} currency={currency} tc={tc} dealsApi={dealsApi} clientsApi={clientsApi} pendingEdit={pendingEdit && pendingEdit.channel === "b2b2c" ? pendingEdit : null} onConsumeEdit={function () { setPendingEdit(null); }} /></TabsContent>
							<TabsContent value="historial"><TabHistorial dealsApi={dealsApi} currency={currency} tc={tc} onEditQuote={function (q) { setPendingEdit(q); setCotizadoraMode(q.channel); }} /></TabsContent>
							<TabsContent value="clientes"><TabClientes clientsApi={clientsApi} dealsApi={dealsApi} currency={currency} tc={tc} onEditDeal={function (d) { setPendingEdit(d); setCotizadoraMode(d.channel); }} /></TabsContent>
						</div>
					</Tabs>
				</div>
			)}

			{section === "configuración" && (
				<div>
					{/* Configuración sub-nav */}
					<div className="no-print" style={{ background: WHITE, borderBottom: "1px solid " + BORD, padding: "0 24px", display: "flex", alignItems: "stretch", gap: 0 }}>
						{CFG_TABS.map(function (t) {
							const act = cfgTab === t.k;
							return (
								<button
									key={t.k}
									onClick={function () { setCfgTab(t.k); }}
									style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: act ? 700 : 400, color: act ? BLUE : GRAY, background: act ? BLUEL : "transparent", border: "none", cursor: "pointer", borderBottom: "2px solid " + (act ? BLUE : "transparent"), whiteSpace: "nowrap" }}
								>
									{t.label}
									{t.k === "modelos" && (
										<span style={{ background: act ? BLUE : "#e2e8f0", color: act ? WHITE : GRAY, fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", lineHeight: "14px" }}>
											{models.length}
										</span>
									)}
								</button>
							);
						})}
					</div>
					{/* Breadcrumb */}
					<div style={{ background: "#f8fafc", borderBottom: "1px solid " + BORD, padding: "5px 24px" }}>
						<span style={os(10, 400, GRAY)}>Configuración</span>
						<span style={Object.assign({}, os(10, 400, GRAY), { margin: "0 5px" })}>·</span>
						<span style={os(10, 700, GRAY)}>{(CFG_TABS.find(function (t) { return t.k === cfgTab; }) || {}).label}</span>
					</div>

					<div style={{ padding: 24 }}>
						{cfgTab === "costos" && <TabConfig costConfig={costConfig} setCostConfig={setCostConfig} tc={tc} setTc={setTc} />}
						{cfgTab === "precios" && <TabDescuentos volumeTiers={volumeTiers} onUpdateVolumeTiers={updateVolumeTiers} />}
						{cfgTab === "modelos" && (
							<TabGuardados
								selectedId={selectedModelId}
								onSelect={function (id) {
									setSelectedModelId(id);
									if (id) { setModTab("análisis"); setSection("modelos"); }
								}}
							/>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export default function LakautCalc() {
	return (
		<ModelsProvider>
			<DiscountProvider>
				<LakautCalcInner />
			</DiscountProvider>
		</ModelsProvider>
	);
}
