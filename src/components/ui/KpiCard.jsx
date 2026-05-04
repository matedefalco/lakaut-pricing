import { WHITE, BORD, GRAY, os, mont } from "../../theme/tokens";
import { InfoTooltip } from "./InfoTooltip";

export function KpiCard({ label, value, sub, accent, tooltip }) {
	return (
		<div
			style={{
				background: WHITE,
				border: "1px solid " + BORD,
				borderRadius: 12,
				padding: "16px 18px",
				borderTop: "4px solid " + accent,
				flex: "1 1 160px",
				minWidth: 0,
			}}
		>
			<div
				style={Object.assign({}, os(10, 700, GRAY), {
					textTransform: "uppercase",
					letterSpacing: "0.6px",
					marginBottom: 8,
					display: "flex",
					alignItems: "center",
					gap: 2,
				})}
			>
				{label}
				{tooltip && <InfoTooltip text={tooltip} />}
			</div>
			<div
				style={Object.assign({}, mont(24), { color: accent, lineHeight: 1 })}
			>
				{value}
			</div>
			{sub && (
				<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 6 })}>
					{sub}
				</div>
			)}
		</div>
	);
}
