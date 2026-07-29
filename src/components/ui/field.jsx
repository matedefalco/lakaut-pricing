import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Campo numérico con label, prefijo opcional y nota.
export function NumberField({ label, value, onChange, prefix, suffix, note, placeholder, min, max, step }) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
			<div className="relative flex items-center">
				{prefix && <span className="absolute left-3 text-sm text-muted-foreground">{prefix}</span>}
				<Input
					type="number"
					min={min}
					max={max}
					step={step}
					placeholder={placeholder}
					value={value}
					onChange={function (e) { onChange(e.target.value === "" ? "" : Number(e.target.value)); }}
					className={cn("tabular-nums", prefix && "pl-11", suffix && "pr-10")}
				/>
				{suffix && <span className="absolute right-3 text-sm text-muted-foreground">{suffix}</span>}
			</div>
			{note && <span className="text-[11px] text-muted-foreground">{note}</span>}
		</div>
	);
}

// Campo select con label.
export function SelectField({ label, value, onValueChange, options, note }) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
				<SelectContent>
					{options.map(function (o) { return <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>; })}
				</SelectContent>
			</Select>
			{note && <span className="text-[11px] text-muted-foreground">{note}</span>}
		</div>
	);
}

const ACCENT_DOT = {
	primary: "bg-primary",
	success: "bg-[var(--success)]",
	warning: "bg-[var(--warning)]",
	destructive: "bg-destructive",
	muted: "bg-muted-foreground/50",
};

// Tarjeta KPI: el acento semántico es un punto de color junto al label
// (lenguaje Crystal Glass: sombra difusa en lugar de bordes duros).
export function StatCard({ label, value, sub, accent = "primary", valueClass }) {
	return (
		// Chip de ancho de contenido con piso de 150px, sin grow. Con `flex-1` los
		// primeros KPIs se estiraban y empujaban al último a una fila propia donde
		// quedaba ocupando todo el ancho; y con un `min-w` fijo una cifra larga
		// ("USD 350.897") se cortaba. Así ninguno se estira ni se corta.
		<Card className="grow-0 shrink-0 basis-auto min-w-[150px] gap-2 py-4">
			<div className="px-4">
				<div className="flex items-center gap-1.5">
					<span className={cn("size-1.5 rounded-full shrink-0", ACCENT_DOT[accent] || ACCENT_DOT.primary)} />
					<span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
				</div>
				{/* whitespace-nowrap: una cifra larga ("USD 350.897") wrappeaba a dos líneas
			    y rompía la lectura del KPI. */}
			<div className={cn("font-display text-2xl mt-1 tabular-nums whitespace-nowrap", valueClass)}>{value}</div>
				{sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
			</div>
		</Card>
	);
}
