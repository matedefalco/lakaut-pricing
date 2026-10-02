import { useEffect, useState } from "react";
import { ListTree, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Índice de la documentación ───────────────────────────────────────────────
// Riel lateral sticky con scrollspy: marca la sección que se está leyendo, muestra
// el avance de lectura y salta con scroll suave. En pantallas chicas se vuelve un
// botón flotante que abre el mismo índice como hoja.
//
// items: [{ id, label, color?, children?: [{ id, label }] }]

function flatIds(items) {
	const out = [];
	items.forEach(function (it) {
		out.push(it.id);
		(it.children || []).forEach(function (c) { out.push(c.id); });
	});
	return out;
}

function useScrollSpy(ids) {
	const [active, setActive] = useState(ids[0]);
	useEffect(function () {
		const els = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
		if (!els.length) return;
		// La sección activa es la última cuyo título ya pasó la franja superior.
		function onScroll() {
			const line = 120;
			let current = els[0].id;
			for (let i = 0; i < els.length; i++) {
				if (els[i].getBoundingClientRect().top - line <= 0) current = els[i].id;
				else break;
			}
			// Al llegar al final, la última sección queda activa aunque sea corta.
			if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = els[els.length - 1].id;
			setActive(current);
		}
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		return function () {
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, [ids.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
	return active;
}

function useReadingProgress() {
	const [p, setP] = useState(0);
	useEffect(function () {
		function onScroll() {
			const max = document.documentElement.scrollHeight - window.innerHeight;
			setP(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1);
		}
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return function () { window.removeEventListener("scroll", onScroll); };
	}, []);
	return p;
}

function jumpTo(id) {
	const el = document.getElementById(id);
	if (!el) return;
	const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

function TocList({ items, active, onPick }) {
	// Una sección padre queda "en curso" si está activa ella o alguno de sus hijos.
	return (
		<ul className="space-y-0.5">
			{items.map(function (it) {
				const childActive = (it.children || []).some(function (c) { return c.id === active; });
				const on = it.id === active || childActive;
				return (
					<li key={it.id}>
						<button type="button" onClick={function () { onPick(it.id); }} aria-current={it.id === active ? "location" : undefined}
							className={cn("group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors", on ? "bg-card font-semibold text-foreground shadow-[var(--shadow-control)]" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
							<span className={cn("size-2 shrink-0 rounded-full transition-transform", on ? "scale-125" : "opacity-60")} style={{ background: it.color || "var(--muted-foreground)" }} aria-hidden="true" />
							<span className="truncate">{it.label}</span>
						</button>
						{it.children && on && (
							<ul className="ml-[15px] mt-0.5 space-y-0.5 border-l border-border pl-2">
								{it.children.map(function (c) {
									const cOn = c.id === active;
									return (
										<li key={c.id}>
											<button type="button" onClick={function () { onPick(c.id); }} aria-current={cOn ? "location" : undefined}
												className={cn("w-full truncate rounded-md px-2 py-1 text-left text-xs transition-colors", cOn ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground")}>
												{c.label}
											</button>
										</li>
									);
								})}
							</ul>
						)}
					</li>
				);
			})}
		</ul>
	);
}

export function DocToc({ items }) {
	const ids = flatIds(items);
	const active = useScrollSpy(ids);
	const progress = useReadingProgress();
	const [sheet, setSheet] = useState(false);

	const progressBar = (
		<div className="mt-4 px-2.5">
			<div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
				<span>Lectura</span>
				<span className="tabular-nums">{Math.round(progress * 100)}%</span>
			</div>
			<div className="h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Avance de lectura" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
				<div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: progress * 100 + "%" }} />
			</div>
		</div>
	);

	return (
		<>
			{/* Riel (desktop) */}
			<nav aria-label="Índice de la documentación" className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-56 shrink-0 overflow-y-auto pb-6 lg:block">
				<div className="mb-2 flex items-center gap-1.5 px-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
					<ListTree size={13} aria-hidden="true" /> En esta página
				</div>
				<TocList items={items} active={active} onPick={jumpTo} />
				{progressBar}
			</nav>

			{/* Botón flotante + hoja (mobile) */}
			<button type="button" onClick={function () { setSheet(true); }} className="no-print fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-float)] lg:hidden">
				<ListTree size={15} aria-hidden="true" /> Índice
				<span className="tabular-nums opacity-75">{Math.round(progress * 100)}%</span>
			</button>
			{sheet && (
				<div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Índice">
					<button type="button" aria-label="Cerrar índice" className="absolute inset-0 bg-foreground/20 backdrop-blur-[2px]" onClick={function () { setSheet(false); }} />
					<div className="glass absolute inset-x-3 bottom-3 max-h-[70vh] overflow-y-auto rounded-2xl border border-[var(--glass-border)] p-3 shadow-[var(--shadow-float)]">
						<div className="mb-2 flex items-center justify-between px-2.5">
							<span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">En esta página</span>
							<button type="button" aria-label="Cerrar" onClick={function () { setSheet(false); }} className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X size={16} /></button>
						</div>
						<TocList items={items} active={active} onPick={function (id) { setSheet(false); jumpTo(id); }} />
						{progressBar}
					</div>
				</div>
			)}
		</>
	);
}
