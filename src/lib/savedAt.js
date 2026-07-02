// Rastro liviano de "última edición" para las pantallas de configuración.
// Guarda el timestamp del último guardado por clave (en localStorage) y lo
// formatea en lenguaje cercano ("hoy 15:30", "ayer 09:10", "12 jul 14:00").
// No pretende ser un audit trail multi-usuario: es feedback de que el guardado
// ocurrió, para que editar la config no se sienta como un salto al vacío.

export function markSaved(key) {
	const iso = new Date().toISOString();
	try { localStorage.setItem("lakaut_savedAt_" + key, iso); } catch (e) {}
	return iso;
}

export function readSaved(key) {
	try { return localStorage.getItem("lakaut_savedAt_" + key); } catch (e) { return null; }
}

export function formatSaved(iso) {
	if (!iso) return null;
	const d = new Date(iso);
	if (isNaN(d.getTime())) return null;
	const now = new Date();
	const hh = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
	if (d.toDateString() === now.toDateString()) return "hoy " + hh;
	const yest = new Date(now); yest.setDate(now.getDate() - 1);
	if (d.toDateString() === yest.toDateString()) return "ayer " + hh;
	return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" }) + " " + hh;
}
