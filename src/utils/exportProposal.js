import { WEB_PRODUCTS, B2B2C_API_TIERS, SLA_PLANS, DISTRIBUTOR_TIERS } from "@/data/channels";

// ─── Paleta ───────────────────────────────────────────────────────────────────
const C = {
	blue: "#3535D5",
	blueDark: "#1E2299",
	blueLight: "#EEF0FB",
	gray: "#5A6178",
	dark: "#1C1F35",
	border: "#DDE1F0",
	white: "#FFFFFF",
	bg: "#F6F7FB",
	red: "#DC2626",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fm(v, currency, tc) {
	if (v == null || isNaN(v)) return "—";
	if (currency === "ARS") {
		return "$ " + (v * tc).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	}
	return "USD " + v.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fd(iso) {
	if (!iso) return "";
	try { return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }); }
	catch (e) { return ""; }
}

function row(k, v) {
	return `<tr><td style="color:${C.gray};font-size:8.5pt;padding:4px 8px;border:1px solid ${C.border};width:46%;">${k}</td><td style="font-weight:600;font-size:8.5pt;padding:4px 8px;border:1px solid ${C.border};">${v}</td></tr>`;
}

function badges(labels) {
	return labels.map(function (l) {
		return `<div style="flex:1;text-align:center;background:${C.blueLight};border-radius:5px;padding:3.5mm 2mm;"><div style="font-size:7.5pt;font-weight:700;color:${C.blue};">${l}</div></div>`;
	}).join("");
}

function logoFID() {
	return `<div style="flex-shrink:0;text-align:right;">
		<span style="font-size:12pt;font-weight:800;color:${C.blue};letter-spacing:-0.5px;">FID</span>
		<span style="font-size:6.5pt;color:${C.gray};margin-left:3px;display:block;">by Lakaut</span>
	</div>`;
}

function bottomBar() {
	return `<div style="height:3mm;background:${C.blue};flex-shrink:0;"></div>`;
}
function topBar() {
	return `<div style="height:2.5mm;background:${C.blue};flex-shrink:0;"></div>`;
}

// ─── Slide 1: Portada ─────────────────────────────────────────────────────────
function slideCover(clientName, fecha) {
	return `<div class="slide" style="background:linear-gradient(135deg,#3535D5 0%,#1E2299 55%,#2A1E8F 100%);display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-35mm;right:-15mm;width:110mm;height:110mm;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
  <div style="position:absolute;bottom:-25mm;right:25mm;width:75mm;height:75mm;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
  <div style="flex:1;display:flex;align-items:center;padding:14mm 20mm;">
    <div>
      <div style="font-size:26pt;font-weight:700;color:white;line-height:1.2;margin-bottom:4mm;">Propuesta Comercial</div>
      <div style="font-size:20pt;font-weight:400;color:rgba(255,255,255,0.88);">${clientName}</div>
      ${fecha ? `<div style="margin-top:8mm;font-size:9pt;color:rgba(255,255,255,0.5);">${fd(fecha)}</div>` : ""}
    </div>
  </div>
  <div style="padding:5mm 20mm;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.12);">
    <div style="display:flex;align-items:baseline;gap:5px;">
      <span style="font-size:16pt;font-weight:800;color:white;letter-spacing:-0.5px;">FID</span>
      <span style="font-size:7.5pt;color:rgba(255,255,255,0.6);">by Lakaut</span>
    </div>
    <div style="font-size:9pt;color:rgba(255,255,255,0.72);border-left:2px solid rgba(255,255,255,0.22);padding-left:10px;">Operaciones seguras y eficientes en la nube</div>
  </div>
</div>`;
}

