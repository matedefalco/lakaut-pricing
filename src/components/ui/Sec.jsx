// Encabezado de sección dentro de una card. El tamaño sube de 10 a 11px: en
// mayúsculas y con letter-spacing, 10px quedaba por debajo del piso legible.
export function Sec({ title }) {
	return (
		<div className="mt-3.5 mb-2 border-b-2 border-secondary pb-1 text-xs font-bold tracking-[1px] text-primary uppercase">
			{title}
		</div>
	);
}
