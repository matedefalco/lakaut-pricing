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

export function dealStatus(deal) {
	return (deal && deal.resumen && deal.resumen.status) || "pendiente";
}

export function dealStatusMeta(status) {
	return DEAL_STATUS_META[status] || DEAL_STATUS_META.pendiente;
}
