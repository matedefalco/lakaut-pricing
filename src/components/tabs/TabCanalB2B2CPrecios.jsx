import { useChannelConfig } from "@/context/ChannelConfigContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export function TabCanalB2B2CPrecios() {
	const { channelConfig } = useChannelConfig();
	const { b2b2cSegments, b2b2cApiTiers, slaPlans, costoIdcRef } = channelConfig;

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h2 className="text-base font-semibold font-heading">Canal B2B2C · Tabla de referencia</h2>
				<p className="text-sm text-muted-foreground mt-1">Precios en USD. La unidad comercial es el IDC (Identidad Digital Certificada). El precio final por cotización puede ajustarse en la Cotizadora.</p>
			</div>

			{/* ── Pricing por segmento ────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3">
						<div className="text-sm font-semibold">Pricing por segmento</div>
						<p className="text-xs text-muted-foreground mt-0.5">El segmento se asigna automáticamente según el volumen mensual de IDC. Costo de referencia: USD {costoIdcRef.toFixed(4)} / IDC.</p>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Segmento</TableHead>
								<TableHead className="text-right">IDC / mes</TableHead>
								<TableHead className="text-right">Precio (USD / IDC)</TableHead>
								<TableHead className="text-right">Margen ref.</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{b2b2cSegments.map(function (s) {
								return (
									<TableRow key={s.id}>
										<TableCell className="font-semibold">{s.label}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{s.idcMin.toLocaleString("es-AR")}
											{s.idcMax == null ? "+" : " – " + s.idcMax.toLocaleString("es-AR")}
										</TableCell>
										<TableCell className="text-right tabular-nums font-semibold">
											{"USD " + s.precioIDC.toFixed(2)}
										</TableCell>
										<TableCell className={"text-right tabular-nums font-semibold " + margClass(s.margenRef)}>
											{(s.margenRef * 100).toFixed(0) + "%"}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
					<p className="text-[11px] text-muted-foreground mt-2">El margen real se recalcula en la Cotizadora con los costos variables actuales del motor.</p>
				</CardContent>
			</Card>

			{/* ── Integración API ────────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3">
						<div className="text-sm font-semibold">Integración API · Fee de implementación</div>
						<p className="text-xs text-muted-foreground mt-0.5">Cargo único al inicio del contrato. El tier se asigna según el fee acordado. Los rangos son orientativos; el valor puntual se define en la Cotizadora.</p>
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
