import { useState } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, os, mont } from "../../theme/tokens";
import { useDiscounts, discountRateFor } from "../../context/DiscountContext";
import { TierEditor } from "../ui/TierEditor";

function SectionHeader({ title }) {
	return (
		<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0", marginTop: 20 })}>
			{title}
		</div>
	);
}

export function TabDescuentos() {
	const { defaultTiers, setDefaultTiers, resetDefaultTiers } = useDiscounts();
	const [savedFlash, setSavedFlash] = useState(false);

	// La persistencia es automática (el contexto guarda en localStorage en cada cambio).
	function handleChange(tiers) {
		setDefaultTiers(tiers);
		setSavedFlash(true);
		setTimeout(function () { setSavedFlash(false); }, 1200);
	}

	// Vista previa de descuentos a distintos volúmenes
	const previewVols = [500, 1000, 5000, 20000, 50000, 100000, 250000];

	return (
		<div style={{ maxWidth: 760 }}>
			<SectionHeader title="Descuentos por volumen (pre-pactados)" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
				<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 14 })}>
					Estos son los tramos predeterminados que se aplican en la Cotizadora cuando el modo de descuento está en <strong>Predeterminados</strong>. Cada tramo define el descuento que recibe un cliente al alcanzar cierto volumen de firmas.
				</div>

				<TierEditor tiers={defaultTiers} onChange={handleChange} accent={BLUE} />

				<div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
					<button
						onClick={resetDefaultTiers}
						style={{ padding: "8px 18px", background: WHITE, color: GRAY, border: "1.5px solid " + BORD, borderRadius: 8, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 400, cursor: "pointer" }}
					>
						Restaurar tramos originales
					</button>
					{savedFlash && (
						<span style={Object.assign({}, os(11, 700, OK), { background: "#dcfce7", padding: "4px 10px", borderRadius: 6 })}>
							✓ Guardado
						</span>
					)}
					{!savedFlash && (
						<span style={os(11, 400, GRAY)}>Los cambios se guardan automáticamente en este navegador.</span>
					)}
				</div>
			</div>

			{/* Vista previa */}
			<SectionHeader title="Vista previa" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 0, background: WHITE, overflow: "hidden" }}>
				<table style={{ width: "100%", borderCollapse: "collapse" }}>
					<thead>
						<tr>
							<th style={Object.assign({}, os(10, 700, WHITE), { padding: "7px 14px", background: "#1e293b", textAlign: "left" })}>Volumen (firmas)</th>
							<th style={Object.assign({}, os(10, 700, WHITE), { padding: "7px 14px", background: "#1e293b", textAlign: "right" })}>Descuento</th>
							<th style={Object.assign({}, os(10, 700, WHITE), { padding: "7px 14px", background: "#1e293b", textAlign: "right" })}>Tramo aplicado</th>
						</tr>
					</thead>
					<tbody>
						{previewVols.map(function (v, i) {
							const sorted = defaultTiers.filter(function (t) { return t && isFinite(t.minVol); }).slice().sort(function (a, b) { return a.minVol - b.minVol; });
							let matchedTier = null;
							for (var j = 0; j < sorted.length; j++) {
								if (v >= sorted[j].minVol) matchedTier = sorted[j];
							}
							const rate = discountRateFor(v, defaultTiers);
							const hasDiscount = rate > 0;
							const bg = i % 2 === 0 ? "#fafafa" : WHITE;
							return (
								<tr key={v} style={{ background: bg }}>
									<td style={{ padding: "6px 14px", fontFamily: "Courier New,monospace", fontSize: 12, color: BLACK }}>{v.toLocaleString("es-AR")}</td>
									<td style={{ padding: "6px 14px", textAlign: "right" }}>
										<span style={Object.assign({}, mont(14), { color: hasDiscount ? BLUE : GRAY, fontWeight: hasDiscount ? 700 : 400 })}>
											{Math.round(rate * 100)}%
										</span>
									</td>
									<td style={{ padding: "6px 14px", textAlign: "right", fontFamily: "Courier New,monospace", fontSize: 11, color: hasDiscount ? BLUE : GRAY }}>
										{matchedTier ? "≥ " + matchedTier.minVol.toLocaleString("es-AR") + " → " + matchedTier.discount + "%" : "—"}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
