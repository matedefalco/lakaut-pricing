import { useState, useRef, useEffect } from "react";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { segmentPricing, idcBundleCost, markupOf, minPriceForMarkup } from "@/lib/tiers";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

// La unidad del canal es la IDC: un bundle de certificado más el cupo de firmas
// incluidas. El análisis se hace contra el costo de ese bundle, no del certificado
// suelto, porque es lo que efectivamente se entrega por el precio de tabla.
const ALL_COLS = [
	{ key: "precioIDC",     label: "Precio IDC (USD)" },
	{ key: "cupo",          label: "Firmas incluidas" },
	{ key: "cvBundle",      label: "CV bundle (USD)" },
	{ key: "markup",        label: "Markup" },
	{ key: "minViable",     label: "Precio mín. viable" },
	{ key: "cmIDC",         label: "CM IDC" },
	{ key: "beIDC",         label: "BE IDC" },
	{ key: "precioFirma",   label: "Firma sobre cupo (USD)" },
	{ key: "cvFirma",       label: "CV firma (USD)" },
	{ key: "cmFirma",       label: "CM firma" },
];

const DEFAULT_VISIBLE = new Set(["precioIDC", "cupo", "cvBundle", "markup", "minViable", "precioFirma"]);

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }
function markupClass(m, min) { return m == null || m >= min * 1.4 ? "text-[var(--success)]" : m >= min ? "text-[var(--warning)]" : "text-destructive"; }

const SLA_STYLES = {
	standard:     { background: "#64748B", color: "#fff" },
	professional: { background: "#2563EB", color: "#fff" },
	enterprise:   { background: "#059669", color: "#fff" },
	dedicated:    { background: "#D97706", color: "#fff" },
};
const API_STYLES = {
	standard:     { background: "#64748B", color: "#fff" },
	professional: { background: "#2563EB", color: "#fff" },
	enterprise:   { background: "#6D28D9", color: "#fff" },
};

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
					border: "1px solid var(--border)", borderRadius: 6,
					background: open ? "var(--accent)" : "var(--background)",
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
					borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", minWidth: 220, padding: "6px 0",
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

