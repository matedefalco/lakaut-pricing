import { useState, useMemo, useEffect } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, BG, OK, WN, ER, os, mont } from "./theme/tokens";
import { fD2, fP, fK } from "./utils/formatters";
import { makeMoney } from "./utils/useMoney";
import { FIXED_ITEMS, ASSET_ITEMS, CV_CERT_ITEMS, CV_FIRMA_ITEMS, CAPACIDAD_FIRMAS_ANUAL, SERVICES_DEF } from "./data/costs";
import { PACKS } from "./data/packs";
import { engine } from "./engine/engine";
import { modelToInp } from "./utils/modelToInp";
import { ModelsProvider, useModels } from "./context/ModelsContext";
import { KpiCard } from "./components/ui/KpiCard";
import { Sec } from "./components/ui/Sec";
import { PackFields } from "./components/ui/PackFields";
import { NumInput } from "./components/ui/NumInput";
import { Toggle } from "./components/ui/Toggle";
import { TabCostos } from "./components/tabs/TabCostos";
import { TabPrecios } from "./components/tabs/TabPrecios";
import { TabProyeccion } from "./components/tabs/TabProyeccion";
import { TabBreakEven } from "./components/tabs/TabBreakEven";
import { TabConfig } from "./components/tabs/TabConfig";
import { TabGuardados } from "./components/tabs/TabGuardados";
import { TabSuscripcion } from "./components/tabs/TabSuscripcion";
import { TabComparacion } from "./components/tabs/TabComparacion";
import { Cotizadora } from "./components/Cotizadora";
import { Comparison } from "./components/Comparison";
import { EnterpriseQuote } from "./components/EnterpriseQuote";
import { CartQuote } from "./components/CartQuote";

// ─── Archive mapping arch → pack key for strategy text ─────────────────────────
const ARCH_TO_PACK = { bolsa: "A", sub: "B", ppu: "C", anual: "D", free: "E", hibrido: "F" };

