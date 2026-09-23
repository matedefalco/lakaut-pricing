import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

// Confirmación de acciones destructivas. La app usaba `window.confirm` en cinco
// lugares, conviviendo con su propio sistema de toasts: el diálogo del navegador
// no toma el tema, no se puede escribir ("¿Borrar la cotización de X?" quedaba
// pegado al chrome del browser) y en algunos navegadores se puede suprimir, con
// lo cual la acción destructiva pasaba a ejecutarse sin confirmar.
//
// Uso:  const confirm = useConfirm();
//       if (await confirm({ title, description, confirmLabel })) { ... }

const ConfirmContext = createContext(null);

export function useConfirm() {
	const ctx = useContext(ConfirmContext);
	if (!ctx) throw new Error("useConfirm necesita estar dentro de <ConfirmProvider>");
	return ctx;
}

export function ConfirmProvider({ children }) {
	const [state, setState] = useState(null);
	const resolveRef = useRef(null);
	const confirmBtnRef = useRef(null);

	const confirm = useCallback(function (opts) {
		return new Promise(function (resolve) {
			resolveRef.current = resolve;
			setState(Object.assign({ confirmLabel: "Eliminar", cancelLabel: "Cancelar", tone: "destructive" }, opts));
		});
	}, []);

	function close(result) {
		if (resolveRef.current) resolveRef.current(result);
		resolveRef.current = null;
		setState(null);
	}

	// Escape cancela y el foco arranca en el botón de confirmar, así se puede
	// resolver entero con teclado.
	useEffect(function () {
		if (!state) return;
		function onKey(e) { if (e.key === "Escape") close(false); }
		document.addEventListener("keydown", onKey);
		if (confirmBtnRef.current) confirmBtnRef.current.focus();
		return function () { document.removeEventListener("keydown", onKey); };
	}, [state]);

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{state && (
				<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
					<div
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="confirm-title"
						aria-describedby={state.description ? "confirm-desc" : undefined}
						className="glass-strong shadow-float w-full max-w-[400px] rounded-2xl border border-[var(--glass-border)] p-5"
					>
						<h2 id="confirm-title" className="font-heading text-base font-semibold text-foreground">
							{state.title}
						</h2>
						{state.description && (
							<p id="confirm-desc" className="mt-2 text-sm text-muted-foreground">
								{state.description}
							</p>
						)}
						<div className="mt-5 flex justify-end gap-2">
							<Button variant="outline" onClick={function () { close(false); }}>
								{state.cancelLabel}
							</Button>
							<Button
								ref={confirmBtnRef}
								variant={state.tone === "destructive" ? "destructive" : "default"}
								onClick={function () { close(true); }}
							>
								{state.confirmLabel}
							</Button>
						</div>
					</div>
				</div>
			)}
		</ConfirmContext.Provider>
	);
}
