import { dealStatusMeta } from "@/lib/dealStatus";
import { cn } from "@/lib/utils";

// Pill de estado de cotización con icono. Unifica los tres lugares que lo
// renderizaban a mano con clases distintas (Inicio, Historial, Clientes).
export function StatusBadge({ status, size = "md", className }) {
	const meta = dealStatusMeta(status);
	const Icon = meta.Icon;
	const s = size === "sm"
		? { pad: "px-1.5 py-0.5", text: "text-[10px]", icon: "size-3" }
		: { pad: "px-2 py-0.5", text: "text-[11px]", icon: "size-3.5" };

	return (
		<span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border font-semibold", s.pad, s.text, meta.className, className)}>
			{Icon && <Icon className={cn(s.icon, "shrink-0")} />}
			{meta.label}
		</span>
	);
}
