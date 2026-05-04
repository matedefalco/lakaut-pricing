import { BLUE, BLUEL, os } from "../../theme/tokens";

export function Sec({ title }) {
	return (
		<div
			style={Object.assign({}, os(10, 700, BLUE), {
				textTransform: "uppercase",
				letterSpacing: "1px",
				margin: "14px 0 8px",
				paddingBottom: 4,
				borderBottom: "2px solid " + BLUEL,
			})}
		>
			{title}
		</div>
	);
}
