import { useChannelConfig } from "@/context/ChannelConfigContext";
import { useModels } from "@/context/ModelsContext";
import { makeMoney } from "@/utils/useMoney";
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

export function TabCanalDistribuidoresPrecios({ currency, tc }) {
	const { channelConfig } = useChannelConfig();
	const { distributorTiers } = channelConfig;
	const { models: allModels } = useModels();
	const models = allModels.filter(function (m) { return m.activo !== false && m.priceUSD > 0; });
	const { fMoney } = makeMoney(currency || "USD", tc || 1);

	return (
		<div className="space-y-6 max-w-5xl">
			<div>
				<h2 className="text-base font-semibold font-heading">Canal Distribuidores · Referencia</h2>
				<p className="text-sm text-muted-foreground mt-1">Precios de lista web y descuentos por nivel. El descuento aplica sobre toda la orden.</p>
			</div>

			{/* ── 1. Tabla de packs ────────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3">
						<div className="text-sm font-semibold">Packs disponibles</div>
						<p className="text-xs text-muted-foreground mt-0.5">Precios de lista web (base de cálculo antes de descuento por nivel).</p>
					</div>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Pack</TableHead>
								<TableHead>Tipo</TableHead>
								<TableHead className="text-right">Precio USD</TableHead>
								<TableHead className="text-right">Certs / u</TableHead>
								<TableHead className="text-right">Firmas / u</TableHead>
								<TableHead className="text-right">Vigencia</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{models.map(function (m) {
								const firmasLabel = m.ilimitadas ? "Ilimitadas" : (m.firmas || 0).toLocaleString("es-AR");
								const vigencia = (m.vigencia || m.billingPeriod || 24) + " meses";
								return (
									<TableRow key={m.id}>
										<TableCell className="font-semibold">{m.label}</TableCell>
										<TableCell>
											<Badge variant={m.segment === "empresa" ? "default" : "secondary"} className="text-[10px]">
												{m.segment === "empresa" ? "Jurídica" : "Física"}
											</Badge>
										</TableCell>
										<TableCell className="text-right tabular-nums font-medium">USD {m.priceUSD.toLocaleString("es-AR")}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">{(m.certs || 1)}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">{firmasLabel}</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">{vigencia}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			{/* ── 2. Matriz de niveles ─────────────────────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3">
						<div className="text-sm font-semibold">Matriz de niveles</div>
						<p className="text-xs text-muted-foreground mt-0.5">El nivel se asigna automáticamente: gana el mayor entre certificados activos y compromiso anual.</p>
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

			{/* ── 3. Matriz combinada packs × niveles ──────────────────── */}
			<Card>
				<CardContent>
					<div className="mb-3">
						<div className="text-sm font-semibold">Precios netos por nivel</div>
						<p className="text-xs text-muted-foreground mt-0.5">Precio neto Lakaut (USD) = precio lista × (1 − descuento del nivel). Lo que el distribuidor paga efectivamente por pack.</p>
					</div>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Pack</TableHead>
									<TableHead>Tipo</TableHead>
									<TableHead className="text-right text-muted-foreground">Lista</TableHead>
									{distributorTiers.map(function (t) {
										return (
											<TableHead key={t.id} className="text-center">
												<span className="inline-flex items-center justify-center rounded px-2 py-0.5 text-xs font-semibold" style={TIER_STYLES[t.id] || {}}>
													{t.label}
												</span>
												<div className="text-[10px] font-normal text-muted-foreground mt-0.5">−{(t.descuento * 100).toFixed(0)}%</div>
											</TableHead>
										);
									})}
								</TableRow>
							</TableHeader>
							<TableBody>
								{models.map(function (m) {
									return (
										<TableRow key={m.id}>
											<TableCell className="font-semibold whitespace-nowrap">{m.label}</TableCell>
											<TableCell>
												<Badge variant={m.segment === "empresa" ? "default" : "secondary"} className="text-[10px]">
													{m.segment === "empresa" ? "Jurídica" : "Física"}
												</Badge>
											</TableCell>
											<TableCell className="text-right tabular-nums text-muted-foreground">USD {m.priceUSD.toLocaleString("es-AR")}</TableCell>
											{distributorTiers.map(function (t) {
												const neto = m.priceUSD * (1 - t.descuento);
												const isZeroDisc = t.descuento === 0;
												return (
													<TableCell key={t.id} className="text-center tabular-nums">
														<span className={"font-semibold " + (isZeroDisc ? "text-muted-foreground" : "text-foreground")}>
															USD {neto.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
														</span>
													</TableCell>
												);
											})}
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{/* ── Reglas y condiciones ─────────────────────────────────── */}
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
							<span>Gana el nivel <strong className="text-foreground">más alto</strong> de los dos.</span>
						</div>
						<div className="flex gap-3">
							<span className="shrink-0 font-semibold text-foreground">4.</span>
							<span>El descuento se aplica sobre la facturación total a precios de lista (no escalonado por producto).</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
