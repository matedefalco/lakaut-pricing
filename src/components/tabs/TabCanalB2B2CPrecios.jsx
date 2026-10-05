import { useState } from "react";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { segmentPricing, segmentViability } from "@/lib/tiers";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { ColumnPicker } from "@/components/ui/ColumnPicker";

// El canal vende la IDC (identidad + certificado) y las firmas por unidad, sin cupo.
// Cada componente se analiza contra su propio costo variable: si los dos cumplen el
// markup mínimo, ninguna cotización del segmento queda bajo el piso.
const ALL_COLS = [
	{ key: "precioIDC",     label: "Precio IDC (USD)" },
	{ key: "markupIDC",     label: "Markup IDC" },
	{ key: "cmIDC",         label: "CM IDC" },
	{ key: "beIDC",         label: "BE IDC" },
	{ key: "precioFirma",   label: "Precio firma (USD)" },
	{ key: "markupFirma",   label: "Markup firma" },
	{ key: "cvFirma",       label: "CV firma (USD)" },
	{ key: "cmFirma",       label: "CM firma" },
	{ key: "excedente",     label: "Excedente (USD)" },
];

const DEFAULT_VISIBLE = new Set(["precioIDC", "markupIDC", "precioFirma", "markupFirma", "excedente"]);

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

	const FALLBACK = { precioIDC: 0, precioFirma: 0, precioFirmaExtra: 0 };
	const bienvenida = channelConfig.b2b2cFirmasBienvenida != null ? channelConfig.b2b2cFirmasBienvenida : 3;

	// Segmentos cuyo precio de tabla (IDC o firma) no alcanza el markup mínimo contra su
	// costo. Se avisa arriba porque es una decisión de política de precios, no un detalle
	// de una cotización puntual.
	const noViables = (b2b2cSegments || []).filter(function (s) {
		return !segmentViability(s, cvCert, cvFirma, markupMin, FALLBACK).ok;
	});

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h2 className="text-base font-semibold font-heading">IDC · Tabla de referencia</h2>
				<p className="text-sm text-muted-foreground mt-1">Precios en USD. Cada segmento tiene su precio por IDC (identidad + certificado) y su precio por firma, según la cantidad de IDC. No hay cupo de firmas por IDC: todas se facturan por unidad y cada cotización bonifica {bienvenida} firmas en total, de bienvenida. El precio final por cotización puede ajustarse en la Cotizadora.</p>
			</div>

			{noViables.length > 0 && (
				<div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
					<div className="text-sm font-semibold text-destructive">
						{noViables.length === 1 ? "1 segmento no cierra" : noViables.length + " segmentos no cierran"} contra el costo variable
					</div>
					<p className="text-xs text-muted-foreground mt-1">
						{noViables.map(function (s) { return s.label; }).join(", ")}: el precio de la IDC o de la firma no alcanza el markup mínimo de {markupMin.toFixed(2)}x. Las cotizaciones de estos segmentos pueden quedar bajo el piso y no poder guardarse ni exportarse. Se resuelve en Config → Precios por canal.
					</p>
				</div>
			)}

			{/* ── Pricing por segmento ────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="flex items-center justify-between gap-4 mb-3">
						<div className="text-sm font-semibold">Pricing por segmento</div>
						<ColumnPicker cols={ALL_COLS} visible={visible} onToggle={toggleCol} />
					</div>
					<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Segmento<InfoTooltip text="El cliente cae en un solo segmento: el mayor entre la cantidad de IDC y su facturación a precio de lista." /></TableHead>
								<TableHead className="text-right">IDC<InfoTooltip text="Rango de cantidad de identidades digitales certificadas contratadas que alcanza el segmento." /></TableHead>
								{visible.has("precioIDC")     && <TableHead className="text-right">Precio IDC<InfoTooltip text="Precio unitario de la IDC (identidad + certificado) en este segmento. Es un precio propio del tramo, no un descuento sobre una lista." /></TableHead>}
								{visible.has("markupIDC")     && <TableHead className="text-right">Markup IDC<InfoTooltip text={"Precio IDC ÷ CV del certificado (USD " + cvCert.toFixed(4) + "). Mínimo exigido: " + markupMin.toFixed(2) + "x."} /></TableHead>}
								{visible.has("cmIDC")         && <TableHead className="text-right">CM IDC<InfoTooltip text="Contribución marginal de la IDC = Precio IDC − CV certificado (sin CF), en USD y como % del precio." /></TableHead>}
								{visible.has("beIDC")         && <TableHead className="text-right">BE IDC<InfoTooltip text="Break-even: IDC mínimas para cubrir el CF directo al precio de este segmento. BE = CF directo ÷ CM IDC." /></TableHead>}
								{visible.has("precioFirma")   && <TableHead className="text-right">Precio firma<InfoTooltip text="Precio unitario de cada firma cotizada en este segmento." /></TableHead>}
								{visible.has("markupFirma")   && <TableHead className="text-right">Markup firma<InfoTooltip text={"Precio firma ÷ CV firma (USD " + cvFirma.toFixed(4) + "). Mínimo exigido: " + markupMin.toFixed(2) + "x."} /></TableHead>}
								{visible.has("cvFirma")       && <TableHead className="text-right">CV firma<InfoTooltip text={"Costo variable por firma = USD " + cvFirma.toFixed(4) + ". Sin costos fijos."} /></TableHead>}
								{visible.has("cmFirma")       && <TableHead className="text-right">CM firma<InfoTooltip text="Contribución marginal de la firma = Precio firma − CV firma (sin CF), en USD y como % del precio." /></TableHead>}
								{visible.has("excedente")     && <TableHead className="text-right">Excedente<InfoTooltip text="Precio de cada firma no planificada por encima de lo contratado. Va como condición del contrato, no se cotiza." /></TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{b2b2cSegments.map(function (s) {
								const p           = segmentPricing(s, FALLBACK);
								const v           = segmentViability(s, cvCert, cvFirma, markupMin, FALLBACK);
								const cmIDCVal    = p.precioIDC - cvCert;
								const cmIDCPct    = p.precioIDC > 0 ? cmIDCVal / p.precioIDC : 0;
								const beIDCVal    = cmIDCVal > 0 ? Math.ceil(cfDirecto / cmIDCVal) : null;
								const cmFirmaVal  = p.precioFirma - cvFirma;
								const cmFirmaPct  = p.precioFirma > 0 ? cmFirmaVal / p.precioFirma : 0;
								return (
									<TableRow key={s.id} className={v.ok ? "" : "bg-destructive/5"}>
										<TableCell className="font-semibold">{s.label}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{(Number(s.idcMin) || 0).toLocaleString("es-AR")}
											{s.idcMax == null ? "+" : " – " + (Number(s.idcMax) || 0).toLocaleString("es-AR")}
										</TableCell>
										{visible.has("precioIDC")     && <TableCell className="text-right tabular-nums font-semibold">{fUSD(p.precioIDC)}</TableCell>}
										{visible.has("markupIDC")     && <TableCell className={"text-right tabular-nums font-semibold " + markupClass(v.markupCert, markupMin)}>{v.markupCert == null ? "—" : v.markupCert.toFixed(2) + "x"}</TableCell>}
										{visible.has("cmIDC")         && <TableCell className={"text-right tabular-nums font-semibold whitespace-nowrap " + margClass(cmIDCPct)}>{fUSD(cmIDCVal)} · {fPct(cmIDCPct)}</TableCell>}
										{visible.has("beIDC")         && <TableCell className="text-right tabular-nums font-semibold">{beIDCVal != null ? beIDCVal.toLocaleString("es-AR") : "—"}</TableCell>}
										{visible.has("precioFirma")   && <TableCell className="text-right tabular-nums font-semibold">{fUSD(p.precioFirma)}</TableCell>}
										{visible.has("markupFirma")   && <TableCell className={"text-right tabular-nums font-semibold " + markupClass(v.markupFirma, markupMin)}>{v.markupFirma == null ? "—" : v.markupFirma.toFixed(2) + "x"}</TableCell>}
										{visible.has("cvFirma")       && <TableCell className="text-right tabular-nums text-muted-foreground">{fUSD(cvFirma)}</TableCell>}
										{visible.has("cmFirma")       && <TableCell className={"text-right tabular-nums font-semibold whitespace-nowrap " + margClass(cmFirmaPct)}>{fUSD(cmFirmaVal)} · {fPct(cmFirmaPct)}</TableCell>}
										{visible.has("excedente")     && <TableCell className="text-right tabular-nums text-muted-foreground">{fUSD(p.precioFirmaExtra)}</TableCell>}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
					</div>
				</CardContent>
			</Card>

			{/* ── Integración SDK ────────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3">
						<div className="text-sm font-semibold">Integración SDK · Fee de implementación</div>
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
					<p className="text-xs text-muted-foreground mt-2">En la Cotizadora podés bonificar el SLA para un cliente específico sin modificar esta tabla.</p>
				</CardContent>
			</Card>
		</div>
	);
}