// ─── Slide 2: Producto ────────────────────────────────────────────────────────
function slideProducto(clientName, casosDeUso) {
	const casos = casosDeUso || "Recibos, contratos y documentos legales";
	const funcionalidades = [
		"Habilitación de firma digital sin fricción, con validez legal plena y a escala",
		"Onboarding 100% remoto",
		"Certificado digital en tiempo real (persona física)",
		"Firma embebida en el flujo de " + clientName,
		"Auditoría y evidencia legal por cada documento firmado",
	];
	return `<div class="slide" style="background:${C.bg};display:flex;flex-direction:column;">
  ${topBar()}
  <div style="flex:1;padding:8mm 16mm;display:grid;grid-template-columns:1fr 1fr;gap:14mm;min-height:0;">
    <div style="display:flex;flex-direction:column;gap:5mm;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <h1 style="font-size:16pt;font-weight:700;color:${C.blue};line-height:1.25;">Firma Digital<br>en ${clientName}</h1>
        ${logoFID()}
      </div>
      <div>
        <div style="font-size:7.5pt;font-weight:700;color:${C.dark};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3mm;">Integración de Firma Digital</div>
        <div style="display:flex;flex-direction:column;gap:2mm;">
          <div style="font-size:9pt;color:${C.gray};">• Firma Digital con validez legal (Ley 25.506)</div>
          <div style="font-size:9pt;color:${C.gray};">• Integración vía API en los flujos del cliente</div>
          <div style="font-size:9pt;color:${C.gray};">• Casos de uso: ${casos}</div>
        </div>
      </div>
      <div style="margin-top:auto;border:1.5px solid ${C.blue};border-radius:6px;padding:4mm 6mm;">
        <div style="font-size:8.5pt;font-style:italic;color:${C.dark};text-align:center;">"El usuario siempre permanece dentro del flujo de ${clientName}"</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4mm;">
      <div style="font-size:7.5pt;font-weight:700;color:${C.dark};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:1mm;">Funcionalidades</div>
      <div style="display:flex;flex-direction:column;gap:2.5mm;">
        ${funcionalidades.map(function (f) { return `<div style="font-size:9pt;color:${C.gray};">• ${f}</div>`; }).join("")}
      </div>
      <div style="display:flex;gap:3mm;margin-top:auto;">${badges(["100% Remoto", "Embebido", "Validez Legal"])}</div>
    </div>
  </div>
  ${bottomBar()}
</div>`;
}

// ─── Slide 3: Fases (B2B2C) ───────────────────────────────────────────────────
function slideFases() {
	const f1 = [
		"La empresa inicia el proceso e invita al usuario a solicitar su certificado",
		"El usuario completa su onboarding vía FID by Lakaut",
		"Validación de identidad: biometría facial + prueba de vida activa",
		"FID by Lakaut emite el certificado: el usuario queda habilitado para firmar",
	];
	const f2 = [
		"La empresa genera el documento a firmar (recibo, contrato u otro)",
		"FID by Lakaut verifica la identidad del firmante con su certificado vigente",
		"El usuario firma desde cualquier dispositivo",
		"FID by Lakaut genera evidencia inmutable",
	];
	function step(i, text) {
		return `<div style="display:flex;gap:3.5mm;align-items:flex-start;">
      <span style="color:${C.blue};font-weight:700;font-size:9pt;flex-shrink:0;min-width:5mm;">${i}.</span>
      <span style="font-size:9pt;color:${C.gray};">${text}</span>
    </div>`;
	}
	return `<div class="slide" style="background:white;display:flex;flex-direction:column;">
  ${topBar()}
  <div style="flex:1;padding:8mm 16mm;display:flex;flex-direction:column;gap:5mm;min-height:0;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h1 style="font-size:16pt;font-weight:700;color:${C.blue};">Fases de integración</h1>
      ${logoFID()}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14mm;flex:1;">
      <div>
        <div style="font-size:7.5pt;font-weight:700;color:${C.dark};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2mm;">Fase I — Onboarding (una sola vez)</div>
        <div style="height:1px;background:${C.border};margin-bottom:3mm;"></div>
        <div style="display:flex;flex-direction:column;gap:2.5mm;">
          ${f1.map(function (s, i) { return step(i + 1, s); }).join("")}
        </div>
      </div>
      <div>
        <div style="font-size:7.5pt;font-weight:700;color:${C.dark};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2mm;">Fase II — Firma (cada vez que sea requerida)</div>
        <div style="height:1px;background:${C.border};margin-bottom:3mm;"></div>
        <div style="display:flex;flex-direction:column;gap:2.5mm;">
          ${f2.map(function (s, i) { return step(i + 5, s); }).join("")}
        </div>
        <div style="display:flex;gap:3mm;margin-top:6mm;">${badges(["100% Remoto", "Embebido", "Validez Legal"])}</div>
      </div>
    </div>
  </div>
  ${bottomBar()}
</div>`;
}

