// Estado comercial de una cotización/deal. Se guarda en deals.resumen.status
// (no requiere columna propia) y por defecto es "pendiente" para deals viejos
// que todavía no tienen el campo.
export const DEAL_STATUSES = ["pendiente", "confirmada", "rechazada"];

export const DEAL_STATUS_META = {
	pendiente:  { label: "Pendiente",  className: "bg-warning/10 text-warning border-warning/30" },
	confirmada: { label: "Confirmada", className: "bg-success/10 text-success border-success/30" },
	rechazada:  { label: "Rechazada",  className: "bg-destructive/10 text-destructive border-destructive/30" },
};

export function dealStatus(deal) {
	return (deal && deal.resumen && deal.resumen.status) || "pendiente";
}
