import { useState, useRef, useEffect } from "react";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

// Certificado y firma se precian y analizan por separado (ya no como un "IDC"
// combinado). Cada componente tiene su precio de lista, su CV y su margen.
const ALL_COLS = [
	{ key: "precioCert",    label: "Precio cert (USD)" },
	{ key: "cvCert",        label: "CV cert (USD)" },
	{ key: "cmCert",        label: "CM cert" },
	{ key: "beCert",        label: "BE cert" },
	{ key: "precioFirma",   label: "Precio firma (USD)" },
	{ key: "cvFirma",       label: "CV firma (USD)" },
	{ key: "cmFirma",       label: "CM firma" },
];

const DEFAULT_VISIBLE = new Set(["precioCert", "cmCert", "precioFirma", "cmFirma"]);

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }

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
	const base = channelConfig.b2b2cBase || { cert: 0, firma: 0 };

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

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h2 className="text-base font-semibold font-heading">Canal Volumen · Tabla de referencia</h2>
				<p className="text-sm text-muted-foreground mt-1">Precios en USD. El certificado y la firma tienen precio de lista base, y el segmento alcanzado aplica un descuento sobre ambos. El precio final por cotización puede ajustarse en la Cotizadora.</p>
			</div>

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
								<TableHead>Segmento<InfoTooltip text="El cliente cae en un solo segmento, asignado por el compromiso del contrato en USD a precio de lista." /></TableHead>
								<TableHead className="text-right">Compromiso (USD)<InfoTooltip text="Rango de compromiso del contrato que alcanza el segmento: certificados × precio base cert + firmas × precio base firma, por los meses de vinculación." /></TableHead>
								<TableHead className="text-right">Desc.<InfoTooltip text="Descuento del segmento, aplicado por igual al precio del certificado y al de la firma." /></TableHead>
								{visible.has("precioCert")    && <TableHead className="text-right">Precio cert (USD)<InfoTooltip text={"Precio base USD " + (Number(base.cert) || 0).toFixed(4) + " menos el descuento del segmento."} /></TableHead>}
								{visible.has("cvCert")        && <TableHead className="text-right">CV cert<InfoTooltip text={"Costo variable por certificado = USD " + cvCert.toFixed(4) + ". Sin costos fijos."} /></TableHead>}
								{visible.has("cmCert")        && <TableHead className="text-right">CM cert<InfoTooltip text="Contribución marginal del certificado = Precio cert − CV cert (sin CF), en USD y como % del precio." /></TableHead>}
								{visible.has("beCert")        && <TableHead className="text-right">BE cert<InfoTooltip text="Break-even: certificados mínimos para cubrir el CF directo al precio de este segmento. BE = CF directo ÷ CM cert." /></TableHead>}
								{visible.has("precioFirma")   && <TableHead className="text-right">Precio firma (USD)<InfoTooltip text={"Precio base USD " + (Number(base.firma) || 0).toFixed(4) + " menos el descuento del segmento."} /></TableHead>}
								{visible.has("cvFirma")       && <TableHead className="text-right">CV firma<InfoTooltip text={"Costo variable por firma = USD " + cvFirma.toFixed(4) + ". Sin costos fijos."} /></TableHead>}
								{visible.has("cmFirma")       && <TableHead className="text-right">CM firma<InfoTooltip text="Contribución marginal de la firma = Precio firma − CV firma (sin CF), en USD y como % del precio." /></TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{b2b2cSegments.map(function (s) {
								const desc       = Math.min(1, Math.max(0, Number(s.descuento) || 0));
								const precioCert = (Number(base.cert) || 0) * (1 - desc);
								const precioFirma = (Number(base.firma) || 0) * (1 - desc);
								const cmCertVal  = precioCert - cvCert;
								const cmCertPct  = precioCert > 0 ? cmCertVal / precioCert : 0;
								const beCertVal  = cmCertVal > 0 ? Math.ceil(cfDirecto / cmCertVal) : null;
								const cmFirmaVal = precioFirma - cvFirma;
								const cmFirmaPct = precioFirma > 0 ? cmFirmaVal / precioFirma : 0;
								return (
									<TableRow key={s.id}>
										<TableCell className="font-semibold">{s.label}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{(Number(s.compromisoMin) || 0).toLocaleString("es-AR")}
											{s.compromisoMax == null ? "+" : " – " + (Number(s.compromisoMax) || 0).toLocaleString("es-AR")}
										</TableCell>
										<TableCell className="text-right tabular-nums font-semibold">{desc > 0 ? "−" + fPct(desc) : "—"}</TableCell>
										{visible.has("precioCert")    && <TableCell className="text-right tabular-nums font-semibold">{fUSD(precioCert)}</TableCell>}
										{visible.has("cvCert")        && <TableCell className="text-right tabular-nums text-muted-foreground">{fUSD(cvCert)}</TableCell>}
										{visible.has("cmCert")        && <TableCell className={"text-right tabular-nums font-semibold whitespace-nowrap " + margClass(cmCertPct)}>{fUSD(cmCertVal)} · {fPct(cmCertPct)}</TableCell>}
										{visible.has("beCert")        && <TableCell className="text-right tabular-nums font-semibold">{beCertVal != null ? beCertVal.toLocaleString("es-AR") : "—"}</TableCell>}
										{visible.has("precioFirma")   && <TableCell className="text-right tabular-nums font-semibold">{fUSD(precioFirma)}</TableCell>}
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
