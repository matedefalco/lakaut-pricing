import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
export function FieldGroup({ step, title, subtitle, action, children }) {
	return (
		<Card className="bg-card border-border gap-0 py-0">
			<CardContent className="p-5 space-y-4">
				<div className="flex items-start gap-2.5">
					{step != null && (
						<span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">{step}</span>
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
