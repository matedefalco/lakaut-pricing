import { useState, useMemo } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, OKBG, WN, WNBG, ER, os, mont } from "../theme/tokens";
import { fP, fK } from "../utils/formatters";
import { makeMoney } from "../utils/useMoney";
import { engine } from "../engine/engine";
import { useModels } from "../context/ModelsContext";
import { NumInput } from "./ui/NumInput";

const PAYWALL_PCT = 0.002;
const MARGIN_OPTS = [30, 40, 50, 60];

const LOGO_B64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkAAD/7AARRHVja3kAAQAEAAAAUAAA/+EDjGh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgMTAuMC1jMDAwIDc5LmQyMGU0NjYzMCwgMjAyNS8xMi8wOS0wMjoxMToyMyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpDQzgzQTQ5NzM2QUExMUYxOUE0MkMwRjQ5MUY1NUNDNCIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDpGOUFCNzk2NDM2QUExMUYxOUE0MkMwRjQ5MUY1NUNDNCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDpGOUFCNzk2MzM2QUExMUYxOUE0MkMwRjQ5MUY1NUNDNCIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjcuNSAoTWFjaW50b3NoKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOmFhMTRjNjZhLWQ4NDMtNDhmNC1iZDIzLWZjYTAzYThjMTlhZCIgc3RSZWY6ZG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjgyMzZkODBjLWM2YzAtZWM0Zi1iYWJiLTVhZGI1YjY5ZWZlYyIvPiA8L3JkZjpEZXNjcmlw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";


// ─── Question options ──────────────────────────────────────────────────────────
const PROFILE_OPTS = [
	{ k: "persona", label: "Persona o profesional", desc: "Firmo mis propios documentos, contratos o trámites" },
	{ k: "empresa", label: "Empresa u organización", desc: "Gestiono firmas para empleados, clientes u operaciones" },
];
const FIRMA_TYPE_OPTS = [
	{ k: "juridica", label: "Firma empresa (persona jurídica)", desc: "Certificado emitido a nombre de la organización" },
	{ k: "humana", label: "Firma humana (certificados personales)", desc: "Certificados individuales para personas — empleados o clientes" },
];
const PAY_OPTS = [
	{ k: "transferencia", label: "Transferencia / efectivo", desc: "Sin costo adicional de procesamiento" },
	{ k: "tarjeta", label: "Tarjeta de crédito / débito", desc: "Se agrega 0.2% de Paywall" },
];

// ─── Volume helpers ────────────────────────────────────────────────────────────
function computeRow(firmas, certs, periodo, marginTarget, costs) {
	const cvPack = certs * costs.cvCertBase + firmas * costs.cvFirmaBase;
	const priceSug = cvPack / (1 - marginTarget / 100);
	const margenPack = priceSug - cvPack;
	const margenMes = margenPack / periodo;
	const be = margenMes > 0 ? Math.ceil(costs.cfDirecto / margenMes) : Infinity;
	const pricePerFirma = firmas > 0 ? priceSug / firmas : 0;
	const pricePerCert = certs > 0 ? priceSug / certs : 0;
	return { firmas, certs, cvPack, priceSug, margenPack, margenMes, be, pricePerFirma, pricePerCert };
}

