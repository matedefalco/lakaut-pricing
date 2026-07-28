import { cn } from "@/lib/utils";

// Interruptor con título y descripción, para palancas que abren o cierran un
// bloque entero del formulario (ej: aplicar descuento comercial en Packs).
// El estado se lee de un vistazo: el riel se pinta con el color primario.
export function SwitchField({ label, description, checked, onChange, action }) {
	return (
		<div
			role="button"
			tabIndex={0}
			onClick={function () { onChange(!checked); }}
			onKeyDown={function (e) {
				if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(!checked); }
			}}
			className={cn(
				"flex cursor-pointer select-none items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
				checked ? "border-primary/40 bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"
			)}
		>
			<span
				aria-hidden="true"
				className={cn(
					"mt-0.5 flex h-[22px] w-[38px] shrink-0 items-center rounded-full p-[3px] transition-colors",
					checked ? "bg-primary" : "bg-border"
				)}
			>
				<span className={cn("size-4 rounded-full bg-white shadow-sm transition-transform", checked && "translate-x-4")} />
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-foreground">{label}</span>
					{action}
				</div>
				{description && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
			</div>
			<input type="checkbox" checked={checked} onChange={function () {}} className="sr-only" tabIndex={-1} aria-hidden="true" />
		</div>
	);
}
