import { WEB_PRODUCTS, B2B2C_API_TIERS, SLA_PLANS, DISTRIBUTOR_TIERS } from "@/data/channels";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const BLUE      = "#3535D5";
const BLUE_DK   = "#1E2299";
const BLUE_BG   = "#EEF0FB";
const DARK      = "#1C1F35";
const GRAY      = "#5A6178";
const BORDER    = "#DDE1F0";
const WHITE     = "#FFFFFF";

// ─── SVG icons (inline) ───────────────────────────────────────────────────────
const ic = {
	check:  function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`; },
	shield: function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`; },
	mobile: function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`; },
	code:   function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`; },
	clock:  function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`; },
	file:   function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`; },
	users:  function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`; },
	zap:    function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`; },
	mail:   function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`; },
	phone:  function(c, s) { return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`; },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fm(v, currency, tc) {
	if (v == null || isNaN(v)) return "—";
	if (currency === "ARS") return "$ " + (v * tc).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	return "USD " + Number(v).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fd(iso) {
	try { return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }); }
	catch (e) { return ""; }
}

// ─── Layout primitives ────────────────────────────────────────────────────────
// PPTX widescreen: 33.87cm × 19.05cm
function mkSlide(content, bg) {
	bg = bg || WHITE;
	return `<div style="width:33.87cm;height:19.05cm;overflow:hidden;position:relative;background:${bg};display:flex;flex-direction:column;">${content}</div>`;
}

// Blue sidebar (left) + main content area (right) — used in slides 2-4
function withSidebar(sideContent, mainContent) {
	return `<div style="display:flex;flex:1;overflow:hidden;">
  <div style="width:5.8cm;background:${BLUE};padding:0.8cm 0.7cm;display:flex;flex-direction:column;">${sideContent}</div>
  <div style="flex:1;padding:0.7cm 0.9cm;overflow:hidden;display:flex;flex-direction:column;">${mainContent}</div>
</div>`;
}

function slideFooter(pageNum) {
	return `<div style="padding:0.2cm 0.8cm;border-top:1px solid ${BORDER};display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
  <div style="display:flex;align-items:baseline;gap:4px;">
    <span style="font-size:10pt;font-weight:800;color:${BLUE};letter-spacing:-0.5px;">FID</span>
    <span style="font-size:7pt;color:${GRAY};">by Lakaut</span>
  </div>
  <div style="font-size:7pt;color:${GRAY};">0${pageNum}</div>
</div>`;
}

function sideLabel(num, title, sub) {
	return `<div style="font-size:7pt;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:1px;margin-bottom:0.2cm;">${num}</div>
<div style="font-size:14pt;font-weight:700;color:${WHITE};line-height:1.2;margin-bottom:0.4cm;">${title}</div>
<div style="width:1.8cm;height:2px;background:rgba(255,255,255,0.3);margin-bottom:0.4cm;"></div>
${sub ? `<div style="font-size:8pt;color:rgba(255,255,255,0.65);line-height:1.5;">${sub}</div>` : ""}`;
}

function sectionHeader(text) {
	return `<div style="font-size:6.5pt;font-weight:700;color:${BLUE};text-transform:uppercase;letter-spacing:1px;margin-bottom:0.25cm;">${text}</div>`;
}