const ESCALON_BASE = [10, 25, 50, 100, 200, 300, 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

function getEscalones(targetFirmas) {
	const all = [...new Set([...ESCALON_BASE, targetFirmas])].sort(function (a, b) { return a - b; });
	var idx = all.indexOf(targetFirmas);
	var start = Math.max(0, idx - 4);
	var end = Math.min(all.length - 1, idx + 4);
	return all.slice(start, end + 1);
}

function fNumShort(n) {
	if (n >= 1000000) return (n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1) + "M";
	if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "k";
	return n.toLocaleString("es-AR");
}

// ─── Quick per-plan export ─────────────────────────────────────────────────────
function openExportWindow({ profile, firmaType, certsCount, firmasEstimadas, payMethod, planData, volumeData, marginTarget, currency, tc }) {
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
	var payLabel = payMethod === "tarjeta" ? "Tarjeta de crédito/débito (+ 0.2% Paywall)" : "Transferencia / efectivo";

	var tableHtml = "";
	var totalPrice = 0;

	if (planData) {
		totalPrice = planData.priceUSD;
		var firmasLabel = planData.ilimitadas ? "Ilimitadas" : (planData.firmas || 0).toLocaleString("es-AR");
		var perFirma = (planData.firmas && planData.firmas > 0) ? fmt(planData.priceUSD / planData.firmas) : "—";
		var perCert = planData.certs > 0 ? fmt(planData.priceUSD / planData.certs) : "—";
		tableHtml = [
			"<table class='prop-table'>",
			"<thead><tr><th>Plan</th><th style='text-align:center'>Certs.</th><th>Cant. Firmas</th><th>$ / Firma</th><th>$ / Cert.</th><th>Vigencia</th><th>Total</th></tr></thead>",
			"<tbody><tr>",
			"<td><strong>" + planData.label + "</strong></td>",
			"<td style='text-align:center'>" + planData.certs + "</td>",
			"<td style='text-align:right'>" + firmasLabel + "</td>",
			"<td style='text-align:right'>" + perFirma + "</td>",
			"<td style='text-align:right'>" + perCert + "</td>",
			"<td style='text-align:right'>24 meses</td>",
			"<td style='text-align:right;font-weight:700'>" + fmt(totalPrice) + "</td>",
			"</tr></tbody></table>",
		].join("");
	}

	if (volumeData) {
		var tr = volumeData.targetRow;
		totalPrice = tr.priceSug;
		var escRowsHtml = volumeData.rows.map(function (r) {
			var isT = r.firmas === volumeData.firmas;
			return [
				"<tr style='background:" + (isT ? "#eef2ff" : "inherit") + "'>",
				"<td style='font-weight:" + (isT ? "700" : "400") + ";color:" + (isT ? "#3949ab" : "#111") + "'>" + (isT ? "▶ " : "") + r.firmas.toLocaleString("es-AR") + (isT ? " ← tu volumen" : "") + "</td>",
				"<td style='text-align:right'>" + fmt(r.pricePerFirma) + "</td>",
				"<td style='text-align:right'>" + fmt(r.pricePerCert) + "</td>",
				"<td style='text-align:right;font-weight:" + (isT ? "700" : "400") + ";color:" + (isT ? "#16a34a" : "inherit") + "'>" + fmt(r.priceSug) + "</td>",
				"</tr>",
			].join("");
		}).join("");
		tableHtml = [
			"<table class='prop-table'>",
			"<thead><tr><th>Cant. Firmas</th><th>$ / Firma</th><th>$ / Cert.</th><th>Total (" + marginTarget + "% margen)</th></tr></thead>",
			"<tbody>" + escRowsHtml + "</tbody></table>",
			"<div style='margin-top:6px;font-size:11px;color:#64748b'>Vigencia: " + volumeData.periodo + " meses · " + volumeData.certs + " cert" + (volumeData.certs !== 1 ? "s" : "") + " · ▶ volumen seleccionado.</div>",
		].join("");
	}

	var paywallNote = payMethod === "tarjeta" ? "<div class='total-row'><span>Paywall tarjeta (0.2%)</span><span>+ " + fmt(totalPrice * 0.002) + "</span></div>" : "";
	var grandTotal = payMethod === "tarjeta" ? totalPrice * 1.002 : totalPrice;
	var html = buildProposalHtml({ date: date, validUntil: validUntil, profileLabel: profileLabel, firmaTypeLabel: firmaTypeLabel, payLabel: payLabel, certsCount: certsCount, firmasEstimadas: firmasEstimadas, tableHtml: tableHtml, paywallNote: paywallNote, grandTotal: grandTotal, currency: currency, tc: tc, fmt: fmt });

	var w = window.open("", "_blank", "width=920,height=750");
	if (w) { w.document.write(html); w.document.close(); }
}

// ─── Cart proposal export ──────────────────────────────────────────────────────
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

	var certsTotal = items.reduce(function (s, it) { return s + it.certs * it.qty; }, 0);
	var firmasTotal = items.reduce(function (s, it) { return s + (it.ilimitadas ? 0 : it.effectiveFirmas * it.qty); }, 0);

	var rowsHtml = items.map(function (item) {
		var perFirma = (!item.ilimitadas && item.effectiveFirmas > 0) ? fmt(item.unitPrice / item.effectiveFirmas) : "—";
		var perCert = item.certs > 0 ? fmt(item.unitPrice / item.certs) : "—";
		var firmasCell = item.ilimitadas ? "Ilimitadas" : item.effectiveFirmas.toLocaleString("es-AR");
		return [
			"<tr>",
			"<td>" + item.planLabel + (item.isCustom ? " <span class='badge'>a medida</span>" : "") + "</td>",
			"<td style='text-align:center'>" + item.certs + "</td>",
			"<td style='text-align:right'>" + firmasCell + "</td>",
			"<td style='text-align:right'>" + perFirma + "</td>",
			"<td style='text-align:right'>" + perCert + "</td>",
			"<td style='text-align:right'>" + item.vigencia + " meses</td>",
			"<td style='text-align:center'>" + item.qty + "</td>",
			"<td style='text-align:right;font-weight:700'>" + fmt(item.unitPrice * item.qty) + "</td>",
			"</tr>",
		].join("");
	}).join("");

	var tableHtml = [
		"<table class='prop-table'>",
		"<thead><tr>",
		"<th>Plan / Descripción</th><th style='text-align:center'>Certs.</th><th>Cant. Firmas</th>",
		"<th>$ / Firma</th><th>$ / Cert.</th><th>Vigencia</th><th style='text-align:center'>Cant.</th><th>Total</th>",
		"</tr></thead>",
		"<tbody>" + rowsHtml + "</tbody>",
		"</table>",
	].join("");

	var paywallNote = pay === "tarjeta" ? "<div class='total-row'><span>Subtotal</span><span>" + fmt(subtotal) + "</span></div><div class='total-row'><span>Paywall (0.2%)</span><span>+ " + fmt(paywall) + "</span></div>" : "";
	var html = buildProposalHtml({ date: date, validUntil: validUntil, profileLabel: profileLabel, firmaTypeLabel: firmaTypeLabel, payLabel: payLabel, certsCount: certsTotal, firmasEstimadas: firmasTotal, tableHtml: tableHtml, paywallNote: paywallNote, grandTotal: total, currency: currency, tc: tc, fmt: fmt });

	var w = window.open("", "_blank", "width=920,height=750");
	if (w) { w.document.write(html); w.document.close(); }
}

