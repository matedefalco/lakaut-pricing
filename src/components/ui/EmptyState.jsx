import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Estado vacío con voz. Los vacíos eran una línea de texto gris centrada, que es
// el primer contacto de un vendedor nuevo con la herramienta y el momento más frío
// de la app. Acá el glifo grande hace de ilustración (sin sumar assets ni peso) y
// el copy dice qué hacer, no sólo que no hay nada.
//
//   <EmptyState glyph="📋" title="Todavía no hay cotizaciones"
//               description="…" action={{ label: "…", onClick: fn }} />

export function EmptyState({ glyph, title, description, action, secondaryAction, tone = "neutral", className }) {
	// El halo detrás del glifo se tiñe según el tono: neutro para "todavía no hay
	// nada" y ámbar para "hay datos pero los filtros no dejan ver ninguno", que son
	// dos situaciones distintas y antes se leían igual.
	const halo = tone === "filter"
		? "radial-gradient(circle, rgba(200, 122, 0, 0.16) 0%, transparent 70%)"
		: "radial-gradient(circle, rgba(48, 65, 213, 0.14) 0%, transparent 70%)";

	return (
		<div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
			<div className="relative mb-4 flex size-20 items-center justify-center">
				<span aria-hidden className="absolute inset-0 rounded-full" style={{ background: halo }} />
				<span aria-hidden className="relative text-4xl leading-none">{glyph}</span>
			</div>
			<p className="font-heading text-base font-semibold text-foreground">{title}</p>
			{description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
			{(action || secondaryAction) && (
				<div className="mt-5 flex flex-wrap items-center justify-center gap-2">
					{action && (
						<Button onClick={action.onClick}>
							{action.icon && <action.icon className="mr-1.5 size-4" />}
							{action.label}
						</Button>
					)}
					{secondaryAction && (
						<Button variant="outline" onClick={secondaryAction.onClick}>
							{secondaryAction.icon && <secondaryAction.icon className="mr-1.5 size-4" />}
							{secondaryAction.label}
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
