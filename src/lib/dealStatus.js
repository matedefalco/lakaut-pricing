// Estado comercial de una cotización/deal. Se guarda en deals.resumen.status
// (no requiere columna propia) y por defecto es "pendiente" para deals viejos
// que todavía no tienen el campo.
//
// Cada estado lleva icono y emoji además del color: los tres pills eran idénticos
// en forma y peso y solo cambiaba el tono, así que en una tabla larga había que leer
// la palabra. Con la forma diferenciada el estado se lee de un vistazo.
import { Clock3, CircleCheck, CircleX } from "lucide-react";

export const DEAL_STATUSES = ["pendiente", "confirmada", "rechazada"];

export const DEAL_STATUS_META = {
	pendiente: {
		label: "Pendiente",
		className: "bg-warning/10 text-warning border-warning/30",
		Icon: Clock3,
		emoji: "⏳",
	},
	confirmada: {
		label: "Confirmada",
		className: "bg-success/10 text-success border-success/30",
		Icon: CircleCheck,
		emoji: "✅",
	},
	rechazada: {
		label: "Rechazada",
		className: "bg-destructive/10 text-destructive border-destructive/30",
		Icon: CircleX,
		emoji: "🚫",
	},
};

// Vigencia de una propuesta: días corridos desde la emisión (deal.fecha). La usa el
// PDF ("válida hasta") y la navegación (aviso de cotizaciones por vencer).
export const VALIDEZ_DIAS = 15;
// Ventana del aviso: una pendiente entra en "por vencer" cuando le quedan estos días.
export const AVISO_VENCIMIENTO_DIAS = 5;

// Días que le quedan a la propuesta (0 = vence hoy, negativo = vencida). null sin fecha.
export function diasParaVencer(deal, now) {
	if (!deal || !deal.fecha) return null;
	const emitida = new Date(deal.fecha);
	if (isNaN(emitida.getTime())) return null;
	const vence = new Date(emitida.getTime() + VALIDEZ_DIAS * 86400000);
	return Math.floor((vence.getTime() - (now || Date.now())) / 86400000);
}

// Pendientes que vencen dentro de la ventana de aviso, la más urgente primero.
export function dealsPorVencer(deals, now) {
	return (deals || [])
		.filter(function (d) {
			if (dealStatus(d) !== "pendiente") return false;
			const dias = diasParaVencer(d, now);
			return dias != null && dias >= 0 && dias <= AVISO_VENCIMIENTO_DIAS;
		})
		.sort(function (a, b) { return diasParaVencer(a, now) - diasParaVencer(b, now); });
}

export function dealStatus(deal) {
	return (deal && deal.resumen && deal.resumen.status) || "pendiente";
}

export function dealStatusMeta(status) {
	return DEAL_STATUS_META[status] || DEAL_STATUS_META.pendiente;
}
