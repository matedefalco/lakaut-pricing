import { useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, GraduationCap, PartyPopper, RotateCcw, Plus, BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIntroProgress } from "../../lib/introProgress";
import { MODULES } from "./intro/modulesList";

// ─── Introducción · inducción para quien llega por primera vez ────────────────
// Curso corto por módulos (no es la Documentación): cada módulo explica una idea,
// tiene algo para tocar (explorador, simulador, caso práctico) y cierra con lo que
// hay que llevarse. El avance se guarda en el navegador (ver lib/introProgress) y
// lo muestra también la tarjeta de bienvenida de Inicio.
//
// Props: onNav(key) navega a una sección; onPreset(channel, inputs) abre un
// cotizador precargado con un caso práctico; onNewQuote(channel).

export function TabIntroduccion({ onNav, onPreset, onNewQuote }) {
	const prog = useIntroProgress();
	const topRef = useRef(null);
	// "fin" es la pantalla de cierre; cualquier otro valor es el id de un módulo.
	const currentId = prog.current && (prog.current === "fin" || MODULES.some(function (m) { return m.id === prog.current; })) ? prog.current : MODULES[0].id;
	const idx = MODULES.findIndex(function (m) { return m.id === currentId; });
	const mod = MODULES[idx];
	const doneCount = MODULES.filter(function (m) { return prog.done.indexOf(m.id) !== -1; }).length;
	const minutesLeft = MODULES.filter(function (m) { return prog.done.indexOf(m.id) === -1; }).reduce(function (a, m) { return a + m.minutes; }, 0);

	function go(id) {
		prog.setCurrent(id);
		const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (topRef.current) topRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
	}
	function next() {
		if (!mod) return;
		prog.markDone(mod.id);
		go(idx < MODULES.length - 1 ? MODULES[idx + 1].id : "fin");
	}
	function prev() { if (idx > 0) go(MODULES[idx - 1].id); }

	// Flechas del teclado para avanzar o volver, salvo que se esté escribiendo o
	// moviendo un slider.
	useEffect(function () {
		function onKey(e) {
			const t = e.target;
			if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
			if (e.key === "ArrowRight" && mod) { e.preventDefault(); next(); }
			if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); prev(); }
		}
		document.addEventListener("keydown", onKey);
		return function () { document.removeEventListener("keydown", onKey); };
	});

	const ctx = {
		nav: onNav,
		preset: function (channel, inputs) {
			if (mod) prog.markDone(mod.id);
			onPreset(channel, inputs);
		},
	};

	return (
		<div ref={topRef} className="mx-auto max-w-5xl scroll-mt-20 space-y-6 pb-20">
			{/* Encabezado + avance */}
			<header className="relative overflow-hidden rounded-3xl border border-border px-6 py-6 shadow-[var(--shadow-card)] sm:px-8"
				style={{ background: "radial-gradient(110% 140% at 0% 0%, #eef0fb 0%, transparent 55%), radial-gradient(90% 130% at 100% 100%, #f3efff 0%, transparent 55%), var(--card)" }}>
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div>
						<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
							<GraduationCap size={15} aria-hidden="true" /> Introducción
						</div>
						<h1 className="mt-2 font-display text-2xl text-foreground text-balance sm:text-3xl">Aprendé a cotizar en Lakaut</h1>
						<p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">Seis módulos cortos, a tu ritmo. Podés saltar a cualquiera y retomar donde dejaste.</p>
					</div>
					<div className="text-right">
						<div className="font-display text-3xl tabular-nums text-foreground">{doneCount}<span className="text-lg text-muted-foreground">/{MODULES.length}</span></div>
						<div className="flex items-center justify-end gap-1 text-xs text-muted-foreground"><Clock size={12} aria-hidden="true" />{minutesLeft > 0 ? "~" + minutesLeft + " min restantes" : "Completada"}</div>
					</div>
				</div>

				{/* Stepper: cada punto es un módulo; se puede saltar a cualquiera. */}
				<ol className="mt-5 flex gap-1.5 overflow-x-auto pb-1" aria-label="Módulos">
					{MODULES.map(function (m, i) {
						const done = prog.done.indexOf(m.id) !== -1;
						const on = m.id === currentId;
						return (
							<li key={m.id} className="min-w-[120px] flex-1">
								<button type="button" onClick={function () { go(m.id); }} aria-current={on ? "step" : undefined}
									className={cn("group flex w-full flex-col gap-1.5 rounded-xl px-2 py-2 text-left transition-colors", on ? "bg-card shadow-[var(--shadow-control)]" : "hover:bg-card/60")}>
									<span className={cn("h-1.5 w-full rounded-full transition-colors duration-300", done ? "bg-success" : on ? "bg-primary" : "bg-muted")} aria-hidden="true" />
									<span className="flex items-start gap-1.5">
										<span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", done ? "bg-success text-white" : on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
											{done ? <Check size={12} strokeWidth={3} aria-label="completado" /> : i + 1}
										</span>
										<span className={cn("line-clamp-2 text-xs leading-tight", on ? "font-semibold text-foreground" : "text-muted-foreground")}>{m.title}</span>
									</span>
								</button>
							</li>
						);
					})}
				</ol>
			</header>

			{mod ? (
				<section key={mod.id} aria-labelledby="intro-mod-title" className="animate-in fade-in slide-in-from-bottom-3 space-y-6 duration-500">
					<div>
						<div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Módulo {idx + 1} de {MODULES.length} · {mod.minutes} min</div>
						<h2 id="intro-mod-title" className="mt-1 font-display text-2xl text-foreground">{mod.title}</h2>
					</div>
					<mod.Comp ctx={ctx} />

					<nav className="flex items-center justify-between gap-3 border-t border-border pt-5" aria-label="Navegación de módulos">
						<button type="button" onClick={prev} disabled={idx === 0}
							className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:pointer-events-none disabled:opacity-30">
							<ArrowLeft size={15} aria-hidden="true" /> Anterior
						</button>
						<span className="hidden text-xs text-muted-foreground sm:inline">Usá ← → para moverte</span>
						<button type="button" onClick={next}
							className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-control)] transition hover:-translate-y-px hover:brightness-110">
							{idx < MODULES.length - 1 ? <>Siguiente: {MODULES[idx + 1].title} <ArrowRight size={15} aria-hidden="true" /></> : <>Terminar <Check size={15} aria-hidden="true" /></>}
						</button>
					</nav>
				</section>
			) : (
				<section className="animate-in fade-in zoom-in-95 rounded-3xl border border-border bg-card px-6 py-10 text-center shadow-[var(--shadow-card)] duration-500">
					<span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-success/10 text-success">
						<PartyPopper size={30} aria-hidden="true" />
					</span>
					<h2 className="mt-4 font-display text-2xl text-foreground">{doneCount === MODULES.length ? "¡Listo! Ya sabés cotizar en Lakaut" : "Llegaste al final"}</h2>
					<p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
						{doneCount === MODULES.length
							? "Recorriste los seis módulos. Lo mejor ahora es hacer tu primera cotización real; la Documentación queda para las dudas puntuales."
							: "Te quedan " + (MODULES.length - doneCount) + " módulos sin completar. Tocalos arriba cuando quieras."}
					</p>
					<div className="mt-6 flex flex-wrap justify-center gap-2">
						<button type="button" onClick={function () { onNewQuote("b2b2c"); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-control)] transition hover:brightness-110">
							<Plus size={15} aria-hidden="true" /> Nueva cotización
						</button>
						<button type="button" onClick={function () { onNav("docs"); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted">
							<BookOpen size={15} aria-hidden="true" /> Documentación
						</button>
						<button type="button" onClick={function () { prog.reset(); }} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">
							<RotateCcw size={14} aria-hidden="true" /> Empezar de nuevo
						</button>
					</div>
				</section>
			)}
		</div>
	);
}

