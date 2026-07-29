import { Check, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// Selector de moneda de exportación: define en qué moneda se genera el PDF de la
// propuesta, independiente del toggle global de visualización. Se muestra solo si
// el canal pasa `onExportCurrencyChange`.
function ExportCurrencyToggle({ value, onChange }) {
	return (
		<div className="flex items-center gap-1.5 mr-1" title="Moneda del PDF exportado">
			<span className="text-[11px] uppercase tracking-wide text-muted-foreground">Exportar en</span>
			<div className="inline-flex rounded-full border p-0.5">
				{["ARS", "USD"].map(function (c) {
					const active = value === c;
					return (
						<button
							key={c}
							type="button"
							onClick={function () { onChange(c); }}
							className={"rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors " + (active ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-muted-foreground hover:text-foreground")}
						>
							{c}
						</button>
					);
				})}
			</div>
		</div>
	);
}

// Barra de acción fija al pie de la cotizadora. Reúne el cierre del flujo en un
// lugar estable y siempre visible: primero entender el resultado, después actuar.
export function SaveExportBar({ hint, canSave, canExport, onSave, onExport, onCancelEdit, editingId, flash, exportCurrency, onExportCurrencyChange }) {
	return (
		<div className="no-print glass shadow-float sticky bottom-4 z-20 rounded-2xl border px-5 py-3">
			<div className="flex items-center justify-between gap-4">
				<p className="text-sm text-muted-foreground min-w-0 truncate">{hint}</p>
				<div className="flex shrink-0 items-center gap-2">
					{editingId && <Button variant="outline" onClick={onCancelEdit}>Cancelar</Button>}
					{onExportCurrencyChange && <ExportCurrencyToggle value={exportCurrency} onChange={onExportCurrencyChange} />}
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