// ─── SLIDE 1: COVER ───────────────────────────────────────────────────────────
function slideCover(clientName, fecha) {
	var badges = [
		{ text: "100% Remoto",        svg: ic.check(  "rgba(255,255,255,0.8)", 12) },
		{ text: "Firma embebida",      svg: ic.code(   "rgba(255,255,255,0.8)", 12) },
		{ text: "Validez legal plena", svg: ic.shield( "rgba(255,255,255,0.8)", 12) },
	];
	return mkSlide(`
  <div style="position:absolute;top:-4cm;right:-2cm;width:14cm;height:14cm;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
  <div style="position:absolute;top:2cm;right:4cm;width:5cm;height:5cm;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
  <div style="position:absolute;bottom:-3cm;right:0;width:10cm;height:10cm;border-radius:50%;background:rgba(255,255,255,0.03);"></div>

  <div style="flex:1;display:flex;flex-direction:column;padding:1cm 1.2cm;">
    <div style="display:flex;align-items:baseline;gap:5px;margin-bottom:1cm;">
      <span style="font-size:13pt;font-weight:800;color:${WHITE};letter-spacing:-0.5px;">FID</span>
      <span style="font-size:7.5pt;color:rgba(255,255,255,0.45);">by Lakaut</span>
    </div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:8.5pt;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:0.35cm;">Propuesta Comercial</div>
      <div style="font-size:40pt;font-weight:700;color:${WHITE};line-height:1.1;margin-bottom:0.4cm;letter-spacing:-0.5px;">${clientName}</div>
      <div style="font-size:10.5pt;color:rgba(255,255,255,0.7);max-width:16cm;line-height:1.55;margin-bottom:0.8cm;">Integración de firma digital con validez legal, embebida en tu flujo y 100% remota.</div>
      <div style="display:flex;gap:0.5cm;">
        ${badges.map(function(b) { return `<div style="display:flex;align-items:center;gap:0.2cm;background:rgba(255,255,255,0.11);padding:0.2cm 0.45cm;border-radius:20px;">${b.svg}<span style="font-size:8pt;color:${WHITE};font-weight:500;">${b.text}</span></div>`; }).join("")}
      </div>
    </div>
  </div>

  <div style="padding:0.3cm 1.2cm;border-top:1px solid rgba(255,255,255,0.12);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
    <div style="font-size:8pt;color:rgba(255,255,255,0.45);">${fecha ? fd(fecha) : ""}</div>
    <div style="font-size:7pt;color:rgba(255,255,255,0.35);">Autoridad Certificante Licenciada · Infraestructura de Firma Digital · Ley N° 25.506</div>
  </div>
`, `linear-gradient(145deg, ${BLUE} 0%, ${BLUE_DK} 55%, #14116B 100%)`);
}

// ─── SLIDE 2: INTEGRACIÓN DE FIRMA DIGITAL ────────────────────────────────────
function slideIntegracion(clientName) {
	var feats = [
		{ svg: ic.zap(WHITE, 16),    title: "Habilitación sin fricción",    desc: "Firma con validez legal plena, lista para operar a escala." },
		{ svg: ic.check(WHITE, 16),  title: "Onboarding 100% remoto",       desc: "Alta del usuario desde cualquier lugar, sin trámites presenciales." },
		{ svg: ic.mobile(WHITE, 16), title: "Certificado en tiempo real",   desc: "Certificado digital de persona física, emitido al instante." },
		{ svg: ic.code(WHITE, 16),   title: "Firma embebida en el flujo",   desc: "El usuario firma dentro de " + clientName + ", sin salir de la experiencia." },
		{ svg: ic.clock(WHITE, 16),  title: "Auditoría y evidencia legal",  desc: "Trazabilidad y respaldo legal por cada documento firmado." },
	];

	var sidebar = sideLabel("02", "Integración<br>de Firma<br>Digital", "Firma digital<br>en " + clientName);

	var main = `
  <div style="margin-bottom:0.45cm;">
    ${sectionHeader("Cómo se integra")}
    <div style="display:flex;flex-direction:column;gap:0.18cm;">
      ${["Firma con validez legal plena (Ley 25.506)", "Integración vía API en los flujos de " + clientName, "Recibos, contratos y documentos legales en cualquier proceso"].map(function(t) {
		return `<div style="display:flex;align-items:flex-start;gap:0.25cm;"><div style="width:5px;height:5px;border-radius:50%;background:${BLUE};margin-top:5px;flex-shrink:0;"></div><div style="font-size:9pt;color:${DARK};line-height:1.4;">${t}</div></div>`;
	}).join("")}
    </div>
  </div>
  <div style="flex:1;">
    ${sectionHeader("Funcionalidades")}
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0.4cm;">
      ${feats.map(function(f) {
		return `<div style="background:${BLUE_BG};border-radius:8px;padding:0.4cm;display:flex;flex-direction:column;gap:0.18cm;">
        <div style="width:1cm;height:1cm;background:${BLUE};border-radius:7px;display:flex;align-items:center;justify-content:center;margin-bottom:0.1cm;flex-shrink:0;">${f.svg}</div>
        <div style="font-size:8.5pt;font-weight:600;color:${DARK};line-height:1.3;">${f.title}</div>
        <div style="font-size:7.5pt;color:${GRAY};line-height:1.4;">${f.desc}</div>
      </div>`;
	}).join("")}
    </div>
  </div>
`;
	return mkSlide(withSidebar(sidebar, main) + slideFooter(2));
}

