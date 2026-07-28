import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Popover contextual "¿por qué este nivel?". Muestra la tabla de niveles con la
// fila activa resaltada y, arriba, la distancia al siguiente nivel. Convierte una
// tabla de referencia (antes al pie de la página) en una herramienta de
// negociación en el momento exacto en que el vendedor ve el nivel asignado.
export function TierHint({ label = "¿por qué este nivel?", nextHint, columns, rows, activeId }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useEffect(function () {
		function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
		document.addEventListener("mousedown", h);
		return function () { document.removeEventListener("mousedown", h); };
	}, []);
	return (
		<div ref={ref} className="relative inline-block">
			<button
				type="button"
				onClick={function () { setOpen(function (o) { return !o; }); }}
				className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
			>
				<Info className="size-3" /> {label}
			</button>
			{open && (
				<div className="glass-strong shadow-float absolute right-0 z-50 mt-2 w-[320px] max-w-[calc(100vw-32px)] rounded-xl border p-3">
					{nextHint && <p className="mb-2 rounded-lg bg-primary/5 px-2.5 py-1.5 text-[11px] leading-relaxed text-foreground">{nextHint}</p>}
					<table className="w-full text-[11px]">
						<thead>
							<tr className="text-muted-foreground">
								{columns.map(function (c, i) {
									return <th key={i} className={cn("pb-1 font-medium", i === 0 ? "text-left" : "text-right")}>{c}</th>;
								})}
							</tr>
						</thead>
						<tbody>
							{rows.map(function (r) {
								const active = Array.isArray(activeId) ? activeId.indexOf(r.id) !== -1 : r.id === activeId;
								return (
									<tr key={r.id} className={cn("border-t border-border/60", active && "bg-accent font-semibold text-foreground")}>
										{r.cells.map(function (cell, i) {
											return <td key={i} className={cn("py-1 tabular-nums", i === 0 ? "pl-1 text-left" : "text-right", i === r.cells.length - 1 && "pr-1")}>{cell}</td>;
										})}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
