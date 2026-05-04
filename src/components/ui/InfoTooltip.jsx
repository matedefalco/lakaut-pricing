import { useState } from "react";
import { GRAY, WHITE } from "../../theme/tokens";

export function InfoTooltip({ text }) {
	const [show, setShow] = useState(false);
	return (
		<span style={{ position: "relative", display: "inline-block", marginLeft: 5, verticalAlign: "middle", cursor: "help" }}
			onMouseEnter={function () { setShow(true); }}
			onMouseLeave={function () { setShow(false); }}>
			<span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "50%", border: "1.5px solid " + GRAY, fontSize: 9, fontWeight: 700, color: GRAY, fontFamily: "'Open Sans',sans-serif", lineHeight: 1 }}>i</span>
			{show && (
				<div style={{ position: "absolute", bottom: "130%", left: "50%", transform: "translateX(-50%)", background: "#1e293b", color: WHITE, padding: "8px 10px", borderRadius: 8, fontSize: 11, width: 220, zIndex: 200, lineHeight: 1.5, pointerEvents: "none", whiteSpace: "normal", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
					{text}
				</div>
			)}
		</span>
	);
}
