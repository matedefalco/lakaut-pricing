import { Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// Barra de acción fija al pie de la cotizadora. Reúne el cierre del flujo en un
// lugar estable y siempre visible: primero entender el resultado, después actuar.
export function SaveExportBar({ hint, canSave, canExport, onSave, onExport, onCancelEdit, editingId, flash }) {
	return (
		<div className="no-print glass shadow-float sticky bottom-4 z-20 rounded-2xl border px-5 py-3">
			<div className="flex items-center justify-between gap-4">
				<p className="text-sm text-muted-foreground min-w-0 truncate">{hint}</p>
				<div className="flex shrink-0 gap-2">
					{editingId && <Button variant="outline" onClick={onCancelEdit}>Cancelar</Button>}
					<Button variant="outline" onClick={onExport} disabled={!canExport} title={canExport ? "Abrir la propuesta para PDF" : "Completá la cotización para exportar"}>
						<FileText className="size-4 mr-1.5" /> Exportar propuesta
					</Button>
					<Button onClick={onSave} disabled={!canSave} className={flash ? "bg-[var(--success)] hover:bg-[var(--success)]" : ""}>
						{flash ? <><Check className="size-4 mr-1.5" /> Guardada</> : editingId ? "Actualizar cotización" : "Guardar cotización"}
					</Button>
				</div>
			</div>
		</div>
	);
}
