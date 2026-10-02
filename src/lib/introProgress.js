import { useEffect, useState } from "react";

// ─── Avance de la Introducción ────────────────────────────────────────────────
// Se guarda en el navegador (localStorage): es una comodidad por persona, no un
// dato del negocio. Si cambia de compu o borra datos, la intro arranca de cero.
// Inicio (tarjeta de bienvenida) y la pantalla de Introducción leen el mismo
// estado; un evento propio los mantiene sincronizados dentro de la misma pestaña.

const KEY = "lakaut_intro_v1";
const EVT = "lakaut-intro-change";
const EMPTY = { done: [], current: null, dismissed: false };

function read() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return EMPTY;
		const v = JSON.parse(raw);
		return { done: Array.isArray(v.done) ? v.done : [], current: v.current || null, dismissed: !!v.dismissed };
	} catch {
		return EMPTY;
	}
}

function write(next) {
	try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage bloqueado: la intro funciona igual, sin recordar */ }
	window.dispatchEvent(new CustomEvent(EVT));
}

export function useIntroProgress() {
	const [state, setState] = useState(read);
	useEffect(function () {
		function sync() { setState(read()); }
		window.addEventListener(EVT, sync);
		window.addEventListener("storage", sync);
		return function () {
			window.removeEventListener(EVT, sync);
			window.removeEventListener("storage", sync);
		};
	}, []);

	return {
		...state,
		markDone: function (id) {
			const s = read();
			if (s.done.indexOf(id) === -1) write({ ...s, done: s.done.concat(id) });
		},
		setCurrent: function (id) { write({ ...read(), current: id }); },
		dismiss: function () { write({ ...read(), dismissed: true }); },
		reset: function () { write(EMPTY); },
	};
}
