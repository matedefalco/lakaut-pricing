import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { channelMeta } from "@/data/channelMeta";

// Encuadre "calculadora" de la cotizadora: el formulario a la izquierda y el
// panel de resultado a la derecha, fijo (sticky) mientras se scrollea el form.
// En mobile el resultado se apila arriba del formulario, para que el número siga
// siendo lo primero que ve el vendedor. Repara el loop de feedback: input y
// output visibles a la vez.
export function QuoteLayout({ header, result, children, footer }) {
	return (
		<div className="space-y-6">
			{header}
			<div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
				<div className="order-first space-y-5 lg:order-last lg:sticky lg:top-[58px]">
					{result}
				</div>
				<div className="order-last min-w-0 space-y-5 lg:order-first">
					{children}
				</div>
			</div>
			{footer}
		</div>
	);
}

// Grupo de campos del formulario, con paso numerado. Reemplaza la card única
// "Datos de la cotización" por la narrativa de venta: qué cotizás → condiciones
// → para la propuesta. El número da sensación de progreso (goal gradient).
//
// El paso toma el color del canal y, cuando `done` es true, cambia el número por
// un check y se rellena. El número solo, en gris azulado, no cerraba el ciclo del
// goal gradient: marcaba el orden pero no el avance.
export function FieldGroup({ step, title, subtitle, action, channel, done, children }) {
	const meta = channel ? channelMeta(channel) : null;
	const tint = meta ? meta.color : "var(--primary)";
	const tintFg = meta ? meta.colorFg : "var(--primary)";

	return (
		<Card className="bg-card border-border gap-0 py-0">
			<CardContent className="p-5 space-y-4">
				<div className="flex items-start gap-2.5">
					{step != null && (
						<span
							className="mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all duration-300"
							style={done
								? { background: tint, color: "#fff", boxShadow: "0 1px 6px -1px " + (meta ? meta.glow : "rgba(48,65,213,0.3)") }
								: { background: meta ? meta.colorSoft : "var(--secondary)", color: tintFg }}
							title={done ? "Paso completo" : undefined}
						>
							{done ? <Check className="size-3.5" strokeWidth={3} /> : step}
						</span>
					)}
					<div className="min-w-0 flex-1">
						<h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
						{subtitle && <p className={cn("text-[11px] text-muted-foreground mt-0.5")}>{subtitle}</p>}
					</div>
					{action && <div className="shrink-0">{action}</div>}
				</div>
				{children}
			</CardContent>
		</Card>
	);
}
