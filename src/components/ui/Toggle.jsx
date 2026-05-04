import { BLUE, BORD, GRAY, BLACK, WHITE, os } from "../../theme/tokens";

export function Toggle({ label, cost, costType, checked, onChange }) {
	const unit =
		costType === "firma"
			? "/firma"
			: costType === "cert"
				? "/cert"
				: costType === "pct_rev"
					? "% del revenue"
					: "/usuario/mes";
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				padding: "8px 0",
				borderBottom: "1px solid " + BORD,
			}}
		>
			<div>
				<div style={os(12, 400, BLACK)}>{label}</div>
				<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 1 })}>
					{cost > 0
						? (costType === "pct_rev" ? "+ " + (cost * 100).toFixed(1) + "% " + unit : "+ USD " + cost.toFixed(2) + " " + unit)
						: "Sin costo adicional"}
				</div>
			</div>
			<div
				onClick={function () {
					onChange(!checked);
				}}
				style={{
					width: 38,
					height: 22,
					borderRadius: 11,
					background: checked ? BLUE : BORD,
					cursor: "pointer",
					position: "relative",
					transition: "background 0.2s",
					flexShrink: 0,
				}}
			>
				<div
					style={{
						position: "absolute",
						width: 16,
						height: 16,
						borderRadius: 8,
						background: WHITE,
						top: 3,
						left: checked ? 18 : 3,
						transition: "left 0.2s",
					}}
				/>
			</div>
		</div>
	);
}