// ─── SLIDE 3: MODELO COMERCIAL — DISTRIBUIDORES ───────────────────────────────
function slideModeloDist(deal, clientName, currency, tc) {
	var inp = deal.inputs || {};
	var res = deal.resumen || {};
	var qtys = inp.qtys || {};
	var firmasAdic = Number(inp.firmasAdic) || 0;
	var precioFirmaUSD = Number(inp.precioFirmaUSD) || 0;

	var packRows = WEB_PRODUCTS.filter(function(p) {
		return p.precioARS != null && (Number(qtys[p.id]) || 0) > 0;
	}).map(function(p) {
		var q = Number(qtys[p.id]);
		var unitUSD = p.precioARS / tc;
		return { label: p.label, qty: q, unitUSD: unitUSD, subUSD: q * unitUSD };
	});

	var tierRecord = DISTRIBUTOR_TIERS.find(function(t) { return t.label === res.tier; });
	var descPct = tierRecord ? (tierRecord.descuento * 100).toFixed(0) : "—";
	var facLista = res.facturacionLista || 0;
	var neto = res.netoLakaut || 0;
	var descMonto = facLista - neto;
	var totalFirmas = packRows.reduce(function(s, r) { return s + r.qty; }, 0) + firmasAdic;
	var mainPack = packRows.reduce(function(best, r) { return (!best || r.subUSD > best.subUSD) ? r : best; }, null);

	var sidebar = sideLabel("03", "Modelo<br>Comercial", "Volumen anual<br>comprometido") +
		(res.tier ? `<div style="margin-top:auto;padding:0.3cm;background:rgba(255,255,255,0.1);border-radius:7px;"><div style="font-size:7pt;color:rgba(255,255,255,0.55);margin-bottom:2px;">Nivel</div><div style="font-size:12pt;font-weight:700;color:${WHITE};">${res.tier}</div><div style="font-size:7pt;color:rgba(255,255,255,0.6);margin-top:2px;">Descuento ${descPct}% sobre lista</div></div>` : "");

	var main = `
  <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:0.7cm;flex:1;overflow:hidden;">
    <div style="display:flex;flex-direction:column;gap:0.3cm;">
      ${sectionHeader("Detalle de facturación")}
      <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
        <thead>
          <tr style="background:${BLUE_BG};">
            <th style="padding:5px 6px;text-align:left;border-bottom:2px solid ${BORDER};color:${DARK};font-weight:600;">Producto</th>
            <th style="padding:5px 6px;text-align:right;border-bottom:2px solid ${BORDER};color:${DARK};font-weight:600;">P. Lista</th>
            <th style="padding:5px 6px;text-align:right;border-bottom:2px solid ${BORDER};color:${DARK};font-weight:600;">Cant./año</th>
            <th style="padding:5px 6px;text-align:right;border-bottom:2px solid ${BORDER};color:${DARK};font-weight:600;">Total lista</th>
          </tr>
        </thead>
        <tbody>
          ${packRows.map(function(r, i) {
		return `<tr style="background:${i % 2 === 1 ? BLUE_BG : WHITE};">
            <td style="padding:5px 6px;border-bottom:1px solid ${BORDER};color:${DARK};font-weight:500;">${r.label}</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;color:${GRAY};">${fm(r.unitUSD, currency, tc)}</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;color:${DARK};">${r.qty.toLocaleString("es-AR")}</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;color:${DARK};font-weight:600;">${fm(r.subUSD, currency, tc)}</td>
          </tr>`;
	}).join("")}
          ${firmasAdic > 0 ? `<tr><td style="padding:5px 6px;border-bottom:1px solid ${BORDER};color:${GRAY};">Firmas adicionales</td><td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;color:${GRAY};">${fm(precioFirmaUSD, currency, tc)}</td><td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;color:${DARK};">${firmasAdic.toLocaleString("es-AR")}</td><td style="padding:5px 6px;border-bottom:1px solid ${BORDER};text-align:right;color:${DARK};font-weight:600;">${fm(firmasAdic * precioFirmaUSD, currency, tc)}</td></tr>` : ""}
          <tr style="background:${BLUE_BG};">
            <td colspan="3" style="padding:5px 6px;font-weight:700;color:${DARK};">Total facturación a lista</td>
            <td style="padding:5px 6px;text-align:right;font-weight:700;color:${DARK};">${fm(facLista, currency, tc)}</td>
          </tr>
        </tbody>
      </table>
      ${mainPack ? `<div style="background:${BLUE};border-radius:8px;padding:0.3cm 0.5cm;"><div style="font-size:11pt;font-weight:700;color:${WHITE};">${mainPack.label}</div><div style="font-size:8pt;color:rgba(255,255,255,0.7);">${totalFirmas.toLocaleString("es-AR")} firmas / año</div></div>` : ""}
    </div>

    <div style="background:${BLUE_BG};border-radius:10px;padding:0.5cm;display:flex;flex-direction:column;">
      ${sectionHeader("Resumen")}
      <div style="margin-bottom:0.3cm;">
        <div style="font-size:8pt;color:${GRAY};margin-bottom:2px;">Nivel alcanzado</div>
        <div style="font-size:13pt;font-weight:700;color:${DARK};">${res.tier || "—"}</div>
      </div>
      <div style="border-top:1px solid ${BORDER};padding-top:0.2cm;margin-bottom:0.2cm;">
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:8.5pt;"><span style="color:${GRAY};">Total a lista</span><span style="color:${DARK};font-weight:500;">${fm(facLista, currency, tc)}</span></div>
        <div style="display:flex;justify-content:space-between;padding:3px 0;font-size:8.5pt;"><span style="color:${GRAY};">Descuento (${descPct}%)</span><span style="color:#DC2626;font-weight:500;">−${fm(descMonto, currency, tc)}</span></div>
      </div>
      <div style="border-top:2px solid ${BLUE};padding-top:0.3cm;margin-top:auto;">
        <div style="font-size:7.5pt;color:${BLUE};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:0.2cm;">Precio neto a pagar</div>
        <div style="font-size:24pt;font-weight:800;color:${BLUE};line-height:1;">${fm(neto, currency, tc)}</div>
        <div style="font-size:7.5pt;color:${GRAY};margin-top:0.2cm;">Compromiso anual · ahorro de ${fm(descMonto, currency, tc)} sobre lista.</div>
      </div>
      <div style="margin-top:0.35cm;padding-top:0.25cm;border-top:1px solid ${BORDER};font-size:6.5pt;color:${GRAY};line-height:1.4;font-style:italic;">La modalidad de pago estará sujeta a la constitución de un seguro de caución a satisfacción de Lakaut S.A.</div>
    </div>
  </div>
`;
	return mkSlide(withSidebar(sidebar, main) + slideFooter(3));
}