// ─── Slide 4a: Modelo Comercial B2B2C ────────────────────────────────────────
function slideModeloB2B2C(deal, currency, tc) {
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

	const slaText = sla.precioMes ? sla.label + " · " + fm(sla.precioMes, currency, tc) + "/mes" : sla.label + " · incluido";

	const detalleRows = [
		["Modalidad", esUnica ? "Adquisición única" : "Recurrente mensual"],
		[esUnica ? "Total IDC" : "IDC por mes", idcMensuales.toLocaleString("es-AR")],
		["Tipo de integración API", api.label],
		["Fee de implementación", fm(fee, currency, tc) + " · única vez"],
		["Plan de soporte / SLA", slaText],
		["Firmas incluidas por IDC", firmasIncl.toString()],
		...(firmasAdic > 0 ? [["Firmas adicionales por IDC", firmasAdic + " · " + fm(precioFirmaAdic, currency, tc) + " c/u"]] : []),
	];

	return `<div class="slide" style="background:${C.bg};display:flex;flex-direction:column;">
  ${topBar()}
  <div style="flex:1;padding:8mm 16mm;display:flex;flex-direction:column;gap:5mm;min-height:0;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <h1 style="font-size:16pt;font-weight:700;color:${C.blue};">Modelo Comercial</h1>
        <div style="font-size:8.5pt;color:${C.gray};font-style:italic;margin-top:1mm;">${esUnica ? "Adquisición única de " + idcMensuales.toLocaleString("es-AR") + " IDC" : idcMensuales.toLocaleString("es-AR") + " IDC / mes · recurrente"}</div>
      </div>
      ${logoFID()}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14mm;flex:1;">
      <div>
        <div style="font-size:7.5pt;font-weight:700;color:${C.dark};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2mm;">Detalle de la propuesta</div>
        <table style="width:100%;border-collapse:collapse;">
          ${detalleRows.map(function (r) { return row(r[0], r[1]); }).join("")}
        </table>
      </div>
      <div style="display:flex;flex-direction:column;gap:3mm;">
        <div style="background:${C.blue};border-radius:8px;padding:5mm 6mm;">
          <div style="font-size:7.5pt;color:rgba(255,255,255,0.65);margin-bottom:1.5mm;">Precio por IDC</div>
          <div style="font-size:20pt;font-weight:700;color:white;">${fm(precioIDC, currency, tc)}</div>
          <div style="font-size:7.5pt;color:rgba(255,255,255,0.65);margin-top:1mm;">${firmasIncl} firma${firmasIncl !== 1 ? "s" : ""} incluida${firmasIncl !== 1 ? "s" : ""} por IDC</div>
        </div>
        ${esUnica ? `
        <div style="background:white;border:1px solid ${C.border};border-radius:7px;padding:4mm 6mm;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:8pt;color:${C.gray};">Total única vez</div>
          <div style="font-size:13pt;font-weight:700;color:${C.dark};">${fm(revMesTotal, currency, tc)}</div>
        </div>` : `
        <div style="background:white;border:1px solid ${C.border};border-radius:7px;padding:4mm 6mm;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:8pt;color:${C.gray};">Revenue mensual</div>
          <div style="font-size:13pt;font-weight:700;color:${C.dark};">${fm(revMesTotal, currency, tc)}<span style="font-size:8pt;font-weight:400;color:${C.gray};">/mes</span></div>
        </div>
        <div style="background:white;border:1px solid ${C.border};border-radius:7px;padding:4mm 6mm;display:flex;justify-content:space-between;align-items:center;">
          <div style="font-size:8pt;color:${C.gray};">Revenue año 1 (incl. fee)</div>
          <div style="font-size:13pt;font-weight:700;color:${C.dark};">${fm(revAnual, currency, tc)}</div>
        </div>`}
        ${fee > 0 ? `<div style="font-size:7.5pt;color:${C.gray};font-style:italic;">* Fee ${fm(fee, currency, tc)} facturado una única vez al inicio</div>` : ""}
      </div>
    </div>
    <div style="font-size:7.5pt;color:${C.gray};font-style:italic;border-top:1px solid ${C.border};padding-top:3mm;">
      → La modalidad de pago estará sujeta a la constitución de un seguro de caución a satisfacción de Lakaut S.A.
    </div>
  </div>
  ${bottomBar()}
</div>`;
}

