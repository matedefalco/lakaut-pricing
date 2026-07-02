// Encabezado de página unificado. Todas las secciones (cotizadoras, seguimiento,
// análisis y configuración) abren con el mismo patrón: título, descripción y un
// slot opcional de acciones a la derecha. Evita que cada tab invente su header.
export function PageHeader({ title, description, actions, children }) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-3">
			<div className="min-w-0">
				<h1 className="font-heading text-xl font-semibold text-foreground">{title}</h1>
				{description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
				{children}
			</div>
			{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
		</div>
	);
}
