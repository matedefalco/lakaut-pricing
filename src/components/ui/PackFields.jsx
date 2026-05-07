import { NumInput } from "./NumInput";

// Returns value/prefix/onChange adapted to the active currency.
// Prices are always stored in USD; ARS mode converts for display only.
function priceField(usdVal, currency, tc, updateFn) {
	if (currency === "ARS") {
		return {
			value: Math.round(usdVal * tc),
			prefix: "$",
			onChange: function (v) { updateFn(v / tc); },
		};
	}
	return { value: usdVal, prefix: "USD", onChange: updateFn };
}

export function PackFields({ arch, inp, update, currency, tc }) {
	if (arch === "ppu") {
		const cert = priceField(inp.precioCert ?? 5, currency, tc, function (v) { update("precioCert", v); });
		const firma = priceField(inp.precioFirma ?? 1.5, currency, tc, function (v) { update("precioFirma", v); });
		return (
			<div>
				<NumInput label="Precio certificado (one-time)" {...cert} />
				<NumInput label="Precio por firma" {...firma} />
				<NumInput
					label="Firmas asumidas / mes (para análisis)"
					value={inp.firmasAsumidas ?? 5}
					onChange={function (v) { update("firmasAsumidas", v); }}
					suffix="f"
					note="No limita al usuario. Define el consumo promedio asumido para proyectar revenue."
				/>
			</div>
		);
	}

	if (arch === "free")
		return (
			<NumInput
				label="Firmas gratuitas / mes"
				value={inp.firmas ?? 1}
				onChange={function (v) { update("firmas", v); }}
				suffix="f"
			/>
		);

	if (arch === "hibrido") {
		const cert = priceField(inp.precioCert ?? 5, currency, tc, function (v) { update("precioCert", v); });
		const bolsa = priceField(inp.precio ?? 0, currency, tc, function (v) { update("precio", v); });
		const extra = priceField(inp.extraFirma ?? 1, currency, tc, function (v) { update("extraFirma", v); });
		return (
			<div>
				<NumInput label="Precio certificado" {...cert} />
				<NumInput label="Precio bolsa de firmas" {...bolsa} />
				<NumInput
					label="Firmas incluidas en bolsa"
					value={inp.firmas ?? 0}
					onChange={function (v) { update("firmas", v); }}
					suffix="f"
				/>
				{(inp.firmas ?? 0) > 0 && <NumInput label="Firma extra" {...extra} />}
				<NumInput
					label="Vigencia del pack"
					value={inp.periodo ?? 24}
					onChange={function (v) { update("periodo", Math.max(6, Math.min(48, Math.round(v)))); }}
					suffix="meses"
				/>
			</div>
		);
	}

	const isAnual = arch === "anual", isPack = arch === "bolsa";
	const precio = priceField(inp.precio ?? 0, currency, tc, function (v) { update("precio", v); });
	const extra = priceField(inp.extraFirma ?? 1, currency, tc, function (v) { update("extraFirma", v); });
	const extraPack = priceField(inp.extraFirmaPrice ?? 0, currency, tc, function (v) { update("extraFirmaPrice", v); });
	return (
		<div>
			<NumInput
				label={isAnual ? "Precio anual" : isPack ? "Precio del pack (one-time)" : "Precio mensual"}
				suffix={isAnual ? "/año" : isPack ? "/ pack" : "/mes"}
				{...precio}
			/>
			<NumInput
				label={isAnual ? "Firmas / año" : isPack ? "Firmas incluidas (toda la vigencia)" : "Firmas incluidas / mes"}
				value={inp.firmas ?? 0}
				onChange={function (v) { update("firmas", v); }}
				suffix="f"
			/>
			{isPack && (
				<NumInput
					label="Vigencia del pack"
					value={inp.periodo ?? 24}
					onChange={function (v) { update("periodo", Math.max(6, Math.min(48, Math.round(v)))); }}
					suffix="meses"
				/>
			)}
			{isPack && (
				<NumInput label="Precio firma extra" {...extraPack} />
			)}
			{isPack && (inp.extraFirmaPrice ?? 0) > 0 && (
				<NumInput
					label="Firmas extra vendidas (total)"
					value={inp.cantFirmasExtra ?? 0}
					onChange={function (v) { update("cantFirmasExtra", Math.max(0, Math.round(v))); }}
					suffix="f"
				/>
			)}
			{arch === "sub" && <NumInput label="Firma extra (USD/firma)" {...extra} />}
		</div>
	);
}
