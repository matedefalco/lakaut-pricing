// Definiciones del glosario de la Introducción (ver Glossary.jsx).
export const GLOSSARY = {
	idc: { term: "IDC", def: "Identidad Digital Certificada: lo que vende el canal IDC. Incluye validación biométrica, emisión del certificado y custodia. Las firmas se cobran aparte, por unidad." },
	bienvenida: { term: "Firmas de bienvenida", def: "Firmas que se bonifican en cada cotización IDC, en total y no por certificado (3 por defecto), para que la persona firme su primer documento sin costo." },
	segmento: { term: "Segmento", def: "Tramo de volumen que define el precio (IDC) o el descuento (Volumen). Se asigna por el mayor entre la cantidad y la facturación." },
	nivel: { term: "Nivel", def: "Tramo de un distribuidor (Azul → Platinum). Define el descuento sobre la firma, según su facturación o sus certificados activos." },
	markup: { term: "Markup", def: "Precio ÷ costo variable. Es el guardarraíl de rentabilidad: debajo del mínimo, el cotizador no deja guardar ni exportar." },
	precioBase: { term: "Precio base", def: "Precio de lista antes de cualquier descuento. La facturación que asigna el nivel se mide siempre a este precio, para no depender del propio descuento." },
	compromiso: { term: "Compromiso anual", def: "El cliente se compromete a un consumo durante el año. La facturación se anualiza (× 12) y eso puede subirlo de segmento o de nivel." },
	fee: { term: "Fee de implementación", def: "Pago único por la integración vía SDK. Es configurable y bonificable a criterio comercial." },
	sla: { term: "SLA", def: "Nivel de servicio comprometido (disponibilidad y soporte). Se cotiza como plan mensual en las integraciones." },
	palancas: { term: "Palancas comerciales", def: "Descuentos adicionales por condiciones (días de pago, duración, velocidad de cierre). Se ofrecen en la propuesta y tienen un tope." },
	bonificado: { term: "Bonificado", def: "Se entrega sin cargo. En Distribuidores el certificado va siempre bonificado: solo se cobran las firmas." },
	version: { term: "Versión", def: "Cada vez que guardás sobre una cotización existente se crea una versión nueva (v2, v3…). La anterior no se pisa." },
	tarifaUnica: { term: "Tarifa única", def: "El descuento del tramo alcanzado se aplica a TODO el volumen, no por porciones." },
};
