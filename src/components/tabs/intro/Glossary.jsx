import { useEffect, useId, useRef, useState } from "react";
import { GLOSSARY } from "./glossaryData";

// ─── Glosario al pasar ────────────────────────────────────────────────────────
// Un término subrayado muestra su definición al pasar el mouse, al enfocarlo con
// teclado o al tocarlo en mobile. Las definiciones viven acá, en un solo lugar,
// para que la intro use siempre las mismas palabras.


export function Term({ k, children }) {
	const g = GLOSSARY[k];
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	const id = useId();

	useEffect(function () {
		if (!open) return;
		function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
		function onKey(e) { if (e.key === "Escape") setOpen(false); }
		document.addEventListener("pointerdown", onDown);
		document.addEventListener("keydown", onKey);
		return function () {
			document.removeEventListener("pointerdown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	if (!g) return <>{children}</>;
	return (
		<span ref={ref} className="relative inline" onMouseEnter={function () { setOpen(true); }} onMouseLeave={function () { setOpen(false); }}>
			<button type="button" aria-describedby={open ? id : undefined} onClick={function () { setOpen(!open); }} onFocus={function () { setOpen(true); }} onBlur={function () { setOpen(false); }}
				className="cursor-help rounded-sm font-semibold text-foreground underline decoration-primary/40 decoration-dotted decoration-2 underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
				{children || g.term}
			</button>
			{open && (
				<span role="tooltip" id={id} className="animate-in fade-in zoom-in-95 absolute bottom-full left-1/2 z-50 mb-2 block w-64 -translate-x-1/2 rounded-xl border border-border bg-popover px-3.5 py-2.5 text-left text-xs font-normal leading-relaxed text-popover-foreground shadow-[var(--shadow-float)] duration-150">
					<span className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-primary">{g.term}</span>
					{g.def}
				</span>
			)}
		</span>
	);
}