// ─── SLIDE 3: MODELO COMERCIAL — B2B2C ───────────────────────────────────────
function slideModeloB2B2C(deal, clientName, currency, tc) {
	var inp = deal.inputs || {};
	var res = deal.resumen || {};
	var esUnica = inp.frecuencia === "unica";
	var api = B2B2C_API_TIERS.slice().reverse().find(function(t) { return (Number(inp.fee) || 0) >= t.feeMin; }) || B2B2C_API_TIERS[0];
	var sla = SLA_PLANS.find(function(s) { return s.id === inp.slaId; }) || SLA_PLANS[0];
	var idcMensuales = Number(inp.idcMensuales) || 0;
	var fee = Number(inp.fee) || 0;
	var firmasIncl = Number(inp.firmasInclPorIDC) || 0;
	var firmasAdic = Number(inp.firmasAdicPorIDC) || 0;
	var precioFirmaAdic = Number(inp.precioFirmaAdic) || 0;
	var precioIDC = res.precioIDC || 0;
	var revMesTotal = res.revMesTotal || 0;
	var revAnual = res.revAnual || 0;
	var slaText = sla.precioMes ? (sla.label + " · " + fm(sla.precioMes, currency, tc) + "/mes") : (sla.label + " · incluido");

	var detailItems = [
		{ label: "Modalidad",                value: esUnica ? "Adquisición única" : "Recurrente mensual" },
		{ label: esUnica ? "Total IDC" : "IDC por mes", value: idcMensuales.toLocaleString("es-AR") },
		{ label: "Tipo de integración API",  value: api.label },
		{ label: "Fee de implementación",    value: fm(fee, currency, tc) + " · una sola vez" },
		{ label: "Plan de soporte / SLA",    value: slaText },
		{ label: "Firmas incluidas por IDC", value: firmasIncl.toString() },
	];
	if (firmasAdic > 0) detailItems.push({ label: "Firmas adicionales por IDC", value: firmasAdic + " · " + fm(precioFirmaAdic, currency, tc) + " c/u" });

	var sidebar = sideLabel("03", "Modelo<br>Comercial", "B2B2C · Identidades<br>Digitales") +
		`<div style="margin-top:auto;padding:0.3cm;background:rgba(255,255,255,0.1);border-radius:7px;"><div style="font-size:7pt;color:rgba(255,255,255,0.55);margin-bottom:2px;">Integración API</div><div style="font-size:11pt;font-weight:700;color:${WHITE};">${api.label}</div></div>`;

	var main = `
  <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:0.7cm;flex:1;overflow:hidden;">
    <div>
      ${sectionHeader("Detalle de la propuesta")}
      <table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
        <tbody>
          ${detailItems.map(function(r, i) {
		return `<tr style="background:${i % 2 === 1 ? BLUE_BG : WHITE};">
            <td style="padding:6px 8px;border-bottom:1px solid ${BORDER};color:${GRAY};width:46%;">${r.label}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${BORDER};color:${DARK};font-weight:500;">${r.value}</td>
          </tr>`;
	}).join("")}
        </tbody>
      </table>
    </div>

    <div style="background:${BLUE_BG};border-radius:10px;padding:0.5cm;display:flex;flex-direction:column;">
      ${sectionHeader("Resumen")}
      <div style="margin-bottom:0.35cm;">
        <div style="font-size:7.5pt;color:${GRAY};margin-bottom:3px;">Precio por IDC</div>
        <div style="font-size:24pt;font-weight:800;color:${BLUE};line-height:1;">${fm(precioIDC, currency, tc)}</div>
      </div>
      <div style="border-top:1px solid ${BORDER};padding-top:0.25cm;display:flex;flex-direction:column;gap:0.1cm;">
        ${esUnica
		? `<div style="display:flex;justify-content:space-between;font-size:8.5pt;padding:3px 0;"><span style="color:${GRAY};">Total única vez</span><span style="color:${DARK};font-weight:600;">${fm(revMesTotal, currency, tc)}</span></div>`
		: `<div style="display:flex;justify-content:space-between;font-size:8.5pt;padding:3px 0;"><span style="color:${GRAY};">Revenue mensual</span><span style="color:${DARK};font-weight:600;">${fm(revMesTotal, currency, tc)}</span></div><div style="display:flex;justify-content:space-between;font-size:8.5pt;padding:3px 0;"><span style="color:${GRAY};">Revenue año 1</span><span style="color:${DARK};font-weight:600;">${fm(revAnual, currency, tc)}</span></div>`
	}
      </div>
      <div style="margin-top:auto;padding-top:0.25cm;border-top:1px solid ${BORDER};font-size:6.5pt;color:${GRAY};line-height:1.4;font-style:italic;">La modalidad de pago estará sujeta a la constitución de un seguro de caución a satisfacción de Lakaut S.A.</div>
    </div>
  </div>
`;
	return mkSlide(withSidebar(sidebar, main) + slideFooter(3));
}

