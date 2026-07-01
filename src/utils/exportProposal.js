
// ─── Color tokens (from PPTX) ────────────────────────────────────────────────
const B   = "#3041D5";   // primary blue
const BLT = "#BCC3F4";  // light blue / text on dark
const DK  = "#36383A";  // dark text
const GR  = "#7F828E";  // medium gray
const GRL = "#E1E3E8";  // light gray border
const OW  = "#F7F8FA";  // off-white background
const W   = "#FFFFFF";  // white
const NG  = "#565961";  // numeric gray

// ─── Términos y condiciones (footer del resumen) ───────────────────────────────
const TERMS_CAUCION = "La modalidad de pago estará sujeta a la constitución de un seguro de caución a satisfacción de Lakaut S.A.";
const TERMS_RETENCIONES = "Lakaut S.A. reviste la condición de Agente de Retención y Percepción, por lo que las percepciones y/o retenciones impositivas que correspondan serán aplicadas en la facturación de acuerdo con la normativa vigente.";
function termsFooter(extraStyle) {
	return `<div style="margin-top:${extraStyle && extraStyle.marginTop ? extraStyle.marginTop : "0.4cm"};padding-top:0.3cm;border-top:1px solid rgba(255,255,255,0.15);font-size:6.5pt;color:rgba(255,255,255,0.45);line-height:1.4;font-style:italic;">
    <div style="margin-bottom:0.12cm;">${TERMS_CAUCION}</div>
    <div>${TERMS_RETENCIONES}</div>
  </div>`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const IVA_RATE = 0.21; // Alineado a TabCanalWeb: precio ARS c/IVA = precio s/IVA × 1.21

// Todos los precios del sistema se guardan sin IVA. `fm` sigue devolviendo el
// valor neto (sin IVA); `fmGross` agrega el IVA solo para ARS, ya que en
// USD los montos no se facturan con IVA discriminado en esta propuesta.
function fm(v, currency, tc) {
	if (v == null || isNaN(v)) return "—";
	if (currency === "ARS") return "$ " + (v * tc).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
	return "USD " + Number(v).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmGross(v, currency, tc) {
	if (v == null || isNaN(v)) return "—";
	if (currency !== "ARS") return fm(v, currency, tc);
	return "$ " + (v * tc * (1 + IVA_RATE)).toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
// Bloque de precio grande (usado en el resumen). En ARS, el monto que se
// paga es el que incluye IVA: ese es el que se destaca grande como "Total a
// pagar". El neto queda como referencia chica arriba, nunca como "a pagar".
function priceBlock(label, v, currency, tc, size) {
	size = size || "26pt";
	if (currency !== "ARS") {
		return `<div style="font-size:8pt;color:${BLT};font-weight:600;margin-bottom:0.2cm;">${label}</div>
        <div style="font-size:${size};font-weight:800;color:${W};line-height:1;">${fm(v, currency, tc)}</div>`;
	}
	return `<div style="font-size:8pt;color:${BLT};font-weight:600;margin-bottom:0.15cm;">${label}</div>
      <div style="display:flex;align-items:baseline;gap:0.18cm;margin-bottom:0.2cm;">
        <span style="font-size:7.5pt;color:${BLT};opacity:0.8;">Neto (sin IVA)</span>
        <span style="font-size:13pt;font-weight:700;color:${W};">${fm(v, currency, tc)}</span>
      </div>
      <div style="font-size:7.5pt;color:${BLT};font-weight:600;margin-bottom:0.1cm;">Total a pagar <span style="font-weight:400;opacity:0.8;">(IVA 21% incl.)</span></div>
      <div style="font-size:${size};font-weight:800;color:${W};line-height:1;">${fmGross(v, currency, tc)}</div>`;
}
function fd(iso) {
	try { return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }); }
	catch (e) { return ""; }
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
const SVG = {
	check:  (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
	shield: (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`,
	mobile: (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
	code:   (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
	clock:  (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
	file:   (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
	users:  (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
	zap:    (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
	mail:   (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
	phone:  (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
};

// ─── Layout ───────────────────────────────────────────────────────────────────
const SLIDE_CSS = `
@page { size: 33.87cm 19.05cm; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 33.87cm; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family: -apple-system, "Segoe UI", Arial, Helvetica, sans-serif; }
.slide { width: 33.87cm; height: 19.05cm; overflow: hidden; position: relative; display: flex; flex-direction: column; page-break-after: always; break-after: page; }
.slide:last-child { page-break-after: avoid; break-after: avoid; }
`;

// Shared footer for slides 2-4
function foot(n) {
	return `<div style="flex-shrink:0;border-top:1px solid ${GRL};padding:0.2cm 1cm;display:flex;justify-content:space-between;align-items:center;">
  <div style="display:flex;align-items:baseline;gap:4px;"><span style="font-size:10pt;font-weight:800;color:${B};letter-spacing:-0.5px;">FID</span><span style="font-size:7pt;color:${GR};">by Lakaut</span></div>
  <span style="font-size:7.5pt;color:${GRL};">0${n}</span>
</div>`;
}

// Icon square (used in funcionalidades + steps)
function iconBox(svg, bg, size) {
	bg = bg || B;
	size = size || "0.95cm";
	return `<div style="width:${size};height:${size};background:${bg};border-radius:8px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${svg}</div>`;
}

// ─── SLIDE 1: COVER ───────────────────────────────────────────────────────────
function s1Cover(clientName, fecha) {
	const badges = [
		{ text: "100% Remoto",        icon: SVG.check( "rgba(255,255,255,0.85)", 11) },
		{ text: "Firma embebida",      icon: SVG.code(  "rgba(255,255,255,0.85)", 11) },
		{ text: "Validez legal plena", icon: SVG.shield("rgba(255,255,255,0.85)", 11) },
	];
	return `<div class="slide" style="background:${B};">
  <!-- decorative circles -->
  <div style="position:absolute;top:-5cm;right:-2.5cm;width:16cm;height:16cm;border-radius:50%;background:rgba(255,255,255,0.05);"></div>
  <div style="position:absolute;bottom:-3cm;right:1cm;width:9cm;height:9cm;border-radius:50%;background:rgba(255,255,255,0.04);"></div>

  <!-- brand top -->
  <div style="padding:0.8cm 1.3cm 0;flex-shrink:0;">
    <div style="display:flex;align-items:baseline;gap:5px;">
      <span style="font-size:12pt;font-weight:800;color:${W};letter-spacing:-0.5px;">FID</span>
      <span style="font-size:7pt;color:rgba(255,255,255,0.45);">by Lakaut</span>
    </div>
  </div>

  <!-- main content -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 1.3cm;">
    <div style="font-size:8.5pt;font-weight:700;color:${BLT};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:0.35cm;">Propuesta Comercial</div>
    <div style="font-size:44pt;font-weight:700;color:${W};line-height:1.05;letter-spacing:-0.5px;margin-bottom:0.45cm;">${clientName}</div>
    <div style="font-size:10pt;color:rgba(255,255,255,0.72);max-width:15cm;line-height:1.6;margin-bottom:0.9cm;">Integración de firma digital con validez legal,<br>embebida en tu flujo y 100% remota.</div>
    <!-- badges -->
    <div style="display:flex;gap:0.45cm;">
      ${badges.map(b => `<div style="display:flex;align-items:center;gap:0.2cm;border:1.5px solid rgba(255,255,255,0.38);border-radius:20px;padding:0.18cm 0.45cm;">${b.icon}<span style="font-size:8pt;color:${W};font-weight:500;">${b.text}</span></div>`).join("")}
    </div>
  </div>

  <!-- footer -->
  <div style="flex-shrink:0;padding:0.3cm 1.3cm;border-top:1px solid rgba(255,255,255,0.18);display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:8pt;color:rgba(255,255,255,0.5);">${fecha ? fd(fecha) : ""}</span>
    <span style="font-size:7pt;color:rgba(255,255,255,0.32);">Autoridad Certificante Licenciada · Infraestructura de Firma Digital · Ley N° 25.506</span>
  </div>
</div>`;
}

// ─── SLIDE 2: INTEGRACIÓN DE FIRMA DIGITAL ────────────────────────────────────
function s2Integracion(clientName) {
	const feats = [
		{ icon: SVG.zap(B,16),    title: "Habilitación sin fricción",    desc: "Firma con validez legal plena, lista para operar a escala." },
		{ icon: SVG.check(B,16),  title: "Onboarding 100% remoto",       desc: "Alta del usuario desde cualquier lugar, sin trámites presenciales." },
		{ icon: SVG.mobile(B,16), title: "Certificado en tiempo real",   desc: "Certificado digital de persona física, emitido al instante." },
		{ icon: SVG.code(B,16),   title: "Firma embebida en el flujo",   desc: `El usuario firma dentro de ${clientName}, sin salir de la experiencia.` },
		{ icon: SVG.clock(B,16),  title: "Auditoría y evidencia legal",  desc: "Trazabilidad y respaldo legal por cada documento firmado." },
	];
	return `<div class="slide" style="background:${OW};">
  <!-- slide header -->
  <div style="flex-shrink:0;padding:0.65cm 1cm 0.4cm;">
    <div style="font-size:17pt;font-weight:700;color:${DK};line-height:1.2;margin-bottom:0.12cm;">Integración de Firma Digital</div>
    <div style="font-size:9pt;color:${GR};">Firma digital en ${clientName}</div>
  </div>

  <!-- two columns -->
  <div style="flex:1;display:flex;gap:0.5cm;padding:0 1cm 0.5cm;overflow:hidden;">

    <!-- LEFT: blue box (Cómo se integra) -->
    <div style="width:42%;background:${B};border-radius:12px;padding:0.75cm;display:flex;flex-direction:column;overflow:hidden;">
      <div style="font-size:7pt;font-weight:700;color:${BLT};text-transform:uppercase;letter-spacing:1px;margin-bottom:0.4cm;">Cómo se integra</div>
      <div style="display:flex;flex-direction:column;gap:0.3cm;margin-bottom:0.6cm;">
        ${["Firma con validez legal plena (Ley 25.506)", `Integración vía API en los flujos de ${clientName}`, "Recibos, contratos y documentos legales en cualquier proceso"].map(t =>
			`<div style="display:flex;align-items:flex-start;gap:0.28cm;">
            <div style="width:6px;height:6px;border-radius:50%;background:${BLT};margin-top:4px;flex-shrink:0;"></div>
            <span style="font-size:9pt;color:rgba(255,255,255,0.85);line-height:1.45;">${t}</span>
          </div>`).join("")}
      </div>
      <!-- quote -->
      <div style="margin-top:auto;border-top:1px solid rgba(255,255,255,0.15);padding-top:0.4cm;">
        <div style="font-size:22pt;color:${BLT};line-height:1;margin-bottom:0.1cm;">"</div>
        <div style="font-size:9pt;color:rgba(255,255,255,0.78);line-height:1.5;font-style:italic;">El usuario siempre permanece dentro del flujo de ${clientName}.</div>
      </div>
    </div>

    <!-- RIGHT: white card (Funcionalidades) -->
    <div style="flex:1;background:${W};border:1px solid ${GRL};border-radius:12px;box-shadow:0 2px 10px rgba(48,65,213,0.07);padding:0.65cm;display:flex;flex-direction:column;overflow:hidden;">
      <div style="font-size:7pt;font-weight:700;color:${GR};text-transform:uppercase;letter-spacing:1px;margin-bottom:0.35cm;">Funcionalidades</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:0.25cm;">
        ${feats.map((f,i) => `<div style="display:flex;align-items:flex-start;gap:0.4cm;padding:0.25cm 0;${i < feats.length-1 ? `border-bottom:1px solid ${GRL};` : ""}">
          ${iconBox(f.icon, OW, "0.85cm")}
          <div>
            <div style="font-size:9pt;font-weight:600;color:${DK};margin-bottom:2px;">${f.title}</div>
            <div style="font-size:8pt;color:${GR};line-height:1.4;">${f.desc}</div>
          </div>
        </div>`).join("")}
      </div>
    </div>

  </div>
  ${foot(2)}
</div>`;
}

// ─── SLIDE 3: MODELO COMERCIAL — DISTRIBUIDORES ───────────────────────────────
function s3Dist(deal, clientName, currency, tc, channelConfig, models) {
	const inp = deal.inputs || {};
	const res = deal.resumen || {};
	const qtys = inp.qtys || {};
	const firmasAdic = Number(inp.firmasAdic) || 0;
	const precioFirmaUSD = Number(inp.precioFirmaUSD) || 0;
	const showIva = currency === "ARS"; // desglose s/IVA y c/IVA solo aplica a cotizaciones en pesos

	const webProducts = models || [];
	const distributorTiers = (channelConfig && channelConfig.distributorTiers) || [];
	const packRows = webProducts
		.filter(p => p.priceUSD > 0 && (Number(qtys[p.id]) || 0) > 0)
		.map(p => ({
			label: p.label, qty: Number(qtys[p.id]),
			unit: p.priceUSD, sub: Number(qtys[p.id]) * p.priceUSD,
			certs: p.certs || 0, firmas: p.firmas || 0, ilimitadas: p.ilimitadas,
			segment: p.segment || "persona",
		}));

	const tierRecord = distributorTiers.find(t => t.label === res.tier);
	const descPct = tierRecord ? (tierRecord.descuento * 100).toFixed(0) : "—";
	const lista = res.facturacionLista || 0;
	const neto = res.netoLakaut || 0;
	const desc = lista - neto;
	const mainPack = packRows.reduce((b,r) => (!b || r.sub > b.sub) ? r : b, null);

	// desglose totales
	const totalPacks = packRows.reduce((s,r) => s + r.qty, 0);
	const totalCertsF = packRows.filter(r => r.segment !== "empresa").reduce((s,r) => s + r.qty * r.certs, 0);
	const totalCertsJ = packRows.filter(r => r.segment === "empresa").reduce((s,r) => s + r.qty * r.certs, 0);
	const hayIlimitadas = packRows.some(r => r.ilimitadas);
	const totalFirmasIncl = hayIlimitadas ? null : packRows.reduce((s,r) => s + r.qty * r.firmas, 0);
	const totalFirmasConAdic = totalFirmasIncl != null ? totalFirmasIncl + firmasAdic : null;

	return `<div class="slide" style="background:${OW};">
  <!-- slide header -->
  <div style="flex-shrink:0;padding:0.55cm 1cm 0.35cm;">
    <div style="font-size:17pt;font-weight:700;color:${DK};line-height:1.2;margin-bottom:0.1cm;">Modelo Comercial</div>
    <div style="font-size:9pt;color:${GR};">Volumen anual comprometido${res.tier ? ` · <strong style="color:${DK};">${res.tier}</strong> · descuento del ${descPct}% sobre precio de lista.` : ""}</div>
  </div>

  <!-- two columns -->
  <div style="flex:1;display:flex;gap:0.5cm;padding:0 1cm 0.5cm;overflow:hidden;">

    <!-- LEFT: white card (Detalle de facturación) -->
    <div style="flex:1;background:${W};border:1px solid ${GRL};border-radius:12px;box-shadow:0 2px 10px rgba(48,65,213,0.07);padding:0.6cm;display:flex;flex-direction:column;overflow:hidden;">
      <div style="font-size:7pt;font-weight:700;color:${GR};text-transform:uppercase;letter-spacing:1px;margin-bottom:0.35cm;">Detalle de facturación</div>
      <table style="width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:0.35cm;">
        <thead>
          <tr style="border-bottom:1.5px solid ${GRL};">
            <th style="padding:5px 6px 6px;text-align:left;font-weight:700;color:${GR};font-size:7.5pt;">PRODUCTO</th>
            <th style="padding:5px 6px 6px;text-align:left;font-weight:700;color:${GR};font-size:7.5pt;">INCLUYE</th>
            <th style="padding:5px 6px 6px;text-align:right;font-weight:700;color:${GR};font-size:7.5pt;">P. LISTA</th>
            <th style="padding:5px 6px 6px;text-align:right;font-weight:700;color:${GR};font-size:7.5pt;">CANTIDAD</th>
            <th style="padding:5px 6px 6px;text-align:right;font-weight:700;color:${GR};font-size:7.5pt;">TOTAL${showIva ? " (S/IVA)" : ""}</th>
            ${showIva ? `<th style="padding:5px 6px 6px;text-align:right;font-weight:700;color:${GR};font-size:7.5pt;">TOTAL (C/IVA)</th>` : ""}
          </tr>
        </thead>
        <tbody>
          ${packRows.map((r,i) => {
            const inclParts = [];
            if (r.certs > 0) inclParts.push(r.certs + " cert" + (r.segment === "empresa" ? " jur." : " fís."));
            if (r.ilimitadas) inclParts.push("firmas ilimitadas");
            else if (r.firmas > 0) inclParts.push(r.firmas.toLocaleString("es-AR") + " firmas");
            return `<tr style="background:${i%2===0?OW:W};">
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};font-weight:600;color:${DK};">${r.label}</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};color:${GR};font-size:7.5pt;">${inclParts.join(" · ")}</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};text-align:right;color:${NG};">${fm(r.unit, currency, tc)}</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};text-align:right;color:${NG};">${r.qty.toLocaleString("es-AR")}</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};text-align:right;font-weight:700;color:${DK};">${fm(r.sub, currency, tc)}</td>
            ${showIva ? `<td style="padding:5px 6px;border-bottom:1px solid ${GRL};text-align:right;font-weight:700;color:${DK};">${fmGross(r.sub, currency, tc)}</td>` : ""}
          </tr>`;
          }).join("")}
          ${firmasAdic > 0 ? `<tr style="background:${packRows.length%2===0?OW:W};">
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};color:${GR};">Firmas adicionales</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};color:${GR};font-size:7.5pt;"></td>
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};text-align:right;color:${NG};">${fm(precioFirmaUSD, currency, tc)}</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};text-align:right;color:${NG};">${firmasAdic.toLocaleString("es-AR")}</td>
            <td style="padding:5px 6px;border-bottom:1px solid ${GRL};text-align:right;font-weight:700;color:${DK};">${fm(firmasAdic*precioFirmaUSD, currency, tc)}</td>
            ${showIva ? `<td style="padding:5px 6px;border-bottom:1px solid ${GRL};text-align:right;font-weight:700;color:${DK};">${fmGross(firmasAdic*precioFirmaUSD, currency, tc)}</td>` : ""}
          </tr>` : ""}
          <tr>
            <td colspan="4" style="padding:7px 6px;font-weight:700;color:${DK};font-size:9pt;">Total facturación a lista</td>
            <td style="padding:7px 6px;text-align:right;font-weight:700;color:${DK};font-size:9pt;">${fm(lista, currency, tc)}</td>
            ${showIva ? `<td style="padding:7px 6px;text-align:right;font-weight:700;color:${DK};font-size:9pt;">${fmGross(lista, currency, tc)}</td>` : ""}
          </tr>
        </tbody>
      </table>
      ${showIva ? `<div style="font-size:6.5pt;color:${GR};font-style:italic;margin-bottom:0.3cm;">Precios expresados en pesos argentinos. IVA discriminado al 21%.</div>` : ""}
      <!-- desglose de valor -->
      <div style="margin-top:auto;display:flex;gap:0.3cm;">
        ${totalCertsF > 0 ? `<div style="flex:1;background:${OW};border:1px solid ${GRL};border-radius:8px;padding:0.25cm 0.35cm;">
          <div style="font-size:6.5pt;color:${GR};margin-bottom:2px;">Certs físicos</div>
          <div style="font-size:11pt;font-weight:700;color:${DK};">${totalCertsF.toLocaleString("es-AR")}</div>
        </div>` : ""}
        ${totalCertsJ > 0 ? `<div style="flex:1;background:${OW};border:1px solid ${GRL};border-radius:8px;padding:0.25cm 0.35cm;">
          <div style="font-size:6.5pt;color:${GR};margin-bottom:2px;">Certs jurídicos</div>
          <div style="font-size:11pt;font-weight:700;color:${DK};">${totalCertsJ.toLocaleString("es-AR")}</div>
        </div>` : ""}
        <div style="flex:1;background:${OW};border:1px solid ${GRL};border-radius:8px;padding:0.25cm 0.35cm;">
          <div style="font-size:6.5pt;color:${GR};margin-bottom:2px;">Firmas incluidas</div>
          <div style="font-size:11pt;font-weight:700;color:${DK};">${totalFirmasConAdic != null ? totalFirmasConAdic.toLocaleString("es-AR") : "Ilimitadas"}</div>
        </div>
      </div>
    </div>

    <!-- RIGHT: blue box (Resumen) -->
    <div style="width:41%;background:${B};border-radius:12px;padding:0.65cm;display:flex;flex-direction:column;overflow:hidden;">
      <div style="font-size:7pt;font-weight:700;color:${BLT};text-transform:uppercase;letter-spacing:1px;margin-bottom:0.45cm;">Resumen</div>

      <!-- nivel tag -->
      ${res.tier ? `<div style="display:inline-flex;align-items:center;border:1.5px solid rgba(255,255,255,0.35);border-radius:20px;padding:0.12cm 0.4cm;width:fit-content;margin-bottom:0.35cm;">
        <span style="font-size:9pt;font-weight:600;color:${W};">Nivel ${res.tier}</span>
      </div>` : ""}

      <!-- line items -->
      <div style="display:flex;flex-direction:column;gap:0.15cm;margin-bottom:0.35cm;">
        <div style="display:flex;justify-content:space-between;font-size:9pt;">
          <span style="color:rgba(255,255,255,0.65);">Total a lista</span>
          <span style="color:${W};font-weight:500;">${fm(lista, currency, tc)}</span>
        </div>
        <div style="height:1px;background:rgba(255,255,255,0.2);margin:0.05cm 0;"></div>
        <div style="display:flex;justify-content:space-between;font-size:9pt;">
          <span style="color:rgba(255,255,255,0.65);">Descuento (${descPct}%)</span>
          <span style="color:rgba(255,255,255,0.85);font-weight:500;">−${fm(desc, currency, tc)}</span>
        </div>
      </div>

      <!-- big price -->
      <div style="border-top:1.5px solid rgba(255,255,255,0.25);padding-top:0.4cm;margin-top:auto;">
        ${inp.abono && res.abonoMes ? `
        ${priceBlock("Mes 1 · compra inicial", neto, currency, tc, "20pt")}
        <div style="height:1px;background:rgba(255,255,255,0.2);margin:0.25cm 0;"></div>
        ${priceBlock("Mes 2 en adelante · abono mensual", res.abonoMes, currency, tc, "20pt")}
        ` : priceBlock("Precio a pagar", neto, currency, tc, "26pt")}
      </div>

      ${inp.abono && res.abonoMes ? `
      <div style="margin-top:0.3cm;padding:0.2cm 0.3cm;background:rgba(255,255,255,0.1);border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:7pt;color:rgba(255,255,255,0.65);">Facturación año 1${showIva ? " (s/IVA)" : ""}</span>
        <span style="font-size:8.5pt;font-weight:700;color:${W};">${fm(res.facturacionAnio1, currency, tc)}</span>
      </div>
      ` : ""}

      ${termsFooter({ marginTop: "0.4cm" })}
    </div>

  </div>
  ${foot(3)}
</div>`;
}

