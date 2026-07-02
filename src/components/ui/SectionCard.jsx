import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Tarjeta de sección unificada para pantallas de configuración y formularios
// largos. Reemplaza los headers oscuros inline (negro en Costos, azul marino en
// Precios por canal) por el mismo lenguaje visual que usan las cotizadoras:
// título chico en mayúsculas + descripción, dentro de una Card estándar.
export function SectionCard({ title, description, actions, children, className }) {
	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0">
						<CardTitle className="font-heading text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</CardTitle>
						{description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
					</div>
					{actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
				</div>
			</CardHeader>
			<CardContent>{children}</CardContent>
		</Card>
	);
}
