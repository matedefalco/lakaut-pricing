// Palanca de costo opcional. Era un <div onClick>: no se podía llegar con Tab ni
// activar con teclado, y un lector de pantalla no anunciaba ni que fuera un
// control ni si estaba encendido. Ahora es un <button role="switch"> real, así
// que el foco, el Enter/Espacio y el estado los da la plataforma.
export function Toggle({ label, cost, costType, checked, onChange }) {
	const unit =
		costType === "firma"
			? "/firma"
			: costType === "cert"
				? "/cert"
				: costType === "pct_rev"
					? "% del revenue"
					: "/usuario/mes";
	const detail =
		cost > 0
			? costType === "pct_rev"
				? "+ " + (cost * 100).toFixed(1) + "% " + unit
				: "+ USD " + cost.toFixed(2) + " " + unit
			: "Sin costo adicional";

	return (
		<div className="flex items-center justify-between gap-3 border-b border-border py-2">
			<div className="min-w-0">
				<div className="text-sm text-foreground">{label}</div>
				<div className="mt-px text-xs text-muted-foreground">{detail}</div>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				aria-label={label}
				onClick={function () {
					onChange(!checked);
				}}
				className="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-none bg-input outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-checked:bg-primary"
			>
				<span
					aria-hidden="true"
					className="absolute top-1 size-4 rounded-full bg-card transition-[left] duration-200"
					style={{ left: checked ? 24 : 4 }}
				/>
			</button>
		</div>
	);
}
