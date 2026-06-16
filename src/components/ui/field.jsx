import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Campo numérico con label, prefijo opcional y nota.
export function NumberField({ label, value, onChange, prefix, suffix, note, placeholder, min, step }) {
	return (
		<div className="flex flex-col gap-1.5">
			<Label className="text-xs text-muted-foreground uppercase tracking-wide">{label}</Label>
			<div className="relative flex items-center">
				{prefix && <span className="absolute left-3 text-sm text-muted-foreground">{prefix}</span>}
				<Input
					type="number"
					min={min}
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

const ACCENT = {
	primary: "border-t-primary",
	success: "border-t-[var(--success)]",
	warning: "border-t-[var(--warning)]",
	destructive: "border-t-destructive",
	muted: "border-t-muted-foreground",
};

// Tarjeta KPI con borde superior de color.
export function StatCard({ label, value, sub, accent = "primary", valueClass }) {
	return (
		<Card className={cn("flex-1 min-w-[150px] gap-2 border-t-4 py-4", ACCENT[accent] || ACCENT.primary)}>
			<div className="px-4">
				<div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
				<div className={cn("font-heading text-2xl font-semibold mt-1", valueClass)}>{value}</div>
				{sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
			</div>
		</Card>
	);
}