// ─── Shared HTML template ──────────────────────────────────────────────────────
function buildProposalHtml({ date, validUntil, profileLabel, firmaTypeLabel, payLabel, certsCount, firmasEstimadas, tableHtml, paywallNote, grandTotal, currency, tc, fmt }) {
	return [
		"<!DOCTYPE html><html lang='es'><head>",
		"<meta charset='UTF-8'><title>Propuesta Comercial — Lakaut</title>",
		"<style>",
		"body{font-family:Arial,sans-serif;margin:48px;color:#111;font-size:13px;line-height:1.6;max-width:860px}",
		"h1{color:#3949ab;margin:0;font-size:24px}",
		"h2{font-size:13px;text-transform:uppercase;letter-spacing:0.6px;color:#64748b;margin:0 0 8px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}",
		".header{margin-bottom:28px}.subtitle{font-size:15px;font-weight:700;margin-top:4px;color:#1e293b}",
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
		"<img src='" + LOGO_B64 + "' alt='FID by Lakaut' style='height:56px;display:block;margin-bottom:10px'>",
		"<div class='subtitle'>Propuesta Comercial · Firma Digital</div>",
		"<div class='meta'>Fecha de emisión: <strong>" + date + "</strong> &nbsp;·&nbsp; Válida hasta: <strong>" + validUntil + "</strong></div>",
		"</div>",
		"<div class='intro'>A continuación les compartimos nuestra propuesta comercial para servicios de firma digital, según los parámetros indicados. Los precios incluyen certificados digitales, firmas y plataforma de gestión documental.</div>",
		"<div class='section'><h2>Datos del cliente</h2>",
		"<table class='profile-table'>",
		"<tr><td>Tipo de cliente:</td><td><strong>" + profileLabel + "</strong></td></tr>",
		"<tr><td>Modalidad de firma:</td><td><strong>" + firmaTypeLabel + "</strong></td></tr>",
		"<tr><td>Certificados requeridos:</td><td><strong>" + certsCount + "</strong></td></tr>",
		firmasEstimadas > 0 ? "<tr><td>Firmas estimadas (vigencia):</td><td><strong>" + firmasEstimadas.toLocaleString("es-AR") + "</strong></td></tr>" : "",
		"<tr><td>Forma de pago:</td><td><strong>" + payLabel + "</strong></td></tr>",
		"</table></div>",
		"<div class='section'><h2>Detalle de la propuesta</h2>",
		tableHtml,
		"<div class='total-section'>",
		paywallNote,
		"<div class='grand-total'>TOTAL: " + fmt(grandTotal) + "</div>",
		currency === "USD" ? "<div style='font-size:11px;color:#94a3b8;margin-top:2px'>≈ $ " + Math.round(grandTotal * tc).toLocaleString("es-AR") + " ARS (referencial)</div>" : "",
		"</div></div>",
		"<div class='conditions'><strong style='font-size:13px'>Condiciones comerciales</strong><ul>",
		"<li>Los precios están expresados en " + (currency === "ARS" ? "pesos argentinos" : "dólares estadounidenses (USD)") + " y no incluyen impuestos (IVA / retenciones).</li>",
		"<li>Esta propuesta tiene vigencia de 30 días a partir de la fecha de emisión.</li>",
		"<li>Los planes incluyen certificado digital, plataforma de gestión documental y soporte técnico.</li>",
		"<li>Las firmas indicadas son el volumen incluido en la vigencia del pack. Firmas adicionales disponibles bajo pedido.</li>",
		"<li>Sujeto a revisión comercial final por parte del equipo de Lakaut.</li>",
		"</ul><div style='margin-top:8px;font-size:12px'>Para consultas o contratar: <strong>ventas@lakaut.com.ar</strong></div></div>",
		"<div class='footer'>Generado con Cotizador Lakaut · " + date + "</div>",
		"<div style='margin-top:20px'><button onclick='window.print()' style='padding:10px 22px;background:#3949ab;color:white;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:700;font-family:Arial,sans-serif'>Imprimir / Guardar PDF</button></div>",
		"</body></html>",
	].join("");
}

// ─── UI helpers ────────────────────────────────────────────────────────────────
function QLabel({ n, text }) {
	return (
		<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
			{n} · {text}
		</div>
	);
}

function Opt({ options, selected, onSelect }) {
	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
			{options.map(function (o) {
				var act = selected === o.k;
				return (
					<button key={o.k} onClick={function () { onSelect(o.k); }}
						style={{ padding: "10px 16px", borderRadius: 10, textAlign: "left", background: act ? BLUE : WHITE, border: "1.5px solid " + (act ? BLUE : BORD), cursor: "pointer", minWidth: 180 }}>
						<div style={os(13, 700, act ? WHITE : BLACK)}>{o.label}</div>
						<div style={os(11, 400, act ? "#c5cbf7" : GRAY)}>{o.desc}</div>
					</button>
				);
			})}
		</div>
	);
}

function ShortcutBar({ values, selected, onSelect }) {
	return (
		<div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
			{values.map(function (n) {
				var act = selected === n;
				return (
					<button key={n} onClick={function () { onSelect(n); }}
						style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid " + (act ? BLUE : BORD), background: act ? BLUE : WHITE, color: act ? WHITE : GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: act ? 700 : 400, cursor: "pointer" }}>
						{fNumShort(n)}
					</button>
				);
			})}
		</div>
	);
}