function LakautCalcInner() {
	const { models } = useModels();

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
	const [section, setSection] = useState("modelos");

	// Modelos sub-nav: análisis | gestionar | suscripción | comparación
	const [modTab, setModTab] = useState("análisis");

	// Selected model id in análisis mode
	const [selectedModelId, setSelectedModelId] = useState(function () {
		return models.length > 0 ? models[0].id : null;
	});

	// Analysis state (sandbox — loaded from model, editable locally)
	const [family, setFamily] = useState("B");
	const [users, setUsers] = useState(20000);
	const [tab, setTab] = useState("costos");
	const [currency, setCurrency] = useState("USD");
	const [tc, setTc] = useState(1150);
	const [svc, setSvc] = useState({ cloudStorage: false, mailCert: false, paywall: false });
	const [inp, setInp] = useState(PACKS.B.defaults);
	const [projParams, setProjParams] = useState({ usersM1: 1000, growthRate: 10, churnRate: 5 });
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
		const cfOps = costConfig.fixedItems.reduce(function (s, r) { return s + r.v; }, 0);
		const cfAmort = costConfig.assetItems.reduce(function (s, r) { return s + r.amort; }, 0);
		const cfTotal = cfOps + cfAmort;
		const cfSegmento = costConfig.fixedItems.filter(function (r) { return r.cat === "RRHH"; }).reduce(function (s, r) { return s + r.v; }, 0);
		const cfDirecto = costConfig.fixedItems.filter(function (r) { return r.tipo === "directo"; }).reduce(function (s, r) { return s + r.v; }, 0)
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
		{ k: "configuración", label: "Configuración" },
		{ k: "modelos", label: "Modelos" },
		{ k: "cotizadora", label: "Cotizadora" },
		{ k: "carrito", label: "Armar Cotización" },
		{ k: "comparación", label: "Comparación" },
		{ k: "enterprise", label: "Enterprise" },
	];
	const MOD_TABS = [
		{ k: "análisis", label: "Análisis" },
		{ k: "gestionar", label: "Modelos guardados" },
		{ k: "suscripción", label: "Suscripción" },
		{ k: "comparación", label: "Comparación" },
	];

	const selectedModel = models.find(function (m) { return m.id === selectedModelId; });

	// Description text: prefer model tagline, fallback to pack strategy
	const strategyText = selectedModel && modTab === "análisis"
		? selectedModel.tagline
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
				<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
					<button
						onClick={function () { window.print(); }}
						style={{ padding: "6px 14px", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, color: WHITE, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
					>
						Exportar PDF
					</button>
					<div style={Object.assign({}, os(12, 400, WHITE), { opacity: 0.6 })}>
						{new Date().toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
					</div>
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
					<div className="no-print" style={{ background: WHITE, borderBottom: "1px solid " + BORD, padding: "0 24px", display: "flex", gap: 0 }}>
						{MOD_TABS.map(function (t) {
							const act = modTab === t.k;
							return (
								<button
									key={t.k}
									onClick={function () { setModTab(t.k); }}
									style={{ padding: "10px 20px", fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: act ? 700 : 400, color: act ? BLUE : GRAY, background: act ? BLUEL : "transparent", border: "none", cursor: "pointer", borderBottom: "2px solid " + (act ? BLUE : "transparent") }}
								>
									{t.label}
								</button>
							);
						})}
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
									<span style={os(12, 400, GRAY)}>Sin modelos guardados · creá uno en "Modelos guardados"</span>
								)}
							</div>

							{/* Strategy / tagline banner */}
							<div style={{ background: BLUEL, borderBottom: "1px solid " + BORD, padding: "10px 24px", display: "flex", gap: 12, alignItems: "flex-start" }}>
								<div style={Object.assign({}, mont(13), { color: selectedModel ? (selectedModel.color || BLUE) : BLUE, flexShrink: 0, marginTop: 1 })}>
									{selectedModel ? selectedModel.label : "Estrategia"}
								</div>
								<div style={os(12, 400, BLACK)}>{strategyText}</div>
							</div>

							{/* KPI strip */}
							<div style={{ padding: "16px 24px 0" }}>
								<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
									<KpiCard
										label="Revenue / mes"
										value={fMoney(calcs.revTotal)}
										sub={fMoney2(calcs.revMes) + " / usuario / mes"}
										accent={BLUE}
										tooltip={"Revenue total mensual = precio por usuario × " + users.toLocaleString() + " usuarios."}
									/>
									<KpiCard
										label="EBITDA / mes"
										value={fMoney(calcs.ebitda)}
										sub={"Margen " + fP(calcs.ebitdaPct)}
										accent={ec}
										tooltip={"EBITDA = Revenue total − CV total − CF directo."}
									/>
									<KpiCard
										label="Margen unitario"
										value={fP(calcs.margenPct)}
										sub={fMoney2(calcs.margenUnit) + " / usuario / mes"}
										accent={mc}
										tooltip={"Margen unitario = precio − CV por usuario."}
									/>
									<KpiCard
										label="Break-even"
										value={fK(calcs.beUsuarios) + " usu."}
										sub={calcs.beMes ? "Alcanzado en mes " + calcs.beMes : "No alcanza en 24M"}
										accent={bc}
										tooltip={"Usuarios mínimos para cubrir el CF directo."}
									/>
									{cfg.arch === "free" && (
										<KpiCard label="Costo asumido/mes" value={fMoney(calcs.cvTotal)} sub="Sin revenue · costo directo" accent={ER} />
									)}
								</div>
							</div>

							{/* Body */}
							<div style={{ display: "flex", gap: 16, padding: "16px 24px", flexWrap: "wrap" }}>
								{/* Left panel */}
								<div className="no-print" style={{ width: "clamp(220px, 22vw, 268px)", flexShrink: 0, display: "flex", flexDirection: "column", gap: 12 }}>
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
									</div>

									{/* Cost reference */}
									<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 12, padding: 16 }}>
										<Sec title="Referencia de costos" />
										<div style={{ background: BLUEL, borderRadius: 10, padding: "10px 14px" }}>
											{[
												{ l: "Break-even", v: isFinite(calcs.beUsuarios) ? calcs.beUsuarios.toLocaleString("es-AR") + " usu." : "∞", color: isFinite(calcs.beUsuarios) ? OK : ER },
												{ l: "CF directo / mes", v: fMoney(costs.cfDirecto), color: OK },
												{ l: "CV firma / unidad", v: fMoney2(calcs.cvFirmaUnit), color: BLUE },
												{ l: "Infra / firma", v: fMoney2(calcs.infraPorFirma), color: GRAY },
											].map(function (row) {
												return (
													<div key={row.l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
														<span style={os(11, 400, GRAY)}>{row.l}</span>
														<span style={Object.assign({}, os(11, 700, row.color), { fontFamily: "Courier New,monospace" })}>{row.v}</span>
													</div>
												);
											})}
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
							</div>
						</div>
					)}

					{/* ── Gestionar modelos (CRUD) ──────────────────────────────────── */}
					{modTab === "gestionar" && (
						<div style={{ padding: 24 }}>
							<TabGuardados
								selectedId={selectedModelId}
								onSelect={function (id) {
									setSelectedModelId(id);
									if (id) setModTab("análisis");
								}}
							/>
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
				<div style={{ padding: 24 }}>
					<Cotizadora costs={costs} currency={currency} tc={tc} />
				</div>
			)}

			{section === "carrito" && (
				<div style={{ padding: 24 }}>
					<CartQuote costs={costs} currency={currency} tc={tc} />
				</div>
			)}

			{section === "comparación" && (
				<div style={{ padding: 24 }}>
					<Comparison costs={costs} currency={currency} tc={tc} />
				</div>
			)}

			{section === "enterprise" && (
				<div style={{ padding: 24 }}>
					<EnterpriseQuote costs={costs} currency={currency} tc={tc} />
				</div>
			)}

			{section === "configuración" && (
				<div style={{ padding: 24 }}>
					<TabConfig costConfig={costConfig} setCostConfig={setCostConfig} tc={tc} setTc={setTc} />
				</div>
			)}
		</div>
	);
}

export default function LakautCalc() {
	return (
		<ModelsProvider>
			<LakautCalcInner />
		</ModelsProvider>
	);
}
