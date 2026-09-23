import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Selector de columnas visibles de una tabla. Estaba duplicado literal en
// TabCanalWeb y TabCanalB2B2CPrecios, cada uno con su propia copia del mismo
// bug: cerraba solo con mousedown (ni Escape ni foco), no declaraba
// `aria-expanded` y ningún control adentro mostraba foco. Arreglarlo dos veces
// era garantizar que volvieran a divergir.
//
// cols: [{ key, label }] · visible: Set de keys · onToggle(key)
export function ColumnPicker({ cols, visible, onToggle }) {
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(function () {
		function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
		function onKey(e) { if (e.key === "Escape") setOpen(false); }
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return function () {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, []);

	return (
		<div ref={ref} className="relative inline-block">
			<button
				type="button"
				aria-expanded={open}
				aria-haspopup="true"
				onClick={function () { setOpen(function (o) { return !o; }); }}
				className={cn(
					"flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
					open ? "bg-accent" : "bg-background"
				)}
			>
				<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
					<line x1="2" y1="4" x2="14" y2="4" /><line x1="4" y1="8" x2="12" y2="8" /><line x1="6" y1="12" x2="10" y2="12" />
				</svg>
				Propiedades
				<span className="rounded-full bg-muted px-1.5 py-px text-xs text-muted-foreground tabular-nums">
					{visible.size}/{cols.length}
				</span>
			</button>
			{open && (
				<div className="absolute top-[calc(100%+6px)] right-0 z-50 min-w-[200px] rounded-lg border border-border bg-background py-1.5 shadow-card">
					<div className="px-3 pt-1 pb-1.5 text-xs font-semibold tracking-[0.4px] text-muted-foreground uppercase">
						Columnas visibles
					</div>
					{cols.map(function (col) {
						const checked = visible.has(col.key);
						return (
							<label
								key={col.key}
								className={cn(
									"flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm text-foreground focus-within:bg-accent",
									checked ? "bg-accent" : "bg-transparent"
								)}
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={function () { onToggle(col.key); }}
									className="size-3.5 cursor-pointer accent-[var(--primary)] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
								/>
								{col.label}
							</label>
						);
					})}
					<div className="my-1 border-t border-border" />
					<div className="flex gap-1.5 px-3 py-1">
						<button
							type="button"
							onClick={function () { cols.forEach(function (c) { if (!visible.has(c.key)) onToggle(c.key); }); }}
							className="cursor-pointer border-none bg-transparent p-0 text-xs text-primary outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							Mostrar todas
						</button>
						<span className="text-muted-foreground" aria-hidden="true">·</span>
						<button
							type="button"
							onClick={function () { cols.forEach(function (c) { if (visible.has(c.key)) onToggle(c.key); }); }}
							className="cursor-pointer border-none bg-transparent p-0 text-xs text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						>
							Ocultar todas
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