// ─── SLIDE 3: MODELO COMERCIAL — B2B2C ───────────────────────────────────────
function s3B2B2C(deal, clientName, currency, tc, channelConfig) {
	const inp = deal.inputs || {};
	const res = deal.resumen || {};
	// La Cotizadora B2B2C no tiene (todavía) un selector de modalidad única/recurrente:
	// el volumen de IDC es un dato neutro. No hay que asumir periodicidad que no se configuró.
	const showIva = currency === "ARS"; // desglose s/IVA y c/IVA solo aplica a cotizaciones en pesos
	const apiTiers = (channelConfig && channelConfig.b2b2cApiTiers) || [];
	const slaPlans = (channelConfig && channelConfig.slaPlans) || [];
	const api = [...apiTiers].reverse().find(t => (Number(inp.fee)||0) >= t.feeMin) || apiTiers[0] || { label: "API Standard" };
	const sla = slaPlans.find(s => s.id === inp.slaId) || slaPlans[0] || { label: "Standard", precioMes: 0, desc: "" };
	const slaText = sla.precioMes
		? `${sla.label} · ${fm(sla.precioMes, currency, tc)}/mes${showIva ? ` (c/IVA ${fmGross(sla.precioMes, currency, tc)})` : ""}`
		: `${sla.label} · incluido`;

	const rows = [
		{ l: "Volumen de IDC",           v: (Number(inp.idcMensuales)||0).toLocaleString("es-AR") },
		{ l: "Tipo de integración API",  v: api.label },
		{ l: "Fee de implementación",    v: `${fm(Number(inp.fee)||0, currency, tc)}${showIva ? ` (c/IVA ${fmGross(Number(inp.fee)||0, currency, tc)})` : ""} · una sola vez` },
		{ l: "Plan de soporte / SLA",    v: slaText },
		{ l: "Firmas incluidas por IDC", v: String(Number(inp.firmasInclPorIDC)||0) },
		...((Number(inp.firmasAdicPorIDC)||0) > 0 ? [{ l: "Firmas adicionales por IDC", v: `${inp.firmasAdicPorIDC} · ${fm(Number(inp.precioFirmaAdic)||0, currency, tc)}${showIva ? ` (c/IVA ${fmGross(Number(inp.precioFirmaAdic)||0, currency, tc)})` : ""} c/u` }] : []),
	];

	// precioIDC es un valor unitario chico (ej. USD 0.65): se formatea aparte de fm/fmGross para no perder los decimales.
	const precioIDC = res.precioIDC != null ? res.precioIDC : 0;
	const precioIDCFmt = currency === "ARS"
		? "$ " + Math.round(precioIDC * tc).toLocaleString("es-AR")
		: "USD " + precioIDC.toFixed(2);
	const precioIDCFmtGross = showIva
		? "$ " + Math.round(precioIDC * tc * (1 + IVA_RATE)).toLocaleString("es-AR")
		: precioIDCFmt;
	const revMes = res.revMesTotal || 0;

	return `<div class="slide" style="background:${OW};">
  <!-- slide header -->
  <div style="flex-shrink:0;padding:0.55cm 1cm 0.35cm;">
    <div style="font-size:17pt;font-weight:700;color:${DK};line-height:1.2;margin-bottom:0.1cm;">Modelo Comercial</div>
    <div style="font-size:9pt;color:${GR};">B2B2C · IDC <span style="font-weight:400;">(Identidad Digital Certificada)</span> · integración <strong style="color:${DK};">${api.label}</strong></div>
  </div>

  <!-- two columns -->
  <div style="flex:1;display:flex;gap:0.5cm;padding:0 1cm 0.5cm;overflow:hidden;">

    <!-- LEFT: white card (Detalle) -->
    <div style="flex:1;background:${W};border:1px solid ${GRL};border-radius:12px;box-shadow:0 2px 10px rgba(48,65,213,0.07);padding:0.6cm;display:flex;flex-direction:column;overflow:hidden;">
      <div style="font-size:7pt;font-weight:700;color:${GR};text-transform:uppercase;letter-spacing:1px;margin-bottom:0.35cm;">Detalle de la propuesta</div>
      <table style="width:100%;border-collapse:collapse;font-size:9pt;">
        <tbody>
          ${rows.map((r,i) => `<tr style="background:${i%2===0?OW:W};">
            <td style="padding:7px 8px;border-bottom:1px solid ${GRL};color:${GR};width:46%;">${r.l}</td>
            <td style="padding:7px 8px;border-bottom:1px solid ${GRL};color:${DK};font-weight:500;">${r.v}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      ${showIva ? `<div style="font-size:6.5pt;color:${GR};font-style:italic;margin-top:0.3cm;">Precios expresados en pesos argentinos. IVA discriminado al 21%.</div>` : ""}
    </div>

    <!-- RIGHT: blue box (Resumen) -->
    <div style="width:41%;background:${B};border-radius:12px;padding:0.65cm;display:flex;flex-direction:column;overflow:hidden;">
      <div style="font-size:7pt;font-weight:700;color:${BLT};text-transform:uppercase;letter-spacing:1px;margin-bottom:0.45cm;">Resumen</div>

      <div style="margin-bottom:0.4cm;">
        ${priceBlock("Precio total", revMes, currency, tc, "28pt")}
      </div>

      <div style="height:1px;background:rgba(255,255,255,0.2);margin-bottom:0.35cm;"></div>

      <div style="display:flex;flex-direction:column;gap:0.18cm;margin-bottom:0.5cm;">
        <div style="display:flex;justify-content:space-between;font-size:9pt;">
          <span style="color:rgba(255,255,255,0.65);">Precio por IDC (${(Number(inp.idcMensuales)||0).toLocaleString("es-AR")} IDC)</span>
          <span style="color:${W};font-weight:600;">${precioIDCFmt}${showIva ? ` <span style="color:rgba(255,255,255,0.6);font-weight:400;font-size:8pt;">(c/IVA ${precioIDCFmtGross})</span>` : ""}</span>
        </div>
      </div>

      ${termsFooter({ marginTop: "auto" })}
    </div>

  </div>
  ${foot(3)}
</div>`;
}

// ─── SLIDE 4: PRÓXIMOS PASOS ──────────────────────────────────────────────────
function s4Pasos(clientName) {
	const steps = [
		{ n:"01", icon: SVG.file( W, 20), title:"Contrato de integración", desc:"Revisión y firma del Contrato de Integración y sus Anexos.",           dark:false },
		{ n:"02", icon: SVG.users(W, 20), title:"Kick-off técnico",         desc:"Arranque con el equipo de desarrollo: SLAs, servicio técnico y puesta a punto.", dark:false },
		{ n:"03", icon: SVG.zap(  W, 20), title:"Go-Live",                  desc:`Pase a producción y puesta en marcha de la firma digital en ${clientName}.`, dark:true  },
	];
	return `<div class="slide" style="background:${W};">
  <!-- slide header -->
  <div style="flex-shrink:0;padding:0.65cm 1cm 0.4cm;">
    <div style="font-size:17pt;font-weight:700;color:${DK};line-height:1.2;margin-bottom:0.1cm;">Próximos Pasos</div>
    <div style="font-size:9pt;color:${GR};">Cómo avanzamos</div>
  </div>

  <!-- three step cards -->
  <div style="flex:1;display:flex;gap:0.5cm;padding:0 1cm 0.5cm;overflow:hidden;">
    ${steps.map(s => {
		const bg   = s.dark ? B : OW;
		const bd   = s.dark ? "none" : `1px solid ${GRL}`;
		const nClr = s.dark ? BLT : B;
		const tClr = s.dark ? W : DK;
		const dClr = s.dark ? "rgba(255,255,255,0.75)" : GR;
		const iBox = s.dark
			? `<div style="width:1.1cm;height:1.1cm;background:rgba(255,255,255,0.16);border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:0.45cm;">${s.icon}</div>`
			: iconBox(SVG[s.n==="01"?"file":"users"](W,20), B, "1.1cm") + `<div style="margin-bottom:0.45cm;"></div>`;
		return `<div style="flex:1;background:${bg};border:${bd};border-radius:12px;padding:0.65cm;display:flex;flex-direction:column;overflow:hidden;">
          <div style="font-size:11pt;font-weight:800;color:${nClr};margin-bottom:0.35cm;">${s.n}</div>
          <div style="width:1.1cm;height:1.1cm;background:${s.dark?"rgba(255,255,255,0.16)":B};border-radius:9px;display:flex;align-items:center;justify-content:center;margin-bottom:0.45cm;">${s.icon}</div>
          <div style="font-size:12pt;font-weight:700;color:${tClr};margin-bottom:0.2cm;">${s.title}</div>
          <div style="font-size:9pt;color:${dClr};line-height:1.55;">${s.desc}</div>
        </div>`;
	}).join("")}
  </div>
  ${foot(4)}
</div>`;
}

// ─── SLIDE 5: CIERRE ──────────────────────────────────────────────────────────
function s5Cierre() {
	return `<div class="slide" style="background:${B};">
  <!-- decorative circle -->
  <div style="position:absolute;bottom:-3.5cm;left:-2cm;width:12cm;height:12cm;border-radius:50%;background:rgba(255,255,255,0.05);"></div>

  <!-- main content -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 1.3cm;">
    <div style="font-size:8.5pt;font-weight:700;color:${BLT};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:0.3cm;">Gracias por su tiempo</div>
    <div style="font-size:36pt;font-weight:700;color:${W};line-height:1.1;margin-bottom:0.4cm;">Muchas gracias</div>
    <div style="font-size:10pt;color:rgba(255,255,255,0.7);line-height:1.6;max-width:14cm;">Quedamos a disposición para avanzar con la integración.</div>
  </div>

  <!-- divider + contact -->
  <div style="flex-shrink:0;border-top:1px solid rgba(255,255,255,0.18);padding:0.5cm 1.3cm;display:flex;align-items:center;gap:1cm;">
    <!-- avatar -->
    <div style="width:1.35cm;height:1.35cm;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.35);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
      <span style="font-size:11pt;font-weight:700;color:${W};letter-spacing:-0.5px;">MD</span>
    </div>
    <!-- info -->
    <div>
      <div style="font-size:11pt;font-weight:700;color:${W};margin-bottom:0.15cm;">Mateo De Falco</div>
      <div style="display:flex;gap:1cm;">
        <div style="display:flex;align-items:center;gap:0.2cm;">${SVG.mail("rgba(255,255,255,0.7)",12)}<span style="font-size:8.5pt;color:rgba(255,255,255,0.8);">mateodefalco@lakaut.com.ar</span></div>
        <div style="display:flex;align-items:center;gap:0.2cm;">${SVG.phone("rgba(255,255,255,0.7)",12)}<span style="font-size:8.5pt;color:rgba(255,255,255,0.8);">+54 11 3635-8577</span></div>
      </div>
    </div>
    <!-- brand right -->
    <div style="margin-left:auto;display:flex;align-items:baseline;gap:4px;">
      <span style="font-size:12pt;font-weight:800;color:${W};letter-spacing:-0.5px;">FID</span>
      <span style="font-size:7.5pt;color:rgba(255,255,255,0.45);">by Lakaut</span>
    </div>
  </div>
</div>`;
}

// ─── Builder ──────────────────────────────────────────────────────────────────
function buildHTML(deal, client, currency, tc, channelConfig, models) {
	const clientName = (client?.name) || deal.clientName || (deal.clients?.name) || "Cliente";
	const s3 = deal.channel === "b2b2c"
		? s3B2B2C(deal, clientName, currency, tc, channelConfig)
		: s3Dist(deal, clientName, currency, tc, channelConfig, models);

	return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Propuesta Comercial — ${clientName}</title>
<style>${SLIDE_CSS}</style>
</head>
<body>
${s1Cover(clientName, deal.fecha)}
${s2Integracion(clientName)}
${s3}
${s4Pasos(clientName)}
${s5Cierre()}
</body>
</html>`;
}

// La propuesta exportada siempre se factura en pesos, sin importar en qué
// moneda esté parada la interfaz al momento de crear o exportar la cotización.
export function exportProposal(deal, client, currency, tc, channelConfig, models) {
	const html = buildHTML(deal, client, "ARS", tc, channelConfig, models);
	const win = window.open("", "_blank");
	if (!win) { alert("Habilitá ventanas emergentes para exportar la propuesta."); return; }
	win.document.open();
	win.document.write(html);
	win.document.close();
	setTimeout(() => win.print(), 400);
}
