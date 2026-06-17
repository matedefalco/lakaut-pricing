import { WEB_PRODUCTS, B2B2C_API_TIERS, SLA_PLANS, DISTRIBUTOR_TIERS } from "@/data/channels";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE      = "#3535D5";
const BLUE_DARK = "#1E2299";
const BLUE_MID  = "#2828B8";
const BLUE_BG   = "#EEF0FB";
const DARK      = "#1C1F35";
const GRAY      = "#5A6178";
const GRAY_LT   = "#8892A4";
const BORDER    = "#DDE1F0";
const WHITE     = "#FFFFFF";
const RED       = "#DC2626";
const GREEN     = "#15803D";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fm(v, currency, tc) {
	if (v == null || isNaN(v)) return "—";
	if (currency === "ARS") return "$ " + (v * tc).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	return "USD " + Number(v).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fd(iso) {
	try { return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }); }
	catch (e) { return ""; }
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@page { size: A4 portrait; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: ${DARK}; font-size: 10pt; line-height: 1.5; }
.page { width: 210mm; min-height: 297mm; page-break-after: always; break-after: page; overflow: hidden; }
.page:last-child { page-break-after: avoid; break-after: avoid; }
.cover { height: 297mm; display: flex; flex-direction: column; background: linear-gradient(155deg, ${BLUE} 0%, ${BLUE_DARK} 60%, #1A1680 100%); }
table { width: 100%; border-collapse: collapse; }
`;

// ─── Cover ────────────────────────────────────────────────────────────────────
function pageCover(clientName, fecha, canal) {
	const canalLabel = canal === "b2b2c" ? "B2B2C · Identidades Digitales" : "Canal Distribuidores";
	return `<div class="page cover">
  <!-- Circles deco -->
  <div style="position:absolute;top:-40mm;right:-20mm;width:120mm;height:120mm;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
  <div style="position:absolute;top:30mm;right:10mm;width:50mm;height:50mm;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
  <div style="position:absolute;bottom:-20mm;left:-10mm;width:80mm;height:80mm;border-radius:50%;background:rgba(255,255,255,0.04);"></div>

  <!-- Top: logo -->
  <div style="padding:12mm 14mm 0;">
    <div style="display:flex;align-items:baseline;gap:5px;">
      <span style="font-size:15pt;font-weight:800;color:white;letter-spacing:-0.5px;">FID</span>
      <span style="font-size:8pt;color:rgba(255,255,255,0.55);">by Lakaut</span>
    </div>
  </div>

  <!-- Center: título -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 14mm;">
    <div style="font-size:10pt;color:rgba(255,255,255,0.55);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5mm;">${canalLabel}</div>
    <div style="font-size:28pt;font-weight:700;color:white;line-height:1.15;margin-bottom:3mm;">Propuesta<br>Comercial</div>
    <div style="font-size:20pt;font-weight:400;color:rgba(255,255,255,0.85);">${clientName}</div>
  </div>

  <!-- Bottom: fecha + tagline -->
  <div style="padding:8mm 14mm;border-top:1px solid rgba(255,255,255,0.12);display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:8.5pt;color:rgba(255,255,255,0.5);">${fecha ? fd(fecha) : ""}</div>
    <div style="font-size:8.5pt;color:rgba(255,255,255,0.6);text-align:right;">Operaciones seguras y eficientes en la nube</div>
  </div>
</div>`;
}

// ─── Page header ──────────────────────────────────────────────────────────────
function pageHeader(clientName, fecha) {
	return `<div style="background:${BLUE};padding:5mm 14mm;display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:11pt;font-weight:700;color:white;">Propuesta Comercial · ${clientName}</div>
    ${fecha ? `<div style="font-size:7.5pt;color:rgba(255,255,255,0.55);margin-top:1px;">${fd(fecha)}</div>` : ""}
  </div>
  <div style="display:flex;align-items:baseline;gap:4px;">
    <span style="font-size:13pt;font-weight:800;color:white;letter-spacing:-0.5px;">FID</span>
    <span style="font-size:6.5pt;color:rgba(255,255,255,0.5);">by Lakaut</span>
  </div>
</div>`;
}

// ─── Section label ────────────────────────────────────────────────────────────
function sectionTitle(text) {
	return `<div style="display:flex;align-items:center;gap:3mm;margin-bottom:3mm;">
  <div style="width:3px;height:4mm;background:${BLUE};border-radius:2px;"></div>
  <div style="font-size:7pt;font-weight:700;color:${BLUE};text-transform:uppercase;letter-spacing:1px;">${text}</div>
</div>`;
}

// ─── Items table ──────────────────────────────────────────────────────────────
function itemRow(label, value, highlight) {
	const bg = highlight ? BLUE_BG : "white";
	const fontW = highlight ? "600" : "400";
	return `<tr style="background:${bg};">
  <td style="padding:4px 8px;border-bottom:1px solid ${BORDER};font-size:9pt;color:${GRAY};width:52%;">${label}</td>
  <td style="padding:4px 8px;border-bottom:1px solid ${BORDER};font-size:9pt;font-weight:${fontW};color:${DARK};">${value}</td>
</tr>`;
}

// ─── Summary box ──────────────────────────────────────────────────────────────
function summaryBox(items) {
	// items: [{label, value, big, color}]
	return `<div style="background:${BLUE};border-radius:8px;padding:5mm 6mm;display:flex;gap:0;margin-top:4mm;">
  ${items.map(function (item, i) {
		const border = i > 0 ? "border-left:1px solid rgba(255,255,255,0.2);" : "";
		const fs = item.big ? "14pt" : "11pt";
		return `<div style="flex:1;padding:0 ${i > 0 ? "5mm" : "2mm"} 0 ${i > 0 ? "5mm" : "0"};${border}">
      <div style="font-size:7pt;color:rgba(255,255,255,0.6);margin-bottom:1.5mm;text-transform:uppercase;letter-spacing:0.5px;">${item.label}</div>
      <div style="font-size:${fs};font-weight:700;color:white;line-height:1.2;">${item.value}</div>
      ${item.sub ? `<div style="font-size:7pt;color:rgba(255,255,255,0.55);margin-top:1.5mm;">${item.sub}</div>` : ""}
    </div>`;
	}).join("")}
</div>`;
}

// ─── Próximos pasos ───────────────────────────────────────────────────────────
function proximosPasos() {
	const steps = [
		"Revisión y firma del Contrato de Integración",
		"Kick-off técnico (SLAs, servicio técnico, etc.)",
		"Go-Live y pase a producción",
	];
	return `<div style="margin-top:6mm;">
  ${sectionTitle("Próximos Pasos")}
  <div style="display:flex;gap:4mm;">
    ${steps.map(function (s, i) {
		return `<div style="flex:1;background:${BLUE_BG};border-radius:6px;padding:4mm;">
        <div style="width:6mm;height:6mm;background:${BLUE};border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:2.5mm;">
          <span style="font-size:8pt;font-weight:700;color:white;">${i + 1}</span>
        </div>
        <div style="font-size:8.5pt;color:${DARK};line-height:1.4;">${s}</div>
      </div>`;
	}).join("")}
  </div>
</div>`;
}

// ─── Contacto footer ──────────────────────────────────────────────────────────
function contactoFooter() {
	return `<div style="margin-top:6mm;padding-top:4mm;border-top:1px solid ${BORDER};display:flex;justify-content:space-between;align-items:center;">
  <div>
    <div style="font-size:9.5pt;font-weight:700;color:${DARK};">Mateo De Falco</div>
    <div style="font-size:8pt;color:${GRAY};margin-top:1.5mm;">✉ mateodefalco@lakaut.com.ar · ☎ +54 11 3635-8577</div>
  </div>
  <div style="font-size:7pt;color:${GRAY_LT};text-align:right;font-style:italic;max-width:55mm;line-height:1.4;">La modalidad de pago estará sujeta a la constitución de un seguro de caución a satisfacción de Lakaut S.A.</div>
</div>`;
}

// ─── Pricing page B2B2C ───────────────────────────────────────────────────────
function pagePricingB2B2C(deal, clientName, currency, tc) {
	const inp = deal.inputs || {};
	const res = deal.resumen || {};

	const esUnica = inp.frecuencia === "unica";
	const api = B2B2C_API_TIERS.slice().reverse().find(function (t) { return (Number(inp.fee) || 0) >= t.feeMin; }) || B2B2C_API_TIERS[0];
	const sla = SLA_PLANS.find(function (s) { return s.id === inp.slaId; }) || SLA_PLANS[0];

	const idcMensuales = Number(inp.idcMensuales) || 0;
	const fee = Number(inp.fee) || 0;
	const firmasIncl = Number(inp.firmasInclPorIDC) || 0;
	const firmasAdic = Number(inp.firmasAdicPorIDC) || 0;
	const precioFirmaAdic = Number(inp.precioFirmaAdic) || 0;
	const precioIDC = res.precioIDC || 0;
	const revMesTotal = res.revMesTotal || 0;
	const revAnual = res.revAnual || 0;
	const casosDeUso = inp.casosDeUso || "";

	const slaText = sla.precioMes ? sla.label + " · " + fm(sla.precioMes, currency, tc) + "/mes" : sla.label + " · incluido";

	const summaryItems = esUnica
		? [
			{ label: "Precio por IDC", value: fm(precioIDC, currency, tc), big: true },
			{ label: "Total única vez", value: fm(revMesTotal, currency, tc), big: true },
		]
		: [
			{ label: "Precio por IDC", value: fm(precioIDC, currency, tc), big: true },
			{ label: "Revenue mensual", value: fm(revMesTotal, currency, tc), big: false, sub: "recurrente" },
			{ label: "Revenue año 1", value: fm(revAnual, currency, tc), big: false, sub: "incl. fee" },
		];

	return `<div class="page">
  ${pageHeader(clientName, deal.fecha)}
  <div style="padding:6mm 14mm 8mm;">
    ${casosDeUso ? `<div style="font-size:8.5pt;color:${GRAY};font-style:italic;margin-bottom:5mm;padding-bottom:4mm;border-bottom:1px solid ${BORDER};">Casos de uso: ${casosDeUso}</div>` : ""}

    ${sectionTitle("Detalle de la propuesta")}
    <table style="margin-bottom:2mm;">
      <tbody>
        ${itemRow("Modalidad", esUnica ? "Adquisición única" : "Recurrente mensual")}
        ${itemRow(esUnica ? "Total IDC" : "IDC por mes", idcMensuales.toLocaleString("es-AR"))}
        ${itemRow("Tipo de integración API", api.label)}
        ${itemRow("Fee de implementación", fm(fee, currency, tc) + " · una sola vez")}
        ${itemRow("Plan de soporte / SLA", slaText)}
        ${itemRow("Firmas incluidas por IDC", firmasIncl.toString())}
        ${firmasAdic > 0 ? itemRow("Firmas adicionales por IDC", firmasAdic + " · " + fm(precioFirmaAdic, currency, tc) + " c/u") : ""}
      </tbody>
    </table>

    ${summaryBox(summaryItems)}

    ${proximosPasos()}
    ${contactoFooter()}
  </div>
</div>`;
}

// ─── Pricing page Distribuidores ──────────────────────────────────────────────
function pagePricingDist(deal, clientName, currency, tc) {
	const inp = deal.inputs || {};
	const res = deal.resumen || {};

	const qtys = inp.qtys || {};
	const firmasAdic = Number(inp.firmasAdic) || 0;
	const precioFirmaUSD = Number(inp.precioFirmaUSD) || 0;

	const packRows = WEB_PRODUCTS.filter(function (p) {
		return p.precioARS != null && (Number(qtys[p.id]) || 0) > 0;
	}).map(function (p) {
		const q = Number(qtys[p.id]);
		const subtotalUSD = q * (p.precioARS / tc);
		return { label: p.label, qty: q, subtotalUSD: subtotalUSD };
	});

	const tierRecord = DISTRIBUTOR_TIERS.find(function (t) { return t.label === res.tier; });
	const descuentoPct = tierRecord ? (tierRecord.descuento * 100).toFixed(0) : "—";
	const facturacionLista = res.facturacionLista || 0;
	const netoLakaut = res.netoLakaut || 0;
	const descuentoMonto = facturacionLista - netoLakaut;
	const casosDeUso = inp.casosDeUso || "";

	return `<div class="page">
  ${pageHeader(clientName, deal.fecha)}
  <div style="padding:6mm 14mm 8mm;">
    ${casosDeUso ? `<div style="font-size:8.5pt;color:${GRAY};font-style:italic;margin-bottom:5mm;padding-bottom:4mm;border-bottom:1px solid ${BORDER};">Casos de uso: ${casosDeUso}</div>` : ""}

    ${sectionTitle("Volumen anual comprometido")}
    <table style="margin-bottom:2mm;">
      <thead>
        <tr style="background:${BLUE_BG};">
          <th style="padding:5px 8px;border-bottom:2px solid ${BORDER};font-size:8pt;font-weight:600;color:${DARK};text-align:left;width:55%;">Producto</th>
          <th style="padding:5px 8px;border-bottom:2px solid ${BORDER};font-size:8pt;font-weight:600;color:${DARK};text-align:right;">Cant./año</th>
          <th style="padding:5px 8px;border-bottom:2px solid ${BORDER};font-size:8pt;font-weight:600;color:${DARK};text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${packRows.map(function (r, i) {
		return `<tr style="background:${i % 2 === 1 ? BLUE_BG : "white"};">
          <td style="padding:5px 8px;border-bottom:1px solid ${BORDER};font-size:9pt;font-weight:600;">${r.label}</td>
          <td style="padding:5px 8px;border-bottom:1px solid ${BORDER};font-size:9pt;text-align:right;">${r.qty.toLocaleString("es-AR")}</td>
          <td style="padding:5px 8px;border-bottom:1px solid ${BORDER};font-size:9pt;text-align:right;font-weight:600;">${fm(r.subtotalUSD, currency, tc)}</td>
        </tr>`;
	}).join("")}
        ${firmasAdic > 0 ? `<tr style="background:white;">
          <td style="padding:5px 8px;border-bottom:1px solid ${BORDER};font-size:9pt;color:${GRAY};">Firmas adicionales / año</td>
          <td style="padding:5px 8px;border-bottom:1px solid ${BORDER};font-size:9pt;text-align:right;">${firmasAdic.toLocaleString("es-AR")}</td>
          <td style="padding:5px 8px;border-bottom:1px solid ${BORDER};font-size:9pt;text-align:right;font-weight:600;">${fm(firmasAdic * precioFirmaUSD, currency, tc)}</td>
        </tr>` : ""}
        <tr style="background:${BLUE_BG};">
          <td colspan="2" style="padding:5px 8px;font-size:9pt;font-weight:700;">Total facturación a lista</td>
          <td style="padding:5px 8px;font-size:9pt;font-weight:700;text-align:right;">${fm(facturacionLista, currency, tc)}</td>
        </tr>
      </tbody>
    </table>

    ${summaryBox([
		{ label: "Nivel alcanzado", value: res.tier || "—", big: false, sub: "Descuento " + descuentoPct + "% sobre lista" },
		{ label: "Descuento aplicado", value: "−" + fm(descuentoMonto, currency, tc), big: false, sub: descuentoPct + "% de " + fm(facturacionLista, currency, tc) },
		{ label: "Precio neto a pagar", value: fm(netoLakaut, currency, tc), big: true, sub: "Compromiso anual" },
	])}

    ${proximosPasos()}
    ${contactoFooter()}
  </div>
</div>`;
}

// ─── Entry point ──────────────────────────────────────────────────────────────
function buildHTML(deal, client, currency, tc) {
	const clientName = (client && client.name) || deal.clientName || (deal.clients && deal.clients.name) || "Cliente";
	const ch = deal.channel;

	const cover = pageCover(clientName, deal.fecha, ch);
	const pricing = ch === "b2b2c"
		? pagePricingB2B2C(deal, clientName, currency, tc)
		: pagePricingDist(deal, clientName, currency, tc);

	return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Propuesta Comercial — ${clientName}</title>
<style>${CSS}</style>
</head>
<body>
${cover}
${pricing}
</body>
</html>`;
}

export function exportProposal(deal, client, currency, tc) {
	const html = buildHTML(deal, client, currency, tc);
	const win = window.open("", "_blank");
	if (!win) { alert("Habilitá ventanas emergentes para exportar la propuesta."); return; }
	win.document.open();
	win.document.write(html);
	win.document.close();
	setTimeout(function () { win.print(); }, 400);
}
