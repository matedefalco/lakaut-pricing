import { Label } from "@/components/ui/label";
import { TierBadge } from "@/components/ui/TierBadge";

// Bloque "Segmento y facturación" del paso 3 de la cotizadora. Se saca de
// TabCanalB2B2C por la misma razón que ProyeccionSection: el archivo tenía 1737
// líneas y este bloque, que decide el segmento y la ventana de facturación, es
// de los que más se consultan. Presentacional: el cálculo queda en el padre.
export function SegmentoSection({
	esIDC, esDistribVol, hasVolume, seg, segDesc, segDriver, segmentList, segPrice, distribConCompromiso, certsActivosNum, certsHistoricos, facturacionAtList, facturacionEje, facturacionNivelDistrib, firmasTotales, feeAplicado, idc, revSinFee, mesesVentanaFact, mesesVinculacion, modalidadFact, setModalidadFact, fMoney, fMoney2,
}) {
	return (
		<>
		{/* Segmento y proyección. En IDC el segmento sale del volumen del paso 2 y acá
		    solo se muestra; en Volumen lo define el compromiso del contrato en USD, que
		    se sugiere como facturación a lista × meses de vinculación y se puede
		    sobrescribir cuando el cliente compromete un volumen distinto al cotizado. */}
		<div className="flex flex-col gap-2">
			<span className="text-sm font-medium">{esIDC ? "Segmento y proyección" : esDistribVol ? "Nivel del distribuidor" : "Compromiso del contrato"}</span>
			<p className="text-xs text-muted-foreground">
				{esIDC
					? "El segmento es el MAYOR entre dos ejes: el volumen mensual de IDC del paso 2 y la facturación de la ventana medida a precio Start Up (referencia que evita la circularidad precio↔segmento). Lo que llegue al segmento más grande, manda."
					: esDistribVol
						? "El nivel (Azul→Platinum) se alcanza por el mayor entre la facturación a precio base (con compromiso anual, servicio × 12; sin compromiso, el período mensual × 1) y los certificados activos del socio (que cuentan solo con compromiso anual). A mayor nivel, mayor descuento sobre la firma (el certificado va bonificado). El descuento se aplica en ambas condiciones: diferido con compromiso anual, o directo en cada factura sin compromiso."
						: "El segmento es el MAYOR entre dos ejes de esta cotización: el volumen real de firmas y la facturación a lista de la ventana contemplada (compromiso del contrato). Lo que llegue al segmento más alto, manda."}
			</p>
			{/* Modalidad de facturación (IDC y Volumen): windowea el eje de facturación.
			    En Distribuidores-Volumen el nivel sale del compromiso anual declarado,
			    así que la modalidad no aplica. */}
			{!esDistribVol && (
				<div className="flex flex-col gap-1.5">
					<Label className="text-xs text-muted-foreground uppercase tracking-wide">Modalidad de facturación</Label>
					<div className="inline-flex w-fit rounded-md border border-border bg-muted/30 p-0.5">
						{[{ id: "unico", label: "Consumo único" }, { id: "anual", label: "Anual" }].map(function (o) {
							const active = modalidadFact === o.id;
							return (
								<button key={o.id} type="button" onClick={function () { setModalidadFact(o.id); }} className={"px-3 py-1 rounded text-xs font-medium transition-colors " + (active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{o.label}</button>
							);
						})}
					</div>
					<span className="text-xs text-muted-foreground">{modalidadFact === "unico" ? "Compra puntual: la facturación se mide sobre ese único período (× 1)." : "Contrato anual: la facturación se anualiza (× " + mesesVinculacion + " " + (mesesVinculacion === 1 ? "mes" : "meses") + " de vinculación)."}</span>
				</div>
			)}

			{esDistribVol ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">{distribConCompromiso ? "Facturación anual (compromiso)" : "Facturación mensual"} <span className="normal-case tracking-normal font-normal">(calculado)</span></Label>
						<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
							<span className="font-semibold tabular-nums">{hasVolume ? fMoney(facturacionNivelDistrib) : "—"}</span>
						</div>
						<span className="text-xs text-muted-foreground">{distribConCompromiso ? "Servicio mensual a precio base × 12. Asigna el nivel junto con los certificados activos (gana el mayor)." : "Servicio del período a precio base (× 1). Asigna el nivel. Con compromiso anual se anualiza (× 12) y suman los certificados activos."}</span>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Nivel alcanzado</Label>
						<div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2">
							{hasVolume ? <TierBadge tier={seg} tiers={segmentList} size="sm" sub={"−" + Math.round(segDesc * 100) + "%"} /> : <span className="text-sm text-muted-foreground/60">—</span>}
							<span className="text-xs text-muted-foreground truncate">{!hasVolume ? "cargá volumen" : segDriver === "certificados" ? "por certificados activos" : segDriver === "ambos" ? "por facturación y certificados" : distribConCompromiso ? "por facturación anual " + fMoney(facturacionNivelDistrib) : "por facturación mensual " + fMoney(facturacionNivelDistrib)}</span>
						</div>
						<span className="text-xs text-muted-foreground">{distribConCompromiso ? "Descuento sobre la firma, liquidado según la forma de pago." : "Descuento directo sobre la firma, sin compromiso de permanencia anual."}</span>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Certificados activos <span className="normal-case tracking-normal font-normal">{distribConCompromiso ? "(asigna nivel)" : "(informativo sin compromiso)"}</span></Label>
						<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
							<span className="font-semibold tabular-nums">{certsActivosNum.toLocaleString("es-AR")}</span>
							<span className="ml-2 text-xs text-muted-foreground truncate">{certsHistoricos.toLocaleString("es-AR")} + {idc.toLocaleString("es-AR")} de esta cotización</span>
						</div>
						<span className="text-xs text-muted-foreground">{distribConCompromiso ? "Suben el nivel si superan el que da la facturación (gana el mayor)." : "Solo suben el nivel con compromiso anual."}</span>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Facturación mensual</Label>
						<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
							<span className="font-semibold tabular-nums">{hasVolume ? fMoney2(revSinFee) : "—"}</span>
						</div>
						<span className="text-xs text-muted-foreground">Servicio + SLA, sin el fee.</span>
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">{esIDC ? "IDC / mes" : "Firmas totales"}</Label>
						<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
							<span className="font-semibold tabular-nums">{(esIDC ? idc : firmasTotales).toLocaleString("es-AR")}</span>
						</div>
						<span className="text-xs text-muted-foreground">{esIDC ? "eje de volumen · identidades por mes" : "eje de volumen · firmas por certificado + firmas sueltas"}</span>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Facturación del segmento</Label>
						<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
							<span className="font-semibold tabular-nums">{hasVolume ? fMoney(facturacionEje) : "—"}</span>
						</div>
						<span className="text-xs text-muted-foreground">{hasVolume ? (esIDC ? "eje de facturación · a precio Start Up × " + mesesVentanaFact + " " + (mesesVentanaFact === 1 ? "mes" : "meses") : "eje de facturación · " + fMoney(facturacionAtList) + " a lista × " + mesesVentanaFact + " " + (mesesVentanaFact === 1 ? "mes" : "meses")) : "se calcula del volumen cotizado"}</span>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Segmento alcanzado</Label>
						<div className="flex h-9 items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2">
							{hasVolume ? <TierBadge tier={seg} tiers={segmentList} size="sm" sub={esIDC ? fMoney2(segPrice.precioIDC) : (segDesc > 0 ? "−" + Math.round(segDesc * 100) + "%" : null)} /> : <span className="text-sm text-muted-foreground/40">—</span>}
							<span className="text-xs text-muted-foreground truncate">{hasVolume ? (esIDC ? (segDriver === "facturacion" ? "por facturación " + fMoney(facturacionEje) : segDriver === "idc" ? "por " + idc.toLocaleString("es-AR") + " IDC/mes" : "por IDC/mes y facturación") : segDriver === "facturacion" ? "por facturación " + fMoney(facturacionEje) : segDriver === "firmas" ? "por " + firmasTotales.toLocaleString("es-AR") + " firmas" : "por firmas y facturación") : "cargá volumen"}</span>
						</div>
						<span className="text-xs text-muted-foreground">{esIDC ? "Precio de tabla del segmento." : "Descuento sobre los dos precios de lista."}</span>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Facturación mensual</Label>
						<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
							<span className="font-semibold tabular-nums">{hasVolume ? fMoney2(revSinFee) : "—"}</span>
						</div>
						<span className="text-xs text-muted-foreground">Servicio + SLA, sin el fee.</span>
					</div>
					{esIDC && (
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">Por la vinculación</Label>
							<div className="flex h-9 items-center rounded-md border border-dashed border-border bg-muted/30 px-3 text-sm">
								<span className="font-semibold tabular-nums">{hasVolume ? fMoney2(revSinFee * mesesVinculacion + feeAplicado) : "—"}</span>
							</div>
							<span className="text-xs text-muted-foreground">{mesesVinculacion} {mesesVinculacion === 1 ? "mes" : "meses"} + fee.</span>
						</div>
					)}
				</div>
			)}
		</div>
		</>
	);
}