// ─── Slide 4b: Modelo Comercial Distribuidores ────────────────────────────────
function slideModeloDist(deal, currency, tc) {
	const inp = deal.inputs || {};
	const res = deal.resumen || {};

	const qtys = inp.qtys || {};
	const firmasAdic = Number(inp.firmasAdic) || 0;
	const precioFirmaUSD = Number(inp.precioFirmaUSD) || 0;

	const packRows = WEB_PRODUCTS
		.filter(function (p) { return p.precioARS != null && (Number(qtys[p.id]) || 0) > 0; })
		.map(function (p) {
			const q = Number(qtys[p.id]);
			const unitUSD = p.precioARS / tc;
			return { label: p.label, qty: q, unitUSD: unitUSD, totalUSD: q * unitUSD };
		});

	const tierRecord = DISTRIBUTOR_TIERS.find(function (t) { return t.label === res.tier; });
	const descuentoPct = tierRecord ? (tierRecord.descuento * 100).toFixed(0) : "—";
	const facturacionLista = res.facturacionLista || 0;
	const netoLakaut = res.netoLakaut || 0;
	const descuentoMonto = facturacionLista - netoLakaut;

	return `<div class="slide" style="background:${C.bg};display:flex;flex-direction:column;">
  ${topBar()}
  <div style="flex:1;padding:8mm 16mm;display:flex;flex-direction:column;gap:4mm;min-height:0;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <h1 style="font-size:16pt;font-weight:700;color:${C.blue};">Modelo Comercial</h1>
        <div style="font-size:8.5pt;color:${C.gray};font-style:italic;margin-top:1mm;">Volumen anual comprometido · Nivel ${res.tier || "—"}</div>
      </div>
      ${logoFID()}
    </div>

    ${packRows.length > 0 ? `
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr>
          <th style="background:${C.blueLight};color:${C.dark};font-weight:600;text-align:left;padding:5px 8px;border:1px solid ${C.border};font-size:8pt;">Producto</th>
          <th style="background:${C.blueLight};color:${C.dark};font-weight:600;text-align:right;padding:5px 8px;border:1px solid ${C.border};font-size:8pt;">Precio lista</th>
          <th style="background:${C.blueLight};color:${C.dark};font-weight:600;text-align:right;padding:5px 8px;border:1px solid ${C.border};font-size:8pt;">Cant./año</th>
          <th style="background:${C.blueLight};color:${C.dark};font-weight:600;text-align:right;padding:5px 8px;border:1px solid ${C.border};font-size:8pt;">Total lista</th>
        </tr>
      </thead>
      <tbody>
        ${packRows.map(function (r) {
			return `<tr>
          <td style="font-weight:600;padding:5px 8px;border:1px solid ${C.border};font-size:9pt;">${r.label}</td>
          <td style="text-align:right;padding:5px 8px;border:1px solid ${C.border};font-size:9pt;">${fm(r.unitUSD, currency, tc)}</td>
          <td style="text-align:right;padding:5px 8px;border:1px solid ${C.border};font-size:9pt;">${r.qty.toLocaleString("es-AR")}</td>
          <td style="text-align:right;font-weight:600;padding:5px 8px;border:1px solid ${C.border};font-size:9pt;">${fm(r.totalUSD, currency, tc)}</td>
        </tr>`;
		}).join("")}
        ${firmasAdic > 0 ? `<tr>
          <td style="color:${C.gray};padding:5px 8px;border:1px solid ${C.border};font-size:9pt;">Firmas adicionales / año</td>
          <td style="text-align:right;padding:5px 8px;border:1px solid ${C.border};font-size:9pt;">${fm(precioFirmaUSD, currency, tc)}</td>
          <td style="text-align:right;padding:5px 8px;border:1px solid ${C.border};font-size:9pt;">${firmasAdic.toLocaleString("es-AR")}</td>
          <td style="text-align:right;font-weight:600;padding:5px 8px;border:1px solid ${C.border};font-size:9pt;">${fm(firmasAdic * precioFirmaUSD, currency, tc)}</td>
        </tr>` : ""}
        <tr>
          <td colspan="3" style="font-weight:700;padding:5px 8px;border:1px solid ${C.border};background:${C.blueLight};font-size:9pt;">Total facturación a lista</td>
          <td style="text-align:right;font-weight:700;padding:5px 8px;border:1px solid ${C.border};background:${C.blueLight};font-size:9pt;">${fm(facturacionLista, currency, tc)}</td>
        </tr>
      </tbody>
    </table>` : `<div style="font-size:9pt;color:${C.gray};">Sin productos cargados</div>`}

    <div style="display:flex;gap:3mm;margin-top:auto;">
      <div style="flex:2;background:white;border:1px solid ${C.border};border-radius:7px;padding:4mm 5mm;">
        <div style="font-size:7.5pt;color:${C.gray};margin-bottom:1.5mm;">Nivel alcanzado</div>
        <div style="font-size:13pt;font-weight:700;color:${C.dark};">${res.tier || "—"}</div>
        <div style="font-size:7.5pt;color:${C.gray};margin-top:1mm;">Descuento sobre lista: ${descuentoPct}%</div>
      </div>
      <div style="flex:2;background:white;border:1px solid ${C.border};border-radius:7px;padding:4mm 5mm;">
        <div style="font-size:7.5pt;color:${C.gray};margin-bottom:1.5mm;">Descuento aplicado</div>
        <div style="font-size:13pt;font-weight:700;color:${C.red};">−${fm(descuentoMonto, currency, tc)}</div>
        <div style="font-size:7.5pt;color:${C.gray};margin-top:1mm;">${descuentoPct}% sobre precio de lista</div>
      </div>
      <div style="flex:3;background:${C.blue};border-radius:7px;padding:4mm 6mm;">
        <div style="font-size:7.5pt;color:rgba(255,255,255,0.65);margin-bottom:1.5mm;">Precio neto a pagar</div>
        <div style="font-size:15pt;font-weight:700;color:white;">${fm(netoLakaut, currency, tc)}</div>
        <div style="font-size:7.5pt;color:rgba(255,255,255,0.6);margin-top:1mm;">Compromiso anual</div>
      </div>
    </div>
    <div style="font-size:7.5pt;color:${C.gray};font-style:italic;border-top:1px solid ${C.border};padding-top:3mm;">
      → La modalidad de pago estará sujeta a la constitución de un seguro de caución a satisfacción de Lakaut S.A.
    </div>
  </div>
  ${bottomBar()}
</div>`;
}

