import { useId, useRef, useState } from "react";

// Ayuda contextual del "i". Era un <span onMouseEnter>: solo existía para el
// mouse, así que con teclado no había forma de leer la explicación. Ahora es un
// <button> que abre con foco además de con hover, cierra con Escape, y enlaza el
// texto por aria-describedby para que el lector de pantalla lo anuncie.
export function InfoTooltip({ text, dir = "up" }) {
	const [pos, setPos] = useState(null);
	const ref = useRef(null);
	const id = useId();

	function open() {
		if (!ref.current) return;
		const r = ref.current.getBoundingClientRect();
		const TIP_W = 220;
		const MARGIN = 8;
		let left = r.left + r.width / 2;
		// Clamp so tooltip stays within viewport
		left = Math.min(left, window.innerWidth - TIP_W / 2 - MARGIN);
		left = Math.max(left, TIP_W / 2 + MARGIN);
		setPos(dir === "down" ? { top: r.bottom + 6, left } : { top: r.top - 6, left });
	}

	function close() {
		setPos(null);
	}

	return (
		<span
			ref={ref}
			className="relative ml-1.5 inline-block align-middle"
			onMouseEnter={open}
			onMouseLeave={close}
		>
			<button
				type="button"
				aria-label="Más información"
				aria-describedby={pos ? id : undefined}
				onFocus={open}
				onBlur={close}
				onKeyDown={function (e) {
					if (e.key === "Escape") close();
				}}
				className="inline-flex size-4 cursor-help items-center justify-center rounded-full border-[1.5px] border-muted-foreground bg-transparent p-0 text-[9px] leading-none font-bold text-muted-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
			>
				i
			</button>
			{pos && (
				<div
					id={id}
					role="tooltip"
					className="pointer-events-none fixed z-[9999] w-[220px] -translate-x-1/2 rounded-lg bg-[#1e293b] px-2.5 py-2 text-xs leading-relaxed whitespace-normal text-white shadow-float"
					style={{
						top: dir === "down" ? pos.top : undefined,
						bottom: dir === "down" ? undefined : window.innerHeight - pos.top,
						left: pos.left,
					}}
				>
					{text}
				</div>
			)}
		</span>
	);
}
