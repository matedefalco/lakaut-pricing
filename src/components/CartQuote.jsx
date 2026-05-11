import { useState, useMemo } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, OKBG, WN, WNBG, ER, os, mont } from "../theme/tokens";
import { makeMoney } from "../utils/useMoney";
import { useModels } from "../context/ModelsContext";
import { NumInput } from "./ui/NumInput";

const PAYWALL_PCT = 0.002;
const MARGIN_PRESETS = [30, 40, 50, 60];

// Cost-based price: CV / (1 - margin%)
function computeRow(firmas, certs, periodo, marginTarget, costs) {
	const cvPack = certs * costs.cvCertBase + firmas * costs.cvFirmaBase;
	const priceSug = marginTarget < 100 ? cvPack / (1 - marginTarget / 100) : cvPack * 2;
	const margenPack = priceSug - cvPack;
	const pricePerFirma = firmas > 0 ? priceSug / firmas : 0;
	const pricePerCert = certs > 0 ? priceSug / certs : 0;
	return { cvPack, priceSug, margenPack, pricePerFirma, pricePerCert };
}

function findBestPlan(segment, firmas, certs, vigencia, models) {
	if (vigencia !== 24) return null;
	const byId = function (id) { return models.find(function (m) { return m.id === id; }); };
	if (segment === "persona") {
		if (certs > 1) return null;
		return firmas <= 10 ? (byId("smart") || null) : (byId("profesional") || null);
	}
	if (segment === "empresa") {
		if (certs <= 1 && firmas <= 300) return byId("pyme") || null;
		if (certs <= 4 && firmas <= 2000) return byId("enterprise") || null;
	}
	return null;
}

