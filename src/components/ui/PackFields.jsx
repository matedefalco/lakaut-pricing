import { NumInput } from "./NumInput";
import { GRAY, os } from "../../theme/tokens";

function arsNote(usd, currency, tc) {
	if (currency !== "ARS" || !usd) return null;
	return (
		<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: -6, marginBottom: 6 })}>
			≈ $ {Math.round(usd * tc).toLocaleString("es-AR")} ARS
		</div>
	);
}

export function PackFields({ arch, inp, update, currency, tc }) {
	if (arch === "ppu")
		return (
			<div>
				<NumInput
					label="Precio certificado (one-time)"
					value={inp.precioCert || 5}
					onChange={function (v) { update("precioCert", v); }}
					prefix="USD"
				/>
				{arsNote(inp.precioCert || 5, currency, tc)}
				<NumInput
					label="Precio por firma"
					value={inp.precioFirma || 1.5}
					onChange={function (v) { update("precioFirma", v); }}
					prefix="USD"
				/>
				{arsNote(inp.precioFirma || 1.5, currency, tc)}
				<NumInput
					label="Firmas asumidas / mes (para análisis)"
					value={inp.firmasAsumidas || 5}
					onChange={function (v) {
						update("firmasAsumidas", v);
					}}
					suffix="f"
					note="No limita al usuario. Define el consumo promedio asumido para proyectar revenue."
				/>
			</div>
		);
	if (arch === "free")
		return (
			<NumInput
				label="Firmas gratuitas / mes"
				value={inp.firmas || 1}
				onChange={function (v) {
					update("firmas", v);
				}}
				suffix="f"
			/>
		);
	if (arch === "hibrido")
		return (
			<div>
				<NumInput
					label="Precio certificado"
					value={inp.precioCert || 5}
					onChange={function (v) { update("precioCert", v); }}
					prefix="USD"
				/>
				{arsNote(inp.precioCert || 5, currency, tc)}
				<NumInput
					label="Precio bolsa de firmas"
					value={inp.precio || 0}
					onChange={function (v) { update("precio", v); }}
					prefix="USD"
				/>
				{arsNote(inp.precio || 0, currency, tc)}
				<NumInput
					label="Firmas incluidas en bolsa"
					value={inp.firmas || 0}
					onChange={function (v) {
						update("firmas", v);
					}}
					suffix="f"
				/>
				{(inp.firmas || 0) > 0 && (
					<NumInput
						label="Firma extra (USD/firma)"
						value={inp.extraFirma || 1}
						onChange={function (v) {
							update("extraFirma", v);
						}}
						prefix="USD"
					/>
				)}
			</div>
		);
	const isAnual = arch === "anual",
		isPack = arch === "bolsa";
	return (
		<div>
			<NumInput
				label={
					isAnual
						? "Precio anual"
						: isPack
							? "Precio del pack (one-time)"
							: "Precio mensual"
				}
				value={inp.precio || 0}
				onChange={function (v) {
					update("precio", v);
				}}
				prefix="USD"
				suffix={isAnual ? "/año" : isPack ? "/ pack" : "/mes"}
			/>
			{arsNote(inp.precio || 0, currency, tc)}
			<NumInput
				label={
					isAnual
						? "Firmas / año"
						: isPack
							? "Firmas incluidas (toda la vigencia)"
							: "Firmas incluidas / mes"
				}
				value={inp.firmas || 0}
				onChange={function (v) {
					update("firmas", v);
				}}
				suffix="f"
			/>
			{arch === "sub" && (
				<NumInput
					label="Firma extra (USD/firma)"
					value={inp.extraFirma || 1}
					onChange={function (v) {
						update("extraFirma", v);
					}}
					prefix="USD"
				/>
			)}
		</div>
	);
}