// ─── Slide 5: Próximos Pasos ──────────────────────────────────────────────────
function slideProximosPasos() {
	const pasos = [
		"Revisión y firma del Contrato de Integración y sus Anexos",
		"Kick-off técnico con el equipo de desarrollo (SLAs, servicio técnico, etc.)",
		"Go-Live y pase a producción",
	];
	return `<div class="slide" style="background:white;display:flex;flex-direction:column;">
  ${topBar()}
  <div style="flex:1;padding:8mm 16mm;display:flex;flex-direction:column;gap:8mm;min-height:0;">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <h1 style="font-size:16pt;font-weight:700;color:${C.blue};">Próximos Pasos</h1>
      ${logoFID()}
    </div>
    <div style="display:flex;flex-direction:column;gap:6mm;flex:1;justify-content:center;">
      ${pasos.map(function (p, i) {
		return `<div style="display:flex;gap:5mm;align-items:flex-start;">
        <div style="width:7mm;height:7mm;border-radius:50%;background:${C.blue};color:white;font-size:10pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">${i + 1}</div>
        <div style="font-size:11pt;color:${C.dark};line-height:1.4;padding-top:0.5mm;">${p}</div>
      </div>`;
	}).join("")}
    </div>
  </div>
  ${bottomBar()}
</div>`;
}

