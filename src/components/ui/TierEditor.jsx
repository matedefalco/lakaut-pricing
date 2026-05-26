import { BLUE, GRAY, BLACK, WHITE, BORD, os } from "../../theme/tokens";

// Editor reutilizable de tramos de descuento por volumen.
// tiers: [{ minVol, discount }] · onChange(nextTiers)
export function TierEditor({ tiers, onChange, accent, compact }) {
	const c = accent || BLUE;

	function upd(i, field, val) {
		onChange(tiers.map(function (t, j) { return j === i ? Object.assign({}, t, { [field]: val }) : t; }));
	}
	function remove(i) {
		onChange(tiers.filter(function (_, j) { return j !== i; }));
	}
	function add() {
		const last = tiers[tiers.length - 1];
		const nextVol = last && isFinite(last.minVol) ? Math.max(1, last.minVol * 2) : 1000;
		onChange(tiers.concat([{ minVol: nextVol, discount: 0 }]));
	}

	const numStyle = {
		width: "100%",
		border: "1px solid " + BORD,
		borderRadius: 4,
		padding: "3px 7px",
		fontFamily: "Courier New,monospace",
		fontSize: 12,
		textAlign: "right",
		color: BLACK,
		background: WHITE,
		outline: "none",
		boxSizing: "border-box",
	};
	const thStyle = Object.assign({}, os(10, 700, WHITE), { padding: "6px 10px", textAlign: "right", background: GRAY });
	const delBtn = { background: "none", border: "none", color: GRAY, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 4px" };
	const addBtn = {
		marginTop: 8, padding: "5px 14px", background: WHITE, border: "1.5px dashed " + c,
		borderRadius: 6, color: c, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer",
	};

	return (
		<div>
			<table style={{ width: "100%", borderCollapse: "collapse" }}>
				<thead>
					<tr>
						<th style={Object.assign({}, thStyle, { textAlign: "left" })}>Volumen ≥ (firmas)</th>
						<th style={Object.assign({}, thStyle, { width: 120 })}>Descuento %</th>
						<th style={Object.assign({}, thStyle, { width: 28, background: GRAY })} />
					</tr>
				</thead>
				<tbody>
					{tiers.length === 0 && (
						<tr>
							<td colSpan={3} style={Object.assign({}, os(11, 400, GRAY), { padding: "10px", textAlign: "center" })}>
								Sin tramos — el precio se cotiza sin descuento por volumen.
							</td>
						</tr>
					)}
					{tiers.map(function (t, i) {
						return (
							<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
								<td style={{ padding: "4px 6px" }}>
									<input
										type="number"
										value={t.minVol}
										min={1}
										onChange={function (e) { upd(i, "minVol", Math.max(0, Math.round(Number(e.target.value) || 0))); }}
										style={Object.assign({}, numStyle, { textAlign: "left" })}
									/>
								</td>
								<td style={{ padding: "4px 6px", width: 120 }}>
									<input
										type="number"
										value={t.discount}
										min={0}
										max={99}
										onChange={function (e) { upd(i, "discount", Math.max(0, Math.min(99, Number(e.target.value) || 0))); }}
										style={numStyle}
									/>
								</td>
								<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
									<button style={delBtn} onClick={function () { remove(i); }} title="Eliminar tramo">×</button>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
			<button style={addBtn} onClick={add}>+ Agregar tramo</button>
			{!compact && (
				<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 8 })}>
					Se aplica el descuento del tramo de mayor volumen que el cliente alcanza. El orden de carga no importa.
				</div>
			)}
		</div>
	);
}
