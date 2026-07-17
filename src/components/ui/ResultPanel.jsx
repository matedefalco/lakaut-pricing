import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/utils/useCountUp";

// Panel de resultado de la cotizadora. En desktop queda fijo (sticky) al costado
// del formulario para que el precio y el margen reaccionen a cada cambio sin que
// el vendedor pierda de vista el número; en mobile se apila arriba del formulario.
// Es el "pico" del recorrido: acá vive lo que el vendedor vino a buscar.

const DOT = {
	primary: "bg-primary",
	success: "bg-[var(--success)]",
	warning: "bg-[var(--warning)]",
	destructive: "bg-destructive",
	muted: "bg-muted-foreground/50",
};

export function ResultPanel({ eyebrow = "Resultado", children }) {
	return (
		<Card className="shadow-float gap-0 py-0">
			<CardContent className="p-5 space-y-4">
				<div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{eyebrow}</div>
				{children}
			</CardContent>
		</Card>
	);
}

// Número protagonista del panel. Muestra un pill de estado opcional (ej. margen)
// pegado al valor, para que la señal de "¿tengo margen para negociar?" esté
// donde está el precio y no escondida en el detalle interno.
export function ResultHero({ label, value, sub, accent = "primary", pill, empty }) {
	return (
		<div>
			<div className="flex items-center gap-1.5">
				<span className={cn("size-1.5 rounded-full shrink-0", DOT[accent] || DOT.primary)} />
				<span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
			</div>
			<div className="mt-1 flex items-baseline gap-2 flex-wrap">
				<span className={cn("font-heading text-3xl font-semibold tabular-nums leading-none", empty && "text-muted-foreground/40")}>{value}</span>
				{pill}
			</div>
			{sub && <div className="text-[11px] text-muted-foreground mt-1.5">{sub}</div>}
		</div>
	);
}

// Fila métrica secundaria dentro del panel. Más compacta que un StatCard: sirve
// para las cifras de apoyo que acompañan al número protagonista.
export function ResultRow({ label, value, accent = "muted", empty, valueClass }) {
	return (
		<div className="flex items-center justify-between gap-3 py-2 border-t border-border/60">
			<div className="flex items-center gap-1.5 min-w-0">
				<span className={cn("size-1.5 rounded-full shrink-0", DOT[accent] || DOT.muted)} />
				<span className="text-[11px] text-muted-foreground truncate">{label}</span>
			</div>
			<span className={cn("text-sm font-semibold tabular-nums shrink-0", empty && "text-muted-foreground/40", valueClass)}>{value}</span>
		</div>
	);
}

// Ítem de la cotización: título + subtotal arriba, detalle de lo que incluye
// abajo. Se usa para listar cada pack/producto cotizado en el resumen del panel,
// espejando la propuesta (cantidad + qué contempla + subtotal).
export function ResultItem({ title, detail, value, accent = "primary", strong }) {
	return (
		<div className="py-2 border-t border-border/60">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<span className={cn("size-1.5 rounded-full shrink-0", DOT[accent] || DOT.primary)} />
					<span className={cn("text-[12px] truncate", strong ? "font-semibold text-foreground" : "font-medium text-foreground")}>{title}</span>
				</div>
				<span className="text-sm font-semibold tabular-nums shrink-0">{value}</span>
			</div>
			{detail && <div className="text-[10px] text-muted-foreground mt-0.5 pl-3">{detail}</div>}
		</div>
	);
}

// Pill de estado semántico (ej. margen saludable / ajustado / a revisar).
export function StatusPill({ tone = "muted", children }) {
	const cls = {
		success: "text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/30",
		warning: "text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/30",
		destructive: "text-destructive bg-destructive/10 border-destructive/30",
		primary: "text-primary bg-primary/10 border-primary/30",
		muted: "text-muted-foreground bg-muted border-border",
	}[tone] || "text-muted-foreground bg-muted border-border";
	return (
		<span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", cls)}>
			{children}
		</span>
	);
}

// Número animado: cuenta hasta `value` y lo formatea con `format` (ej. fMoney).
// Se usa dentro de ResultHero/ResultRow para el microfeedback de causa-efecto.
export function AnimatedNumber({ value, format, duration }) {
	const d = useCountUp(value, duration);
	if (format) return <>{format(d)}</>;
	return <>{Math.round(d).toLocaleString("es-AR")}</>;
}
