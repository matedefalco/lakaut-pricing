import { useState, useRef, useEffect } from "react";
import { tierMaterial, tierMaterialInList } from "@/lib/tierMaterial";
import { cn } from "@/lib/utils";

// Insignia de nivel / segmento con material real. Reemplaza el texto plano que se
// usaba en las 6 pantallas donde aparece el nivel. El material sale de
// `tierMaterial` (ver ese módulo para la cascada de resolución).
//
// Tamaños:
//   sm  → celdas de tabla (Historial, Clientes, Comparación)
//   md  → default, listas y resúmenes
//   lg  → el nivel asignado en la cotizadora: es un logro, no un dato

const SIZES = {
	sm: { pad: "px-2 py-0.5", text: "text-[11px]", emoji: "text-[11px]", radius: 8, gap: "gap-1" },
	md: { pad: "px-2.5 py-1", text: "text-xs", emoji: "text-sm", radius: 10, gap: "gap-1.5" },
	lg: { pad: "px-3.5 py-1.5", text: "text-sm", emoji: "text-base", radius: 12, gap: "gap-2" },
};

export function TierBadge({ tier, tiers, size = "md", showEmoji = true, sub, className, title }) {
	if (!tier) return <span className="text-muted-foreground/40">—</span>;

	const mat = tiers ? tierMaterialInList(tier, tiers) : tierMaterial(tier);
	const s = SIZES[size] || SIZES.md;
	const label = (typeof tier === "object" ? tier.label : tier) || "—";

	return (
		<span
			title={title}
			className={cn("inline-flex items-center whitespace-nowrap font-semibold", s.pad, s.text, s.gap, className)}
			style={{
				background: mat.bg,
				color: mat.fg,
				border: "1px solid " + mat.border,
				borderRadius: s.radius,
				// Highlight interior + glow del color del material: es lo que hace que el
				// gradiente se lea como superficie física y no como relleno plano.
				boxShadow: "inset 0 1px 0 rgba(255,255,255,0.75), 0 1px 3px " + mat.glow,
			}}
		>
			{showEmoji && <span className={cn("leading-none", s.emoji)}>{mat.emoji}</span>}
			<span className="leading-none">{label}</span>
			{sub != null && (
				<span className="leading-none font-bold tabular-nums opacity-80">{sub}</span>
			)}
		</span>
	);
}

// Variante grande para el panel de resultado: el nivel como trofeo, con el
// descuento pegado. Es el momento en que el vendedor descubre cuánto puede
// negociar, así que se le da escala y glow real en lugar de una línea de texto.
//
// Cuando el nivel cambia, el trofeo rebota y un brillo lo barre una vez. El aviso
// de "subiste de nivel" lo dispara el cotizador con `useTierUp` + `notifyTierUp`;
// esto es el acuse local, en el lugar donde el vendedor está mirando.
export function TierTrophy({ tier, tiers, discountPct, note, empty, eyebrow = "Nivel · descuento" }) {
	const mat = tier && !empty ? (tiers ? tierMaterialInList(tier, tiers) : tierMaterial(tier)) : null;
	const [celebrate, setCelebrate] = useState(false);
	const prevKey = useRef(null);
	const key = mat && tier ? String(tier.id || tier.label) : null;

	useEffect(function () {
		// Sólo al cambiar de nivel con volumen cargado, no en el primer render.
		if (key && prevKey.current && prevKey.current !== key) {
			setCelebrate(true);
			const t = setTimeout(function () { setCelebrate(false); }, 950);
			prevKey.current = key;
			return function () { clearTimeout(t); };
		}
		prevKey.current = key;
	}, [key]);

	if (!mat) {
		return (
			<div className="rounded-xl border border-dashed border-border px-3.5 py-2.5">
				<div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{eyebrow}</div>
				<div className="mt-1 font-heading text-lg font-semibold text-muted-foreground/40">—</div>
			</div>
		);
	}

	return (
		<div
			className={cn("relative overflow-hidden rounded-xl px-3.5 py-2.5 transition-all duration-300", celebrate && "animate-tier-pop")}
			style={{
				background: mat.bg,
				border: "1px solid " + mat.border,
				boxShadow: celebrate
					? "inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 20px -2px " + mat.glow
					: "inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 12px -2px " + mat.glow,
			}}
		>
			{celebrate && (
				<span
					aria-hidden
					className="animate-tier-sheen pointer-events-none absolute inset-y-0 -inset-x-1/3 w-1/3"
					style={{ background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.85), transparent)" }}
				/>
			)}
			<div className="relative text-[10px] font-bold uppercase tracking-wide" style={{ color: mat.fg, opacity: 0.7 }}>
				{eyebrow}
			</div>
			<div className="mt-1 flex items-baseline gap-2">
				<span className="text-lg leading-none">{mat.emoji}</span>
				<span className="font-heading text-lg font-bold leading-none" style={{ color: mat.fg }}>
					{tier.label}
				</span>
				{discountPct != null && (
					<span className="font-heading text-xl font-bold leading-none tabular-nums" style={{ color: mat.fg }}>
						{discountPct}%
					</span>
				)}
			</div>
			{note && (
				<div className="mt-1 text-[11px]" style={{ color: mat.fg, opacity: 0.75 }}>{note}</div>
			)}
		</div>
	);
}
