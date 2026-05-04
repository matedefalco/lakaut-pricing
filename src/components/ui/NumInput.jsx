import { WHITE, BORD, GRAY, BLACK, os } from "../../theme/tokens";

export function NumInput({ label, value, onChange, prefix, suffix, note }) {
	return (
		<div style={{ marginBottom: 10 }}>
			{label && (
				<div style={Object.assign({}, os(12, 400, GRAY), { marginBottom: 4 })}>
					{label}
				</div>
			)}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					border: "1.5px solid " + BORD,
					borderRadius: 8,
					overflow: "hidden",
					background: WHITE,
				}}
			>
				{prefix && (
					<span
						style={Object.assign({}, os(12, 400, GRAY), {
							padding: "5px 8px",
							background: "#f4f6fd",
							borderRight: "1px solid " + BORD,
							whiteSpace: "nowrap",
						})}
					>
						{prefix}
					</span>
				)}
				<input
					type="number"
					value={value}
					onChange={function (e) {
						onChange(Number(e.target.value));
					}}
					style={{
						flex: 1,
						border: "none",
						outline: "none",
						padding: "6px 8px",
						fontFamily: "'Open Sans',sans-serif",
						fontSize: 13,
						color: BLACK,
					}}
				/>
				{suffix && (
					<span
						style={Object.assign({}, os(11, 400, GRAY), {
							padding: "5px 8px",
							background: "#f4f6fd",
							borderLeft: "1px solid " + BORD,
						})}
					>
						{suffix}
					</span>
				)}
			</div>
			{note && (
				<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 3 })}>
					{note}
				</div>
			)}
		</div>
	);
}
