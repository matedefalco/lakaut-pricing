import { useId, useState } from "react";

// Campo numérico de la cotizadora. Es el control más tocado de la app (22 call
// sites), así que las tres cosas que estaban rotas acá se sentían en todas partes:
//
//  1. No tenía foco visible. El <input> llevaba border:none + outline:none y el
//     borde vivía en el contenedor, que nunca reaccionaba. Navegando con teclado
//     no pasaba nada al entrar al campo. Ahora el contenedor usa :focus-within y
//     espeja el anillo de `input.jsx`, así todos los campos de la app se ven igual.
//  2. No tenía nombre accesible: el label era un <div> suelto, sin htmlFor, y el
//     input no tenía id. Un lector de pantalla anunciaba "spin button" a secas.
//  3. `onChange(Number(e.target.value))` mandaba el valor a 0 al borrar el campo
//     y se comía el punto decimal mientras escribías "1.5" (Number("1.") es NaN,
//     pero Number("") es 0, que es peor: parece un dato válido). Como acá se
//     cargan precios, era un bug de todos los días. Ahora el texto que estás
//     tipeando vive en estado local y el número sale recién cuando es parseable.
export function NumInput({ label, value, onChange, prefix, suffix, note }) {
	const id = useId();
	const noteId = note ? id + "-note" : undefined;
	// Borrador de lo que se está tipeando. null = mostrar el valor del padre.
	const [draft, setDraft] = useState(null);

	function handleChange(e) {
		const raw = e.target.value;
		setDraft(raw);
		// Solo propagamos cuando el texto es un número completo. "", "-", "1." y
		// "1,5" quedan en el borrador sin ensuciar el cálculo de la cotización.
		const n = Number(raw);
		if (raw.trim() !== "" && Number.isFinite(n)) onChange(n);
	}

	// Al salir del campo el borrador se descarta: si quedó a medio escribir, el
	// input vuelve a mostrar el último valor válido en lugar de un texto huérfano.
	function handleBlur() {
		setDraft(null);
	}

	return (
		<div className="mb-2.5">
			{label && (
				<label htmlFor={id} className="mb-1 block text-xs text-muted-foreground">
					{label}
				</label>
			)}
			<div className="flex items-stretch overflow-hidden rounded-md border border-input bg-card transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
				{prefix && (
					<span className="flex shrink-0 items-center whitespace-nowrap border-r border-input bg-muted px-2 text-xs text-muted-foreground">
						{prefix}
					</span>
				)}
				<input
					id={id}
					type="number"
					inputMode="decimal"
					step="any"
					value={draft ?? value}
					onChange={handleChange}
					onBlur={handleBlur}
					aria-describedby={noteId}
					className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground tabular-nums outline-none"
				/>
				{suffix && (
					<span className="flex shrink-0 items-center whitespace-nowrap border-l border-input bg-muted px-2 text-xs text-muted-foreground">
						{suffix}
					</span>
				)}
			</div>
			{note && (
				<div id={noteId} className="mt-1 text-xs text-muted-foreground">
					{note}
				</div>
			)}
		</div>
	);
}
