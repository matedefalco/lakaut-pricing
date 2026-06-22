import { useState, useRef } from "react";
import { GRAY, WHITE } from "../../theme/tokens";

export function InfoTooltip({ text, dir = "up" }) {
	const [pos, setPos] = useState(null);
	const ref = useRef(null);

	function handleEnter() {
		if (!ref.current) return;
		const r = ref.current.getBoundingClientRect();
		const TIP_W = 220;
		const MARGIN = 8;
		let left = r.left + r.width / 2;
		// Clamp so tooltip stays within viewport
		left = Math.min(left, window.innerWidth - TIP_W / 2 - MARGIN);
		left = Math.max(left, TIP_W / 2 + MARGIN);
		setPos(dir === "down"
			? { top: r.bottom + 6, left }
			: { top: r.top - 6, left });
	}

	return (
		<span ref={ref} style={{ position: "relative", display: "inline-block", marginLeft: 5, verticalAlign: "middle", cursor: "help" }}
			onMouseEnter={handleEnter}
			onMouseLeave={function () { setPos(null); }}>
			<span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", border: "1.5px solid " + GRAY, fontSize: 9, fontWeight: 700, color: GRAY, fontFamily: "'Open Sans',sans-serif", lineHeight: 1 }}>i</span>
			{pos && (
				<div style={{
					position: "fixed",
					top: dir === "down" ? pos.top : undefined,
					bottom: dir === "down" ? undefined : window.innerHeight - pos.top,
					left: pos.left,
					transform: "translateX(-50%)",
					background: "#1e293b", color: WHITE, padding: "8px 10px", borderRadius: 8,
					fontSize: 11, width: 220, zIndex: 9999, lineHeight: 1.5,
					pointerEvents: "none", whiteSpace: "normal", boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
				}}>
					{text}
				</div>
			)}
		</span>
	);
}
