import { useEffect, useRef, useState } from "react";

// Anima un número desde su valor anterior hasta el nuevo en ~duration ms, con
// ease-out. Es el microfeedback de "causa y efecto" de la cotizadora: al tocar
// un input, el resultado se mueve hacia el valor nuevo en lugar de saltar.
// Respeta prefers-reduced-motion (devuelve el valor final sin animar) y garantiza
// llegar al valor final aunque requestAnimationFrame no dispare (pestaña en
// segundo plano / compositor throttled): un setTimeout de respaldo lo fija.
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
		let finished = false;
		function finish() {
			if (finished) return;
			finished = true;
			setDisplay(to);
			fromRef.current = to;
		}
		const start = (typeof performance !== "undefined" ? performance.now() : Date.now());
		function tick(now) {
			const t = Math.min(1, (now - start) / duration);
			const eased = 1 - Math.pow(1 - t, 3);
			setDisplay(from + (to - from) * eased);
			if (t < 1) {
				rafRef.current = requestAnimationFrame(tick);
			} else {
				finish();
			}
		}
		rafRef.current = requestAnimationFrame(tick);
		// Respaldo: si raf no corre (pestaña en segundo plano), fija el valor final.
		const fallback = setTimeout(finish, duration + 80);
		return function () {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			clearTimeout(fallback);
			fromRef.current = to;
		};
	}, [to, duration]);

	return display;
}
