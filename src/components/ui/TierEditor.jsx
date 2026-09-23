import { cn } from "@/lib/utils";

// Editor reutilizable de tramos de descuento por volumen.
// tiers: [{ minVol, discount }] · onChange(nextTiers)
export function TierEditor({ tiers, onChange, accent, compact }) {
	const c = accent || "var(--primary)";

	function upd(i, field, val) {
		onChange(tiers.map(function (t, j) { return j === i ? Object.assign({}, t, { [field]: val }) : t; }));
	}
	function remove(i) {
		onChange(tiers.filter(function (_, j) { return j !== i; }));
	}
	function add() {
		const last = tiers[tiers.length - 1];
		const nextVol = last && isFinite(last.minVol) ? Math.max(1, last.minVol * 2) : 1000;
		onChange(tiers.concat([{ minVol: nextVol, discount: 0 }]));
	}

	// Tenían `outline: none` sin reemplazo, igual que el resto de los inputs de la
	// app: al tabular por la tabla de tramos no se veía dónde estabas parado.
	const numClass = "box-border w-full rounded border border-input bg-card px-2 py-1 text-right font-mono text-xs text-foreground tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";
	const thClass = "bg-muted-foreground px-2.5 py-1.5 text-right text-xs font-bold text-white";
	const delBtn = "cursor-pointer border-none bg-transparent px-1 text-sm leading-none text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

	return (
		<div>
			<table className="w-full border-collapse">
				<thead>
					<tr>
						<th className={thClass + " text-left"}>Volumen ≥ (firmas)</th>
						<th className={thClass + " w-[120px]"}>Descuento %</th>
						<th className={thClass + " w-[28px]"} />
					</tr>
				</thead>
				<tbody>
					{tiers.length === 0 && (
						<tr>
							<td colSpan={3} className="p-2.5 text-center text-xs text-muted-foreground">
								Sin tramos — el precio se cotiza sin descuento por volumen.
							</td>
						</tr>
					)}
					{tiers.map(function (t, i) {
						return (
							<tr key={i} className={i % 2 === 0 ? "bg-muted/40" : "bg-card"}>
								<td className="px-1.5 py-1">
									<input
										type="number"
										value={t.minVol}
										min={1}
										aria-label={"Volumen mínimo del tramo " + (i + 1)}
										onChange={function (e) { upd(i, "minVol", Math.max(0, Math.round(Number(e.target.value) || 0))); }}
										className={cn(numClass, "text-left")}
									/>
								</td>
								<td className="w-[120px] px-1.5 py-1">
									<input
										type="number"
										value={t.discount}
										min={0}
										max={99}
										aria-label={"Descuento del tramo " + (i + 1) + " en porcentaje"}
										onChange={function (e) { upd(i, "discount", Math.max(0, Math.min(99, Number(e.target.value) || 0))); }}
										className={numClass}
									/>
								</td>
								<td className="w-[28px] px-1 py-1 text-center">
									<button
										type="button"
										className={delBtn}
										onClick={function () { remove(i); }}
										title="Eliminar tramo"
										aria-label={"Eliminar el tramo " + (i + 1)}
									>×</button>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			<button
				type="button"
				onClick={add}
				className="mt-2 cursor-pointer rounded-md border-[1.5px] border-dashed bg-card px-3.5 py-1.5 text-xs font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
				style={{ borderColor: c, color: c }}
			>+ Agregar tramo</button>
			{!compact && (
				<p className="mt-2 text-xs text-muted-foreground">
					Se aplica el descuento del tramo de mayor volumen que el cliente alcanza. El orden de carga no importa.
				</p>
			)}
		</div>
	);
}
