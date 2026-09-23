import { fD } from "../../utils/formatters";

// Tooltip de los gráficos de Recharts.
export function ChartTip({ active, payload, label }) {
	if (!active || !payload || !payload.length) return null;
	return (
		<div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card">
			<div className="mb-1 text-sm font-bold text-foreground">{label}</div>
			{payload.map(function (p) {
				return (
					<div key={p.name} className="flex justify-between gap-3" style={{ color: p.color || p.stroke }}>
						<span className="text-xs">{p.name}</span>
						<span className="text-xs font-bold tabular-nums">
							{typeof p.value === "number" ? fD(p.value) : p.value}
						</span>
					</div>
				);
			})}
		</div>
	);
}
