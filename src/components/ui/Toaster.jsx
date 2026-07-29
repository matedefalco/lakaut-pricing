import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { Check, AlertCircle, Info, X, FileText, ArrowRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Sistema de toasts global ───────────────────────────────────────────────
// Notificación flotante reutilizable (guardado, errores, export, etc.). Se monta
// una vez desde <ToastProvider> y se dispara desde cualquier lado con useToast().
//
//   const { toast } = useToast();
//   toast({ variant: "success", title: "Listo", description: "…",
//           actions: [{ label: "Ver", onClick: fn, icon: ArrowRight }] });
//
// Comportamiento: se cierra sola a los `duration` ms (default 6000; 0 = persiste)
// y pausa el temporizador mientras el mouse está encima, para no perderla al leer.

const ToastContext = createContext(null);

const VARIANT_META = {
	success: { Icon: Check,       ring: "border-[var(--success)]/40", chip: "bg-[var(--success)]" },
	error:   { Icon: AlertCircle, ring: "border-destructive/40",      chip: "bg-destructive" },
	info:    { Icon: Info,        ring: "border-primary/40",          chip: "bg-primary" },
	// "tier" se usa cuando la cotización sube de nivel: el chip lleva el emoji del
	// material en vez de un icono, así el toast se reconoce como logro y no como
	// confirmación de sistema.
	tier:    { Icon: Trophy,      ring: "border-primary/40",          chip: "bg-primary" },
};

let idSeq = 0;

export function ToastProvider({ children }) {
	const [toasts, setToasts] = useState([]);

	const dismiss = useCallback(function (id) {
		setToasts(function (prev) { return prev.filter(function (t) { return t.id !== id; }); });
	}, []);

	const toast = useCallback(function (opts) {
		const id = ++idSeq;
		const t = Object.assign({ id: id, variant: "success", duration: 6000 }, opts);
		setToasts(function (prev) { return prev.concat(t); });
		return id;
	}, []);

	return (
		<ToastContext.Provider value={{ toast: toast, dismiss: dismiss }}>
			{children}
			<ToastViewport toasts={toasts} onDismiss={dismiss} />
		</ToastContext.Provider>
	);
}

export function useToast() {
	const ctx = useContext(ToastContext);
	if (!ctx) throw new Error("useToast must be used within ToastProvider");
	return ctx;
}

// Helper: toast de "cotización guardada", compartido por los canales cotizables
// para que el copy y las acciones sean idénticos en los tres.
export function notifyQuoteSaved(toast, opts) {
	opts = opts || {};
	toast({
		variant: "success",
		title: opts.clientName ? "Cotización guardada · " + opts.clientName : "Cotización guardada",
		description: "Ya quedó sincronizada con el equipo.",
		actions: [
			{ label: "Exportar propuesta", icon: FileText, onClick: opts.onExport },
			{ label: "Ver en Cotizaciones", icon: ArrowRight, iconPosition: "right", variant: "outline", onClick: opts.onGoHistorial },
		],
	});
}

// Helper: la propuesta se exportó. Exportar es el acto que cierra el trabajo del
// vendedor y hasta acá no tenía ninguna respuesta: se abría la ventana del PDF y la
// app no se enteraba. Nombra el cliente, el canal y el ID para que quede registro
// de qué se mandó.
export function notifyQuoteExported(toast, opts) {
	opts = opts || {};
	const parts = [];
	if (opts.channelLabel) parts.push(opts.channelLabel);
	if (opts.cotId) parts.push(opts.cotId);
	toast({
		variant: "success",
		emoji: "📄",
		title: opts.clientName ? "Propuesta lista · " + opts.clientName : "Propuesta lista",
		description: (parts.length ? parts.join(" · ") + ". " : "") + "Se abrió en una pestaña nueva para guardarla como PDF.",
		actions: opts.onGoHistorial
			? [{ label: "Ver en Cotizaciones", icon: ArrowRight, iconPosition: "right", variant: "outline", onClick: opts.onGoHistorial }]
			: null,
	});
}

// Helper: la cotización subió de nivel / segmento. Es el mejor argumento de venta
// que tiene la herramienta (el volumen cargado desbloqueó más descuento) y pasaba
// desapercibido: el nivel cambiaba de texto y nada más.
export function notifyTierUp(toast, opts) {
	opts = opts || {};
	toast({
		variant: "tier",
		emoji: opts.emoji,
		chipStyle: opts.material ? { background: opts.material.solid } : null,
		duration: 5000,
		title: "Subió a " + opts.label,
		description: opts.discountPct != null
			? "El volumen cargado desbloquea " + opts.discountPct + "% de descuento. Usalo para cerrar."
			: "El volumen cargado desbloquea un descuento mayor.",
	});
}

function ToastViewport({ toasts, onDismiss }) {
	return (
		<div className="no-print pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2.5">
			{toasts.map(function (t) {
				return <ToastItem key={t.id} t={t} onDismiss={onDismiss} />;
			})}
		</div>
	);
}

function ToastItem({ t, onDismiss }) {
	const meta = VARIANT_META[t.variant] || VARIANT_META.success;
	const Icon = meta.Icon;
	const duration = t.duration == null ? 6000 : t.duration;

	// Temporizador con pausa on-hover: guardamos cuánto falta y reiniciamos el
	// setTimeout al entrar/salir el mouse.
	const remainingRef = useRef(duration);
	const startRef = useRef(0);
	const timerRef = useRef(null);

	const clearTimer = useCallback(function () {
		if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
	}, []);

	const resume = useCallback(function () {
		if (duration <= 0) return;
		clearTimer();
		startRef.current = Date.now();
		timerRef.current = setTimeout(function () { onDismiss(t.id); }, remainingRef.current);
	}, [duration, onDismiss, t.id, clearTimer]);

	const pause = useCallback(function () {
		if (duration <= 0) return;
		clearTimer();
		remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startRef.current));
	}, [duration, clearTimer]);

	useEffect(function () {
		resume();
		return clearTimer;
	}, [resume, clearTimer]);

	function runAction(action) {
		onDismiss(t.id);
		if (action.onClick) action.onClick();
	}

	return (
		<div
			onMouseEnter={pause}
			onMouseLeave={resume}
			className={cn(
				"glass-strong shadow-float pointer-events-auto rounded-2xl border p-4",
				"animate-in fade-in slide-in-from-bottom-4 duration-300",
				meta.ring
			)}
		>
			<div className="flex items-start gap-3">
				<span
					className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-white", !t.chipStyle && meta.chip)}
					style={t.chipStyle}
				>
					{t.emoji ? <span className="text-sm leading-none">{t.emoji}</span> : <Icon className="size-4" />}
				</span>
				<div className="min-w-0 flex-1">
					{t.title && <p className="text-sm font-semibold text-foreground">{t.title}</p>}
					{t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
					{t.actions && t.actions.length > 0 && (
						<div className="mt-3 flex flex-wrap gap-2">
							{t.actions.map(function (a, i) {
								const ActionIcon = a.icon;
								return (
									<Button
										key={i}
										size="sm"
										variant={a.variant || (i === 0 ? "default" : "outline")}
										onClick={function () { runAction(a); }}
									>
										{ActionIcon && a.iconPosition !== "right" && <ActionIcon className="mr-1.5 size-4" />}
										{a.label}
										{ActionIcon && a.iconPosition === "right" && <ActionIcon className="ml-1.5 size-4" />}
									</Button>
								);
							})}
						</div>
					)}
				</div>
				<button
					onClick={function () { onDismiss(t.id); }}
					className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
					title="Cerrar"
				>
					<X className="size-4" />
				</button>
			</div>
		</div>
	);
}
