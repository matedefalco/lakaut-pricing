import { useState } from "react";
import { makeMoney } from "@/utils/useMoney";
import { useModels } from "@/context/ModelsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { PageHeader } from "@/components/ui/PageHeader";
import { ColumnPicker } from "@/components/ui/ColumnPicker";
import { OK, WN, ER } from "@/theme/tokens";

const ALL_COLS = [
	{ key: "precioARS", label: "Precio ARS s/IVA" },
	{ key: "precioARSiva", label: "Precio ARS c/IVA" },
	{ key: "precioUSD", label: "Precio USD" },
	{ key: "certs", label: "Certs" },
	{ key: "firmas", label: "Firmas incl." },
	{ key: "firmaExtra", label: "Firma extra" },
	{ key: "cvTotal", label: "CV total" },
	{ key: "margen", label: "Cont. marginal" },
	{ key: "beAnual", label: "BE" },
];

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }

const PACK_COLORS = ["#378ADD", "#1D9E75", "#BA7517", "#993556", "#534AB7", "#D85A30", "#639922"];

function PortfolioSimulator({ models, costs, currency, tc }) {
	const { fMoney2 } = makeMoney(currency, tc);
	const { fMoney: fUSD } = makeMoney("USD", tc);
	const isARS = currency === "ARS";
	// Formats a raw ARS value (no TC conversion needed — value is already in ARS)
	function fARSraw(n) { return "$ " + Math.round(n).toLocaleString("es-AR"); }
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
		// Precio display: use exact ARS value when price was defined in ARS
		const precioARS = (m.priceDefinedIn === "ARS" && m.priceARS != null) ? m.priceARS : Math.round(m.priceUSD * tc);
		return { m, cvTotal, cmUnit, u, rev, cmTot, precioARS, color: PACK_COLORS[i % PACK_COLORS.length] };
	});

	const totalUnits = rows.reduce(function (s, r) { return s + r.u; }, 0);
	const totalRev = rows.reduce(function (s, r) { return s + r.rev; }, 0);
	const totalRevARS = rows.reduce(function (s, r) { return s + r.precioARS * r.u; }, 0);
	const totalCM = rows.reduce(function (s, r) { return s + r.cmTot; }, 0);
	const cmPond = totalUnits > 0 ? totalCM / totalUnits : 0;
	const beUnits = cmPond > 0 ? Math.ceil(cf / cmPond) : Infinity;
	const ebitda = totalCM - cf;
	const cfPct = cf > 0 ? (totalCM / cf) * 100 : 0;
	const cfCovered = cfPct >= 100;

	const barColor = cfCovered ? OK : cfPct >= 60 ? WN : ER;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="mt-0.5 text-sm text-muted-foreground">
						Estimá cuántas unidades vendés por mes de cada pack y verás si el mix cubre costos fijos.
					</div>
				</div>
				<button
					onClick={function () { const z = {}; activeModels.forEach(function (m) { z[m.id] = 0; }); setUnits(z); }}
					className="shrink-0 cursor-pointer rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
					type="button"
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
								<TableHead className="text-right">{isARS ? "Precio ARS s/IVA" : "Precio USD"}</TableHead>
								<TableHead className="text-right">CV unit<InfoTooltip dir="down" text="Costo variable unitario = (certs × CV cert) + (firmas × CV firma)." /></TableHead>
								<TableHead className="text-right">CM unit<InfoTooltip dir="down" text={"Contribución marginal unitaria = Precio " + (isARS ? "ARS" : "USD") + " − CV unit. Lo que aporta cada venta antes de cubrir CF."} /></TableHead>
								<TableHead className="text-right">Unidades</TableHead>
								<TableHead className="text-right">Ingresos</TableHead>
								<TableHead className="text-right">CM</TableHead>
								<TableHead className="text-right">Mix</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map(function (r) {
								const mix = totalUnits > 0 ? Math.round(r.u / totalUnits * 100) : 0;
								const cmColor = r.cmUnit >= 0 ? OK : ER;
								return (
									<TableRow key={r.m.id}>
										<TableCell>
											<div className="flex items-center gap-2">
												<span className="inline-block size-2 shrink-0 rounded-full" style={{ background: r.color }} />
												<span className="font-semibold">{r.m.label}</span>
											</div>
											<div className="pl-4 text-xs text-muted-foreground">{r.m.segment === "persona" ? "Persona / profesional" : "Empresa"}</div>
										</TableCell>
										<TableCell className="text-right tabular-nums">{isARS ? fARSraw(r.precioARS) : fUSD(r.m.priceUSD)}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">{fMoney2(r.cvTotal)}</TableCell>
										<TableCell className="text-right tabular-nums" style={{ color: cmColor }} >{fMoney2(r.cmUnit)}</TableCell>
										<TableCell className="text-right">
											<input
												type="number"
												min="0"
												step="1"
												value={r.u}
												onChange={function (e) { setUnit(r.m.id, e.target.value); }}
												className="w-20 rounded-md border border-input bg-card px-2 py-1 text-right text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
											/>
										</TableCell>
										<TableCell className="text-right tabular-nums">{r.u > 0 ? (isARS ? fARSraw(r.precioARS * r.u) : fUSD(Math.round(r.rev))) : <span className="text-muted-foreground">—</span>}</TableCell>
										<TableCell className="text-right tabular-nums" style={{ color: r.u > 0 ? cmColor : "var(--muted-foreground)" }} >{r.u > 0 ? fMoney2(Math.round(r.cmTot)) : "—"}</TableCell>
										<TableCell className="text-right tabular-nums text-xs text-muted-foreground">{r.u > 0 ? mix + "%" : "—"}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
						<tfoot>
							<tr className="border-t border-border bg-secondary">
								<td colSpan={4} className="px-4 py-2.5 text-sm font-bold text-foreground">Total</td>
								<td className="px-2 py-2.5 text-right text-sm font-bold text-foreground tabular-nums">{totalUnits > 0 ? totalUnits.toLocaleString("es-AR") + " u." : "—"}</td>
								<td className="px-2 py-2.5 text-right text-sm font-bold text-foreground tabular-nums">{isARS ? (totalRevARS > 0 ? fARSraw(totalRevARS) : "—") : (totalRev > 0 ? fUSD(Math.round(totalRev)) : "—")}</td>
								<td className="px-2 py-2.5 text-right text-sm font-bold text-foreground tabular-nums">{totalCM !== 0 ? fMoney2(Math.round(totalCM)) : "—"}</td>
								<td className="px-2 py-2.5 text-right text-sm text-muted-foreground tabular-nums">100%</td>
							</tr>
						</tfoot>
					</Table>
				</CardContent>
			</Card>

			{/* KPI row */}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{[
					{
						label: "CM ponderado",
						tooltip: "Contribución marginal promedio ponderada por el mix de ventas.\nFórmula: Σ(CM unit × unidades) ÷ Σ unidades.\nRepresenta cuánto aporta en promedio cada unidad vendida, considerando el mix actual.",
						value: totalUnits > 0 ? fMoney2(Math.round(cmPond * 100) / 100) + " / u." : "—",
						color: "var(--foreground)",
					},
					{
						label: "BE portfolio",
						tooltip: "Break-even del portfolio: cuántas unidades totales (con este mix) se necesitan para cubrir los costos fijos directos del canal.\nFórmula: CF directo ÷ CM ponderado.\nCF directo: " + fMoney2(cf) + ".",
						value: isFinite(beUnits) ? beUnits.toLocaleString("es-AR") + " u." : "—",
						sub: isFinite(beUnits) && totalUnits > 0
							? (totalUnits >= beUnits ? "✓ Cubierto" : "Faltan " + (beUnits - totalUnits).toLocaleString("es-AR") + " u.")
							: null,
						subColor: isFinite(beUnits) && totalUnits >= beUnits ? OK : WN,
					},
					{
						label: "Unidades actuales",
						tooltip: "Total de unidades ingresadas en el simulador, sumando todos los packs.",
						value: totalUnits > 0 ? totalUnits.toLocaleString("es-AR") + " u." : "—",
						color: "var(--foreground)",
					},
					{
						label: "EBITDA",
						tooltip: "Resultado estimado para el volumen ingresado, antes de impuestos y amortizaciones.\nFórmula: CM total − CF directo.\nCM total: " + (totalUnits > 0 ? fMoney2(Math.round(totalCM)) : "—") + " · CF directo: " + fMoney2(cf) + ".",
						value: totalUnits > 0 ? (ebitda >= 0 ? "+" : "") + fMoney2(Math.round(ebitda)) : "—",
						color: totalUnits > 0 ? (ebitda >= 0 ? OK : ER) : "var(--foreground)",
					},
				].map(function (kpi) {
					return (
						<div key={kpi.label} className="rounded-lg border border-border bg-secondary px-3.5 py-3">
							<div className="flex items-center gap-1">
							<span className="text-xs text-muted-foreground">{kpi.label}</span>
							{kpi.tooltip && <InfoTooltip dir="down" text={kpi.tooltip} />}
						</div>
							<div className="mt-1 text-base font-bold tabular-nums" style={{ color: kpi.color || "var(--foreground)" }}>{kpi.value}</div>
							{kpi.sub && <div className="mt-0.5 text-xs" style={{ color: kpi.subColor || "var(--muted-foreground)" }}>{kpi.sub}</div>}
						</div>
					);
				})}
			</div>

			{/* CF coverage bar */}
			<div className="rounded-lg border border-border px-4 py-3.5">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-sm font-bold text-muted-foreground">Cobertura de CF</span>
					<span className="text-sm font-bold text-foreground tabular-nums">
						{totalUnits > 0 ? Math.round(cfPct) + "%" : "0%"}
						<span className="ml-1.5 text-sm text-muted-foreground">de {fMoney2(cf)}</span>
					</span>
				</div>
				<div className="h-2 overflow-hidden rounded-full bg-input">
					<div className="h-full rounded-full transition-[width] duration-200" style={{ width: Math.min(cfPct, 100) + "%", background: barColor }} />
				</div>
				<p className="mt-2 text-sm text-muted-foreground">
					{totalUnits === 0
						? "Ingresá unidades para ver la cobertura."
						: cfCovered
							? "El mix actual cubre CF y genera " + fMoney2(Math.round(ebitda)) + " de EBITDA."
							: "Falta " + fMoney2(Math.round(cf - totalCM)) + " de CM para cubrir CF. Ajustá volumen o mix de packs."}
				</p>
			</div>

			<p className="text-xs text-muted-foreground">
				CM ponderado = Σ(CM unit × unidades) / Σ unidades · BE portfolio = CF directo / CM ponderado · CF directo: {fMoney2(cf)}
			</p>
		</div>
	);
}

export function TabCanalWeb({ costs, currency, tc, view }) {
	const { models } = useModels();
	const { fMoney2 } = makeMoney(currency, tc);
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
		// Use stored ARS value when price was defined in ARS to avoid USD round-trip drift
		const precioARS = (m.priceDefinedIn === "ARS" && m.priceARS != null)
			? m.priceARS
			: Math.round(precioUSD * tc);
		const precioARSiva = Math.round(precioARS * 1.21);
		const certCost = (m.certs || 1) * cvCert;
		const firmasCost = m.ilimitadas ? 0 : (m.firmas || 0) * cvFirma;
		const cvTotal = certCost + firmasCost;
		const margenPct = precioUSD > 0 ? (precioUSD - cvTotal) / precioUSD : 0;
		return { precioUSD, precioARS, precioARSiva, cvTotal, margenPct };
	}

	const showPrecios = !view || view === "precios";
	const showSimulador = !view || view === "simulador";

	return (
		<div className="space-y-6">
			{showPrecios && (
				<>
					<PageHeader
						title="Precios de lista"
						description="Precio de lista de cada pack, el que paga el cliente que contrata sin intermediación. Valores en ARS, USD derivado por TC."
						actions={<ColumnPicker cols={ALL_COLS} visible={visibleCols} onToggle={toggleCol} />}
					/>
					<Card>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Producto</TableHead>
										{show("precioARS") && <TableHead className="text-right">Precio ARS s/IVA<InfoTooltip dir="down" text="Precio en pesos sin IVA. Se deriva de: Precio USD × TC." /></TableHead>}
										{show("precioARSiva") && <TableHead className="text-right">Precio ARS c/IVA<InfoTooltip dir="down" text="Precio en pesos con IVA incluido (21%). Precio s/IVA × 1,21." /></TableHead>}
										{show("precioUSD") && <TableHead className="text-right">Precio USD<InfoTooltip dir="down" text="Precio de lista en dólares, definido directamente en la configuración del pack." /></TableHead>}
										{show("certs") && <TableHead className="text-right">Certs<InfoTooltip dir="down" text="Cantidad de certificados de firma incluidos en el pack. Cada certificado tiene un costo variable de CV cert." /></TableHead>}
										{show("firmas") && <TableHead className="text-right">Firmas incl.<InfoTooltip dir="down" text="Firmas digitales incluidas en el plan. Si es 'Ilimitadas', no se cobra costo variable por firmas adicionales." /></TableHead>}
										{show("firmaExtra") && <TableHead className="text-right">Firma extra<InfoTooltip dir="down" text="Precio por firma adicional fuera del límite incluido. Si no aplica o no está configurado, se muestra —." /></TableHead>}
										{show("cvTotal") && <TableHead className="text-right">CV total<InfoTooltip dir="down" text={"Costo Variable total = (certs × CV cert) + (firmas incluidas × CV firma).\nCV cert: " + fMoney2(cvCert) + " · CV firma: " + fMoney2(cvFirma) + ".\nPara planes con firmas ilimitadas, el CV de firmas es 0."} /></TableHead>}
										{show("margen") && <TableHead className="text-right">Cont. marginal<InfoTooltip dir="down" text="Contribución marginal = Precio USD − CV total. Es la ganancia antes de cubrir costos fijos. Se muestra como % sobre el precio." /></TableHead>}
										{show("beAnual") && <TableHead className="text-right">BE<InfoTooltip dir="down" text={"Break-even = CF total ÷ Contribución marginal por pack.\nCuántos packs de este tipo necesitás vender para cubrir todos los costos fijos del canal (" + fMoney2(costs.cfTotal) + ")."} /></TableHead>}
									</TableRow>
								</TableHeader>
								<TableBody>
									{models.filter(function (m) { return m.activo !== false; }).map(function (m) {
										const e = econ(m);
										const cm = e ? e.precioUSD - e.cvTotal : null;
										const beAnual = cm && cm > 0 ? Math.ceil(costs.cfTotal / cm) : null;
										return (
											<TableRow key={m.id}>
												<TableCell>
													<div className="font-semibold">{m.label}</div>
													<div className="text-xs text-muted-foreground">{m.segment === "persona" ? "Persona / profesional" : "Empresa"}</div>
												</TableCell>
												{show("precioARS") && <TableCell className="text-right tabular-nums">
													{e == null ? <Badge variant="outline">Consultar</Badge> : "$ " + e.precioARS.toLocaleString("es-AR")}
												</TableCell>}
												{show("precioARSiva") && <TableCell className="text-right tabular-nums">
													{e == null ? "—" : "$ " + e.precioARSiva.toLocaleString("es-AR")}
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
				</>
			)}

			{showSimulador && (
				<>
					{!view && <div className="border-t border-border pt-6" />}
					{view === "simulador" && (
						<div className="mb-4">
							<PageHeader
								title="Simulador de portfolio"
								description="Break-even con mezcla de ventas de packs a precio de lista. Estimá el volumen por pack y verás si el mix cubre costos fijos."
							/>
						</div>
					)}
					<PortfolioSimulator models={models} costs={costs} currency={currency} tc={tc} />
				</>
			)}
		</div>
	);
}
