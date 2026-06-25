import { useState, useRef, useEffect } from "react";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

// 1 IDC = 1 cert + 1 firma
const FIRMAS_INCL_REF = 1;

const ALL_COLS = [
	{ key: "precioIDC",     label: "Precio (USD/IDC)" },
	{ key: "costoReal",     label: "Costo CV (USD/IDC)" },
	{ key: "cmReal",        label: "CM $" },
	{ key: "cmRealPct",     label: "CM %" },
	{ key: "margenReal",    label: "Margen $" },
	{ key: "margenRealPct", label: "Margen %" },
	{ key: "costoRef",      label: "Costo ref. (USD/IDC)" },
	{ key: "cmRef",         label: "CM ref. (USD/IDC)" },
	{ key: "margenRef",     label: "Margen ref. %" },
];

const DEFAULT_VISIBLE = new Set(["precioIDC", "costoReal", "cmReal", "cmRealPct", "margenReal", "margenRealPct"]);

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
	const { b2b2cSegments, b2b2cApiTiers, slaPlans, costoIdcRef } = channelConfig;

	const cvCert = costs?.cvCertBase ?? 0;
	const cvFirma = costs?.cvFirmaBase ?? 0;
	// Costo real por IDC = cert + firmas incluidas por defecto
	const costoRealIDC = cvCert + FIRMAS_INCL_REF * cvFirma;

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
				<h2 className="text-base font-semibold font-heading">Canal B2B2C · Tabla de referencia</h2>
				<p className="text-sm text-muted-foreground mt-1">Precios en USD. La unidad comercial es el IDC (Identidad Digital Certificada). El precio final por cotización puede ajustarse en la Cotizadora.</p>
			</div>

			{/* ── Pricing por segmento ────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="flex items-start justify-between gap-4 mb-3">
						<div>
							<div className="text-sm font-semibold">Pricing por segmento</div>
							<p className="text-xs text-muted-foreground mt-0.5">
								El segmento se asigna por volumen mensual de IDC.
								CV/IDC = cert USD {cvCert.toFixed(4)} + 1 firma USD {cvFirma.toFixed(4)} = USD {costoRealIDC.toFixed(4)}.
								Margen incluye absorción de CF directo al volumen medio de cada segmento.
							</p>
						</div>
						<ColFilterDropdown visible={visible} onToggle={toggleCol} />
					</div>
					<div className="overflow-x-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Segmento</TableHead>
								<TableHead className="text-right">IDC / mes</TableHead>
								{visible.has("precioIDC")     && <TableHead className="text-right">Precio (USD/IDC)</TableHead>}
								{visible.has("costoReal")     && <TableHead className="text-right">Costo CV<InfoTooltip text="Costo variable por IDC = cert + 1 firma. Sin costos fijos." /></TableHead>}
								{visible.has("cmReal")        && <TableHead className="text-right">CM $<InfoTooltip text="Contribución marginal = Precio − CV. Ganancia antes de cubrir costos fijos." /></TableHead>}
								{visible.has("cmRealPct")     && <TableHead className="text-right">CM %<InfoTooltip text="CM como porcentaje del precio = CM / Precio × 100." /></TableHead>}
								{visible.has("margenReal")    && <TableHead className="text-right">Margen $<InfoTooltip text="Margen neto por IDC = Precio − CV − (CF directo ÷ IDC/mes del punto medio del segmento)." /></TableHead>}
								{visible.has("margenRealPct") && <TableHead className="text-right">Margen %<InfoTooltip text="Margen neto como porcentaje del precio. Incluye la absorción de costos fijos al volumen medio del segmento." /></TableHead>}
								{visible.has("costoRef")      && <TableHead className="text-right">Costo ref.</TableHead>}
								{visible.has("cmRef")         && <TableHead className="text-right">CM ref.</TableHead>}
								{visible.has("margenRef")     && <TableHead className="text-right">Margen ref. %</TableHead>}
							</TableRow>
						</TableHeader>
						<TableBody>
							{b2b2cSegments.map(function (s) {
								const idcMid    = s.idcMax == null ? s.idcMin * 1.5 : (s.idcMin + s.idcMax) / 2;
								const cfPerIDC  = idcMid > 0 ? (costs?.cfDirecto ?? 0) / idcMid : 0;
								const cmVal     = s.precioIDC - costoRealIDC;
								const cmPct     = s.precioIDC > 0 ? cmVal / s.precioIDC : 0;
								const margenVal = cmVal - cfPerIDC;
								const margenPct = s.precioIDC > 0 ? margenVal / s.precioIDC : 0;
								const cmRefVal  = s.precioIDC - costoIdcRef;
								const mRefPct   = s.precioIDC > 0 ? cmRefVal / s.precioIDC : 0;
								return (
									<TableRow key={s.id}>
										<TableCell className="font-semibold">{s.label}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{s.idcMin.toLocaleString("es-AR")}
											{s.idcMax == null ? "+" : " – " + s.idcMax.toLocaleString("es-AR")}
										</TableCell>
										{visible.has("precioIDC")     && <TableCell className="text-right tabular-nums font-semibold">{fUSD(s.precioIDC)}</TableCell>}
										{visible.has("costoReal")     && <TableCell className="text-right tabular-nums text-muted-foreground">{fUSD(costoRealIDC)}</TableCell>}
										{visible.has("cmReal")        && <TableCell className={"text-right tabular-nums font-semibold " + margClass(cmPct)}>{fUSD(cmVal)}</TableCell>}
										{visible.has("cmRealPct")     && <TableCell className={"text-right tabular-nums font-semibold " + margClass(cmPct)}>{fPct(cmPct)}</TableCell>}
										{visible.has("margenReal")    && <TableCell className={"text-right tabular-nums font-semibold " + margClass(margenPct)}>{fUSD(margenVal)}</TableCell>}
										{visible.has("margenRealPct") && <TableCell className={"text-right tabular-nums font-semibold " + margClass(margenPct)}>{fPct(margenPct)}</TableCell>}
										{visible.has("costoRef")      && <TableCell className="text-right tabular-nums text-muted-foreground">{fUSD(costoIdcRef)}</TableCell>}
										{visible.has("cmRef")         && <TableCell className={"text-right tabular-nums font-semibold " + margClass(mRefPct)}>{fUSD(cmRefVal)}</TableCell>}
										{visible.has("margenRef")     && <TableCell className={"text-right tabular-nums font-semibold " + margClass(s.margenRef)}>{fPct(s.margenRef)}</TableCell>}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
					</div>
					<p className="text-[11px] text-muted-foreground mt-2">
						CM = Precio − CV (sin CF). Margen = CM − CF directo ÷ IDC/mes del punto medio del segmento. Columnas "ref." provienen del Borrador v5.
					</p>
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