// ─── Slide 6: Cierre ──────────────────────────────────────────────────────────
function slideCierre() {
	return `<div class="slide" style="background:linear-gradient(135deg,#3535D5 0%,#1E2299 55%,#2A1E8F 100%);display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;">
  <div style="position:absolute;top:-30mm;right:-10mm;width:90mm;height:90mm;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
  <div style="position:absolute;bottom:-20mm;left:40mm;width:60mm;height:60mm;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
  <div style="padding:10mm 20mm;">
    <div style="display:flex;align-items:baseline;gap:5px;">
      <span style="font-size:16pt;font-weight:800;color:white;letter-spacing:-0.5px;">FID</span>
      <span style="font-size:7.5pt;color:rgba(255,255,255,0.6);">by Lakaut</span>
    </div>
  </div>
  <div style="flex:1;display:flex;justify-content:space-between;align-items:flex-end;padding:0 20mm 14mm;">
    <div>
      <div style="font-size:13pt;font-weight:700;color:white;margin-bottom:3mm;">Mateo De Falco</div>
      <div style="height:1px;background:rgba(255,255,255,0.28);margin-bottom:3.5mm;width:45mm;"></div>
      <div style="font-size:9pt;color:rgba(255,255,255,0.78);">✉ mateodefalco@lakaut.com.ar</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:22pt;color:rgba(255,255,255,0.65);font-weight:300;">Muchas</div>
      <div style="font-size:28pt;font-weight:700;color:white;">Gracias!</div>
    </div>
  </div>
</div>`;
}

// ─── CSS global ───────────────────────────────────────────────────────────────
const CSS = `
@page { size: A4 landscape; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 297mm; background: white; }
body { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; color: #1C1F35; }
.slide { width: 297mm; height: 210mm; overflow: hidden; position: relative; page-break-after: always; break-after: page; }
.slide:last-child { page-break-after: avoid; break-after: avoid; }
`;

// ─── Entry point ──────────────────────────────────────────────────────────────
function buildHTML(deal, client, currency, tc) {
	const clientName = (client && client.name) || deal.clientName || (deal.clients && deal.clients.name) || "Cliente";
	const ch = deal.channel;
	const casosDeUso = (deal.inputs && deal.inputs.casosDeUso) || "";

	const slides = [
		slideCover(clientName, deal.fecha),
		slideProducto(clientName, casosDeUso),
		...(ch === "b2b2c" ? [slideFases()] : []),
		ch === "b2b2c" ? slideModeloB2B2C(deal, currency, tc) : slideModeloDist(deal, currency, tc),
		slideProximosPasos(),
		slideCierre(),
	];

	return "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n<meta charset=\"UTF-8\">\n<title>Propuesta Comercial — " + clientName + "</title>\n<style>" + CSS + "</style>\n</head>\n<body>\n" + slides.join("\n") + "\n</body>\n</html>";
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
