
// ─── Color tokens (from PPTX) ────────────────────────────────────────────────
const B   = "#3041D5";   // primary blue
const BLT = "#BCC3F4";  // light blue / text on dark
const DK  = "#36383A";  // dark text
const GR  = "#7F828E";  // medium gray
const GRL = "#E1E3E8";  // light gray border
const OW  = "#F7F8FA";  // off-white background
const W   = "#FFFFFF";  // white
const NG  = "#565961";  // numeric gray

// ─── Términos y condiciones (footer de la propuesta) ────────────────────────────
const TERMS_CAUCION = "La modalidad de pago estará sujeta a la constitución de un seguro de caución a satisfacción de Lakaut S.A.";
const TERMS_RETENCIONES = "Lakaut S.A. reviste la condición de Agente de Retención y Percepción, por lo que las percepciones y/o retenciones impositivas que correspondan serán aplicadas en la facturación de acuerdo con la normativa vigente.";
const VALIDEZ_DIAS = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const IVA_RATE = 0.21; // Alineado a TabCanalWeb: precio ARS c/IVA = precio s/IVA × 1.21

// Abono mensual (Distribuidores y Volumen): repone la bolsa de firmas con 35% de
// descuento, arranca en el mes 2 (el mes 1 ya viene con la bolsa incluida en la
// compra/emisión inicial) y se sostiene mientras dura la vigencia del certificado
// (2 años = 24 meses, Borrador v5). Ambos canales comparten esta convención.
const DESCUENTO_ABONO = 0.35;
const ABONO_DESDE_MES = 2;
const ABONO_VIGENCIA_MESES = 24;

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
function fd(iso) {
	try { return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" }); }
	catch (e) { return ""; }
}
// Fecha de vencimiento de la propuesta: emisión + VALIDEZ_DIAS días corridos.
function addDays(iso, days) {
	try {
		const d = new Date(iso);
		d.setDate(d.getDate() + days);
		return d.toISOString();
	} catch (e) { return null; }
}

// ─── Slide "Modelo Comercial" — building blocks compartidos por Volumen y
// Precio de lista con descuento. Narrativa "momentos": Momento 1 = pago/alta
// inicial, Momento 2 (solo si hay abono) = cargo recurrente que repone firmas.
function chip(icon, html) {
	return `<div style="display:flex;align-items:center;gap:0.18cm;">${icon}<span style="font-size:8.5pt;color:${DK};">${html}</span></div>`;
}

// Une los chips en una sola tarjeta, separados por divisores verticales finos
// (en vez de una tarjeta por dato) para que "Incluye" se lea de un vistazo.
function chipsCard(items) {
	return `<div style="background:${W};border:1px solid ${GRL};border-radius:12px;padding:0.32cm 0.5cm;box-shadow:0 2px 8px rgba(48,65,213,0.06);">
    <div style="display:flex;align-items:center;flex-wrap:wrap;">
      ${items.map((it, i) => it + (i < items.length - 1 ? `<div style="width:1px;height:0.4cm;background:${GRL};margin:0 0.4cm;"></div>` : "")).join("")}
    </div>
  </div>`;
}

function momentoCard({ dark, kicker, icon, heading, body, pageBg }) {
	const bg = dark ? B : W;
	const border = dark ? "" : `border:1px solid ${GRL};box-shadow:0 2px 10px rgba(48,65,213,0.07);`;
	const kickerColor = dark ? "rgba(255,255,255,0.75)" : GR;
	const headingColor = dark ? W : DK;
	const iconBg = dark ? "rgba(255,255,255,0.18)" : "#EEF0FD";
	return `<div style="flex:1;background:${bg};${border}border-radius:14px;padding:0.55cm 0.6cm;display:flex;flex-direction:column;overflow:hidden;">
    <div style="display:flex;align-items:center;gap:0.3cm;margin-bottom:0.22cm;">
      <div style="width:0.8cm;height:0.8cm;background:${iconBg};border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${icon}</div>
      <div style="font-size:7pt;font-weight:700;color:${kickerColor};text-transform:uppercase;letter-spacing:0.8px;">${kicker}</div>
    </div>
    <div style="font-size:15pt;font-weight:800;color:${headingColor};line-height:1.2;margin-bottom:0.2cm;">${heading}</div>
    ${body}
  </div>`;
}

// Precio grande dentro de un momentoCard. `note` va debajo, chico.
function bigPrice({ dark, label, value, perMes, note }) {
	const labelColor = dark ? "rgba(255,255,255,0.8)" : GR;
	const valueColor = dark ? W : DK;
	const noteColor = dark ? "rgba(255,255,255,0.68)" : GR;
	return `<div style="margin-top:auto;padding-top:0.25cm;">
    <div style="font-size:8pt;font-weight:600;color:${labelColor};margin-bottom:0.1cm;">${label}</div>
    <div style="display:flex;align-items:baseline;gap:0.15cm;">
      <div style="font-size:23pt;font-weight:800;color:${valueColor};line-height:1;">${value}</div>
      ${perMes ? `<span style="font-size:11pt;font-weight:700;color:${dark ? "rgba(255,255,255,0.85)" : GR};">/mes</span>` : ""}
    </div>
    ${note ? `<div style="font-size:7.5pt;color:${noteColor};margin-top:0.15cm;">${note}</div>` : ""}
  </div>`;
}

// Par de mini-stats lado a lado (ej. Subtotal | IVA), separadas por un divisor arriba.
function miniStats(dark, statsList) {
	const line = dark ? "rgba(255,255,255,0.2)" : GRL;
	return `<div style="border-top:1px solid ${line};margin-top:0.22cm;padding-top:0.22cm;display:flex;gap:0.4cm;">
    ${statsList.map(s => `<div style="flex:1;">
      <div style="font-size:7.5pt;color:${dark ? "rgba(255,255,255,0.68)" : GR};margin-bottom:2px;">${s.label}</div>
      <div style="font-size:11pt;font-weight:700;color:${dark ? W : DK};">${s.value}</div>
    </div>`).join("")}
  </div>`;
}

function discountBadge(text) {
	return `<div style="display:inline-flex;align-items:center;gap:0.2cm;background:${W};border-radius:20px;padding:0.16cm 0.42cm;margin-bottom:0.3cm;width:fit-content;">
    ${SVG.check(B, 11)}<span style="font-size:8.5pt;font-weight:700;color:${DK};">${text}</span>
  </div>`;
}

// Barra inferior "cómo se paga": mes 1 → abono mensual, con el total de referencia
// para toda la vigencia del certificado. Solo se usa cuando el abono está activo.
function scheduleBar({ mes1Value, abonoValue, totalValue, totalNote }) {
	return `<div style="display:flex;background:${W};border:1px solid ${GRL};border-radius:14px;overflow:hidden;">
    <div style="flex:1;padding:0.4cm 0.6cm;">
      <div style="font-size:7pt;font-weight:700;color:${GR};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:0.25cm;">Cómo se paga · suscripción mensual</div>
      <div style="display:flex;align-items:center;gap:0.4cm;">
        <div>
          <div style="font-size:7.5pt;color:${GR};margin-bottom:2px;">Pago inicial · mes 1</div>
          <div style="font-size:15pt;font-weight:800;color:${DK};">${mes1Value}</div>
        </div>
        ${SVG.arrowRight(GR, 15)}
        <div>
          <div style="font-size:7.5pt;color:${GR};margin-bottom:2px;">Suscripción · mes ${ABONO_DESDE_MES} a ${ABONO_VIGENCIA_MESES}</div>
          <div style="font-size:15pt;font-weight:800;color:${B};">${abonoValue}<span style="font-size:9pt;font-weight:700;"> /mes</span></div>
        </div>
      </div>
    </div>
    <div style="width:32%;background:${OW};border-left:1px solid ${GRL};padding:0.4cm 0.6cm;display:flex;flex-direction:column;justify-content:center;">
      <div style="font-size:7pt;font-weight:700;color:${GR};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:0.12cm;">Total acumulado a ${ABONO_VIGENCIA_MESES} meses · referencia</div>
      <div style="font-size:18pt;font-weight:800;color:${DK};line-height:1;margin-bottom:0.12cm;">${totalValue}</div>
      <div style="font-size:7.5pt;color:${GR};line-height:1.4;">${totalNote}</div>
    </div>
  </div>`;
}

// `validUntil` es opcional: si viene, agrega la línea de vigencia de 15 días
// al pie de términos (además de mostrarse arriba, junto a la fecha de emisión).
function termsFooterLight() {
	return `<div style="font-size:6.5pt;color:${GR};line-height:1.4;font-style:italic;">
    <div style="margin-bottom:0.08cm;">${TERMS_CAUCION}</div>
    <div>${TERMS_RETENCIONES}</div>
  </div>`;
}

// Shell de la slide: header (kicker + título + subtítulo), fila "Incluye" con
// chips, las tarjetas de momento (1 o 2), la barra de pago (si hay abono) y el
// pie con términos + branding. La fecha de emisión/vencimiento vive únicamente
// en la portada (slide 1) — acá no se repite.
function commercialSlide({ kicker, title, subtitle, chips, cardsHtml, scheduleHtml, pageN }) {
	return `<div class="slide" style="background:${OW};">
  <div style="flex-shrink:0;padding:0.5cm 1cm 0;">
    <div style="font-size:9pt;font-weight:700;color:${B};text-transform:uppercase;letter-spacing:1px;margin-bottom:0.12cm;">${kicker}</div>
    <div style="font-size:21pt;font-weight:800;color:${DK};line-height:1.15;">${title}</div>
    ${subtitle ? `<div style="font-size:8.5pt;color:${GR};margin-top:0.1cm;">${subtitle}</div>` : ""}
  </div>

  <div style="flex-shrink:0;padding:0.3cm 1cm 0;">
    <div style="font-size:7pt;font-weight:700;color:${GR};text-transform:uppercase;letter-spacing:0.8px;margin-bottom:0.18cm;">Incluye</div>
    ${chipsCard(chips)}
  </div>

  <div style="flex:1;display:flex;gap:0.4cm;padding:0.3cm 1cm 0;overflow:hidden;">${cardsHtml}</div>

  ${scheduleHtml ? `<div style="flex-shrink:0;padding:0.3cm 1cm 0;">${scheduleHtml}</div>` : ""}

  <div style="flex-shrink:0;padding:0.28cm 1cm 0;">${termsFooterLight()}</div>
  ${foot(pageN)}
</div>`;
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
	idcard: (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M6 16c0-1.4 1-2.5 2-2.5s2 1.1 2 2.5"/><line x1="14" y1="9" x2="19" y2="9"/><line x1="14" y1="13" x2="19" y2="13"/></svg>`,
	checkSquare: (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="8 12.5 11 15.5 16 9"/></svg>`,
	calendar: (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
	refresh: (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
	arrowRight: (c,s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
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
function s1Cover(clientName, fecha, sinApi) {
	const badges = [
		{ text: "100% Remoto",        icon: SVG.check( "rgba(255,255,255,0.85)", 11) },
		sinApi
			? { text: "Emisión a escala",  icon: SVG.zap(   "rgba(255,255,255,0.85)", 11) }
			: { text: "Firma embebida",    icon: SVG.code(  "rgba(255,255,255,0.85)", 11) },
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
    <div style="font-size:10pt;color:rgba(255,255,255,0.72);max-width:15cm;line-height:1.6;margin-bottom:0.9cm;">${sinApi
		? "Firma digital con validez legal,<br>emitida por volumen y 100% remota."
		: "Integración de firma digital con validez legal,<br>embebida en tu flujo y 100% remota."}</div>
    <!-- badges -->
    <div style="display:flex;gap:0.45cm;">
      ${badges.map(b => `<div style="display:flex;align-items:center;gap:0.2cm;border:1.5px solid rgba(255,255,255,0.38);border-radius:20px;padding:0.18cm 0.45cm;">${b.icon}<span style="font-size:8pt;color:${W};font-weight:500;">${b.text}</span></div>`).join("")}
    </div>
  </div>

  <!-- footer -->
  <div style="flex-shrink:0;padding:0.3cm 1.3cm;border-top:1px solid rgba(255,255,255,0.18);display:flex;justify-content:space-between;align-items:center;">
    <span style="font-size:8pt;color:rgba(255,255,255,0.5);">${fecha ? `Emitida el ${fd(fecha)} · Válida hasta el ${fd(addDays(fecha, VALIDEZ_DIAS))}` : ""}</span>
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

	// desglose totales
	const totalPacks = packRows.reduce((s,r) => s + r.qty, 0);
	const totalCertsF = packRows.filter(r => r.segment !== "empresa").reduce((s,r) => s + r.qty * r.certs, 0);
	const totalCertsJ = packRows.filter(r => r.segment === "empresa").reduce((s,r) => s + r.qty * r.certs, 0);
	const hayIlimitadas = packRows.some(r => r.ilimitadas);
	const totalFirmasIncl = hayIlimitadas ? null : packRows.reduce((s,r) => s + r.qty * r.firmas, 0);
	const totalFirmasConAdic = totalFirmasIncl != null ? totalFirmasIncl + firmasAdic : null;

	// Abono: repone la bolsa de firmas del pack desde el mes 2, durante la vigencia del certificado.
	const abonoActivo = !!inp.abono && (res.abonoMes || 0) > 0;
	const abonoVigenciaTotal = abonoActivo ? neto + res.abonoMes * (ABONO_VIGENCIA_MESES - 1) : 0;

	const chips = [
		chip(SVG.idcard(B, 15), `<strong>${totalPacks.toLocaleString("es-AR")}</strong> unidades contratadas`),
		chip(SVG.shield(B, 15), `<strong>${(totalCertsF + totalCertsJ).toLocaleString("es-AR")}</strong> certificados incluidos`),
		chip(SVG.checkSquare(B, 15), `<strong>${totalFirmasConAdic != null ? totalFirmasConAdic.toLocaleString("es-AR") : "Ilimitadas"}</strong> firmas incluidas`),
		chip(SVG.calendar(B, 15), `<strong>${ABONO_VIGENCIA_MESES} meses</strong> de vigencia`),
	];

	const packItemsHtml = packRows.map(r => {
		const inclParts = [];
		if (r.certs > 0) inclParts.push(r.certs + " cert" + (r.segment === "empresa" ? " jur." : " fís."));
		if (r.ilimitadas) inclParts.push("firmas ilimitadas");
		else if (r.firmas > 0) inclParts.push(r.firmas.toLocaleString("es-AR") + " firmas");
		return `<div style="display:flex;justify-content:space-between;gap:0.3cm;font-size:8.5pt;">
      <span style="color:${GR};">${r.qty}× <strong style="color:${DK};">${r.label}</strong> <span style="font-size:7.5pt;">(${inclParts.join(" · ")})</span></span>
      <span style="color:${DK};font-weight:600;white-space:nowrap;">${fm(r.sub, currency, tc)}</span>
    </div>`;
	}).join("");
	const firmasAdicItemHtml = firmasAdic > 0 ? `<div style="display:flex;justify-content:space-between;gap:0.3cm;font-size:8.5pt;">
      <span style="color:${GR};">Firmas adicionales (${firmasAdic.toLocaleString("es-AR")})</span>
      <span style="color:${DK};font-weight:600;white-space:nowrap;">${fm(firmasAdic * precioFirmaUSD, currency, tc)}</span>
    </div>` : "";

	const momento1 = momentoCard({
		dark: false,
		kicker: "Momento 1 · mes 1",
		icon: SVG.shield(B, 16),
		heading: "Activás tu volumen",
		body: `
      <div style="font-size:8.5pt;color:${GR};line-height:1.5;margin-bottom:0.22cm;">
        Adquirís el volumen contratado con el nivel <strong style="color:${DK};">${res.tier || "—"}</strong>, con un descuento del ${descPct}% sobre precio de lista.
      </div>
      <div style="display:flex;flex-direction:column;gap:0.14cm;">${packItemsHtml}${firmasAdicItemHtml}</div>
      ${bigPrice({
				dark: false,
				label: abonoActivo ? "Pago único de activación" : "Total a pagar",
				value: showIva ? fmGross(neto, currency, tc) : fm(neto, currency, tc),
				note: showIva ? "IVA 21% incluido" : null,
			})}
      ${miniStats(false, [
				{ label: "Precio de lista", value: fm(lista, currency, tc) },
				{ label: `Descuento (${descPct}%)`, value: "−" + fm(desc, currency, tc) },
			])}
    `,
	});

	const momento2 = abonoActivo ? momentoCard({
		dark: true,
		kicker: `Momento 2 · mes ${ABONO_DESDE_MES} a ${ABONO_VIGENCIA_MESES}`,
		icon: SVG.refresh(W, 16),
		heading: "Reponés tus firmas",
		body: `
      <div style="font-size:8.5pt;color:rgba(255,255,255,0.85);line-height:1.5;margin-bottom:0.2cm;">
        Tus packs contratados renuevan su bolsa de firmas cada mes, con un abono fijo y previsible.
      </div>
      ${discountBadge(`${(DESCUENTO_ABONO * 100).toFixed(0)}% de ahorro sobre precio de lista`)}
      ${bigPrice({
				dark: true, perMes: true,
				label: "Abono mensual",
				value: showIva ? fmGross(res.abonoMes, currency, tc) : fm(res.abonoMes, currency, tc),
				note: `Precio de lista (${fm(lista, currency, tc)}) × ${((1 - DESCUENTO_ABONO) * 100).toFixed(0)}%${showIva ? ` · IVA 21% incluido (neto ${fm(res.abonoMes, currency, tc)})` : ""}`,
			})}
    `,
	}) : "";

	const schedule = abonoActivo ? scheduleBar({
		mes1Value: showIva ? fmGross(neto, currency, tc) : fm(neto, currency, tc),
		abonoValue: showIva ? fmGross(res.abonoMes, currency, tc) : fm(res.abonoMes, currency, tc),
		totalValue: showIva ? fmGross(abonoVigenciaTotal, currency, tc) : fm(abonoVigenciaTotal, currency, tc),
		totalNote: "No se abona por adelantado: se paga mes a mes durante la vigencia.",
	}) : "";

	return commercialSlide({
		kicker: "Modelo comercial · precio de lista con descuento",
		title: "Tu propuesta a medida",
		subtitle: showIva ? "Precios expresados en pesos argentinos. IVA discriminado al 21%." : null,
		chips,
		cardsHtml: momento1 + momento2,
		scheduleHtml: schedule,
		pageN: 3,
	});
}

// ─── SLIDE 3: MODELO COMERCIAL — B2B2C ───────────────────────────────────────
function s3B2B2C(deal, clientName, currency, tc, channelConfig, pageN) {
	const inp = deal.inputs || {};
	const res = deal.resumen || {};
	const sinApi = inp.integracion === "sin_api";
	// La Cotizadora B2B2C no tiene (todavía) un selector de modalidad única/recurrente:
	// el volumen de IDC es un dato neutro. No hay que asumir periodicidad que no se configuró.
	const showIva = currency === "ARS"; // desglose s/IVA y c/IVA solo aplica a cotizaciones en pesos
	const apiTiers = (channelConfig && channelConfig.b2b2cApiTiers) || [];
	const slaPlans = (channelConfig && channelConfig.slaPlans) || [];
	const api = [...apiTiers].reverse().find(t => (Number(inp.fee)||0) >= t.feeMin) || apiTiers[0] || { label: "API Standard" };
	const sla = slaPlans.find(s => s.id === inp.slaId) || slaPlans[0] || { label: "Standard", precioMes: 0, desc: "" };

	// precioIDC es un valor unitario chico (ej. USD 0.65): se formatea aparte de fm/fmGross para no perder los decimales.
	const precioIDC = res.precioIDC != null ? res.precioIDC : 0;
	const precioIDCFmt = currency === "ARS"
		? "$ " + Math.round(precioIDC * tc).toLocaleString("es-AR")
		: "USD " + precioIDC.toFixed(2);

	// Cantidades: cada IDC incluye 1 certificado; las firmas se informan en totales.
	const idc = Number(inp.idcMensuales) || 0;
	const inclPorIDC = Number(inp.firmasInclPorIDC) || 0;
	const adicPorIDC = Number(inp.firmasAdicPorIDC) || 0;
	const firmasIncl = idc * inclPorIDC;
	const firmasAdicTotal = idc * adicPorIDC;
	const precioFirmaAdicN = Number(inp.precioFirmaAdic) || 0;
	// Precio de firma a precio de lista (mes 1, sin el 35% del abono). Se formatea
	// aparte como precioIDC: es un decimal chico y fm/USD lo redondearía a entero.
	const precioFirmaFmt = currency === "ARS"
		? "$ " + Math.round(precioFirmaAdicN * tc).toLocaleString("es-AR")
		: "USD " + precioFirmaAdicN.toFixed(2);

	// Desglose del mes 1 (activación): certificados + bolsa inicial de firmas a precio
	// de lista + firmas adicionales. El 35% de descuento aplica recién al abono (mes 2
	// en adelante); por eso las firmas del mes 1 van a precio de lista.
	const revIDC = idc * precioIDC;
	const revFirmasIncl = firmasIncl * precioFirmaAdicN;
	const revFirmasAdic = firmasAdicTotal * precioFirmaAdicN;
	const slaMesVal = sinApi || inp.slaBonificado ? 0 : (sla.precioMes || 0);
	const feeVal = sinApi ? 0 : (Number(inp.fee) || 0);
	const subtotal = revIDC + revFirmasIncl + revFirmasAdic + slaMesVal + feeVal;
	const items = [
		{ l: `Certificados (${idc.toLocaleString("es-AR")} × ${precioIDCFmt})`, v: revIDC },
		...(revFirmasIncl > 0 ? [{ l: `Firmas incluidas (${firmasIncl.toLocaleString("es-AR")} × ${precioFirmaFmt})`, v: revFirmasIncl }] : []),
		...(revFirmasAdic > 0 ? [{ l: `Firmas adicionales (${firmasAdicTotal.toLocaleString("es-AR")} × ${precioFirmaFmt})`, v: revFirmasAdic }] : []),
		...(slaMesVal > 0 ? [{ l: `Soporte / SLA (${sla.label})`, v: slaMesVal }] : []),
		...(feeVal > 0 ? [{ l: "Fee de implementación (única vez)", v: feeVal }] : []),
	];
	// Abono: repone la bolsa de firmas incluidas desde el mes 2, durante la vigencia del certificado.
	// El volumen de IDC no se asume recurrente por sí solo — recurre a partir de que se activa el abono.
	// Precio del abono = precio de firma adicional con el descuento; se muestra la cuenta completa
	// (cantidad × precio) para que el monto nunca aparezca como un número sin origen visible.
	const abonoActivo = !!inp.abono && (res.revAbonoMes || 0) > 0;
	const abonoMensual = abonoActivo ? res.revAbonoMes : 0;
	const precioAbonoUnit = precioFirmaAdicN * (1 - DESCUENTO_ABONO);
	const abonoVigenciaTotal = abonoActivo ? subtotal + abonoMensual * (ABONO_VIGENCIA_MESES - 1) : 0;

	const chips = [
		chip(SVG.idcard(B, 15), `<strong>${idc.toLocaleString("es-AR")}</strong> identidades (IDC)`),
		chip(SVG.shield(B, 15), `<strong>1</strong> certificado c/u`),
		chip(SVG.checkSquare(B, 15), `<strong>${inclPorIDC}</strong> firma${inclPorIDC === 1 ? "" : "s"} incl. c/u`),
		chip(SVG.calendar(B, 15), `<strong>${ABONO_VIGENCIA_MESES} meses</strong> de vigencia`),
	];

	// Cuando hay un único concepto (solo IDC, sin fee/SLA/firmas adicionales), el
	// desglose se reduce a una sola cuenta "cantidad × precio" — sin listar items.
	const singleItem = items.length === 1;
	const subtotalLabel = singleItem ? `Subtotal (${idc.toLocaleString("es-AR")} × ${precioIDCFmt})` : "Subtotal (sin IVA)";
	const itemsListHtml = !singleItem ? items.map(it => `<div style="display:flex;justify-content:space-between;font-size:8.5pt;">
      <span style="color:${GR};">${it.l}</span>
      <span style="color:${DK};font-weight:600;">${fm(it.v, currency, tc)}</span>
    </div>`).join("") : "";
	const stats = [{ label: subtotalLabel, value: fm(subtotal, currency, tc) }];
	if (showIva) stats.push({ label: "IVA (21%)", value: fm(subtotal * IVA_RATE, currency, tc) });

	const momento1 = momentoCard({
		dark: false,
		kicker: "Momento 1 · mes 1",
		icon: SVG.shield(B, 16),
		heading: "Activás tus identidades",
		body: `
      <div style="font-size:8.5pt;color:${GR};line-height:1.5;margin-bottom:0.22cm;">
        Comprás las ${idc.toLocaleString("es-AR")} identidades: cada una con su certificado y ${inclPorIDC === 1 ? "su primera firma" : `sus ${inclPorIDC} firmas`} de activación${inclPorIDC > 0 ? ` (${firmasIncl.toLocaleString("es-AR")} firmas en total)` : ""}.
      </div>
      ${itemsListHtml ? `<div style="display:flex;flex-direction:column;gap:0.14cm;margin-bottom:0.05cm;">${itemsListHtml}</div>` : ""}
      ${bigPrice({
				dark: false,
				label: abonoActivo ? "Pago único de activación" : "Total a pagar",
				value: showIva ? fmGross(subtotal, currency, tc) : fm(subtotal, currency, tc),
				note: showIva ? "IVA 21% incluido" : null,
			})}
      ${miniStats(false, stats)}
    `,
	});

	const momento2 = abonoActivo ? momentoCard({
		dark: true,
		kicker: `Momento 2 · mes ${ABONO_DESDE_MES} a ${ABONO_VIGENCIA_MESES}`,
		icon: SVG.refresh(W, 16),
		heading: "Reponés tus firmas",
		body: `
      <div style="font-size:8.5pt;color:rgba(255,255,255,0.85);line-height:1.5;margin-bottom:0.2cm;">
        Tu bolsa de ${firmasIncl.toLocaleString("es-AR")} firmas se renueva cada mes, con un abono fijo y previsible.
      </div>
      ${discountBadge(`${(DESCUENTO_ABONO * 100).toFixed(0)}% de ahorro · ${fm(precioAbonoUnit, currency, tc)} en vez de ${fm(precioFirmaAdicN, currency, tc)} por firma`)}
      ${bigPrice({
				dark: true, perMes: true,
				label: "Abono mensual",
				value: showIva ? fmGross(abonoMensual, currency, tc) : fm(abonoMensual, currency, tc),
				note: `${firmasIncl.toLocaleString("es-AR")} firmas × ${fm(precioAbonoUnit, currency, tc)}${showIva ? ` · IVA 21% incluido (neto ${fm(abonoMensual, currency, tc)})` : ""}`,
			})}
    `,
	}) : "";

	const schedule = abonoActivo ? scheduleBar({
		mes1Value: showIva ? fmGross(subtotal, currency, tc) : fm(subtotal, currency, tc),
		abonoValue: showIva ? fmGross(abonoMensual, currency, tc) : fm(abonoMensual, currency, tc),
		totalValue: showIva ? fmGross(abonoVigenciaTotal, currency, tc) : fm(abonoVigenciaTotal, currency, tc),
		totalNote: "No se abona por adelantado: se paga mes a mes durante la vigencia.",
	}) : "";

	const subtitleParts = [sinApi ? "Cotización de volumen directo, sin integración API" : `Integración ${api.label} · incluye fee de implementación y soporte ${sla.label}`];
	if (showIva) subtitleParts.push("precios en pesos argentinos, IVA discriminado al 21%");

	return commercialSlide({
		kicker: "Modelo comercial · volumen IDC",
		title: "Tu propuesta a medida",
		subtitle: subtitleParts.join(" · "),
		chips,
		cardsHtml: momento1 + momento2,
		scheduleHtml: schedule,
		pageN: pageN || 3,
	});
}

// ─── SLIDE 4: PRÓXIMOS PASOS ──────────────────────────────────────────────────
function s4Pasos(clientName, sinApi, pageN) {
	const steps = sinApi
		? [
			{ n:"01", icon: SVG.file( W, 20), title:"Aceptación de la propuesta", desc:"Revisión y firma de la propuesta comercial y sus condiciones.",                dark:false },
			{ n:"02", icon: SVG.users(W, 20), title:"Alta y emisión",             desc:"Alta de los usuarios y emisión de las identidades digitales cotizadas.",       dark:false },
			{ n:"03", icon: SVG.zap(  W, 20), title:"Puesta en marcha",           desc:`Entrega del volumen solicitado y puesta en marcha de la firma digital en ${clientName}.`, dark:true  },
		]
		: [
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
  ${foot(pageN || 4)}
</div>`;
}

// ─── SLIDE 5: CIERRE ──────────────────────────────────────────────────────────
function s5Cierre(sinApi) {
	return `<div class="slide" style="background:${B};">
  <!-- decorative circle -->
  <div style="position:absolute;bottom:-3.5cm;left:-2cm;width:12cm;height:12cm;border-radius:50%;background:rgba(255,255,255,0.05);"></div>

  <!-- main content -->
  <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 1.3cm;">
    <div style="font-size:8.5pt;font-weight:700;color:${BLT};text-transform:uppercase;letter-spacing:1.5px;margin-bottom:0.3cm;">Gracias por su tiempo</div>
    <div style="font-size:36pt;font-weight:700;color:${W};line-height:1.1;margin-bottom:0.4cm;">Muchas gracias</div>
    <div style="font-size:10pt;color:rgba(255,255,255,0.7);line-height:1.6;max-width:14cm;">${sinApi ? "Quedamos a disposición para avanzar con la propuesta." : "Quedamos a disposición para avanzar con la integración."}</div>
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
	// Cotizaciones de volumen sin integración API: la propuesta omite la slide de
	// integración y el lenguaje técnico (fee, SLA, kick-off) — solo el volumen cotizado.
	const sinApi = deal.channel === "b2b2c" && deal.inputs?.integracion === "sin_api";
	const s3 = deal.channel === "b2b2c"
		? s3B2B2C(deal, clientName, currency, tc, channelConfig, sinApi ? 2 : 3)
		: s3Dist(deal, clientName, currency, tc, channelConfig, models);

	return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Propuesta Comercial — ${clientName}</title>
<style>${SLIDE_CSS}</style>
</head>
<body>
${s1Cover(clientName, deal.fecha, sinApi)}
${sinApi ? "" : s2Integracion(clientName)}
${s3}
${s4Pasos(clientName, sinApi, sinApi ? 3 : 4)}
${s5Cierre(sinApi)}
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
