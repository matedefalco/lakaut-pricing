import { useState, useRef, useEffect } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useModels } from "@/context/ModelsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

const ALL_COLS = [
	{ key: "precioARS", label: "Precio ARS" },
	{ key: "precioUSD", label: "Precio USD" },
	{ key: "certs", label: "Certs" },
	{ key: "firmas", label: "Firmas incl." },
	{ key: "firmaExtra", label: "Firma extra" },
	{ key: "cvTotal", label: "CV total" },
	{ key: "margen", label: "Cont. marginal" },
	{ key: "beAnual", label: "BE anual" },
];

function ColFilterDropdown({ visible, onToggle }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useEffect(function () {
		function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
		document.addEventListener("mousedown", handler);
		return function () { document.removeEventListener("mousedown", handler); };
	}, []);
	return (
		<div ref={ref} style={{ position: "relative", display: "inline-block" }}>
			<button
				onClick={function () { setOpen(function (o) { return !o; }); }}
				style={{
					display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
					border: "1px solid var(--border)", borderRadius: 6, background: open ? "var(--accent)" : "var(--background)",
					cursor: "pointer", fontSize: 12, fontWeight: 500, color: "var(--foreground)",
				}}
			>
				<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
					<line x1="2" y1="4" x2="14" y2="4" /><line x1="4" y1="8" x2="12" y2="8" /><line x1="6" y1="12" x2="10" y2="12" />
				</svg>
				Propiedades
				<span style={{ fontSize: 10, background: "var(--muted)", borderRadius: 10, padding: "1px 6px", color: "var(--muted-foreground)" }}>
					{visible.size}/{ALL_COLS.length}
				</span>
			</button>
			{open && (
				<div style={{
					position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
					background: "var(--background)", border: "1px solid var(--border)",
					borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 200, padding: "6px 0",
				}}>
					<div style={{ padding: "4px 12px 6px", fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
						Columnas visibles
					</div>
					{ALL_COLS.map(function (col) {
						const checked = visible.has(col.key);
						return (
							<label key={col.key} style={{
								display: "flex", alignItems: "center", gap: 9, padding: "6px 12px",
								cursor: "pointer", fontSize: 13, color: "var(--foreground)",
								background: checked ? "var(--accent)" : "transparent",
							}}>
								<input
									type="checkbox"
									checked={checked}
									onChange={function () { onToggle(col.key); }}
									style={{ accentColor: "var(--primary)", width: 14, height: 14, cursor: "pointer" }}
								/>
								{col.label}
							</label>
						);
					})}
					<div style={{ borderTop: "1px solid var(--border)", margin: "4px 0" }} />
					<div style={{ display: "flex", gap: 6, padding: "4px 12px" }}>
						<button onClick={function () { ALL_COLS.forEach(function (c) { if (!visible.has(c.key)) onToggle(c.key); }); }}
							style={{ fontSize: 11, color: "var(--primary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
							Mostrar todas
						</button>
						<span style={{ color: "var(--muted-foreground)" }}>·</span>
						<button onClick={function () { ALL_COLS.forEach(function (c) { if (visible.has(c.key)) onToggle(c.key); }); }}
							style={{ fontSize: 11, color: "var(--muted-foreground)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
							Ocultar todas
						</button>
					</div>
				</div>
			)}
		</div>
	);
}

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }

const PACK_COLORS = ["#378ADD", "#1D9E75", "#BA7517", "#993556", "#534AB7", "#D85A30", "#639922"];

function PortfolioSimulator({ models, costs, currency, tc }) {
	const { fMoney2 } = makeMoney(currency, tc);
	const { fMoney: fUSD } = makeMoney("USD", tc);
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;
	const cf = costs.cfDirecto;

	const activeModels = models.filter(function (m) { return m.activo !== false && m.priceUSD && m.priceUSD > 0; });

	const [units, setUnits] = useState(function () {
		const init = {};
		activeModels.forEach(function (m) { init[m.id] = 0; });
		return init;
	});

	function setUnit(id, val) {
		setUnits(function (prev) { return Object.assign({}, prev, { [id]: Math.max(0, Math.round(val) || 0) }); });
	}

	const rows = activeModels.map(function (m, i) {
		const certCost = (m.certs || 1) * cvCert;
		const firmasCost = m.ilimitadas ? 0 : (m.firmas || 0) * cvFirma;
		const cvTotal = certCost + firmasCost;
		const cmUnit = m.priceUSD - cvTotal;
		const u = units[m.id] || 0;
		const rev = m.priceUSD * u;
		const cmTot = cmUnit * u;
		return { m, cvTotal, cmUnit, u, rev, cmTot, color: PACK_COLORS[i % PACK_COLORS.length] };
	});

	const totalUnits = rows.reduce(function (s, r) { return s + r.u; }, 0);
	const totalRev = rows.reduce(function (s, r) { return s + r.rev; }, 0);
	const totalCM = rows.reduce(function (s, r) { return s + r.cmTot; }, 0);
	const cmPond = totalUnits > 0 ? totalCM / totalUnits : 0;
	const beUnits = cmPond > 0 ? Math.ceil(cf / cmPond) : Infinity;
	const ebitda = totalCM - cf;
	const cfPct = cf > 0 ? (totalCM / cf) * 100 : 0;
	const cfCovered = cfPct >= 100;

	const kpiCls = "rounded-md p-3 text-sm";
	const kpiBg = "bg-muted/50";

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="font-semibold text-foreground text-base">Simulador de portfolio</h3>
					<p className="text-xs text-muted-foreground mt-0.5">Estimá cuántas unidades vendés por mes de cada pack y verás si el mix cubre costos fijos.</p>
				</div>
				<button
					onClick={function () { const z = {}; activeModels.forEach(function (m) { z[m.id] = 0; }); setUnits(z); }}
					className="text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1"
				>
					Limpiar
				</button>
			</div>

			<Card>
				<CardContent className="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Pack</TableHead>
								<TableHead className="text-right">Precio USD</TableHead>
								<TableHead className="text-right">CV unit<InfoTooltip dir="down" text="Costo variable unitario = (certs × CV cert) + (firmas × CV firma)." /></TableHead>
								<TableHead className="text-right">CM unit<InfoTooltip dir="down" text="Contribución marginal unitaria = Precio USD − CV unit. Lo que aporta cada venta antes de cubrir CF." /></TableHead>
								<TableHead className="text-right">Unid / mes</TableHead>
								<TableHead className="text-right">Rev. mensual</TableHead>
								<TableHead className="text-right">CM mensual</TableHead>
								<TableHead className="text-right">Mix</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map(function (r) {
								const mix = totalUnits > 0 ? Math.round(r.u / totalUnits * 100) : 0;
								const cmColor = r.cmUnit >= 0 ? "text-[var(--success)]" : "text-destructive";
								return (
									<TableRow key={r.m.id}>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: r.color }} />
												<span className="font-semibold">{r.m.label}</span>
											</div>
											<div className="text-[11px] text-muted-foreground pl-4">{r.m.segment === "persona" ? "Persona / profesional" : "Empresa"}</div>
										</TableCell>
										<TableCell className="text-right tabular-nums">{fUSD(r.m.priceUSD)}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">{fMoney2(r.cvTotal)}</TableCell>
										<TableCell className={"text-right tabular-nums font-semibold " + cmColor}>{fMoney2(r.cmUnit)}</TableCell>
										<TableCell className="text-right">
											<input
												type="number"
												min="0"
												step="1"
												value={r.u}
												onChange={function (e) { setUnit(r.m.id, e.target.value); }}
												className="w-20 text-right text-sm border border-border rounded px-2 py-1 bg-background text-foreground tabular-nums"
											/>
										</TableCell>
										<TableCell className="text-right tabular-nums">{r.u > 0 ? fUSD(Math.round(r.rev)) : <span className="text-muted-foreground">—</span>}</TableCell>
										<TableCell className={"text-right tabular-nums font-semibold " + (r.u > 0 ? cmColor : "text-muted-foreground")}>{r.u > 0 ? fMoney2(Math.round(r.cmTot)) : "—"}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground text-xs">{r.u > 0 ? mix + "%" : "—"}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
						<tfoot>
							<tr className="border-t border-border bg-muted/30">
								<td colSpan={4} className="px-4 py-2.5 text-sm font-semibold text-foreground">Total</td>
								<td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-foreground">{totalUnits > 0 ? totalUnits.toLocaleString("es-AR") + " u." : "—"}</td>
								<td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-foreground">{totalRev > 0 ? fUSD(Math.round(totalRev)) : "—"}</td>
								<td className="px-4 py-2.5 text-right text-sm font-semibold tabular-nums text-foreground">{totalCM !== 0 ? fMoney2(Math.round(totalCM)) : "—"}</td>
								<td className="px-4 py-2.5 text-right text-xs text-muted-foreground">100%</td>
							</tr>
						</tfoot>
					</Table>
				</CardContent>
			</Card>

			<div className="grid grid-cols-4 gap-3">
				<div className={kpiCls + " " + kpiBg}>
					<div className="text-xs text-muted-foreground mb-1">CM ponderado</div>
					<div className="font-semibold text-foreground">{totalUnits > 0 ? fMoney2(Math.round(cmPond * 100) / 100) + " / u." : "—"}</div>
				</div>
				<div className={kpiCls + " " + kpiBg}>
					<div className="text-xs text-muted-foreground mb-1">BE portfolio</div>
					<div className="font-semibold text-foreground">{isFinite(beUnits) ? beUnits.toLocaleString("es-AR") + " u." : "—"}</div>
					{isFinite(beUnits) && totalUnits > 0 && (
						<div className={"text-xs mt-0.5 " + (totalUnits >= beUnits ? "text-[var(--success)]" : "text-[var(--warning)]")}>
							{totalUnits >= beUnits ? "Cubierto" : "Faltan " + (beUnits - totalUnits).toLocaleString("es-AR") + " u."}
						</div>
					)}
				</div>
				<div className={kpiCls + " " + kpiBg}>
					<div className="text-xs text-muted-foreground mb-1">Unidades actuales</div>
					<div className="font-semibold text-foreground">{totalUnits > 0 ? totalUnits.toLocaleString("es-AR") + " u." : "—"}</div>
				</div>
				<div className={kpiCls + " " + kpiBg}>
					<div className="text-xs text-muted-foreground mb-1">EBITDA mensual</div>
					<div className={"font-semibold " + (ebitda >= 0 ? "text-[var(--success)]" : "text-destructive")}>
						{totalUnits > 0 ? (ebitda >= 0 ? "+" : "") + fMoney2(Math.round(ebitda)) : "—"}
					</div>
				</div>
			</div>

			<div className="rounded-md border border-border p-4 space-y-2">
				<div className="flex justify-between items-center text-xs">
					<span className="text-muted-foreground font-medium">Cobertura de CF mensual</span>
					<span className="font-semibold text-foreground">{totalUnits > 0 ? Math.round(cfPct) + "%" : "0%"} <span className="text-muted-foreground font-normal">de {fMoney2(cf)}</span></span>
				</div>
				<div className="h-2 rounded-full bg-muted overflow-hidden">
					<div
						className="h-full rounded-full transition-all duration-200"
						style={{
							width: Math.min(cfPct, 100) + "%",
							background: cfCovered ? "var(--success)" : cfPct >= 60 ? "var(--warning)" : "var(--destructive)",
						}}
					/>
				</div>
				<p className="text-xs text-muted-foreground">
					{totalUnits === 0
						? "Ingresá unidades para ver la cobertura."
						: cfCovered
							? "El mix actual cubre CF y genera " + fMoney2(Math.round(ebitda)) + " de EBITDA mensual."
							: "Falta " + fMoney2(Math.round(cf - totalCM)) + " de CM para cubrir CF. Ajustá volumen o mix de packs."}
				</p>
			</div>

			<p className="text-[11px] text-muted-foreground">
				CM ponderado = Σ(CM unit × unidades) / Σ unidades · BE portfolio = CF directo / CM ponderado · CF directo mensual: {fMoney2(cf)}
			</p>
		</div>
	);
}

export function TabCanalWeb({ costs, currency, tc }) {
	const { models } = useModels();
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const { fMoney: fUSD } = makeMoney("USD", tc);
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;
	const [visibleCols, setVisibleCols] = useState(function () { return new Set(ALL_COLS.map(function (c) { return c.key; })); });
	function toggleCol(key) {
		setVisibleCols(function (prev) {
			const next = new Set(prev);
			if (next.has(key)) { next.delete(key); } else { next.add(key); }
			return next;
		});
	}
	const show = function (key) { return visibleCols.has(key); };

	function isConsultar(m) { return !m.priceUSD || m.priceUSD <= 0; }

	function econ(m) {
		if (isConsultar(m)) return null;
		const precioUSD = m.priceUSD;
		// Use stored ARS price if available, otherwise derive from TC
		const precioARS = m.precioARS || Math.round(precioUSD * tc);
		const certCost = (m.certs || 1) * cvCert;
		const firmasCost = m.ilimitadas ? 0 : (m.firmas || 0) * cvFirma;
		const cvTotal = certCost + firmasCost;
		const margenPct = precioUSD > 0 ? (precioUSD - cvTotal) / precioUSD : 0;
		return { precioUSD, precioARS, cvTotal, margenPct };
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-heading text-lg font-semibold text-foreground">Canal Web Lakaut · venta directa</h2>
				<p className="text-sm text-muted-foreground">Personas, profesionales y PyMEs que contratan sin intermediación, abonando con tarjeta. Precios de lista en ARS, USD derivado por TC.</p>
			</div>

			<div className="flex justify-end mb-2">
				<ColFilterDropdown visible={visibleCols} onToggle={toggleCol} />
			</div>
			<Card>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Producto</TableHead>
								{show("precioARS") && <TableHead className="text-right">Precio ARS<InfoTooltip dir="down" text="Precio de lista en pesos. Si el pack tiene precio ARS definido en configuración, se usa ese valor. Si no, se deriva: Precio USD × TC." /></TableHead>}
								{show("precioUSD") && <TableHead className="text-right">Precio USD<InfoTooltip dir="down" text="Precio de lista en dólares, definido directamente en la configuración del pack." /></TableHead>}
								{show("certs") && <TableHead className="text-right">Certs<InfoTooltip dir="down" text="Cantidad de certificados de firma incluidos en el pack. Cada certificado tiene un costo variable de CV cert." /></TableHead>}
								{show("firmas") && <TableHead className="text-right">Firmas incl.<InfoTooltip dir="down" text="Firmas digitales incluidas en el plan. Si es 'Ilimitadas', no se cobra costo variable por firmas adicionales." /></TableHead>}
								{show("firmaExtra") && <TableHead className="text-right">Firma extra<InfoTooltip dir="down" text="Precio por firma adicional fuera del límite incluido. Si no aplica o no está configurado, se muestra —." /></TableHead>}
								{show("cvTotal") && <TableHead className="text-right">CV total<InfoTooltip dir="down" text={"Costo Variable total = (certs × CV cert) + (firmas incluidas × CV firma).\nCV cert: " + fMoney2(cvCert) + " · CV firma: " + fMoney2(cvFirma) + ".\nPara planes con firmas ilimitadas, el CV de firmas es 0."} /></TableHead>}
								{show("margen") && <TableHead className="text-right">Cont. marginal<InfoTooltip dir="down" text="Contribución marginal = Precio USD − CV total. Es la ganancia antes de cubrir costos fijos. Se muestra como % sobre el precio." /></TableHead>}
								{show("beAnual") && <TableHead className="text-right">BE anual<InfoTooltip dir="down" text={"Break-even anual = CF anual ÷ Contribución marginal por pack.\nCuántos packs de este tipo necesitás vender por año para cubrir todos los costos fijos del canal (" + fMoney2(costs.cfDirecto * 12) + "/año)."} /></TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{models.filter(function (m) { return m.activo !== false; }).map(function (m) {
								const e = econ(m);
										const cm = e ? e.precioUSD - e.cvTotal : null;
								const beAnual = cm && cm > 0 ? Math.ceil(costs.cfDirecto * 12 / cm) : null;
								return (
									<TableRow key={m.id}>
										<TableCell>
											<div className="font-semibold">{m.label}</div>
											<div className="text-[11px] text-muted-foreground">{m.segment === "persona" ? "Persona / profesional" : "Empresa"}</div>
										</TableCell>
										{show("precioARS") && <TableCell className="text-right tabular-nums">
											{e == null ? <Badge variant="outline">Consultar</Badge> : "$ " + e.precioARS.toLocaleString("es-AR")}
										</TableCell>}
										{show("precioUSD") && <TableCell className="text-right tabular-nums">{e == null ? "—" : fUSD(e.precioUSD)}</TableCell>}
										{show("certs") && <TableCell className="text-right tabular-nums">{m.certs == null || m.certs === 0 ? "—" : m.certs}</TableCell>}
										{show("firmas") && <TableCell className="text-right tabular-nums">{m.ilimitadas ? "Ilimitadas" : (m.firmas == null ? "—" : m.firmas)}</TableCell>}
										{show("firmaExtra") && <TableCell className="text-right tabular-nums">
											{m.extraFirmaPrice
												? (currency === "ARS"
												? "$ " + (m.firmaExtraARS || Math.round(m.extraFirmaPrice * tc)).toLocaleString("es-AR")
												: fUSD(m.extraFirmaPrice))
												: "—"}
										</TableCell>}
										{show("cvTotal") && <TableCell className="text-right tabular-nums">{e == null ? "—" : fMoney2(e.cvTotal)}</TableCell>}
										{show("margen") && <TableCell className={"text-right tabular-nums font-semibold " + (e == null ? "text-muted-foreground" : margClass(e.margenPct))}>
											{e == null ? "—" : (e.margenPct * 100).toFixed(0) + "%"}
										</TableCell>}
										{show("beAnual") && <TableCell className="text-right tabular-nums text-muted-foreground">{beAnual == null ? "—" : beAnual.toLocaleString("es-AR") + " u."}</TableCell>}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<p className="text-[11px] text-muted-foreground">Contribución marginal = precio USD − CV certificados − CV firmas incluidas, sobre la vigencia de 2 años. BE anual = packs/año necesarios para cubrir CF anual. CV cert {fMoney2(cvCert)} · CV firma {fMoney2(cvFirma)}.</p>

			<div className="border-t border-border pt-6">
				<PortfolioSimulator models={models} costs={costs} currency={currency} tc={tc} />
			</div>
		</div>
	);
}
