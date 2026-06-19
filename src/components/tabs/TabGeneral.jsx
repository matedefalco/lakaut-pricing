import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, OKBG, WN, WNBG, ER, os, mont } from "../../theme/tokens";
import { DOLAR_SOURCES } from "../../lib/useDolarTC";

export function TabGeneral({ tc, setTc, tcSource, setTcSource, tcLoading, tcError, tcLastUpdated, tcRefresh }) {
	return (
		<div style={{ maxWidth: 600 }}>
			<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0" })}>
				Tipo de cambio USD → ARS
			</div>
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 24, background: WHITE }}>

				{/* Selector de variante */}
				<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 })}>
					Variante del dólar
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
					{DOLAR_SOURCES.map(function (s) {
						const active = tcSource === s.k;
						return (
							<button
								key={s.k}
								onClick={function () { setTcSource(s.k); }}
								style={{
									padding: "8px 18px",
									borderRadius: 8,
									border: "1.5px solid " + (active ? BLUE : BORD),
									background: active ? BLUEL : WHITE,
									color: active ? BLUE : GRAY,
									fontFamily: "'Open Sans',sans-serif",
									fontSize: 13,
									fontWeight: active ? 700 : 400,
									cursor: "pointer",
									transition: "all 0.15s",
								}}
							>
								{s.label}
							</button>
						);
					})}
				</div>

				{/* Valor actual */}
				<div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
					<div>
						<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 })}>
							Valor actual (venta)
						</div>
						<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
							<span style={os(12, 400, GRAY)}>1 USD =</span>
							<input
								type="number"
								value={tc}
								onChange={function (e) { setTc(Number(e.target.value) || 1); }}
								style={{
									width: 110,
									padding: "8px 12px",
									border: "1.5px solid " + BORD,
									borderRadius: 8,
									fontFamily: "Courier New,monospace",
									fontSize: 16,
									fontWeight: 700,
									color: BLACK,
									outline: "none",
								}}
							/>
							<span style={os(12, 400, GRAY)}>ARS</span>
						</div>
					</div>
					<button
						onClick={tcRefresh}
						disabled={tcLoading}
						style={{
							marginTop: 18,
							padding: "8px 18px",
							background: tcLoading ? "#f1f5f9" : BLUE,
							color: tcLoading ? GRAY : WHITE,
							border: "none",
							borderRadius: 8,
							fontFamily: "'Open Sans',sans-serif",
							fontSize: 12,
							fontWeight: 700,
							cursor: tcLoading ? "default" : "pointer",
						}}
					>
						{tcLoading ? "Actualizando..." : "↺ Actualizar"}
					</button>
				</div>

				{/* Estado */}
				{tcError && (
					<div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
						<span style={os(11, 700, ER)}>{tcError}</span>
					</div>
				)}
				{tcLastUpdated && !tcError && (
					<div style={{ background: OKBG, border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
						<span style={os(11, 400, OK)}>
							Última actualización: {new Date(tcLastUpdated).toLocaleString("es-AR")}
						</span>
					</div>
				)}

				<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 8 })}>
					Fuente: <strong>dolarapi.com</strong>. El valor se carga automáticamente al entrar y se puede forzar con "Actualizar".
					El toggle USD/ARS en la barra superior usa este tipo de cambio para convertir todos los precios.
				</div>
			</div>
		</div>
	);
}