// ─── Formal commercial proposal export ────────────────────────────────────────
function openProposalWindow({ profile, firmaType, pay, items, subtotal, paywall, total, currency, tc }) {
	var date = new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
	var validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
	var fmt = function (n) {
		return currency === "ARS"
			? "$ " + Math.round(n * tc).toLocaleString("es-AR")
			: "USD " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	};

	var profileLabel = profile === "persona" ? "Persona / Profesional" : "Empresa / Organización";
	var firmaTypeLabel = profile === "empresa"
		? (firmaType === "humana" ? "Firma humana — certificados individuales" : "Firma empresa — persona jurídica")
		: "Firma personal";
	var payLabel = pay === "tarjeta" ? "Tarjeta de crédito/débito (+ 0.2% Paywall)" : "Transferencia / efectivo";

	var rowsHtml = items.map(function (item) {
		var perFirma = item.effectiveFirmas > 0 ? fmt(item.unitPrice / item.effectiveFirmas) : "-";
		var perCert = item.certs > 0 ? fmt(item.unitPrice / item.certs) : "-";
		return [
			"<tr>",
			"<td>" + item.planLabel + (item.isCustom ? " <span class='badge'>a medida</span>" : "") + "</td>",
			"<td style='text-align:center'>" + item.certs + "</td>",
			"<td style='text-align:right'>" + item.effectiveFirmas.toLocaleString("es-AR") + "</td>",
			"<td style='text-align:right'>" + perFirma + "</td>",
			"<td style='text-align:right'>" + perCert + "</td>",
			"<td style='text-align:right'>" + item.vigencia + " meses</td>",
			item.qty > 1 ? "<td style='text-align:center'>" + item.qty + "</td>" : "<td style='text-align:center'>1</td>",
			"<td style='text-align:right;font-weight:700'>" + fmt(item.unitPrice * item.qty) + "</td>",
			"</tr>",
		].join("");
	}).join("");

	var html = [
		"<!DOCTYPE html><html lang='es'><head>",
		"<meta charset='UTF-8'>",
		"<title>Propuesta Comercial — Lakaut</title>",
		"<style>",
		"body{font-family:Arial,sans-serif;margin:48px;color:#111;font-size:13px;line-height:1.6;max-width:860px}",
		"h1{color:#3949ab;margin:0;font-size:24px}",
		"h2{font-size:13px;text-transform:uppercase;letter-spacing:0.6px;color:#64748b;margin:0 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}",
		".header{margin-bottom:28px}",
		".subtitle{font-size:15px;font-weight:700;margin-top:4px;color:#1e293b}",
		".meta{font-size:12px;color:#64748b;margin-top:6px}",
		".intro{background:#f8fafc;border-left:4px solid #3949ab;padding:14px 18px;margin:20px 0;font-size:13px;color:#1e293b;border-radius:0 6px 6px 0}",
		".section{margin:24px 0}",
		".profile-table{border-collapse:collapse;width:100%}",
		".profile-table td{padding:4px 8px 4px 0;vertical-align:top}",
		".profile-table td:first-child{color:#64748b;width:38%}",
		".prop-table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}",
		".prop-table th{background:#1e293b;color:white;padding:8px 10px;font-size:11px;font-weight:700;text-align:right;letter-spacing:0.3px}",
		".prop-table th:first-child{text-align:left}",
		".prop-table td{padding:8px 10px;border-bottom:1px solid #e2e8f0;vertical-align:middle}",
		".prop-table tr:last-child td{border-bottom:none}",
		".prop-table tr:nth-child(even){background:#f8fafc}",
		".badge{background:#e2e8f0;color:#64748b;font-size:9px;font-weight:700;padding:1px 6px;border-radius:10px;text-transform:uppercase;letter-spacing:0.4px;margin-left:4px}",
		".total-section{margin-top:16px;border-top:2px solid #1e293b;padding-top:12px;display:flex;flex-direction:column;align-items:flex-end;gap:4px}",
		".total-row{display:flex;gap:24px;font-size:12px;color:#64748b}",
		".grand-total{font-size:18px;font-weight:700;color:#3949ab;margin-top:4px}",
		".conditions{margin-top:28px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px 18px}",
		".conditions ul{margin:6px 0;padding-left:18px}",
		".conditions li{margin-bottom:4px;font-size:12px;color:#475569}",
		".footer{margin-top:32px;border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#94a3b8;text-align:center}",
		"@media print{body{margin:24px}button{display:none}}",
		"</style></head><body>",
		"<div class='header'>",
		"<h1>LAKAUT</h1>",
		"<div class='subtitle'>Propuesta Comercial · Firma Digital</div>",
		"<div class='meta'>Fecha de emisión: <strong>" + date + "</strong> &nbsp;·&nbsp; Válida hasta: <strong>" + validUntil + "</strong></div>",
		"</div>",

		"<div class='intro'>",
		"A continuación les compartimos nuestra propuesta comercial para servicios de firma digital, según los parámetros indicados. Los precios incluyen certificados digitales, firmas y plataforma de gestión documental.",
		"</div>",

		"<div class='section'>",
		"<h2>Datos del cliente</h2>",
		"<table class='profile-table'>",
		"<tr><td>Tipo de cliente:</td><td><strong>" + profileLabel + "</strong></td></tr>",
		"<tr><td>Modalidad de firma:</td><td><strong>" + firmaTypeLabel + "</strong></td></tr>",
		"<tr><td>Forma de pago:</td><td><strong>" + payLabel + "</strong></td></tr>",
		"</table>",
		"</div>",

		"<div class='section'>",
		"<h2>Detalle de la propuesta</h2>",
		"<table class='prop-table'>",
		"<thead><tr>",
		"<th>Plan / Descripción</th>",
		"<th style='text-align:center'>Certs.</th>",
		"<th>Firmas</th>",
		"<th>$ / Firma</th>",
		"<th>$ / Cert.</th>",
		"<th>Vigencia</th>",
		"<th style='text-align:center'>Cant.</th>",
		"<th>Total</th>",
		"</tr></thead>",
		"<tbody>" + rowsHtml + "</tbody>",
		"</table>",

		"<div class='total-section'>",
		pay === "tarjeta" ? "<div class='total-row'><span>Subtotal</span><span>" + fmt(subtotal) + "</span></div>" : "",
		pay === "tarjeta" ? "<div class='total-row'><span>Paywall (0.2%)</span><span>+ " + fmt(paywall) + "</span></div>" : "",
		"<div class='grand-total'>TOTAL: " + fmt(total) + "</div>",
		currency === "USD" ? "<div style='font-size:11px;color:#94a3b8;margin-top:2px'>≈ $ " + Math.round(total * tc).toLocaleString("es-AR") + " ARS (referencial)</div>" : "",
		"</div>",
		"</div>",

		"<div class='conditions'>",
		"<strong style='font-size:13px'>Condiciones comerciales</strong>",
		"<ul>",
		"<li>Los precios están expresados en " + (currency === "ARS" ? "pesos argentinos" : "dólares estadounidenses (USD)") + " y no incluyen impuestos (IVA / retenciones).</li>",
		"<li>Esta propuesta tiene vigencia de 30 días a partir de la fecha de emisión.</li>",
		"<li>Los planes incluyen certificado digital, plataforma de gestión documental y soporte técnico.</li>",
		"<li>Las firmas indicadas son el volumen incluido en la vigencia del pack. Firmas adicionales disponibles bajo pedido.</li>",
		"<li>Sujeto a revisión comercial final por parte del equipo de Lakaut.</li>",
		"</ul>",
		"<div style='margin-top:8px;font-size:12px'>Para consultas o contratar: <strong>ventas@lakaut.com.ar</strong></div>",
		"</div>",

		"<div class='footer'>Generado con Cotizador Lakaut · " + date + "</div>",
		"<div style='margin-top:20px'>",
		"<button onclick='window.print()' style='padding:10px 22px;background:#3949ab;color:white;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:700;font-family:Arial,sans-serif'>Imprimir / Guardar PDF</button>",
		"</div>",
		"</body></html>",
	].join("");

	var w = window.open("", "_blank", "width=920,height=750");
	if (w) { w.document.write(html); w.document.close(); }
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
function ChoiceBtn({ label, desc, active, onClick }) {
	return (
		<button onClick={onClick} style={{ padding: "10px 16px", borderRadius: 10, textAlign: "left", background: active ? BLUE : WHITE, border: "1.5px solid " + (active ? BLUE : BORD), cursor: "pointer", flex: "1 1 140px" }}>
			<div style={os(13, 700, active ? WHITE : BLACK)}>{label}</div>
			{desc && <div style={os(11, 400, active ? "#c5cbf7" : GRAY)}>{desc}</div>}
		</button>
	);
}

function FieldLabel({ text }) {
	return (
		<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 })}>
			{text}
		</div>
	);
}

