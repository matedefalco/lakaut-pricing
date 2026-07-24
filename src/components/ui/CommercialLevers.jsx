import { SelectField } from "@/components/ui/field";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { LEVER_META, leverOptions, resolveLevers } from "@/lib/commercialLevers";

// Los 3 selectores de descuento por condiciones (time-to-cash, duración, velocidad
// de cierre) + resumen del descuento aplicado. Compartido por Volumen y
// Distribuidores. `levers` = config (channelConfig.commercialLevers); `value` =
// selección { timeToCash, duracion, velocidad }; `onChange` recibe la selección nueva.
const HINTS = {
	timeToCash: "Cuánto tarda el cliente en pagarnos. Más rápido, más descuento.",
	duracion: "Duración del acuerdo. A mayor compromiso, mayor descuento.",
	velocidad: "Cuánto tarda en confirmar la vinculación. Cerrar rápido premia.",
};

export function CommercialLevers({ levers, value, onChange }) {
	if (!levers) return null;
	const sel = value || {};
	const resolved = resolveLevers(levers, sel);

	function set(key, v) {
		onChange(Object.assign({}, sel, { [key]: v }));
	}

	return (
		<div className="space-y-3">
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
				{LEVER_META.map(function (m) {
					return (
						<SelectField
							key={m.key}
							label={m.label}
							value={sel[m.key] || ""}
							onValueChange={function (v) { set(m.key, v); }}
							options={leverOptions(levers[m.key], m.key)}
							note={HINTS[m.key]}
						/>
					);
				})}
			</div>

			<div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
				<span className="text-xs font-medium text-muted-foreground flex items-center">
					Descuento por condiciones
					<InfoTooltip text="Suma de las 3 palancas, con tope. Se aplica sobre el subtotal de servicio, además del precio por volumen." />
				</span>
				<span className="text-sm font-semibold tabular-nums">
					−{(resolved.cappedPts).toFixed(0)}%
					{resolved.capped && resolved.cap != null && (
						<span className="ml-1.5 text-[11px] font-normal text-[var(--warning)]">tope {resolved.cap}% (suma {resolved.rawPct}%)</span>
					)}
				</span>
			</div>
		</div>
	);
}
