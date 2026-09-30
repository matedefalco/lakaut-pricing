import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, ArrowRight, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { channelMeta, resolveChannel } from "@/data/channelMeta";
import { dealStatus, dealStatusMeta } from "@/lib/dealStatus";
import { formatCotId } from "@/lib/cotId";

// Buscador ⌘K: encontrar una cotización o un destino y actuar sin navegar por el
// menú. Busca cotizaciones por cliente o número (COT-…), ofrece arrancar una nueva
// en cualquier canal y saltar a cualquier sección. Se maneja entero con teclado:
// flechas para moverse, Enter para abrir, Escape para cerrar.

// Comparación sin tildes ni mayúsculas: "cotizacion" encuentra "Cotización".
function norm(s) {
	return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Se monta solo mientras está abierto: cada apertura arranca con la búsqueda vacía.
export function CommandPalette({ onClose, deals, clientsById, navItems, quotable, onOpenDeal, onNav, onNewQuote }) {
	const [q, setQ] = useState("");
	const [idx, setIdx] = useState(0);
	const inputRef = useRef(null);
	const listRef = useRef(null);

	useEffect(function () {
		if (inputRef.current) inputRef.current.focus();
	}, []);

	const results = useMemo(function () {
		const nq = norm(q.trim());
		const out = [];
		function clientOf(d) { return (d.client_id && clientsById[d.client_id]) || d.clients || null; }

		const dealRows = (deals || []).map(function (d) {
			const c = clientOf(d);
			const name = (c && c.name) || d.clientName || "(sin nombre)";
			return { deal: d, name: name, cotId: formatCotId(d.inputs && d.inputs.cot, c && c.tipo, d.channel) || "" };
		}).filter(function (r) {
			return !nq || norm(r.name).includes(nq) || norm(r.cotId).includes(nq);
		}).slice(0, nq ? 6 : 4);
		dealRows.forEach(function (r) {
			const meta = channelMeta(resolveChannel(r.deal.channel));
			out.push({
				group: nq ? "Cotizaciones" : "Recientes",
				id: "deal-" + r.deal.id,
				label: r.name + (r.cotId ? " · " + r.cotId : ""),
				sub: (meta.label || "") + " · " + dealStatusMeta(dealStatus(r.deal)).label.toLowerCase(),
				dot: meta.color,
				run: function () { onOpenDeal(r.deal); },
			});
		});

		(quotable || []).forEach(function (c) {
			const label = "Nueva cotización · " + c.label;
			if (nq && !norm(label).includes(nq) && !"nueva".includes(nq)) return;
			out.push({ group: "Acciones", id: "new-" + c.key, label: label, Icon: Plus, run: function () { onNewQuote(c.key); } });
		});

		(navItems || []).forEach(function (it) {
			if (nq && !norm(it.label).includes(nq) && !norm(it.group).includes(nq)) return;
			out.push({ group: "Ir a", id: "nav-" + it.key, label: it.label, sub: it.group, Icon: ArrowRight, run: function () { onNav(it.key); } });
		});
		return out;
	}, [q, deals, clientsById, navItems, quotable, onOpenDeal, onNav, onNewQuote]);

	// El índice activo no puede quedar fuera de la lista al filtrar.
	const active = Math.min(idx, Math.max(0, results.length - 1));

	useEffect(function () {
		if (!listRef.current) return;
		const el = listRef.current.querySelector("[data-active='true']");
		if (el) el.scrollIntoView({ block: "nearest" });
	}, [active]);

	function run(r) {
		onClose();
		r.run();
	}

	function onKeyDown(e) {
		if (e.key === "Escape") { e.preventDefault(); onClose(); }
		else if (e.key === "ArrowDown") { e.preventDefault(); setIdx(Math.min(active + 1, results.length - 1)); }
		else if (e.key === "ArrowUp") { e.preventDefault(); setIdx(Math.max(active - 1, 0)); }
		else if (e.key === "Enter" && results[active]) { e.preventDefault(); run(results[active]); }
	}

	let lastGroup = null;
	return (
		<div className="no-print fixed inset-0 z-[150] flex justify-center bg-black/35 px-4 pt-[12vh]" onMouseDown={function (e) { if (e.target === e.currentTarget) onClose(); }}>
			<div role="dialog" aria-modal="true" aria-label="Buscador" className="glass-strong shadow-float flex h-fit max-h-[70vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl border border-[var(--glass-border)]">
				<div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5">
					<Search size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
					<input
						ref={inputRef}
						value={q}
						onChange={function (e) { setQ(e.target.value); setIdx(0); }}
						onKeyDown={onKeyDown}
						placeholder="Buscar cliente, cotización o acción"
						aria-label="Buscar"
						aria-controls="palette-list"
						aria-activedescendant={results[active] ? "palette-" + results[active].id : undefined}
						className="min-w-0 flex-1 border-none bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
					/>
					<kbd className="rounded-md border border-border px-1.5 py-0.5 text-xs font-semibold text-muted-foreground">esc</kbd>
				</div>
				<div id="palette-list" ref={listRef} role="listbox" aria-label="Resultados" className="overflow-y-auto p-2">
					{results.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados para “{q}”.</p>}
					{results.map(function (r, i) {
						const header = r.group !== lastGroup ? r.group : null;
						lastGroup = r.group;
						const isActive = i === active;
						const Icon = r.Icon || FileText;
						return (
							<div key={r.id}>
								{header && <div className="px-3 pt-3 pb-1 text-xs font-bold tracking-[0.6px] text-muted-foreground uppercase">{header}</div>}
								<button
									id={"palette-" + r.id}
									type="button"
									role="option"
									aria-selected={isActive}
									data-active={isActive}
									onMouseMove={function () { if (idx !== i) setIdx(i); }}
									onClick={function () { run(r); }}
									className={cn("flex w-full cursor-pointer items-center gap-3 rounded-xl border-none px-3 py-2.5 text-left outline-none", isActive ? "bg-primary/10" : "bg-transparent")}
								>
									{r.dot
										? <span className="size-2 shrink-0 rounded-full" style={{ background: r.dot }} aria-hidden="true" />
										: <Icon size={16} className="shrink-0 text-primary" aria-hidden="true" />}
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-semibold text-foreground">{r.label}</span>
										{r.sub && <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>}
									</span>
									{isActive && <span className="shrink-0 text-xs font-semibold text-muted-foreground">↵</span>}
								</button>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
