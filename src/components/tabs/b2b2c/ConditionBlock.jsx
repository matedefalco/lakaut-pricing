import { cn } from "@/lib/utils";

// Bloques de "Condiciones comerciales" (paso 3 de la cotizadora).
//
// El paso encadenaba ocho bloques con <Separator />, todos con el mismo encabezado
// y el mismo aire entre uno y otro. Tres problemas encima:
//
//  1. La línea hacía todo el agrupamiento. El espacio agrupa primero, la superficie
//     después y la línea al final, sólo donde el espacio no alcanza. Acá estaba
//     invertido, así que ocho decisiones distintas se leían como una lista larga.
//  2. Los encabezados eran <span> (o <Label>, que además no etiquetaba ningún
//     control): en una pantalla de 290 líneas, quien navega con lector de pantalla
//     no tenía forma de saltar de un bloque al siguiente ni de saber cuántos hay.
//  3. Ningún bloque tenía identidad propia, aunque deciden cosas muy distintas:
//     cuánto se cobra, cómo se liquida, qué se bonifica.
//
// El icono es el diferenciador barato: no agrega color decorativo (el acento del
// canal sigue siendo el del paso) pero le da a cada bloque un ancla visual propia.
//
// Lo que NO se tocó: los cuatro bloques opcionales ya hacían progressive disclosure
// bien, con un checkbox visible que despliega el contenido y un texto que explica
// qué hace cuando está apagado. Meterlos además en un colapsable habría escondido
// el control real detrás de un clic de más.

function BlockIcon({ icon: Icon }) {
	if (!Icon) return null;
	return (
		<span
			aria-hidden="true"
			className="mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground"
		>
			<Icon className="size-3" strokeWidth={2.2} />
		</span>
	);
}

// Bloque siempre visible: su contenido define el precio en toda cotización.
export function ConditionBlock({ icon, title, description, children, className }) {
	return (
		<section className={cn("flex flex-col gap-2", className)}>
			<div className="flex items-start gap-2">
				<BlockIcon icon={icon} />
				<div className="min-w-0">
					<h4 className="font-heading text-sm font-semibold text-foreground">{title}</h4>
					{description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
				</div>
			</div>
			<div className="pl-7">{children}</div>
		</section>
	);
}

// Bloque opcional: el checkbox es el control y a la vez la disclosure. El título va
// en un <h4> dentro del <label> para que el bloque siga siendo navegable por
// encabezados sin perder el area de clic de la etiqueta.
export function ConditionToggleBlock({ icon, title, checked, onChange, badge, hint, children, className }) {
	return (
		<section className={cn("flex flex-col gap-2", className)}>
			<label className="flex cursor-pointer items-start gap-2 select-none">
				<input
					type="checkbox"
					checked={checked}
					onChange={onChange}
					className="mt-0.5 size-3.5 shrink-0 rounded accent-[var(--primary)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
				/>
				<BlockIcon icon={icon} />
				<span className="flex min-w-0 flex-wrap items-center gap-2">
					<h4 className="font-heading text-sm font-semibold text-foreground">{title}</h4>
					{badge}
				</span>
			</label>
			{!checked && hint && <p className="pl-7 text-xs text-muted-foreground">{hint}</p>}
			{checked && <div className="pl-7">{children}</div>}
		</section>
	);
}
