import { useState } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, os, mont } from "../../theme/tokens";
import { useDiscounts, discountRateFor } from "../../context/DiscountContext";
import { TierEditor } from "../ui/TierEditor";
import { TabVolumenConfig } from "./TabVolumenConfig";

function SectionHeader({ title }) {
	return (
		<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0", marginTop: 20 })}>
			{title}
		</div>
	);
}

export function TabDescuentos({ volumeTiers, onUpdateVolumeTiers }) {
	return (
		<div style={{ maxWidth: 820 }}>
			{volumeTiers && onUpdateVolumeTiers && (
				<TabVolumenConfig volumeTiers={volumeTiers} onUpdate={onUpdateVolumeTiers} />
			)}
		</div>
	);
}
