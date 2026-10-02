import { useState } from "react";
import { ShieldCheck, TriangleAlert, Lightbulb, Info, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Piezas de la documentación in-app ────────────────────────────────────────
// Componentes chicos y sin estado global que arman la página de Documentación:
// sección con ancla (para el índice), callouts tipados, tabla viva, barra de
// magnitud y acordeón. Viven acá y no en ui/ porque su tono (lectura larga, prosa
// con jerarquía) es propio de la doc, no de las pantallas de trabajo.

// Inline mínimo para la prosa: **negrita** y `código`. La doc es JSX, pero los
// textos largos se escriben como string para que se lean y editen de corrido.
export function Rich({ children }) {
	const text = String(children || "");
	const nodes = [];
	const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
	let last = 0;
	let m;
	let i = 0;
	while ((m = re.exec(text)) !== null) {
		if (m.index > last) nodes.push(text.slice(last, m.index));
		if (m[1] != null) nodes.push(<strong key={"b" + i} className="font-semibold text-foreground">{m[1]}</strong>);
		else nodes.push(<code key={"c" + i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{m[2]}</code>);
		last = re.lastIndex;
		i++;
	}
	if (last < text.length) nodes.push(text.slice(last));
	return <>{nodes}</>;
}

export function P({ children, className }) {
	return <p className={cn("text-[0.95rem] leading-relaxed text-muted-foreground max-w-[68ch]", className)}><Rich>{children}</Rich></p>;
}

// Sección de primer nivel. El `id` es el ancla que usa el índice; `scroll-mt`
// deja lugar para la barra superior sticky al saltar desde el índice.
export function DocSection({ id, eyebrow, title, lead, color, Icon, children }) {
	return (
		<section id={id} data-doc-section className="scroll-mt-20 space-y-5">
			<header className="space-y-2">
				{eyebrow && (
					<div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: color || "var(--primary)" }}>
						{Icon && (
							<span className="flex size-6 items-center justify-center rounded-lg" style={{ background: color ? color + "1a" : "var(--accent)" }}>
								<Icon size={14} aria-hidden="true" />
							</span>
						)}
						{eyebrow}
					</div>
				)}
				<h2 className="font-display text-2xl text-foreground text-balance">{title}</h2>
				{lead && <P className="text-base">{lead}</P>}
			</header>
			{children}
		</section>
	);
}

export function SubHeading({ id, children }) {
	return <h3 id={id} data-doc-section className="scroll-mt-20 pt-2 font-heading text-base font-semibold text-foreground">{children}</h3>;
}

// Callouts: cada tipo es una intención distinta, con su ícono y su color. Reemplazan
// los párrafos planos donde la doc dice "ojo con esto" o "esta es la regla".
const CALLOUTS = {
	regla: { Icon: ShieldCheck, label: "Regla", color: "var(--primary)", bg: "var(--accent)" },
	ojo: { Icon: TriangleAlert, label: "Ojo", color: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 9%, transparent)" },
	ejemplo: { Icon: Lightbulb, label: "Ejemplo", color: "var(--success)", bg: "color-mix(in srgb, var(--success) 8%, transparent)" },
	porque: { Icon: Info, label: "Por qué", color: "#7c3aed", bg: "color-mix(in srgb, #7c3aed 8%, transparent)" },
};

export function Callout({ type = "regla", title, children }) {
	const c = CALLOUTS[type] || CALLOUTS.regla;
	const Icon = c.Icon;
	return (
		<aside className="flex gap-3 rounded-xl border px-4 py-3" style={{ background: c.bg, borderColor: "color-mix(in srgb, " + c.color + " 22%, transparent)" }}>
			<Icon size={18} className="mt-0.5 shrink-0" style={{ color: c.color }} aria-hidden="true" />
			<div className="min-w-0 space-y-1 text-sm leading-relaxed text-foreground/85">
				<div className="text-xs font-bold uppercase tracking-wide" style={{ color: c.color }}>{title || c.label}</div>
				{typeof children === "string" ? <p><Rich>{children}</Rich></p> : children}
			</div>
		</aside>
	);
}

// Barra de magnitud: hace visible la progresión de una columna (el descuento que
// crece, el precio que baja) sin tener que comparar números a ojo.
export function MagBar({ value, max, color }) {
	const w = max > 0 ? Math.max(4, Math.min(100, (value / max) * 100)) : 0;
	return (
		<span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-muted align-middle" aria-hidden="true">
			<span className="block h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: w + "%", background: color || "var(--primary)" }} />
		</span>
	);
}

// Tabla viva: columnas declarativas, fila resaltada al pasar y una columna "clave"
// con fondo propio para que el ojo vaya directo al dato que importa.
// columns: [{ key, label, align, render(row, i), key: true }]
// isActive(row): opcional, resalta la fila (ej. el tramo donde cae una cantidad).
export function LiveTable({ columns, rows, rowKey, caption, accent, isActive }) {
	return (
		<div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[var(--shadow-control)]">
			<table className="w-full border-collapse text-sm">
				{caption && <caption className="sr-only">{caption}</caption>}
				<thead>
					<tr className="bg-muted/60">
						{columns.map(function (c) {
							return (
								<th key={c.key} scope="col" className={cn("whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground", c.align === "right" ? "text-right" : "text-left")} style={c.emphasis ? { color: accent || "var(--primary)" } : undefined}>
									{c.label}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{rows.map(function (r, i) {
						const on = isActive ? isActive(r) : false;
						return (
							<tr key={rowKey ? rowKey(r, i) : i} aria-current={on ? "true" : undefined} className={cn("group border-t border-border transition-colors hover:bg-accent/50", on && "font-semibold")}
								style={on ? { background: "color-mix(in srgb, " + (accent || "var(--primary)") + " 12%, transparent)", boxShadow: "inset 3px 0 0 " + (accent || "var(--primary)") } : undefined}>
								{columns.map(function (c) {
									return (
										<td key={c.key} className={cn("whitespace-nowrap px-4 py-2.5 tabular-nums", c.align === "right" ? "text-right" : "text-left", c.emphasis && "font-semibold text-foreground")} style={c.emphasis ? { background: "color-mix(in srgb, " + (accent || "var(--primary)") + " 5%, transparent)" } : undefined}>
											{c.render ? c.render(r, i) : r[c.key]}
										</td>
									);
								})}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// Selector segmentado chico (filtros de tabla, moneda, vista).
export function Segmented({ options, value, onChange, label }) {
	return (
		<div role="group" aria-label={label} className="inline-flex w-fit rounded-lg border border-border bg-muted/40 p-0.5">
			{options.map(function (o) {
				const active = value === o.id;
				return (
					<button key={o.id} type="button" aria-pressed={active} onClick={function () { onChange(o.id); }}
						className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors", active ? "bg-card text-foreground shadow-[var(--shadow-control)]" : "text-muted-foreground hover:text-foreground")}>
						{o.Icon && <o.Icon size={13} aria-hidden="true" />}
						{o.label}
					</button>
				);
			})}
		</div>
	);
}

// Acordeón para material de consulta (contexto de decisiones, mantenimiento): está,
// pero no compite con el contenido principal.
export function Disclosure({ title, children, defaultOpen = false }) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="rounded-xl border border-border bg-card">
			<button type="button" aria-expanded={open} onClick={function () { setOpen(!open); }} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-foreground">
				<span>{title}</span>
				<ChevronDown size={16} className={cn("shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
			</button>
			{open && <div className="space-y-3 border-t border-border px-4 py-3 text-sm leading-relaxed text-muted-foreground">{children}</div>}
		</div>
	);
}