// Tarjeta de bienvenida para Inicio: muestra el avance y retoma donde quedó. Se
// oculta al completar la intro o al descartarla (la intro sigue en el riel).
export function IntroWelcomeCard({ onOpen }) {
	const prog = useIntroProgress();
	const doneCount = MODULES.filter(function (m) { return prog.done.indexOf(m.id) !== -1; }).length;
	if (prog.dismissed || doneCount === MODULES.length) return null;
	const empezada = doneCount > 0;
	const nextMod = MODULES.find(function (m) { return prog.done.indexOf(m.id) === -1; });
	return (
		<div className="animate-in fade-in slide-in-from-top-2 flex flex-col gap-4 overflow-hidden rounded-2xl border border-primary/15 p-5 shadow-[var(--shadow-card)] duration-500 sm:flex-row sm:items-center"
			style={{ background: "radial-gradient(120% 160% at 0% 0%, #e3e7fb 0%, transparent 60%), var(--card)" }}>
			<span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_6px_18px_rgba(48,65,213,0.3)]">
				<GraduationCap size={24} aria-hidden="true" />
			</span>
			<div className="min-w-0 flex-1">
				<div className="font-heading text-base font-semibold text-foreground">{empezada ? "Seguí con la introducción" : "¿Primera vez acá? Arrancá por la introducción"}</div>
				<p className="text-sm text-muted-foreground">{empezada ? "Vas " + doneCount + " de " + MODULES.length + ". Sigue: " + nextMod.title + "." : "Seis módulos cortos sobre la plataforma, los canales y cómo se arma un precio. Unos 15 minutos."}</p>
				<div className="mt-2 flex h-1.5 max-w-xs gap-1" aria-hidden="true">
					{MODULES.map(function (m) { return <span key={m.id} className={cn("flex-1 rounded-full", prog.done.indexOf(m.id) !== -1 ? "bg-success" : "bg-primary/15")} />; })}
				</div>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<button type="button" onClick={prog.dismiss} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground">Ahora no</button>
				<button type="button" onClick={function () { if (nextMod) prog.setCurrent(nextMod.id); onOpen(); }} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-control)] transition hover:brightness-110">
					{empezada ? "Continuar" : "Empezar"} <ArrowRight size={15} aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
