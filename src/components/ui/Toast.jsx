import { Check } from "lucide-react";

// Toast de confirmación unificado (esquina inferior derecha). Un solo estilo de
// feedback de guardado para toda la app, en lugar de un toast azul marino acá y
// un botón que cambia de color allá.
export function Toast({ toast }) {
	if (!toast) return null;
	return (
		<div className="fixed bottom-7 right-7 z-[9999] flex items-center gap-2.5 rounded-lg bg-foreground px-5 py-3 text-sm font-semibold text-background shadow-lg">
			<Check className="size-4 text-[var(--success)]" />
			{toast.msg}
		</div>
	);
}
