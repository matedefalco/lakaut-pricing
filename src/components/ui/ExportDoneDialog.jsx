import { useEffect, useRef, useState } from "react";
import { Check, Mail, CalendarPlus, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VALIDEZ_DIAS } from "@/lib/dealStatus";

// "Propuesta lista": cierre del recorrido de cotizar. Antes era un toast que se
// iba solo; el momento en que la propuesta sale merece un final claro y, sobre
// todo, el paso siguiente a mano: el mail al cliente y el recordatorio de
// seguimiento antes de que venza.

function fechaLarga(d) {
	return d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

function ymd(d) {
	return d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
}

// Recordatorio como archivo .ics: lo abre cualquier calendario (Google, Outlook,
// Apple) sin integraciones ni permisos. Evento de día completo 2 días antes del
// vencimiento (o hoy, si la vigencia es más corta).
function descargarRecordatorio({ cotId, clientName, vence, uid }) {
	const aviso = new Date(Math.max(Date.now(), vence.getTime() - 2 * 86400000));
	const fin = new Date(aviso.getTime() + 86400000);
	const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
	const titulo = "Seguimiento " + (cotId || "propuesta") + (clientName ? " · " + clientName : "");
	const ics = [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//FID by Lakaut//Cotizador//ES",
		"BEGIN:VEVENT",
		"UID:" + uid + "@fid-cotizador",
		"DTSTAMP:" + stamp,
		"DTSTART;VALUE=DATE:" + ymd(aviso),
		"DTEND;VALUE=DATE:" + ymd(fin),
		"SUMMARY:" + titulo.replace(/[,;]/g, " "),
		"DESCRIPTION:La propuesta vence el " + fechaLarga(vence).replace(/[,;]/g, " ") + ".",
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
	const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
	const a = document.createElement("a");
	a.href = url;
	a.download = "seguimiento-" + (cotId || "propuesta").toLowerCase() + ".ics";
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

// Se monta solo con datos: cada exportación arranca con las acciones sin marcar.
// data.mode: "guardada" (recién guardada: el paso principal es exportar) o
// "exportada" (el PDF ya se abrió). Una sola ventana para los dos momentos.
export function ExportDoneDialog({ data, onClose, onGoHistorial, onNewQuote, onExport }) {
	const [copiado, setCopiado] = useState(false);
	const [agendado, setAgendado] = useState(false);
	const closeRef = useRef(null);

	useEffect(function () {
		function onKey(e) { if (e.key === "Escape") onClose(); }
		document.addEventListener("keydown", onKey);
		if (closeRef.current) closeRef.current.focus();
		return function () { document.removeEventListener("keydown", onKey); };
	}, [onClose]);

	const emitida = data.deal && data.deal.fecha ? new Date(data.deal.fecha) : new Date();
	const vence = new Date(emitida.getTime() + VALIDEZ_DIAS * 86400000);
	const clientName = data.client && data.client.name;
	const cotId = data.cotId;
	const guardada = data.mode === "guardada";

	const mail = "Hola,\n\n"
		+ "Te comparto la propuesta" + (cotId ? " " + cotId : "") + (clientName ? " para " + clientName : "") + ", vigente hasta el " + fechaLarga(vence) + ". Va adjunta en PDF.\n\n"
		+ "Si te sirve, coordinamos una llamada corta esta semana para repasarla y resolver dudas.\n\n"
		+ "Saludos,\nMateo De Falco\nLakaut";

	function copiarMail() {
		if (!navigator.clipboard) return;
		navigator.clipboard.writeText(mail).then(function () { setCopiado(true); }, function () {});
	}

	return (
		<div className="no-print fixed inset-0 z-[160] flex items-center justify-center bg-black/35 p-4" onMouseDown={function (e) { if (e.target === e.currentTarget) onClose(); }}>
			<div role="dialog" aria-modal="true" aria-labelledby="export-done-title" className="glass-strong shadow-float relative w-full max-w-[480px] rounded-3xl border border-[var(--glass-border)] p-7">
				<button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar" className="absolute top-4 right-4 flex size-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-muted-foreground outline-none hover:bg-white/60 focus-visible:ring-[3px] focus-visible:ring-ring/50">
					<X size={18} aria-hidden="true" />
				</button>
				<span className="flex size-14 items-center justify-center rounded-full bg-[var(--success)]/15 text-[var(--success)] animate-in zoom-in-50 duration-300">
					<Check size={28} strokeWidth={2.6} aria-hidden="true" />
				</span>
				<h2 id="export-done-title" className="mt-4 font-heading text-2xl font-bold text-foreground">
					{guardada ? "Cotización guardada" : "Propuesta lista"}{clientName ? " para " + clientName : ""}
				</h2>
				<p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
					{cotId ? cotId + " · vence" : "Vence"} el {fechaLarga(vence)}. {guardada ? "Ya quedó sincronizada con el equipo." : "El PDF se abrió en otra pestaña."}
				</p>

				{guardada && onExport && (
					<button type="button" onClick={onExport} className="mt-5 flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border-none bg-primary px-5 py-3 text-left text-[16px] font-bold text-primary-foreground shadow-[var(--shadow-control)] outline-none transition hover:-translate-y-px hover:brightness-110 focus-visible:ring-[3px] focus-visible:ring-ring/50">
						<FileText size={20} className="shrink-0" aria-hidden="true" />
						<span className="flex-1">Exportar propuesta</span>
						<span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{data.currency || "USD"}</span>
					</button>
				)}

				<div className="mt-5 flex flex-col gap-2">
					<div className="text-xs font-bold tracking-[0.6px] text-muted-foreground uppercase">¿Qué sigue?</div>
					{!guardada && <button type="button" onClick={copiarMail} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-white/70 px-4 py-2.5 text-left text-[15px] font-semibold text-foreground outline-none transition-colors hover:bg-white focus-visible:ring-[3px] focus-visible:ring-ring/50">
						<Mail size={18} className="shrink-0 text-primary" aria-hidden="true" />
						<span className="flex-1">{copiado ? "Mail copiado: pegalo y adjuntá el PDF" : "Copiar el mail para el cliente"}</span>
						{copiado && <Check size={16} className="text-[var(--success)]" aria-hidden="true" />}
					</button>}
					<button type="button" onClick={function () { descargarRecordatorio({ cotId: cotId, clientName: clientName, vence: vence, uid: (data.deal && data.deal.id) || String(Date.now()) }); setAgendado(true); }} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-border bg-white/70 px-4 py-2.5 text-left text-[15px] font-semibold text-foreground outline-none transition-colors hover:bg-white focus-visible:ring-[3px] focus-visible:ring-ring/50">
						<CalendarPlus size={18} className="shrink-0 text-primary" aria-hidden="true" />
						<span className="flex-1">{agendado ? "Recordatorio descargado: abrilo para agendarlo" : "Recordarme el seguimiento antes del vencimiento"}</span>
						{agendado && <Check size={16} className="text-[var(--success)]" aria-hidden="true" />}
					</button>
				</div>

				<div className="mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-5">
					{onGoHistorial
						? <button type="button" onClick={onGoHistorial} className="cursor-pointer border-none bg-transparent p-0 text-[15px] font-semibold text-primary outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50">Ver en Cotizaciones</button>
						: <span className="text-sm text-muted-foreground">Guardala para verla en Cotizaciones.</span>}
					<Button onClick={onNewQuote}>Nueva cotización</Button>
				</div>
			</div>
		</div>
	);
}
