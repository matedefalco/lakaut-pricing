import { useChannelConfig } from "@/context/ChannelConfigContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const TIER_STYLES = {
	azul:     { background: "#2563EB", color: "#fff" },
	bronce:   { background: "#92400E", color: "#fff" },
	plata:    { background: "#64748B", color: "#fff" },
	oro:      { background: "#B45309", color: "#fff" },
	platinum: { background: "#6D28D9", color: "#fff" },
};

export function TabCanalDistribuidoresPrecios() {
	const { channelConfig } = useChannelConfig();
	const { distributorTiers } = channelConfig;

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h2 className="text-base font-semibold font-heading">Canal Distribuidores · Tabla de referencia</h2>
				<p className="text-sm text-muted-foreground mt-1">Descuento sobre la lista web. El nivel se asigna automáticamente: gana el mayor entre certificados activos y compromiso anual de facturación.</p>
			</div>

			{/* ── Matriz de niveles ────────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3">
						<div className="text-sm font-semibold">Matriz de niveles</div>
						<p className="text-xs text-muted-foreground mt-0.5">El descuento aplica sobre la facturación a precios de lista web (ARS). Aplica a toda la orden, sin mezcla de tiers.</p>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Nivel</TableHead>
								<TableHead className="text-right">Compromiso anual (USD)</TableHead>
								<TableHead className="text-right">Certificados activos</TableHead>
								<TableHead className="text-right">Descuento sobre lista</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{distributorTiers.map(function (t) {
								return (
									<TableRow key={t.id}>
										<TableCell>
											<Badge style={TIER_STYLES[t.id] || {}}>{t.label}</Badge>
										</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{t.compromisoMax == null
												? "> USD " + t.compromisoMin.toLocaleString("es-AR")
												: "USD " + t.compromisoMin.toLocaleString("es-AR") + " – " + t.compromisoMax.toLocaleString("es-AR")}
										</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">
											{t.certsMin.toLocaleString("es-AR")}
											{t.certsMax == null ? "+" : " – " + t.certsMax.toLocaleString("es-AR")}
										</TableCell>
										<TableCell className="text-right tabular-nums font-semibold text-lg">
											{(t.descuento * 100).toFixed(0) + "%"}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* ── Reglas de asignación ─────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3 text-sm font-semibold">Reglas de asignación de nivel</div>
					<div className="space-y-3 text-sm text-muted-foreground">
						<div className="flex gap-3">
							<span className="shrink-0 font-semibold text-foreground">1.</span>
							<span>Se calcula el nivel por <strong className="text-foreground">compromiso anual</strong> (facturación a lista USD de la cotización, criterio principal).</span>
						</div>
						<div className="flex gap-3">
							<span className="shrink-0 font-semibold text-foreground">2.</span>
							<span>Se calcula también por <strong className="text-foreground">certificados activos</strong> (acumulado histórico del distribuidor, criterio secundario).</span>
						</div>
						<div className="flex gap-3">
							<span className="shrink-0 font-semibold text-foreground">3.</span>
							<span>Gana el nivel <strong className="text-foreground">más alto</strong> de los dos. Esto permite que un distribuidor suba de nivel por volumen en una sola orden aunque su historial sea bajo.</span>
						</div>
						<div className="flex gap-3">
							<span className="shrink-0 font-semibold text-foreground">4.</span>
							<span>El descuento se aplica sobre la facturación total a precios de lista (no es acumulable ni escalonado por producto).</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Qué incluye el canal ─────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3 text-sm font-semibold">Qué incluye el canal</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
						<div className="space-y-2">
							<div className="font-medium text-foreground">Acceso</div>
							<ul className="space-y-1 text-muted-foreground">
								<li>→ Portal de distribuidores Lakaut</li>
								<li>→ Acceso a todos los productos de lista web</li>
								<li>→ Soporte técnico y comercial dedicado</li>
							</ul>
						</div>
						<div className="space-y-2">
							<div className="font-medium text-foreground">Condiciones</div>
							<ul className="space-y-1 text-muted-foreground">
								<li>→ Contrato anual de distribuidor requerido</li>
								<li>→ Compromiso mínimo: nivel Azul (0% descuento base)</li>
								<li>→ Revisión de nivel: anual o por cotización</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
