import { useEffect, useRef, useState } from "react";

// Anima un número desde su valor anterior hasta el nuevo en ~duration ms, con
// ease-out. Es el microfeedback de "causa y efecto" de la cotizadora: al tocar
// un input, el resultado se mueve hacia el valor nuevo en lugar de saltar.
// Respeta prefers-reduced-motion (devuelve el valor final sin animar).
export function useCountUp(target, duration = 320) {
	const to = Number(target) || 0;
	const [display, setDisplay] = useState(to);
	const fromRef = useRef(to);
	const rafRef = useRef(null);

	useEffect(function () {
		const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const from = fromRef.current;
		if (reduce || from === to) {
			setDisplay(to);
			fromRef.current = to;
			return;
		}
		const start = performance.now();
		function tick(now) {
			const t = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			setDisplay(from + (to - from) * eased);
			if (t < 1) {
				rafRef.current = requestAnimationFrame(tick);
			} else {
				fromRef.current = to;
			}
		}
		rafRef.current = requestAnimationFrame(tick);
		return function () {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			fromRef.current = to;
		};
	}, [to, duration]);

	return display;
}