// ─── SLIDE 4: PRÓXIMOS PASOS ──────────────────────────────────────────────────
function slideProximosPasos(clientName) {
	var steps = [
		{ num: "01", svg: ic.file(WHITE, 22),  title: "Contrato de integración", desc: "Revisión y firma del Contrato de Integración y sus Anexos." },
		{ num: "02", svg: ic.users(WHITE, 22), title: "Kick-off técnico",         desc: "Arranque con el equipo de desarrollo: SLAs, servicio técnico y puesta a punto." },
		{ num: "03", svg: ic.zap(WHITE, 22),   title: "Go-Live",                  desc: "Pase a producción y puesta en marcha de la firma digital en " + clientName + "." },
	];

	var sidebar = sideLabel("04", "Próximos<br>Pasos", "Cómo<br>avanzamos");

	var main = `
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0.65cm;">
      ${steps.map(function(s) {
		return `<div style="background:${BLUE_BG};border-radius:10px;padding:0.55cm;position:relative;overflow:hidden;">
        <div style="font-size:40pt;font-weight:900;color:rgba(53,53,213,0.07);position:absolute;top:-5px;right:8px;line-height:1;">${s.num}</div>
        <div style="width:1.1cm;height:1.1cm;background:${BLUE};border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:0.35cm;">${s.svg}</div>
        <div style="font-size:11pt;font-weight:700;color:${DARK};margin-bottom:0.2cm;">${s.title}</div>
        <div style="font-size:8.5pt;color:${GRAY};line-height:1.5;">${s.desc}</div>
      </div>`;
	}).join("")}
    </div>
  </div>
`;
	return mkSlide(withSidebar(sidebar, main) + slideFooter(4));
}

