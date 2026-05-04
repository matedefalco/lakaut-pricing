import { WHITE, BORD, BLACK, os } from "../../theme/tokens";
import { fD } from "../../utils/formatters";

export function ChartTip({ active, payload, label }) {
	if (!active || !payload || !payload.length) return null;
	return (
		<div
			style={{
				background: WHITE,
				border: "1px solid " + BORD,
				borderRadius: 8,
				padding: "8px 12px",
			}}
		>
			<div style={Object.assign({}, os(12, 700, BLACK), { marginBottom: 4 })}>
				{label}
			</div>
			{payload.map(function (p) {
				return (
					<div
						key={p.name}
						style={{
							display: "flex",
							justifyContent: "space-between",
							gap: 12,
							color: p.color || p.stroke,
						}}
					>
						<span style={os(11, 400)}>{p.name}</span>
						<span style={os(11, 700)}>
							{typeof p.value === "number" ? fD(p.value) : p.value}
						</span>
					</div>
				);
			})}
		</div>
	);
}