function SegmentedControl({ options, value, onChange }) {
	return (
		<div style={{ display: "inline-flex", border: "1.5px solid " + BORD, borderRadius: 8, overflow: "hidden" }}>
			{options.map(function (opt, i) {
				return (
					<button key={opt.k} onClick={function () { onChange(opt.k); }} style={{ padding: "6px 14px", background: value === opt.k ? BLUE : WHITE, color: value === opt.k ? WHITE : GRAY, border: "none", borderLeft: i > 0 ? "1px solid " + BORD : "none", cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
						{opt.label}
					</button>
				);
			})}
		</div>
	);
}

// ─── Main component ────────────────────────────────────────────────────────────
export function CartQuote({ costs, currency, tc }) {
	const { models } = useModels();

	// Configurator state
	const [segment, setSegment] = useState("persona");
	const [firmaType, setFirmaType] = useState("juridica");
	const [certs, setCerts] = useState(1);
	const [firmaMode, setFirmaMode] = useState("total");
	const [firmasTotal, setFirmasTotal] = useState(10);
	const [firmasPerCert, setFirmasPerCert] = useState(10);
	const [vigencia, setVigencia] = useState(24);
	const [qty, setQty] = useState(1);
	const [marginTarget, setMarginTarget] = useState(40);
	const [useCustomMargin, setUseCustomMargin] = useState(false);

	// Order state
	const [cart, setCart] = useState([]);
	const [pay, setPay] = useState("transferencia");
	const [addedFlash, setAddedFlash] = useState(false);

	const { fMoney2 } = makeMoney(currency, tc);

	const effectiveFirmas = firmaMode === "total" ? firmasTotal : certs * firmasPerCert;

	const plan = useMemo(function () {
		return findBestPlan(segment, effectiveFirmas, certs, vigencia, models);
	}, [segment, effectiveFirmas, certs, vigencia, models]);

	const costRow = useMemo(function () {
		return computeRow(effectiveFirmas, certs, vigencia, marginTarget, costs);
	}, [effectiveFirmas, certs, vigencia, marginTarget, costs]);

	// For standard plans: show plan price; for custom: use cost-based price
	const isCustom = !plan;
	const unitPrice = plan ? plan.priceUSD : costRow.priceSug;
	const pricePerFirma = effectiveFirmas > 0 ? unitPrice / effectiveFirmas : 0;
	const pricePerCert = certs > 0 ? unitPrice / certs : 0;
	const col = plan ? plan.color : "#475569";

	const ilimitadasThreshold = plan && plan.ilimitadas
		? (function () {
			var periodo = plan.vigencia || 24;
			var revMes = plan.priceUSD / periodo;
			var available = revMes - costs.cvCertBase / periodo;
			return available > 0 ? Math.floor(available / costs.cvFirmaBase) : 0;
		})()
		: null;

	function addToCart() {
		setCart(function (prev) {
			return [...prev, {
				id: Date.now(),
				planLabel: plan ? plan.label : "Plan a medida",
				col: col,
				isCustom: isCustom,
				segment: segment,
				firmaType: segment === "empresa" ? firmaType : null,
				certs: certs,
				effectiveFirmas: effectiveFirmas,
				vigencia: vigencia,
				qty: qty,
				unitPrice: unitPrice,
				marginTarget: isCustom ? marginTarget : null,
			}];
		});
		setAddedFlash(true);
		setTimeout(function () { setAddedFlash(false); }, 1400);
	}

	function removeFromCart(id) {
		setCart(function (prev) { return prev.filter(function (item) { return item.id !== id; }); });
	}

	var cartSubtotal = cart.reduce(function (sum, item) { return sum + item.unitPrice * item.qty; }, 0);
	var cartPaywall = pay === "tarjeta" ? cartSubtotal * PAYWALL_PCT : 0;
	var cartTotal = cartSubtotal + cartPaywall;

	const PAY_OPTS = [
		{ k: "transferencia", label: "Transferencia" },
		{ k: "tarjeta", label: "Tarjeta · +0.2%" },
	];

	return (
		<div>
			<div style={{ display: "flex", gap: 20, alignItems: "start", flexWrap: "wrap" }}>

				{/* ─── Configurador ──────────────────────────────────────────────────── */}
				<div style={{ background: WHITE, border: "1px solid " + BORD, borderRadius: 14, padding: 20, display: "flex", flexDirection: "column", gap: 20, flex: "0 0 300px", minWidth: 280 }}>
					<div style={Object.assign({}, mont(15), { color: BLACK })}>Configurá tu pack</div>

					{/* Segment */}
					<div>
						<FieldLabel text="¿Quién firma?" />
						<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
							<ChoiceBtn label="Persona / Profesional" desc="Uso individual" active={segment === "persona"} onClick={function () { setSegment("persona"); }} />
							<ChoiceBtn label="Empresa / Organización" desc="Múltiples firmantes" active={segment === "empresa"} onClick={function () { setSegment("empresa"); }} />
						</div>
					</div>

					{/* FirmaType (empresa only) */}
					{segment === "empresa" && (
						<div>
							<FieldLabel text="Modalidad de firma" />
							<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
								<ChoiceBtn label="Persona jurídica" desc="Sello empresa" active={firmaType === "juridica"} onClick={function () { setFirmaType("juridica"); }} />
								<ChoiceBtn label="Firma humana" desc="Certificados individuales" active={firmaType === "humana"} onClick={function () { setFirmaType("humana"); }} />
							</div>
						</div>
					)}

					{/* Certs */}
					<div>
						<FieldLabel text="Certificados digitales" />
						<NumInput value={certs} onChange={function (v) { setCerts(Math.max(1, Math.round(v))); }} suffix="cert" />
						{certs > 1 && segment === "persona" && (
							<div style={Object.assign({}, os(10, 400, WN), { marginTop: 4 })}>Múltiples certificados para persona — se generará una cotización a medida.</div>
						)}
						{certs > 4 && segment === "empresa" && firmaType === "juridica" && (
							<div style={Object.assign({}, os(10, 400, WN), { marginTop: 4 })}>Supera el plan ENTERPRISE (4 certs). Se cotizará a medida.</div>
						)}
					</div>

					{/* Firmas */}
					<div>
						<FieldLabel text="Firmas digitales" />
						<div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
							{["total", "perCert"].map(function (m) {
								return (
									<button key={m} onClick={function () { setFirmaMode(m); }} style={{ padding: "4px 12px", borderRadius: 20, border: "1.5px solid " + (firmaMode === m ? BLUE : BORD), background: firmaMode === m ? BLUEL : WHITE, color: firmaMode === m ? BLUE : GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
										{m === "total" ? "Total" : "Por certificado"}
									</button>
								);
							})}
						</div>
						{firmaMode === "total"
							? <NumInput value={firmasTotal} onChange={setFirmasTotal} suffix="firmas" />
							: (
								<div>
									<NumInput value={firmasPerCert} onChange={setFirmasPerCert} suffix="firmas / cert" />
									<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 4 })}>
										Total: {certs} × {firmasPerCert} = <strong>{effectiveFirmas.toLocaleString("es-AR")}</strong> firmas
									</div>
								</div>
							)
						}
					</div>

					{/* Vigencia */}
					<div>
						<FieldLabel text="Vigencia" />
						<div style={{ display: "flex", gap: 8 }}>
							{[24, 12].map(function (v) {
								return (
									<button key={v} onClick={function () { setVigencia(v); }} style={{ padding: "8px 0", borderRadius: 8, border: "1.5px solid " + (vigencia === v ? BLUE : BORD), background: vigencia === v ? BLUE : WHITE, color: vigencia === v ? WHITE : GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", flex: 1 }}>
										{v} meses
									</button>
								);
							})}
						</div>
						{vigencia !== 24 && (
							<div style={Object.assign({}, os(10, 400, WN), { marginTop: 6 })}>Los planes estándar son a 24 meses. Se generará una cotización personalizada.</div>
						)}
					</div>

					{/* Margin target */}
					<div>
						<FieldLabel text="Margen de ganancia objetivo" />
						<div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
							{MARGIN_PRESETS.map(function (m) {
								var act = m === marginTarget && !useCustomMargin;
								return (
									<button key={m} onClick={function () { setMarginTarget(m); setUseCustomMargin(false); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid " + (act ? BLUE : BORD), background: act ? BLUE : WHITE, color: act ? WHITE : GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
										{m}%
									</button>
								);
							})}
							{!useCustomMargin
								? (
									<button onClick={function () { setUseCustomMargin(true); }} style={{ padding: "5px 10px", borderRadius: 6, border: "1.5px solid " + BORD, background: WHITE, color: GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
										Otro…
									</button>
								)
								: (
									<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
										<input
											type="number"
											value={marginTarget}
											min={1}
											max={99}
											onChange={function (e) { setMarginTarget(Math.max(1, Math.min(99, Number(e.target.value) || 40))); }}
											style={{ width: 56, padding: "5px 8px", border: "1.5px solid " + BLUE, borderRadius: 6, fontFamily: "'Open Sans',sans-serif", fontSize: 11, color: BLACK, outline: "none" }}
										/>
										<span style={os(11, 400, GRAY)}>%</span>
										<button onClick={function () { setUseCustomMargin(false); }} style={{ padding: "3px 7px", border: "1px solid " + BORD, borderRadius: 4, background: WHITE, color: GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 10, cursor: "pointer" }}>✕</button>
									</div>
								)
							}
						</div>
						{isCustom && (
							<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 6 })}>
								CV pack: {fMoney2(costRow.cvPack)} · Precio al {marginTarget}%: {fMoney2(costRow.priceSug)}
							</div>
						)}
					</div>

					{/* Qty */}
					<div>
						<FieldLabel text="Cantidad de packs" />
						<NumInput value={qty} onChange={function (v) { setQty(Math.max(1, Math.round(v))); }} suffix="pack(s)" />
					</div>
				</div>

				{/* ─── Resultado ──────────────────────────────────────────────────────── */}
				<div style={{ flex: "1 1 300px", minWidth: 0, background: WHITE, border: "2px solid " + col, borderRadius: 14, overflow: "hidden" }}>
					{/* Header */}
					<div style={{ background: col, padding: "18px 20px" }}>
						{isCustom ? (
							<>
								<div style={Object.assign({}, os(10, 700, WHITE), { opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 })}>Cotización personalizada</div>
								<div style={Object.assign({}, mont(20), { color: WHITE })}>Plan a medida</div>
								<div style={Object.assign({}, os(12, 400, WHITE), { opacity: 0.85, marginTop: 4 })}>Precio basado en costos al {marginTarget}% de margen objetivo.</div>
							</>
						) : (
							<>
								<div style={Object.assign({}, os(10, 700, WHITE), { opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 })}>✓ Plan recomendado</div>
								<div style={Object.assign({}, mont(20), { color: WHITE })}>{plan.label}</div>
								<div style={Object.assign({}, os(12, 400, WHITE), { opacity: 0.85, marginTop: 4 })}>{plan.tagline}</div>
							</>
						)}
					</div>

					{/* Precio principal */}
					<div style={{ padding: "16px 20px", borderBottom: "1px solid " + BORD }}>
						<div style={os(10, 400, GRAY)}>Precio por pack</div>
						<div style={Object.assign({}, mont(32), { color: col, lineHeight: 1.1, marginTop: 4 })}>{fMoney2(unitPrice)}</div>
						{currency === "USD" && <div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>{"≈ $ " + Math.round(unitPrice * tc).toLocaleString("es-AR") + " ARS"}</div>}
						{currency === "ARS" && <div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>{"USD " + unitPrice}</div>}
						<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 4 })}>
							{isCustom ? "Vigencia " + vigencia + " meses · " + marginTarget + "% margen objetivo" : plan.priceNote}
						</div>

						{/* Unit economics — consistent pricing */}
						<div style={{ display: "flex", gap: 20, marginTop: 12, paddingTop: 10, borderTop: "1px solid " + BORD, flexWrap: "wrap" }}>
							<div>
								<div style={os(9, 400, GRAY)}>Precio x firma</div>
								<div style={Object.assign({}, mont(14), { color: col })}>{fMoney2(pricePerFirma)}</div>
							</div>
							<div>
								<div style={os(9, 400, GRAY)}>Precio x certificado</div>
								<div style={Object.assign({}, mont(14), { color: col })}>{fMoney2(pricePerCert)}</div>
							</div>
							<div>
								<div style={os(9, 400, GRAY)}>Firmas incluidas</div>
								<div style={Object.assign({}, mont(14), { color: GRAY })}>{effectiveFirmas.toLocaleString("es-AR")}</div>
							</div>
							<div>
								<div style={os(9, 400, GRAY)}>Certificados</div>
								<div style={Object.assign({}, mont(14), { color: GRAY })}>{certs}</div>
							</div>
						</div>

						{/* Cost comparison for custom */}
						{isCustom && (
							<div style={{ marginTop: 8, padding: "8px 10px", background: "#f8fafc", borderRadius: 6, display: "flex", gap: 16, flexWrap: "wrap" }}>
								<div>
									<div style={os(9, 400, GRAY)}>CV pack</div>
									<div style={os(11, 700, "#b45309")}>{fMoney2(costRow.cvPack)}</div>
								</div>
								<div>
									<div style={os(9, 400, GRAY)}>Margen bruto</div>
									<div style={os(11, 700, "#16a34a")}>{fMoney2(costRow.margenPack)}</div>
								</div>
								<div>
									<div style={os(9, 400, GRAY)}>Margen %</div>
									<div style={os(11, 700, "#16a34a")}>{marginTarget}%</div>
								</div>
							</div>
						)}
						{/* Plan vs cost comparison */}
						{!isCustom && (
							<div style={{ marginTop: 8, padding: "6px 10px", background: "#f8fafc", borderRadius: 6 }}>
								<span style={os(10, 400, GRAY)}>Precio basado en costos al {marginTarget}%: </span>
								<span style={os(10, 700, "#475569")}>{fMoney2(costRow.priceSug)}</span>
							</div>
						)}
					</div>

					{/* Benefits / breakdown */}
					<div style={{ padding: "16px 20px", borderBottom: "1px solid " + BORD }}>
						<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 })}>
							{isCustom ? "Composición del precio" : "Qué incluye"}
						</div>
						{!isCustom ? (
							<div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
								{plan.benefits.map(function (b, i) {
									return (
										<div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
											<span style={Object.assign({}, os(13, 700, col), { flexShrink: 0, lineHeight: "18px" })}>✓</span>
											<span style={Object.assign({}, os(12, i === 0 ? 700 : 400, i === 0 ? col : BLACK), { lineHeight: "18px" })}>{b}</span>
										</div>
									);
								})}
							</div>
						) : (
							<div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
								{[
									{ l: "Setup y plataforma", v: fMoney2(50) },
									{ l: certs + (certs === 1 ? " certificado digital" : " certificados digitales"), v: fMoney2(certs * 10) },
									{ l: effectiveFirmas.toLocaleString("es-AR") + " firmas · margen " + marginTarget + "%", v: fMoney2(costRow.priceSug) },
								].map(function (row, i) {
									return (
										<div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
											<span style={os(12, 400, BLACK)}>{row.l}</span>
											<span style={os(12, 700, col)}>{row.v}</span>
										</div>
									);
								})}
							</div>
						)}
					</div>

					{/* Ilimitadas warning */}
					{ilimitadasThreshold !== null && (
						<div style={{ padding: "10px 20px", background: WNBG, borderBottom: "1px solid " + BORD }}>
							<div style={Object.assign({}, os(11, 700, WN), { marginBottom: 2 })}>⚠ Rentable hasta {ilimitadasThreshold} firmas / mes</div>
							<div style={os(10, 400, WN)}>Por encima de ese umbral el costo variable supera el ingreso del pack.</div>
						</div>
					)}

					{/* Qty summary */}
					{qty > 1 && (
						<div style={{ padding: "12px 20px", background: "#fafafa", borderBottom: "1px solid " + BORD }}>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={os(12, 400, GRAY)}>{qty} packs × {fMoney2(unitPrice)}</span>
								<span style={os(12, 700, BLACK)}>{fMoney2(unitPrice * qty)}</span>
							</div>
						</div>
					)}

					{/* Add to cart */}
					<div style={{ padding: "16px 20px" }}>
						<button
							onClick={addToCart}
							style={{ width: "100%", padding: "13px", background: addedFlash ? "#059669" : col, color: WHITE, border: "none", borderRadius: 10, fontFamily: "'Open Sans',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "background 0.2s" }}
						>
							{addedFlash ? "✓ Agregado a la cotización" : "+ Agregar a la cotización"}
						</button>
						{isCustom && (
							<div style={Object.assign({}, os(10, 400, GRAY), { textAlign: "center", marginTop: 8 })}>
								Precio estimado al {marginTarget}% de margen · El equipo de Lakaut confirmará la cotización final.
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ─── Cotización acumulada ────────────────────────────────────────────────── */}
			{cart.length > 0 && (
				<div style={{ marginTop: 24, background: WHITE, border: "1px solid " + BORD, borderRadius: 14, overflow: "hidden" }}>
					{/* Header */}
					<div style={{ padding: "14px 20px", borderBottom: "1px solid " + BORD, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
						<div style={Object.assign({}, mont(14), { color: BLACK })}>
							Cotización · {cart.length} {cart.length === 1 ? "ítem" : "ítems"}
						</div>
						<button onClick={function () { setCart([]); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 12, color: GRAY, padding: "4px 8px" }}>
							Vaciar
						</button>
					</div>

					{/* Items table */}
					<div style={{ overflowX: "auto" }}>
						<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
							<thead>
								<tr style={{ background: "#f8fafc" }}>
									<th style={Object.assign({}, os(9, 700, GRAY), { padding: "8px 16px", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 })}>Plan</th>
									<th style={Object.assign({}, os(9, 700, GRAY), { padding: "8px 12px", textAlign: "center", textTransform: "uppercase", letterSpacing: "0.5px" })}>Certs</th>
									<th style={Object.assign({}, os(9, 700, GRAY), { padding: "8px 12px", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.5px" })}>Firmas</th>
									<th style={Object.assign({}, os(9, 700, GRAY), { padding: "8px 12px", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.5px" })}>$ / Firma</th>
									<th style={Object.assign({}, os(9, 700, GRAY), { padding: "8px 12px", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.5px" })}>$ / Cert</th>
									<th style={Object.assign({}, os(9, 700, GRAY), { padding: "8px 12px", textAlign: "right", textTransform: "uppercase", letterSpacing: "0.5px" })}>Total</th>
									<th style={{ padding: "8px 12px" }}></th>
								</tr>
							</thead>
							<tbody>
								{cart.map(function (item, idx) {
									var pf = item.effectiveFirmas > 0 ? fMoney2(item.unitPrice / item.effectiveFirmas) : "—";
									var pc = item.certs > 0 ? fMoney2(item.unitPrice / item.certs) : "—";
									return (
										<tr key={item.id} style={{ background: idx % 2 === 1 ? "#fafafa" : WHITE, borderBottom: "1px solid " + BORD }}>
											<td style={{ padding: "12px 16px" }}>
												<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
													<div style={{ width: 4, height: 32, borderRadius: 4, background: item.col, flexShrink: 0 }} />
													<div>
														<div style={os(13, 700, BLACK)}>{item.planLabel}</div>
														<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 2 })}>
															{item.vigencia}m {item.qty > 1 ? "· ×" + item.qty : ""}
															{item.isCustom && <span style={{ marginLeft: 4, background: "#e2e8f0", color: GRAY, fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 8, textTransform: "uppercase" }}>a medida</span>}
														</div>
													</div>
												</div>
											</td>
											<td style={{ padding: "12px", textAlign: "center" }}>
												<span style={os(12, 400, GRAY)}>{item.certs}</span>
											</td>
											<td style={{ padding: "12px", textAlign: "right" }}>
												<span style={os(12, 400, BLACK)}>{item.effectiveFirmas.toLocaleString("es-AR")}</span>
											</td>
											<td style={{ padding: "12px", textAlign: "right", fontFamily: "Courier New,monospace" }}>
												<span style={os(12, 400, BLACK)}>{pf}</span>
											</td>
											<td style={{ padding: "12px", textAlign: "right", fontFamily: "Courier New,monospace" }}>
												<span style={os(12, 400, BLACK)}>{pc}</span>
											</td>
											<td style={{ padding: "12px", textAlign: "right" }}>
												<span style={os(13, 700, item.col)}>{fMoney2(item.unitPrice * item.qty)}</span>
											</td>
											<td style={{ padding: "12px" }}>
												<button onClick={function () { removeFromCart(item.id); }} style={{ background: "none", border: "1px solid " + BORD, borderRadius: 6, cursor: "pointer", color: GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 700, padding: "3px 8px" }}>×</button>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Footer */}
					<div style={{ padding: "16px 20px" }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
							{/* Payment method */}
							<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
								<span style={os(11, 700, GRAY)}>Pago:</span>
								<SegmentedControl options={PAY_OPTS} value={pay} onChange={setPay} />
							</div>

							{/* Total + actions */}
							<div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
								{pay === "tarjeta" && (
									<div style={{ textAlign: "right" }}>
										<div style={os(10, 400, GRAY)}>Subtotal</div>
										<div style={os(12, 700, BLACK)}>{fMoney2(cartSubtotal)}</div>
										<div style={os(10, 400, GRAY)}>Paywall +{fMoney2(cartPaywall)}</div>
									</div>
								)}
								<div style={{ textAlign: "right" }}>
									<div style={os(10, 700, GRAY)}>TOTAL</div>
									<div style={Object.assign({}, mont(26), { color: BLUE })}>{fMoney2(cartTotal)}</div>
									{currency === "USD" && <div style={os(10, 400, GRAY)}>{"≈ $ " + Math.round(cartTotal * tc).toLocaleString("es-AR") + " ARS"}</div>}
								</div>
								<button
									onClick={function () {
										openProposalWindow({
											profile: segment,
											firmaType: firmaType,
											pay: pay,
											items: cart,
											subtotal: cartSubtotal,
											paywall: cartPaywall,
											total: cartTotal,
											currency: currency,
											tc: tc,
										});
									}}
									style={{ padding: "12px 20px", background: WHITE, color: BLUE, border: "2px solid " + BLUE, borderRadius: 10, fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
								>
									↓ Exportar propuesta
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
