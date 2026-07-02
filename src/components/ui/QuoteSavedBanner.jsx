import { Check, FileText, ArrowRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Momento de cierre del flujo: confirmación visible + próximos pasos a un click.
// Es el punto de mayor carga emocional de la cotizadora — que se sienta como un
// logro, no como un formulario que se envió al vacío.
export function QuoteSavedBanner({ clientName, onExport, onGoHistorial, onNew, onDismiss }) {
	return (
		<div className="rounded-xl border border-[var(--success)]/40 bg-[var(--success)]/8 p-4">
			<div className="flex items-start gap-3">
				<span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--success)] text-white">
					<Check className="size-4" />
				</span>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-semibold text-foreground">
						Cotización guardada{clientName ? <> para <span className="text-[var(--success)]">{clientName}</span></> : ""}
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">Ya quedó sincronizada con el equipo. ¿Qué querés hacer ahora?</p>
					<div className="mt-3 flex flex-wrap gap-2">
						<Button size="sm" onClick={onExport}><FileText className="size-4 mr-1.5" /> Exportar propuesta</Button>
						<Button size="sm" variant="outline" onClick={onGoHistorial}>Ver en Cotizaciones <ArrowRight className="size-4 ml-1.5" /></Button>
						<Button size="sm" variant="ghost" onClick={onNew}><Plus className="size-4 mr-1.5" /> Nueva cotización</Button>
					</div>
				</div>
				<button onClick={onDismiss} className="shrink-0 text-muted-foreground hover:text-foreground" title="Cerrar">
					<X className="size-4" />
				</button>
			</div>
		</div>
	);
}
