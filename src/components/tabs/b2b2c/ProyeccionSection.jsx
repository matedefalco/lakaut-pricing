import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PROYECCION_DRIVERS } from "@/lib/proyeccion";

// Bloque "Proyección / escalonado de crecimiento" del paso 3 de la cotizadora.
// Vivía adentro de TabCanalB2B2C, que tenía 1737 líneas: los cortes de sección ya
// estaban marcados con comentarios, pero el archivo seguía siendo uno solo, así
// que tocar este bloque obligaba a abrir la cotizadora entera. Es puramente
// presentacional: el estado y el cálculo siguen en el componente padre.
export function ProyeccionSection({
	esIDC, esDistribVol, hasVolume, baseCanal, fMoney, fMoney2,
	proyEnabled, setProyEnabled, proyCustom, proyDriver, proySteps,
	proyRows, escalonadoRows,
	changeDriver, resetSteps, updateStep, addStep, removeStep,
}) {
	return (
		<>
		{/* Proyección de crecimiento (opcional): override por propuesta que suma
		    al PDF una tabla de precios por volumen alcanzado. */}
		<div className="flex flex-col gap-3">
			<label className="flex items-center gap-2.5 cursor-pointer select-none">
				<input type="checkbox" checked={proyEnabled} onChange={function (e) { setProyEnabled(e.target.checked); }} className="rounded" />
				<span className="text-sm font-medium">{esIDC ? "Proyección de crecimiento en la propuesta" : "Escalonado de crecimiento en la propuesta"}</span>
				{proyEnabled && <Badge variant="secondary" className="text-xs px-1.5 py-0 text-[var(--success)] border-[var(--success)]">activa</Badge>}
				{proyEnabled && !esIDC && <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">{esDistribVol ? "según niveles" : (proyCustom ? "personalizado" : "estándar")}</Badge>}
			</label>
			{!proyEnabled && <p className="text-xs text-muted-foreground pl-6">{esIDC ? "Opcional. Agrega al PDF una tabla de precios por volumen alcanzado, con descuento progresivo." : esDistribVol ? "Opcional. Agrega al PDF un escalonado derivado de los niveles de Distribuidores-Volumen: una fila por nivel, alineada con el descuento que alcanza la cotización." : "Opcional. Agrega al PDF el escalonado estándar de precios por volumen de firmas; podés ajustarlo para esta cotización puntual."}</p>}

		{proyEnabled && (esIDC ? (
			<div className="space-y-4">
				<p className="text-xs text-muted-foreground">
					Parte del volumen y el precio de esta cotización y muestra escalones crecientes con mejor precio. Es un override solo para esta propuesta: no cambia tu segmentación.
				</p>

				{/* Driver: qué escala en cada escalón */}
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">Qué crece en cada escalón</Label>
					<div className="flex gap-1 flex-wrap">
						{PROYECCION_DRIVERS.map(function (d) {
							const active = proyDriver === d.id;
							return (
								<button key={d.id} onClick={function () { changeDriver(d.id); }} className={"px-2.5 py-1 rounded-md text-xs transition-colors " + (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}>{d.label}</button>
							);
						})}
					</div>
					<span className="text-xs text-muted-foreground">{(PROYECCION_DRIVERS.find(function (d) { return d.id === proyDriver; }) || {}).desc}</span>
				</div>

				{/* Escalones editables */}
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Escalones</Label>
						<button onClick={resetSteps} className="text-xs text-muted-foreground hover:text-foreground">restaurar (5/10/25/50%)</button>
					</div>
					<div className="space-y-1.5">
						{proySteps.map(function (s, i) {
							return (
								<div key={i} className="flex items-end gap-2 flex-wrap">
									{proyDriver === "manual" ? (
										<>
											<div className="flex flex-col gap-1">
												<span className="text-xs text-muted-foreground">Certificados</span>
												<Input type="number" min={0} value={s.idc != null ? s.idc : ""} onChange={function (e) { updateStep(i, { idc: e.target.value }); }} className="h-8 w-28 text-sm tabular-nums" />
											</div>
											<div className="flex flex-col gap-1">
												<span className="text-xs text-muted-foreground">Firmas</span>
												<Input type="number" min={0} value={s.firmas != null ? s.firmas : ""} onChange={function (e) { updateStep(i, { firmas: e.target.value }); }} className="h-8 w-28 text-sm tabular-nums" />
											</div>
										</>
									) : (
										<div className="flex flex-col gap-1">
											<span className="text-xs text-muted-foreground">Crecimiento</span>
											<div className="flex items-center">
												<span className="text-xs text-muted-foreground mr-1">+</span>
												<Input type="number" min={0} value={s.pct} onChange={function (e) { updateStep(i, { pct: e.target.value }); }} className="h-8 w-20 text-sm tabular-nums" />
												<span className="text-xs text-muted-foreground ml-1">%</span>
											</div>
										</div>
									)}
									<div className="flex flex-col gap-1">
										<span className="text-xs text-muted-foreground">Descuento</span>
										<div className="flex items-center">
											<span className="text-xs text-muted-foreground mr-1">−</span>
											<Input type="number" min={0} max={100} value={s.descuento} onChange={function (e) { updateStep(i, { descuento: e.target.value }); }} className="h-8 w-20 text-sm tabular-nums" />
											<span className="text-xs text-muted-foreground ml-1">%</span>
										</div>
									</div>
									<button onClick={function () { removeStep(i); }} className="h-8 px-2 text-muted-foreground hover:text-destructive text-xs shrink-0" title="Quitar escalón">✕</button>
								</div>
							);
						})}
					</div>
					<button onClick={addStep} className="text-xs font-medium text-primary hover:underline">+ agregar escalón</button>
				</div>

				{/* Preview de la tabla que va al PDF */}
				{hasVolume ? (
					<div className="rounded-lg border border-border overflow-hidden">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Escenario</TableHead>
									<TableHead>Volumen</TableHead>
									<TableHead className="text-right">/ cert</TableHead>
									<TableHead className="text-right">/ firma</TableHead>
									<TableHead className="text-right">Costo est.</TableHead>
									<TableHead className="text-right">Ahorro</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{proyRows.map(function (r, i) {
									const isBase = i === 0;
									const isTarget = proyRows.length > 1 && i === proyRows.length - 1;
									return (
										<TableRow key={i} className={isTarget ? "bg-primary/5" : ""}>
											<TableCell className="font-medium">{isBase ? "Actual" : "+" + r.pct + "%"}{isTarget ? <span className="ml-1 text-xs text-primary font-semibold">objetivo</span> : null}</TableCell>
											<TableCell className="text-muted-foreground text-xs tabular-nums">{r.idc.toLocaleString("es-AR")} cert{r.firmas > 0 ? " · " + r.firmas.toLocaleString("es-AR") + " firmas" : ""}</TableCell>
											<TableCell className="text-right tabular-nums">{fMoney2(r.precioCert)}</TableCell>
											<TableCell className="text-right tabular-nums">{fMoney2(r.precioFirma)}</TableCell>
											<TableCell className="text-right tabular-nums font-semibold">{esDistribVol ? (r.firmasHasta != null ? fMoney(r.firmasHasta * r.precioFirma) : "—") : fMoney(r.costo)}</TableCell>
											<TableCell className="text-right tabular-nums text-[var(--success)]">{isBase ? "—" : fMoney(r.ahorroMonto) + " (" + (r.ahorroPct * 100).toFixed(0) + "%)"}</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				) : (
					<p className="text-xs text-muted-foreground">Cargá certificados para ver la proyección.</p>
				)}
				<p className="text-xs text-muted-foreground">Costo estimado = volumen de certificados y firmas a ese escalón (sin fee ni SLA). El descuento se aplica al precio de cert y de firma por igual.</p>
				</div>
			) : (
			<div className="space-y-4">
				<p className="text-xs text-muted-foreground">
					{esDistribVol
						? <>Escalonado derivado de los niveles: una fila por nivel (Azul a Platinum) con su rango de firmas y su descuento sobre el precio base de la firma ({fMoney2(baseCanal.firma)}). El rango de firmas de cada nivel es de referencia; el nivel que aplica lo define el mayor entre la facturación (windoweada por la condición comercial) y los certificados activos. Se ajusta en Config, niveles de Distribuidores-Volumen.</>
						: <>Escala estándar de precios por cantidad de firmas: el mismo escalonado para todas las propuestas. El precio por firma de cada escalón sale del precio base ({fMoney2(baseCanal.firma)}). {proyCustom ? "Personalizaste el escalonado para esta propuesta." : "Se toma de la config; podés ajustarlo acá para esta propuesta."}</>}
				</p>

				{/* Escalones editables (firmas absolutas). En Distribuidores-Volumen el escalonado
				    se deriva de los niveles y no se edita a mano acá. */}
				{!esDistribVol && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Escalones (firmas → descuento)</Label>
						<button onClick={resetSteps} className="text-xs text-muted-foreground hover:text-foreground">restaurar estándar</button>
					</div>
					<div className="space-y-1.5">
						{proySteps.map(function (s, i) {
							return (
								<div key={i} className="flex items-end gap-2 flex-wrap">
									<div className="flex flex-col gap-1">
										<span className="text-xs text-muted-foreground">Desde firmas</span>
										<Input type="number" min={0} value={s.firmas != null ? s.firmas : ""} onChange={function (e) { updateStep(i, { firmas: e.target.value }); }} className="h-8 w-32 text-sm tabular-nums" />
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-xs text-muted-foreground">Descuento</span>
										<div className="flex items-center">
											<span className="text-xs text-muted-foreground mr-1">−</span>
											<Input type="number" min={0} max={100} value={s.descuento} onChange={function (e) { updateStep(i, { descuento: e.target.value }); }} className="h-8 w-20 text-sm tabular-nums" />
											<span className="text-xs text-muted-foreground ml-1">%</span>
										</div>
									</div>
									<div className="flex flex-col gap-1">
										<span className="text-xs text-muted-foreground">Precio / firma</span>
										<div className="flex h-8 items-center rounded-md border border-dashed border-border bg-muted/30 px-2 text-sm tabular-nums">{fMoney2(baseCanal.firma * (1 - Math.min(100, Math.max(0, Number(s.descuento) || 0)) / 100))}</div>
									</div>
									<button onClick={function () { removeStep(i); }} className="h-8 px-2 text-muted-foreground hover:text-destructive text-xs shrink-0" title="Quitar escalón">✕</button>
								</div>
							);
						})}
					</div>
					<button onClick={addStep} className="text-xs font-medium text-primary hover:underline">+ agregar escalón</button>
				</div>
			)}

				{/* Preview del escalonado que va al PDF */}
				<div className="rounded-lg border border-border overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{esDistribVol ? "Nivel · firmas" : "Volumen de firmas"}</TableHead>
								<TableHead className="text-right">Descuento</TableHead>
								<TableHead className="text-right">/ firma</TableHead>
								<TableHead className="text-right">Costo est.</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{escalonadoRows.map(function (r, i) {
								return (
									<TableRow key={i} className={r.actual ? "bg-primary/5" : ""}>
										<TableCell className="font-medium tabular-nums">{esDistribVol ? (r.firmasHasta != null ? r.firmas.toLocaleString("es-AR") + "–" + r.firmasHasta.toLocaleString("es-AR") : r.firmas.toLocaleString("es-AR") + "+") : r.firmas.toLocaleString("es-AR")}{r.actual ? <span className="ml-1 text-xs text-primary font-semibold">{esDistribVol ? "tu nivel" : "tu volumen"}</span> : null}</TableCell>
										<TableCell className="text-right tabular-nums">{r.descuento > 0 ? "−" + r.descuento + "%" : "—"}</TableCell>
										<TableCell className="text-right tabular-nums">{fMoney2(r.precioFirma)}</TableCell>
										<TableCell className="text-right tabular-nums font-semibold">{esDistribVol ? (r.firmasHasta != null ? fMoney(r.firmasHasta * r.precioFirma) : "—") : fMoney(r.costo)}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
				<p className="text-xs text-muted-foreground">{esDistribVol ? "Una fila por nivel (Azul a Platinum): el rango es la banda de firmas y el costo estimado es el tope de la banda a su precio por firma, sin certificados, fee ni SLA. Se resalta el nivel que alcanza esta cotización (tu volumen exacto está arriba)." : "Escala fija de precios por volumen de firmas (misma en toda propuesta). El costo estimado es el volumen de firmas de cada escalón a su precio, sin certificados, fee ni SLA. Se resalta el tramo que alcanza el volumen de esta cotización."}</p>
				</div>
			))}
		</div>
		</>
	);
}
