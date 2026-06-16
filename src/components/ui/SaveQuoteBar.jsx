import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Barra de guardado de cotización: nombre de cliente + guardar/actualizar.
export function SaveQuoteBar({ clientName, setClientName, onSave, canSave, editingId, onCancelEdit, flash }) {
	return (
		<div className={"flex flex-wrap items-end gap-3 rounded-lg border p-3 " + (editingId ? "bg-success/5 border-success/40" : "bg-muted/50")}>
			<div className="flex flex-1 flex-col gap-1.5 min-w-[200px]">
				<Label className="text-xs text-muted-foreground uppercase tracking-wide">
					Nombre del cliente {editingId && <span className="text-success font-semibold normal-case tracking-normal">· editando</span>}
				</Label>
				<Input placeholder="Ej: Banco XYZ S.A." value={clientName} onChange={function (e) { setClientName(e.target.value); }} />
			</div>
			{editingId && <Button variant="outline" onClick={onCancelEdit}>Cancelar</Button>}
			<Button onClick={onSave} disabled={!canSave} className={flash ? "bg-success hover:bg-success" : ""}>
				{flash ? <><Check /> Guardada</> : editingId ? "Actualizar" : "Guardar cotización"}
			</Button>
		</div>
	);
}
