import { cn } from "@/lib/utils";

// Placeholders de carga. La app no tenía ninguno: los contexts y los hooks de
// Supabase resuelven después del primer render, así que entre que monta y llegan
// los datos se veía una pantalla vacía (o, peor, los valores de fallback del
// código, que parecen datos reales). Un esqueleto dice "esto viene en camino" y
// además reserva el alto, así la lista no salta cuando llega.
//
// El pulso lo apaga el `prefers-reduced-motion` global de index.css.
export function Skeleton({ className }) {
	return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

// Filas de una lista o tabla mientras carga.
export function SkeletonRows({ rows = 4, className }) {
	return (
		<div className={cn("space-y-2", className)} role="status" aria-label="Cargando…">
			{Array.from({ length: rows }).map(function (_, i) {
				return (
					<div key={i} className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-3">
						<Skeleton className="size-2.5 shrink-0 rounded-full" />
						<Skeleton className="h-3.5 flex-1" />
						<Skeleton className="h-3.5 w-20 shrink-0" />
						<Skeleton className="h-3.5 w-16 shrink-0" />
					</div>
				);
			})}
			<span className="sr-only">Cargando…</span>
		</div>
	);
}

// Tarjetas de KPI o de resumen mientras carga.
export function SkeletonCards({ cards = 4, className }) {
	return (
		<div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)} role="status" aria-label="Cargando…">
			{Array.from({ length: cards }).map(function (_, i) {
				return (
					<div key={i} className="rounded-lg border border-border px-3.5 py-3">
						<Skeleton className="h-3 w-2/3" />
						<Skeleton className="mt-2 h-5 w-1/2" />
					</div>
				);
			})}
			<span className="sr-only">Cargando…</span>
		</div>
	);
}