// ─── SLIDE 5: CIERRE ──────────────────────────────────────────────────────────
function slideCierre() {
	return mkSlide(`
  <div style="display:flex;flex:1;overflow:hidden;">
    <div style="width:55%;background:linear-gradient(145deg,${BLUE} 0%,${BLUE_DK} 100%);padding:1cm 1.1cm;display:flex;flex-direction:column;justify-content:space-between;">
      <div>
        <div style="font-size:8pt;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:1.5px;margin-bottom:0.35cm;">05</div>
        <div style="font-size:30pt;font-weight:700;color:${WHITE};line-height:1.15;margin-bottom:0.4cm;">Gracias por<br>su tiempo</div>
        <div style="font-size:10.5pt;color:rgba(255,255,255,0.65);line-height:1.6;max-width:12cm;">Quedamos a disposición para avanzar con la integración.</div>
      </div>
      <div style="display:flex;align-items:baseline;gap:5px;">
        <span style="font-size:13pt;font-weight:800;color:${WHITE};letter-spacing:-0.5px;">FID</span>
        <span style="font-size:7.5pt;color:rgba(255,255,255,0.45);">by Lakaut</span>
      </div>
    </div>

    <div style="flex:1;background:#F8F9FD;display:flex;align-items:center;justify-content:center;padding:1cm;">
      <div style="background:${WHITE};border-radius:12px;padding:0.7cm 0.8cm;box-shadow:0 4px 20px rgba(53,53,213,0.09);width:100%;max-width:10cm;">
        <div style="width:1.4cm;height:1.4cm;background:${BLUE};border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:0.4cm;">
          <span style="font-size:13pt;font-weight:700;color:${WHITE};letter-spacing:-0.5px;">MD</span>
        </div>
        <div style="font-size:14pt;font-weight:700;color:${DARK};margin-bottom:0.1cm;">Mateo De Falco</div>
        <div style="font-size:8.5pt;color:${GRAY};margin-bottom:0.45cm;">Consultoría Comercial · Lakaut</div>
        <div style="display:flex;flex-direction:column;gap:0.22cm;">
          <div style="display:flex;align-items:center;gap:0.25cm;">${ic.mail(BLUE, 13)}<span style="font-size:9pt;color:${DARK};">mateodefalco@lakaut.com.ar</span></div>
          <div style="display:flex;align-items:center;gap:0.25cm;">${ic.phone(BLUE, 13)}<span style="font-size:9pt;color:${DARK};">+54 11 3635-8577</span></div>
        </div>
      </div>
    </div>
  </div>
`);
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
var CSS = `
@page { size: 33.87cm 19.05cm; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 33.87cm; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: ${DARK}; }
body > div { page-break-after: always; break-after: page; }
body > div:last-child { page-break-after: avoid; break-after: avoid; }
`;

// ─── Entry point ──────────────────────────────────────────────────────────────
function buildHTML(deal, client, currency, tc) {
	var clientName = (client && client.name) || deal.clientName || (deal.clients && deal.clients.name) || "Cliente";
	var ch = deal.channel;

	var slide3 = ch === "b2b2c"
		? slideModeloB2B2C(deal, clientName, currency, tc)
		: slideModeloDist(deal, clientName, currency, tc);

	var slides = [
		slideCover(clientName, deal.fecha),
		slideIntegracion(clientName),
		slide3,
		slideProximosPasos(clientName),
		slideCierre(),
	].join("\n");

	return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Propuesta Comercial — ${clientName}</title>
<style>${CSS}</style>
</head>
<body>
${slides}
</body>
</html>`;
}

export function exportProposal(deal, client, currency, tc) {
	var html = buildHTML(deal, client, currency, tc);
	var win = window.open("", "_blank");
	if (!win) { alert("Habilitá ventanas emergentes para exportar la propuesta."); return; }
	win.document.open();
	win.document.write(html);
	win.document.close();
	setTimeout(function() { win.print(); }, 400);
}
