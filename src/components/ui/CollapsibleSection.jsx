import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Sección plegable: título siempre visible, contenido bajo demanda.
// Sirve para "progressive disclosure" — la referencia y el detalle de
// rentabilidad viven acá, sin cargar la vista principal del vendedor.
export function CollapsibleSection({ title, subtitle, defaultOpen = false, children, tone = "default" }) {
	const [open, setOpen] = useState(defaultOpen);
	const toneClass = tone === "internal" ? "border-dashed" : "";
	return (
		<Card className={cn("overflow-hidden", toneClass)}>
			<button
				type="button"
				onClick={function () { setOpen(function (o) { return !o; }); }}
				className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
				aria-expanded={open}
			>
				<div className="min-w-0 flex-1">
					<div className="text-sm font-semibold text-foreground">{title}</div>
					{subtitle && <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>}
				</div>
				<ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
			</button>
			{open && <CardContent className="pt-0 pb-5">{children}</CardContent>}
		</Card>
	);
}