export function TabCanalB2B2CPrecios({ costs }) {
	const { channelConfig } = useChannelConfig();
	const { b2b2cSegments, b2b2cApiTiers, slaPlans } = channelConfig;
	const markupMin = channelConfig.b2b2cMarkupMin != null ? channelConfig.b2b2cMarkupMin : 1.2;

	const cvCert = costs?.cvCertBase ?? 0;
	const cvFirma = costs?.cvFirmaBase ?? 0;
	const cfDirecto = costs?.cfDirecto ?? 0;

	const [visible, setVisible] = useState(DEFAULT_VISIBLE);
	function toggleCol(key) {
		setVisible(function (prev) {
			const next = new Set(prev);
			if (next.has(key)) { next.delete(key); } else { next.add(key); }
			return next;
		});
	}

	function fUSD(n) { return "USD " + n.toFixed(2); }
	function fPct(n) { return (n * 100).toFixed(0) + "%"; }

	// Segmentos cuyo precio de tabla no alcanza el markup mínimo contra el costo de su
	// bundle. Se avisa arriba porque es una decisión de política de precios, no un
	// detalle de una cotización puntual.
	const noViables = (b2b2cSegments || []).filter(function (s) {
		const p = segmentPricing(s, { precioIDC: 0, firmasIncluidas: 0, precioFirmaExtra: 0 });
		const m = markupOf(p.precioIDC, idcBundleCost(cvCert, cvFirma, p.firmasIncluidas));
		return m != null && m < markupMin;
	});

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h2 className="text-base font-semibold font-heading">Canal Volumen · Tabla de referencia</h2>
				<p className="text-sm text-muted-foreground mt-1">Precios en USD. Cada segmento tiene su propio precio por IDC según el volumen mensual, con un cupo de firmas incluidas; las firmas que exceden el cupo se facturan por unidad. El precio final por cotización puede ajustarse en la Cotizadora.</p>
			</div>

			{noViables.length > 0 && (
				<div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
					<div className="text-sm font-semibold text-destructive">
						{noViables.length === 1 ? "1 segmento no cierra" : noViables.length + " segmentos no cierran"} contra el costo del bundle
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						{noViables.map(function (s) { return s.label; }).join(", ")}: el precio por IDC no alcanza el markup mínimo de {markupMin.toFixed(2)}x. Las cotizaciones que caigan en estos segmentos no se van a poder guardar ni exportar.
					</p>
					<p className="text-xs text-muted-foreground mt-1.5">
						El cupo de firmas incluidas es lo que empuja el costo: cada firma del bundle suma USD {cvFirma.toFixed(4)} de costo variable. Se resuelve subiendo el precio por IDC hasta el mínimo viable de la tabla, o bajando el cupo en Config → Precios por canal.
					</p>
				</div>
			)}

			{/* ── Pricing por segmento ────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="flex items-center justify-between gap-4 mb-3">
						<div className="text-sm font-semibold">Pricing por segmento</div>
						<ColFilterDropdown visible={visible} onToggle={toggleCol} />
					</div>
					<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Segmento<InfoTooltip text="El cliente cae en un solo segmento, asignado por su volumen mensual de IDC." /></TableHead>
								<TableHead className="text-right">IDC / mes<InfoTooltip text="Rango de volumen mensual de identidades digitales certificadas que alcanza el segmento." /></TableHead>
								{visible.has("precioIDC")     && <TableHead className="text-right">Precio IDC (USD)<InfoTooltip text="Precio unitario de la IDC en este segmento. Es un precio propio del tramo, no un descuento sobre una lista." /></TableHead>}
								{visible.has("cupo")          && <TableHead className="text-right">Firmas incl.<InfoTooltip text="Cupo de firmas que entran en el precio de la IDC: la firma inicial que requiere la institución más las firmas de activación." /></TableHead>}
								{visible.has("cvBundle")      && <TableHead className="text-right">CV bundle<InfoTooltip text={"Costo variable de lo que se entrega por el precio de la IDC = certificado (USD " + cvCert.toFixed(4) + ") + las firmas del cupo (USD " + cvFirma.toFixed(4) + " cada una)."} /></TableHead>}
								{visible.has("markup")        && <TableHead className="text-right">Markup<InfoTooltip text={"Precio de la IDC ÷ CV del bundle. Es la métrica de la columna MARGEN del Borrador v5. Mínimo exigido: " + markupMin.toFixed(2) + "x."} /></TableHead>}
								{visible.has("minViable")     && <TableHead className="text-right">Mín. viable<InfoTooltip text={"Precio por IDC más bajo que cumple el markup mínimo de " + markupMin.toFixed(2) + "x contra el CV del bundle."} /></TableHead>}
								{visible.has("cmIDC")         && <TableHead className="text-right">CM IDC<InfoTooltip text="Contribución marginal de la IDC = Precio IDC − CV bundle (sin CF), en USD y como % del precio." /></TableHead>}
								{visible.has("beIDC")         && <TableHead className="text-right">BE IDC<InfoTooltip text="Break-even: IDC mínimas para cubrir el CF directo al precio de este segmento. BE = CF directo ÷ CM IDC." /></TableHead>}
								{visible.has("precioFirma")   && <TableHead className="text-right">Firma sobre cupo<InfoTooltip text="Precio unitario de cada firma que excede el cupo del bundle." /></TableHead>}
								{visible.has("cvFirma")       && <TableHead className="text-right">CV firma<InfoTooltip text={"Costo variable por firma = USD " + cvFirma.toFixed(4) + ". Sin costos fijos."} /></TableHead>}
								{visible.has("cmFirma")       && <TableHead className="text-right">CM firma<InfoTooltip text="Contribución marginal de la firma sobre el cupo = Precio firma − CV firma (sin CF), en USD y como % del precio." /></TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{b2b2cSegments.map(function (s) {
								const p           = segmentPricing(s, { precioIDC: 0, firmasIncluidas: 0, precioFirmaExtra: 0 });
								const cvBundle    = idcBundleCost(cvCert, cvFirma, p.firmasIncluidas);
								const markup      = markupOf(p.precioIDC, cvBundle);
								const minViable   = minPriceForMarkup(cvBundle, markupMin);
								const cmIDCVal    = p.precioIDC - cvBundle;
								const cmIDCPct    = p.precioIDC > 0 ? cmIDCVal / p.precioIDC : 0;
								const beIDCVal    = cmIDCVal > 0 ? Math.ceil(cfDirecto / cmIDCVal) : null;
								const cmFirmaVal  = p.precioFirmaExtra - cvFirma;
								const cmFirmaPct  = p.precioFirmaExtra > 0 ? cmFirmaVal / p.precioFirmaExtra : 0;
								const viable      = markup == null || markup >= markupMin;
								return (
									<TableRow key={s.id} className={viable ? "" : "bg-destructive/5"}>
										<TableCell className="font-semibold">{s.label}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{(Number(s.idcMin) || 0).toLocaleString("es-AR")}
											{s.idcMax == null ? "+" : " – " + (Number(s.idcMax) || 0).toLocaleString("es-AR")}
										</TableCell>
										{visible.has("precioIDC")     && <TableCell className="text-right tabular-nums font-semibold">{fUSD(p.precioIDC)}</TableCell>}
										{visible.has("cupo")          && <TableCell className="text-right tabular-nums text-muted-foreground">{p.firmasIncluidas}</TableCell>}
										{visible.has("cvBundle")      && <TableCell className="text-right tabular-nums text-muted-foreground">{fUSD(cvBundle)}</TableCell>}
										{visible.has("markup")        && <TableCell className={"text-right tabular-nums font-semibold " + markupClass(markup, markupMin)}>{markup == null ? "—" : markup.toFixed(2) + "x"}</TableCell>}
										{visible.has("minViable")     && <TableCell className={"text-right tabular-nums " + (viable ? "text-muted-foreground" : "font-semibold text-destructive")}>{fUSD(minViable)}</TableCell>}
										{visible.has("cmIDC")         && <TableCell className={"text-right tabular-nums font-semibold whitespace-nowrap " + margClass(cmIDCPct)}>{fUSD(cmIDCVal)} · {fPct(cmIDCPct)}</TableCell>}
										{visible.has("beIDC")         && <TableCell className="text-right tabular-nums font-semibold">{beIDCVal != null ? beIDCVal.toLocaleString("es-AR") : "—"}</TableCell>}
										{visible.has("precioFirma")   && <TableCell className="text-right tabular-nums font-semibold">{fUSD(p.precioFirmaExtra)}</TableCell>}
										{visible.has("cvFirma")       && <TableCell className="text-right tabular-nums text-muted-foreground">{fUSD(cvFirma)}</TableCell>}
										{visible.has("cmFirma")       && <TableCell className={"text-right tabular-nums font-semibold whitespace-nowrap " + margClass(cmFirmaPct)}>{fUSD(cmFirmaVal)} · {fPct(cmFirmaPct)}</TableCell>}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
					</div>
				</CardContent>
			</Card>

			{/* ── Integración API ────────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3">
						<div className="text-sm font-semibold">Integración API · Fee de implementación</div>
						<p className="text-xs text-muted-foreground mt-0.5">Cargo único al inicio del contrato. Los rangos son orientativos; el valor puntual se define en la Cotizadora.</p>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Tier</TableHead>
								<TableHead className="text-right">Rango fee (USD)</TableHead>
								<TableHead className="text-right">Fee default (USD)</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{b2b2cApiTiers.map(function (t) {
								return (
									<TableRow key={t.id}>
										<TableCell>
											<Badge style={API_STYLES[t.id] || {}}>{t.label}</Badge>
										</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{"USD " + t.feeMin.toLocaleString("es-AR") + " – " + t.feeMax.toLocaleString("es-AR")}
										</TableCell>
										<TableCell className="text-right tabular-nums font-semibold">
											{"USD " + t.feeDefault.toLocaleString("es-AR")}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* ── Planes de soporte / SLA ────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3">
						<div className="text-sm font-semibold">Planes de soporte / SLA</div>
						<p className="text-xs text-muted-foreground mt-0.5">Standard incluido en todos los contratos. Los planes superiores se suman al revenue mensual recurrente.</p>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Plan</TableHead>
								<TableHead className="text-right">Precio (USD / mes)</TableHead>
								<TableHead className="text-right">Tx incluidas / mes</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{slaPlans.map(function (s) {
								return (
									<TableRow key={s.id}>
										<TableCell>
											<Badge style={SLA_STYLES[s.id] || {}}>{s.label}</Badge>
										</TableCell>
										<TableCell className="text-right tabular-nums font-semibold">
											{s.precioMes == null ? "A medida" : s.precioMes === 0 ? "Incluido" : "USD " + s.precioMes.toLocaleString("es-AR")}
										</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{s.txMes != null ? s.txMes.toLocaleString("es-AR") : "—"}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
					<p className="text-[11px] text-muted-foreground mt-2">En la Cotizadora podés bonificar el SLA para un cliente específico sin modificar esta tabla.</p>
				</CardContent>
			</Card>
		</div>
	);
}
