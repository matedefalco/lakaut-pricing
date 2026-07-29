import { channelMeta, channelShort } from "@/data/channelMeta";
import { cn } from "@/lib/utils";

// Badge de canal con la identidad de `channelMeta`. Antes los dos canales usaban el
// mismo `Badge variant="default"` (azul), así que en una tabla de 19 filas el canal
// no se distinguía sin leer. Ahora Packs es azul y Volumen violeta, con emoji.

const SIZES = {
	sm: { pad: "px-1.5 py-0.5", text: "text-[10px]", radius: 6, gap: "gap-1" },
	md: { pad: "px-2 py-0.5", text: "text-[11px]", radius: 8, gap: "gap-1" },
};

export function ChannelBadge({ channel, size = "md", showEmoji = true, className }) {
	const meta = channelMeta(channel);
	const s = SIZES[size] || SIZES.md;

	return (
		<span
			className={cn("inline-flex shrink-0 items-center whitespace-nowrap font-semibold", s.pad, s.text, s.gap, className)}
			style={{
				background: meta.gradient,
				color: meta.colorFg,
				border: "1px solid " + meta.glow,
				borderRadius: s.radius,
			}}
		>
			{showEmoji && <span className="leading-none">{meta.emoji}</span>}
			<span className="leading-none">{channelShort(channel)}</span>
		</span>
	);
}