// ─── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, isFirst, costs, payMethod, fMoney2, currency, tc, onExport, onAddToCart, flash }) {
	var svc = { cloudStorage: false, mailCert: false, paywall: payMethod === "tarjeta" };
	var periodo = plan.vigencia || plan.billingPeriod || 24;
	var inp = plan.inp || { precio: plan.priceUSD, firmas: plan.firmas || 0, periodo: periodo };
	var c = engine({ arch: plan.arch || "bolsa", inp: inp, svc: svc, users: 1000, costs: costs });
	var col = plan.color;

	var ilimitadasThreshold = plan.ilimitadas
		? (function () {
			var revMes = plan.priceUSD / periodo;
			var certCostMes = costs.cvCertBase / periodo;
			var avail = revMes - certCostMes;
			return avail > 0 ? Math.floor(avail / costs.cvFirmaBase) : 0;
		})()
		: null;

	return (
		<div style={{ background: WHITE, border: "2px solid " + col, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", opacity: isFirst ? 1 : 0.75 }}>
			<div style={{ background: col, padding: "14px 18px" }}>
				{plan.recommended && <div style={Object.assign({}, os(10, 700, col), { background: "#fef3c7", padding: "2px 8px", borderRadius: 20, display: "inline-block", marginBottom: 6 })}>⭐ Recomendado</div>}
				{isFirst && !plan.recommended && <div style={Object.assign({}, os(10, 700, col), { background: WHITE, padding: "2px 8px", borderRadius: 20, display: "inline-block", marginBottom: 6 })}>✦ Mejor opción para tu perfil</div>}
				<div style={Object.assign({}, mont(20), { color: WHITE })}>{plan.label}</div>
				<div style={Object.assign({}, os(12, 400, WHITE), { opacity: 0.85, marginTop: 3 })}>{plan.tagline}</div>
			</div>

			<div style={{ padding: "14px 18px", borderBottom: "1px solid " + BORD }}>
				<div style={Object.assign({}, mont(28), { color: col, lineHeight: 1 })}>{fMoney2(plan.priceUSD)}</div>
				{currency === "USD" && <div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>{"$ " + (plan.priceUSD * tc).toLocaleString("es-AR") + " ARS"}</div>}
				{currency === "ARS" && <div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>{"USD " + plan.priceUSD}</div>}
				<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 4 })}>
					{plan.priceNote}{payMethod === "tarjeta" ? " · +0.2% Paywall" : ""}
				</div>
			</div>

			{ilimitadasThreshold !== null && (
				<div style={{ padding: "10px 18px", background: WNBG, borderBottom: "1px solid " + BORD }}>
					<div style={Object.assign({}, os(11, 700, WN), { marginBottom: 2 })}>⚠ Rentable hasta {ilimitadasThreshold} firmas / mes</div>
					<div style={os(10, 400, WN)}>Por encima de ese umbral el costo variable supera el ingreso del pack.</div>
				</div>
			)}

			<div style={{ padding: "14px 18px", flex: 1 }}>
				{plan.benefits.map(function (b, i) {
					return (
						<div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
							<span style={Object.assign({}, os(13, 700, col), { flexShrink: 0, lineHeight: "18px" })}>✓</span>
							<span style={Object.assign({}, os(12, i === 0 ? 700 : 400, i === 0 ? col : BLACK), { lineHeight: "18px" })}>{b}</span>
						</div>
					);
				})}
			</div>

			<div style={{ borderTop: "1px solid " + BORD, padding: "10px 18px", background: "#fafafa" }}>
				<div style={Object.assign({}, os(9, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 })}>Análisis interno</div>
				<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
					{[
						{ l: "Margen", v: fP(c.margenPct), col: c.margenPct > 30 ? OK : c.margenPct > 0 ? WN : ER },
						{ l: "BE clientes", v: isFinite(c.beUsuarios) ? fK(c.beUsuarios) + " usu." : "∞", col: isFinite(c.beUsuarios) ? OK : WN },
						{ l: "CV/pack", v: fMoney2(c.cvMes * 24), col: GRAY },
					].map(function (m) {
						return (
							<div key={m.l}>
								<div style={os(9, 400, GRAY)}>{m.l}</div>
								<div style={Object.assign({}, mont(12), { color: m.col })}>{m.v}</div>
							</div>
						);
					})}
				</div>
			</div>

			<div style={{ margin: "0 18px 16px", display: "flex", gap: 6 }}>
				<button
					onClick={onAddToCart}
					style={{ flex: 1, padding: "10px", background: flash ? "#059669" : (isFirst ? col : WHITE), color: flash ? WHITE : (isFirst ? WHITE : col), border: "2px solid " + (flash ? "#059669" : col), borderRadius: 8, fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
				>
					{flash ? "✓ Agregado" : "+ Agregar a cotización"}
				</button>
				<button
					onClick={onExport}
					title="Exportar cotización de este plan"
					style={{ padding: "8px 10px", background: WHITE, color: col, border: "2px solid " + col, borderRadius: 8, fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
				>
					↓ Cotización
				</button>
			</div>
		</div>
	);
}

// ─── Volume section ───────────────────────────────────────────────────────────
function VolumeSection({ certs, firmas, periodo, marginTarget, setMarginTarget, costs, fMoney2, rows, targetRow, onAddToCart, addedFlash }) {
	var [useCustomMargin, setUseCustomMargin] = useState(false);
	var thStyle = Object.assign({}, os(10, 700, WHITE), { padding: "7px 10px", background: "#1e293b", textAlign: "right", whiteSpace: "nowrap" });
	var thL = Object.assign({}, thStyle, { textAlign: "left" });

	return (
		<div>
			{/* Margin selector */}
			<div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
				<span style={os(11, 400, GRAY)}>Margen objetivo:</span>
				{MARGIN_OPTS.map(function (m) {
					var act = m === marginTarget && !useCustomMargin;
					return (
						<button key={m} onClick={function () { setMarginTarget(m); setUseCustomMargin(false); }}
							style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid " + (act ? BLUE : BORD), background: act ? BLUE : WHITE, color: act ? WHITE : GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
							{m}%
						</button>
					);
				})}
				{!useCustomMargin
					? <button onClick={function () { setUseCustomMargin(true); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1.5px solid " + BORD, background: WHITE, color: GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Otro…</button>
					: (
						<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
							<input type="number" value={marginTarget} min={1} max={99}
								onChange={function (e) { setMarginTarget(Math.max(1, Math.min(99, Number(e.target.value) || 40))); }}
								style={{ width: 52, padding: "4px 8px", border: "1.5px solid " + BLUE, borderRadius: 6, fontFamily: "'Open Sans',sans-serif", fontSize: 11, color: BLACK, outline: "none" }} />
							<span style={os(11, 400, GRAY)}>%</span>
							<button onClick={function () { setUseCustomMargin(false); }} style={{ padding: "2px 7px", border: "1px solid " + BORD, borderRadius: 4, background: WHITE, color: GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 10, cursor: "pointer" }}>✕</button>
						</div>
					)
				}
			</div>

			{/* KPI cards */}
			<div style={{ background: BLUEL, border: "2px solid " + BLUE, borderRadius: 12, padding: "14px 18px", marginBottom: 16 }}>
				<div style={Object.assign({}, os(10, 700, BLUE), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 })}>
					Tu volumen · {firmas.toLocaleString("es-AR")} firmas · {certs} cert{certs !== 1 ? "s" : ""}
				</div>
				<div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
					{[
						{ l: "Costo variable del pack", v: fMoney2(targetRow.cvPack), col: "#b45309", big: false },
						{ l: "Precio al " + marginTarget + "% margen", v: fMoney2(targetRow.priceSug), col: OK, big: true },
						{ l: "Margen bruto", v: fMoney2(targetRow.margenPack), col: BLUE, big: false },
						{ l: "Precio por firma", v: fMoney2(targetRow.pricePerFirma), col: GRAY, big: false },
						{ l: "Precio por certificado", v: fMoney2(targetRow.pricePerCert), col: GRAY, big: false },
					].map(function (k) {
						return (
							<div key={k.l}>
								<div style={os(9, 400, GRAY)}>{k.l}</div>
								<div style={Object.assign({}, mont(k.big ? 24 : 16), { color: k.col, fontWeight: k.big ? 700 : 400, lineHeight: 1.2 })}>{k.v}</div>
							</div>
						);
					})}
				</div>
				<div style={{ marginTop: 14 }}>
					<button
						onClick={onAddToCart}
						style={{ padding: "9px 20px", background: addedFlash ? "#059669" : BLUE, color: WHITE, border: "none", borderRadius: 8, fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}
					>
						{addedFlash ? "✓ Agregado a la cotización" : "+ Agregar a cotización"}
					</button>
				</div>
			</div>

			{/* Escalation table */}
			<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
				Escalonado de precios · {marginTarget}% margen objetivo
			</div>
			<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 10 })}>
				Los precios varían según el volumen. Tu cotización está marcada con ▶.
			</div>
			<div style={{ overflowX: "auto" }}>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
					<thead>
						<tr>
							<th style={thL}>Firmas</th>
							<th style={thStyle}>CV pack</th>
							<th style={thStyle}>Precio ({marginTarget}%)</th>
							<th style={thStyle}>$/firma</th>
							<th style={thStyle}>Margen bruto</th>
						</tr>
					</thead>
					<tbody>
						{rows.map(function (r) {
							var isTarget = r.firmas === firmas;
							return (
								<tr key={r.firmas} style={{ background: isTarget ? "#eaecfb" : r.firmas % 2 === 0 ? "#fafafa" : WHITE }}>
									<td style={Object.assign({}, os(13, isTarget ? 700 : 400, isTarget ? BLUE : BLACK), { padding: "9px 10px" })}>
										{isTarget && "▶ "}{r.firmas.toLocaleString("es-AR")}
										{isTarget && <span style={Object.assign({}, os(10, 400, BLUE), { marginLeft: 6 })}>← tu volumen</span>}
									</td>
									<td style={{ fontFamily: "Courier New,monospace", textAlign: "right", padding: "9px 10px" }}>{fMoney2(r.cvPack)}</td>
									<td style={{ fontFamily: "Courier New,monospace", textAlign: "right", padding: "9px 10px", fontWeight: isTarget ? 700 : 400, color: isTarget ? OK : "inherit" }}>{fMoney2(r.priceSug)}</td>
									<td style={{ fontFamily: "Courier New,monospace", textAlign: "right", padding: "9px 10px" }}>{fMoney2(r.pricePerFirma)}</td>
									<td style={{ fontFamily: "Courier New,monospace", textAlign: "right", padding: "9px 10px" }}>{fMoney2(r.margenPack)}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
			<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 6 })}>
				CV cert: {fMoney2(costs.cvCertBase)} · CV firma: {fMoney2(costs.cvFirmaBase)} · Vigencia {periodo} meses
			</div>
		</div>
	);
}

// ─── Cart panel ───────────────────────────────────────────────────────────────
function CartPanel({ cart, onRemove, onClear, pay, setPay, subtotal, paywall, total, fMoney2, currency, tc, onExport }) {
	const PAY_OPTS_CART = [
		{ k: "transferencia", label: "Transferencia" },
		{ k: "tarjeta", label: "Tarjeta · +0.2%" },
	];

	return (
		<div style={{ marginTop: 32, background: WHITE, border: "2px solid " + BLUE, borderRadius: 14, overflow: "hidden" }}>
			<div style={{ background: BLUE, padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				<div style={Object.assign({}, mont(14), { color: WHITE })}>
					Cotización · {cart.length} {cart.length === 1 ? "ítem" : "ítems"}
				</div>
				<button onClick={onClear} style={{ background: "none", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 11, color: WHITE, padding: "3px 10px", opacity: 0.8 }}>
					Vaciar
				</button>
			</div>

			<div style={{ overflowX: "auto" }}>
				<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 580 }}>
					<thead>
						<tr style={{ background: "#f8fafc" }}>
							{["Plan", "Certs", "Firmas", "$ / Firma", "$ / Cert", "Vigencia", "Total", ""].map(function (h, i) {
								return (
									<th key={i} style={Object.assign({}, os(9, 700, GRAY), { padding: "8px " + (i === 0 ? "16px" : "12px"), textAlign: i === 0 ? "left" : i === 1 ? "center" : "right", textTransform: "uppercase", letterSpacing: "0.5px" })}>
										{h}
									</th>
								);
							})}
						</tr>
					</thead>
					<tbody>
						{cart.map(function (item, idx) {
							var pf = (!item.ilimitadas && item.effectiveFirmas > 0) ? fMoney2(item.unitPrice / item.effectiveFirmas) : "—";
							var pc = item.certs > 0 ? fMoney2(item.unitPrice / item.certs) : "—";
							var firmasCell = item.ilimitadas ? "Ilimitadas" : item.effectiveFirmas.toLocaleString("es-AR");
							return (
								<tr key={item.id} style={{ background: idx % 2 === 1 ? "#fafafa" : WHITE, borderBottom: "1px solid " + BORD }}>
									<td style={{ padding: "12px 16px" }}>
										<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
											<div style={{ width: 4, height: 32, borderRadius: 4, background: item.col, flexShrink: 0 }} />
											<div>
												<div style={os(13, 700, BLACK)}>{item.planLabel}</div>
												<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 2 })}>
													{item.vigencia}m{item.qty > 1 ? " · ×" + item.qty : ""}
													{item.isCustom && <span style={{ marginLeft: 4, background: "#e2e8f0", color: GRAY, fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 8, textTransform: "uppercase" }}>a medida</span>}
												</div>
											</div>
										</div>
									</td>
									<td style={{ padding: "12px", textAlign: "center" }}><span style={os(12, 400, GRAY)}>{item.certs}</span></td>
									<td style={{ padding: "12px", textAlign: "right" }}><span style={os(12, 400, BLACK)}>{firmasCell}</span></td>
									<td style={{ padding: "12px", textAlign: "right", fontFamily: "Courier New,monospace" }}><span style={os(12, 400, BLACK)}>{pf}</span></td>
									<td style={{ padding: "12px", textAlign: "right", fontFamily: "Courier New,monospace" }}><span style={os(12, 400, BLACK)}>{pc}</span></td>
									<td style={{ padding: "12px", textAlign: "right" }}><span style={os(12, 400, GRAY)}>{item.vigencia}m</span></td>
									<td style={{ padding: "12px", textAlign: "right" }}><span style={os(13, 700, item.col)}>{fMoney2(item.unitPrice * item.qty)}</span></td>
									<td style={{ padding: "12px" }}>
										<button onClick={function () { onRemove(item.id); }} style={{ background: "none", border: "1px solid " + BORD, borderRadius: 6, cursor: "pointer", color: GRAY, fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 700, padding: "3px 8px" }}>×</button>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			<div style={{ padding: "16px 20px", borderTop: "1px solid " + BORD }}>
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
					<div style={{ display: "flex", alignItems: "center", gap: 8 }}>
						<span style={os(11, 700, GRAY)}>Pago:</span>
						<div style={{ display: "inline-flex", border: "1.5px solid " + BORD, borderRadius: 8, overflow: "hidden" }}>
							{PAY_OPTS_CART.map(function (opt, i) {
								return (
									<button key={opt.k} onClick={function () { setPay(opt.k); }}
										style={{ padding: "6px 14px", background: pay === opt.k ? BLUE : WHITE, color: pay === opt.k ? WHITE : GRAY, border: "none", borderLeft: i > 0 ? "1px solid " + BORD : "none", cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
										{opt.label}
									</button>
								);
							})}
						</div>
					</div>

					<div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
						{pay === "tarjeta" && (
							<div style={{ textAlign: "right" }}>
								<div style={os(10, 400, GRAY)}>Subtotal · {fMoney2(subtotal)}</div>
								<div style={os(10, 400, GRAY)}>Paywall +{fMoney2(paywall)}</div>
							</div>
						)}
						<div style={{ textAlign: "right" }}>
							<div style={os(10, 700, GRAY)}>TOTAL</div>
							<div style={Object.assign({}, mont(26), { color: BLUE })}>{fMoney2(total)}</div>
							{currency === "USD" && <div style={os(10, 400, GRAY)}>{"≈ $ " + Math.round(total * tc).toLocaleString("es-AR") + " ARS"}</div>}
						</div>
						<button
							onClick={onExport}
							style={{ padding: "12px 20px", background: BLUE, color: WHITE, border: "none", borderRadius: 10, fontFamily: "'Open Sans',sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
						>
							↓ Exportar propuesta
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── Main component ────────────────────────────────────────────────────────────
export function Cotizadora({ costs, currency, tc }) {
	const { models } = useModels();
	const { fMoney2 } = makeMoney(currency, tc);

	// Questionnaire
	const [profile, setProfile] = useState(null);
	const [firmaType, setFirmaType] = useState(null);
	const [certsCount, setCertsCount] = useState(1);
	const [firmasEstimadas, setFirmasEstimadas] = useState(0);
	const [payMethod, setPayMethod] = useState("transferencia");
	const [marginTarget, setMarginTarget] = useState(40);
	var PERIODO = 24;

	// Cart
	const [cart, setCart] = useState([]);
	const [cartPay, setCartPay] = useState("transferencia");
	const [flashId, setFlashId] = useState(null);

	function handleProfileChange(k) {
		setProfile(k); setFirmaType(null); setCertsCount(1); setFirmasEstimadas(0);
	}
	function handleFirmaTypeChange(k) {
		setFirmaType(k); setCertsCount(k === "humana" ? 10 : 1); setFirmasEstimadas(0);
	}

	var readyToRecommend = useMemo(function () {
		if (!profile) return false;
		if (profile === "empresa" && !firmaType) return false;
		if (!firmasEstimadas || firmasEstimadas < 1) return false;
		return true;
	}, [profile, firmaType, firmasEstimadas]);

	var isVolume = useMemo(function () {
		if (!readyToRecommend) return false;
		if (profile === "empresa" && firmaType === "humana") return true;
		if (profile === "persona" && certsCount > 1) return true;
		if (certsCount > 4) return true;
		if (firmasEstimadas > 2000) return true;
		return false;
	}, [readyToRecommend, profile, firmaType, certsCount, firmasEstimadas]);

	var recommendations = useMemo(function () {
		if (!readyToRecommend || isVolume) return [];
		if (profile === "persona") {
			var smart = models.find(function (m) { return m.id === "smart"; });
			var prof = models.find(function (m) { return m.id === "profesional"; });
			return firmasEstimadas < 50 ? [smart, prof].filter(Boolean) : [prof, smart].filter(Boolean);
		}
		if (profile === "empresa" && firmaType === "juridica") {
			var pyme = models.find(function (m) { return m.id === "pyme"; });
			var ent = models.find(function (m) { return m.id === "enterprise"; });
			return (certsCount <= 1 && firmasEstimadas < 300) ? [pyme, ent].filter(Boolean) : [ent, pyme].filter(Boolean);
		}
		return [];
	}, [readyToRecommend, isVolume, profile, firmaType, certsCount, firmasEstimadas, models]);

	var escalones = useMemo(function () {
		if (!isVolume) return [];
		return getEscalones(firmasEstimadas);
	}, [isVolume, firmasEstimadas]);

	var volumeRows = useMemo(function () {
		if (!isVolume) return [];
		return escalones.map(function (f) { return computeRow(f, certsCount, PERIODO, marginTarget, costs); });
	}, [isVolume, escalones, certsCount, marginTarget, costs]);

	var targetRow = useMemo(function () {
		if (!isVolume) return null;
		return computeRow(firmasEstimadas, certsCount, PERIODO, marginTarget, costs);
	}, [isVolume, firmasEstimadas, certsCount, marginTarget, costs]);

	var certShortcuts = profile === "empresa" && firmaType === "humana"
		? [1, 5, 10, 50, 200, 1000, 10000]
		: [1, 2, 3, 4, 5, 10];
	var firmaShortcuts = profile === "empresa" && firmaType === "humana"
		? [100, 500, 2000, 10000, 50000, 100000]
		: [10, 50, 100, 500, 1000, 2000, 10000];

	var qOffset = profile === "empresa" ? 1 : 0;

	// Cart operations
	function addPlanToCart(plan) {
		setCart(function (prev) {
			return [...prev, {
				id: Date.now(),
				planLabel: plan.label,
				col: plan.color,
				isCustom: false,
				ilimitadas: plan.ilimitadas || false,
				certs: plan.certs || 1,
				effectiveFirmas: plan.firmas || 0,
				vigencia: 24,
				qty: 1,
				unitPrice: plan.priceUSD,
			}];
		});
		setFlashId(plan.id);
		setTimeout(function () { setFlashId(null); }, 1400);
	}

	function addVolumeToCart() {
		setCart(function (prev) {
			return [...prev, {
				id: Date.now(),
				planLabel: firmasEstimadas.toLocaleString("es-AR") + " firmas · " + certsCount + " cert" + (certsCount !== 1 ? "s" : ""),
				col: BLUE,
				isCustom: true,
				ilimitadas: false,
				certs: certsCount,
				effectiveFirmas: firmasEstimadas,
				vigencia: PERIODO,
				qty: 1,
				unitPrice: targetRow.priceSug,
				marginTarget: marginTarget,
			}];
		});
		setFlashId("volume");
		setTimeout(function () { setFlashId(null); }, 1400);
	}

	function removeFromCart(id) {
		setCart(function (prev) { return prev.filter(function (item) { return item.id !== id; }); });
	}

	var cartSubtotal = cart.reduce(function (s, item) { return s + item.unitPrice * item.qty; }, 0);
	var cartPaywall = cartPay === "tarjeta" ? cartSubtotal * PAYWALL_PCT : 0;
	var cartTotal = cartSubtotal + cartPaywall;

	function handleExport(overridePlan) {
		openExportWindow({
			profile: profile,
			firmaType: firmaType,
			certsCount: certsCount,
			firmasEstimadas: firmasEstimadas,
			payMethod: payMethod,
			planData: overridePlan || (!isVolume && recommendations.length > 0 ? recommendations[0] : null),
			volumeData: isVolume && targetRow
				? { firmas: firmasEstimadas, certs: certsCount, periodo: PERIODO, targetRow: targetRow, rows: volumeRows }
				: null,
			marginTarget: marginTarget,
			currency: currency,
			tc: tc,
		});
	}

	var profileSet = profile !== null;
	var firmaTypeSet = profile === "empresa" ? firmaType !== null : true;

	return (
		<div>
			<div style={Object.assign({}, os(12, 400, GRAY), { marginBottom: 20 })}>
				Respondé las preguntas y te mostramos los planes más adecuados o una cotización personalizada según tu volumen.
			</div>

			{/* Q1 */}
			<QLabel n="1" text="¿Quién necesita la firma digital?" />
			<Opt options={PROFILE_OPTS} selected={profile} onSelect={handleProfileChange} />

			{/* Q2 — empresa only */}
			{profile === "empresa" && (
				<>
					<QLabel n="2" text="¿Cómo van a firmar?" />
					<Opt options={FIRMA_TYPE_OPTS} selected={firmaType} onSelect={handleFirmaTypeChange} />
				</>
			)}

			{/* Q3 — certs */}
			{profileSet && firmaTypeSet && (
				<>
					<QLabel n={String(2 + qOffset)} text="¿Cuántos certificados digitales necesitás?" />
					<ShortcutBar values={certShortcuts} selected={certsCount} onSelect={setCertsCount} />
					<div style={{ maxWidth: 220 }}>
						<NumInput label="" value={certsCount} onChange={function (v) { setCertsCount(Math.max(1, Math.round(v))); }} suffix="certificados" />
					</div>
					{profile === "empresa" && firmaType === "humana" && certsCount >= 50 && (
						<div style={{ background: WNBG, border: "1px solid " + WN, borderRadius: 8, padding: "8px 12px", marginTop: 4, marginBottom: 8 }}>
							<span style={os(11, 700, WN)}>Alto volumen de certificados — </span>
							<span style={os(11, 400, WN)}>se generará una cotización escalonada a medida.</span>
						</div>
					)}
				</>
			)}

			{/* Q4 — firmas */}
			{profileSet && firmaTypeSet && (
				<>
					<QLabel n={String(3 + qOffset)} text={"¿Cuántas firmas estimás usar en " + PERIODO + " meses?"} />
					<ShortcutBar values={firmaShortcuts} selected={firmasEstimadas} onSelect={setFirmasEstimadas} />
					<div style={{ maxWidth: 220 }}>
						<NumInput label="" value={firmasEstimadas || ""} onChange={function (v) { setFirmasEstimadas(Math.max(0, Math.round(v))); }} suffix="firmas" />
					</div>
					{firmasEstimadas > 2000 && (
						<div style={{ background: BLUEL, border: "1px solid " + BLUE, borderRadius: 8, padding: "8px 12px", marginTop: 4, marginBottom: 8 }}>
							<span style={os(11, 700, BLUE)}>Volumen alto — </span>
							<span style={os(11, 400, BLUE)}>se mostrará la tabla escalonada de precios.</span>
						</div>
					)}
				</>
			)}

			{/* Q5 — pago */}
			{profileSet && firmaTypeSet && (
				<>
					<QLabel n={String(4 + qOffset)} text="¿Cómo vas a pagar?" />
					<Opt options={PAY_OPTS} selected={payMethod} onSelect={setPayMethod} />
				</>
			)}

			{/* ── Resultados ─────────────────────────────────────────────────── */}
			{readyToRecommend && (
				<div style={{ marginTop: 8 }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "20px 0 12px", flexWrap: "wrap", gap: 10 }}>
						<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px" })}>
							{isVolume ? "Cotización de volumen" : "Planes para tu perfil"}
						</div>
						<button
							onClick={function () { handleExport(null); }}
							style={{ padding: "7px 16px", background: WHITE, color: BLUE, border: "2px solid " + BLUE, borderRadius: 8, fontFamily: "'Open Sans',sans-serif", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
						>
							↓ Exportar cotización
						</button>
					</div>

					{!isVolume && recommendations.length > 0 && (
						<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, alignItems: "start" }}>
							{recommendations.map(function (plan, i) {
								return (
									<PlanCard
										key={plan.id}
										plan={plan}
										isFirst={i === 0}
										costs={costs}
										payMethod={payMethod}
										fMoney2={fMoney2}
										currency={currency}
										tc={tc}
										flash={flashId === plan.id}
										onAddToCart={function () { addPlanToCart(plan); }}
										onExport={function () { handleExport(plan); }}
									/>
								);
							})}
						</div>
					)}

					{!isVolume && recommendations.length === 0 && (
						<div style={{ background: BLUEL, border: "1px solid " + BORD, borderRadius: 10, padding: "14px 18px" }}>
							<div style={os(12, 400, BLUE)}>No se encontraron planes para este perfil. Verificá que existan modelos guardados en la sección Modelos.</div>
						</div>
					)}

					{isVolume && targetRow && (
						<VolumeSection
							certs={certsCount}
							firmas={firmasEstimadas}
							periodo={PERIODO}
							marginTarget={marginTarget}
							setMarginTarget={setMarginTarget}
							costs={costs}
							fMoney2={fMoney2}
							rows={volumeRows}
							targetRow={targetRow}
							addedFlash={flashId === "volume"}
							onAddToCart={addVolumeToCart}
						/>
					)}
				</div>
			)}

			{/* Prompts */}
			{!readyToRecommend && profileSet && firmaTypeSet && (
				<div style={{ background: BLUEL, border: "1px solid " + BORD, borderRadius: 10, padding: "14px 18px", marginTop: 8 }}>
					<div style={os(12, 400, BLUE)}>Ingresá la cantidad de firmas estimadas para ver la cotización.</div>
				</div>
			)}
			{!profileSet && (
				<div style={{ background: BLUEL, border: "1px solid " + BORD, borderRadius: 10, padding: "14px 18px", marginTop: 8 }}>
					<div style={os(12, 400, BLUE)}>Completá las preguntas para ver los planes disponibles.</div>
				</div>
			)}

			{/* ── Carrito ────────────────────────────────────────────────────── */}
			{cart.length > 0 && (
				<CartPanel
					cart={cart}
					onRemove={removeFromCart}
					onClear={function () { setCart([]); }}
					pay={cartPay}
					setPay={setCartPay}
					subtotal={cartSubtotal}
					paywall={cartPaywall}
					total={cartTotal}
					fMoney2={fMoney2}
					currency={currency}
					tc={tc}
					onExport={function () {
						openProposalWindow({
							profile: profile,
							firmaType: firmaType,
							pay: cartPay,
							items: cart,
							subtotal: cartSubtotal,
							paywall: cartPaywall,
							total: cartTotal,
							currency: currency,
							tc: tc,
						});
					}}
				/>
			)}
		</div>
	);
}
