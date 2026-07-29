import { useEffect, useRef } from "react";

// ─── Detección de "subió de nivel" ────────────────────────────────────────────
// Avisa cuando la cotización cruza hacia arriba un nivel de Packs o un segmento de
// Volumen. Es el mejor argumento de venta que tiene la herramienta (el volumen que
// el vendedor acaba de cargar desbloqueó más descuento) y pasaba desapercibido: el
// nivel cambiaba de texto y nada más.
//
// Sólo festeja movimientos hacia arriba, y nunca en el montaje ni al abrir una
// cotización guardada. Para eso el llamador pasa `loadToken`: un contador que
// incrementa cada vez que carga datos en bloque. Cuando el token cambia, el hook
// adopta el nivel nuevo en silencio en lugar de leerlo como un ascenso. Se usa un
// token en vez de un flag booleano porque un flag puede quedar colgado si la carga
// no cambia el nivel, y se comería el siguiente ascenso real.
export function useTierUp(tierId, tiers, onUp, loadToken) {
	const prevRef = useRef(undefined);
	const tokenRef = useRef(loadToken);
	// El callback vive en un ref para que el efecto dependa del nivel y no de la
	// identidad de la función (que cambia en cada render del cotizador).
	const onUpRef = useRef(onUp);
	onUpRef.current = onUp;

	useEffect(function () {
		const list = Array.isArray(tiers) ? tiers : [];
		const idx = list.findIndex(function (t) { return t && t.id === tierId; });
		const prev = prevRef.current;
		const tokenChanged = tokenRef.current !== loadToken;

		prevRef.current = idx;
		tokenRef.current = loadToken;

		if (tokenChanged) return;               // carga en bloque: adoptar sin festejar
		if (prev === undefined || prev < 0 || idx < 0) return;
		if (idx > prev && onUpRef.current) onUpRef.current(list[idx], list[prev]);
	}, [tierId, tiers, loadToken]);
}
