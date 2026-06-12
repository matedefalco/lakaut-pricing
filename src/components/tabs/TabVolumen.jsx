import { useState, useMemo, useEffect } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, OK, OKBG, WN, WNBG, ER, ERBG, os, mont } from "../../theme/tokens";
import { fD2 } from "../../utils/formatters";
import { makeMoney } from "../../utils/useMoney";
import { loadConfig, saveConfig } from "../../lib/supabase";
import { getTierForCerts, calcVolumenDeal, PRECIO_CERT_JURIDICA } from "../../data/volumeTiers";

const QUOTES_KEY = "b2b_quotes";

const TIER_COLORS = {
	starter:    { bg: "#f1effd", border: "#7c3aed", text: "#4c1d95" },
	scale:      { bg: "#e0f2fe", border: "#0284c7", text: "#0c4a6e" },
	growth:     { bg: "#fef3c7", border: "#d97706", text: "#78350f" },
	enterprise: { bg: "#f0fdf4", border: "#16a34a", text: "#14532d" },
};

function Row({ label, value, sub, mono, bold, color }) {
	return (
		<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid " + BORD }}>
			<span style={os(12, 400, GRAY)}>{label}</span>
			<div style={{ textAlign: "right" }}>
				<span style={Object.assign({}, os(13, bold ? 700 : 400, color || BLACK), mono ? { fontFamily: "Courier New,monospace" } : {})}>
					{value}
				</span>
				{sub && <div style={os(11, 400, GRAY)}>{sub}</div>}
			</div>
		</div>
	);
}

function NumField({ label, value, onChange, min, step, decimals }) {
	return (
		<div style={{ marginBottom: 12 }}>
			<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 })}>
				{label}
			</div>
			<input
				type="number"
				min={min || 0}
				step={step || 1}
				value={value}
				onChange={function (e) { onChange(Number(e.target.value)); }}
				style={{
					width: "100%",
					border: "1px solid " + BORD,
					borderRadius: 6,
					padding: "8px 10px",
					fontFamily: "Courier New,monospace",
					fontSize: 14,
					color: BLACK,
					background: WHITE,
					outline: "none",
					boxSizing: "border-box",
				}}
			/>
		</div>
	);
}

function openB2BExportWindow({ clientName, tier, certsAnuales, certsJuridicas, firmasPorCert, modalidad, firmasIncluidas, precioCertFisica, precioFirmaExtra, setupFee, deal, currency, tcRate }) {
	const cur = currency === "ARS" ? "ARS" : "USD";
	const fmt = currency === "ARS"
		? function (n) { return "$ " + Math.round(n * tcRate).toLocaleString("es-AR"); }
		: function (n) { return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); };
	const tierLabel = tier ? tier.label : "—";
	const today = new Date().toLocaleDateString("es-AR");

	const firmasRow = modalidad === "bundle"
		? "<tr><td>Firmas incluidas / cert</td><td>" + firmasIncluidas + "</td><td>Bundle</td><td>—</td></tr>"
			+ (deal.firmasExtra > 0 ? "<tr><td>Firmas extra (" + deal.firmasExtra.toLocaleString() + ")</td><td>1</td><td>" + fmt(precioFirmaExtra) + " c/u</td><td>" + fmt(deal.revFirmasExtra) + "</td></tr>" : "")
		: "<tr><td>Firmas à la demanda (" + deal.firmasTotales.toLocaleString() + ")</td><td>1</td><td>" + fmt(precioFirmaExtra) + " c/u</td><td>" + fmt(deal.revFirmasExtra) + "</td></tr>";

	const setupRow = (setupFee || 0) > 0
		? "<tr><td>Setup fee mensual</td><td>12 meses</td><td>" + fmt(setupFee) + "/mes</td><td>" + fmt(deal.revSetup) + "</td></tr>"
		: "";

	const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Propuesta Lakaut · B2B ${clientName ? "· " + clientName : ""}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Open Sans',Arial,sans-serif;background:#f8f8f8;color:#111;padding:40px 24px}
  .page{max-width:760px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)}
  .header{background:#111;color:#fff;padding:28px 32px;display:flex;justify-content:space-between;align-items:center}
  .header h1{font-size:22px;font-weight:700;letter-spacing:.5px}
  .header p{font-size:12px;opacity:.6;margin-top:4px}
  .badge{background:#0050f5;color:#fff;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700}
  .section{padding:24px 32px;border-bottom:1px solid #e5e7eb}
  .section h2{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#666;margin-bottom:14px}
  .meta-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .meta-item{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
  .meta-item .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#9ca3af;margin-bottom:4px}
  .meta-item .value{font-size:16px;font-weight:700;color:#111}
  .meta-item .sub{font-size:10px;color:#6b7280;margin-top:2px}
  table{width:100%;border-collapse:collapse}
  th{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;padding:8px 12px;background:#f9fafb;border-bottom:1px solid #e5e7eb;text-align:left}
  th.r,td.r{text-align:right}
  td{font-size:13px;padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#111}
  tr:last-child td{border-bottom:none}
  .total-row td{font-weight:700;font-size:14px;background:#f0f5ff;color:#0050f5}
  .cv-row td{font-size:12px;color:#6b7280}
  .margin-row td{font-weight:700;color:#16a34a;background:#f0fdf4}
  .footer{padding:20px 32px;font-size:11px;color:#9ca3af;line-height:1.6;background:#f9fafb}
  .print-btn{display:block;margin:24px auto 0;padding:10px 28px;background:#111;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit}
  @media print{.print-btn{display:none}body{background:#fff;padding:0}.page{box-shadow:none;border-radius:0}}
</style></head><body>
<div class="page">
  <div class="header">
    <div>
      <h1>Propuesta Comercial B2B</h1>
      <p>Lakaut · Certificados Digitales · ${today}</p>
    </div>
    <div><span class="badge">Tier ${tierLabel}</span></div>
  </div>

  <div class="section">
    <h2>Datos del deal</h2>
    <div class="meta-grid">
      ${clientName ? '<div class="meta-item"><div class="label">Cliente</div><div class="value" style="font-size:14px">' + clientName + '</div></div>' : ""}
      <div class="meta-item"><div class="label">Certs físicas / año</div><div class="value">${certsAnuales.toLocaleString()}</div><div class="sub">Tier ${tierLabel}</div></div>
      ${certsJuridicas > 0 ? '<div class="meta-item"><div class="label">Certs jurídicas / año</div><div class="value">' + certsJuridicas.toLocaleString() + '</div><div class="sub">$70/empresa/año</div></div>' : ""}
      <div class="meta-item"><div class="label">Firmas prom. / cert</div><div class="value">${firmasPorCert}</div><div class="sub">Modalidad: ${modalidad}</div></div>
      <div class="meta-item"><div class="label">Precio cert / año</div><div class="value">${fmt(precioCertFisica)}</div></div>
      ${(setupFee || 0) > 0 ? '<div class="meta-item"><div class="label">Setup fee</div><div class="value">' + fmt(setupFee) + '/mes</div></div>' : ""}
    </div>
  </div>

  <div class="section">
    <h2>Desglose de pricing</h2>
    <table>
      <thead><tr><th>Concepto</th><th>Volumen</th><th>Precio unit.</th><th class="r">Subtotal / año</th></tr></thead>
      <tbody>
        <tr><td>Certificados físicos</td><td>${certsAnuales.toLocaleString()}</td><td>${fmt(precioCertFisica)}/cert/año</td><td class="r">${fmt(deal.revCertsFisicas)}</td></tr>
        ${certsJuridicas > 0 ? "<tr><td>Certificados jurídicos</td><td>" + certsJuridicas.toLocaleString() + "</td><td>$70/empresa/año</td><td class='r'>" + fmt(deal.revCertsJuridicas) + "</td></tr>" : ""}
        ${firmasRow}
        ${setupRow}
        <tr class="total-row"><td colspan="3">Total / año</td><td class="r">${fmt(deal.revTotal)}</td></tr>
        <tr><td colspan="3" style="font-size:11px;color:#6b7280">Equivalente mensual</td><td class="r" style="font-size:11px;color:#6b7280">${fmt(deal.revTotal / 12)}/mes</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">
    Condiciones: precios en ${cur}. Vigencia del contrato: 12 meses desde la firma. Vigencia de certificados y firmas: 2 años. Volúmenes comprometidos anuales. Setup fee mensual recurrente durante la vigencia del contrato. Los precios no incluyen IVA. Esta propuesta es válida por 72 horas.
  </div>
  <button class="print-btn" onclick="window.print()">Imprimir / Guardar PDF</button>
</div>
</body></html>`;

	const win = window.open("", "_blank", "width=820,height=700,scrollbars=yes");
	if (win) {
		win.document.write(html);
		win.document.close();
	}
}

export function TabVolumen({ volumeTiers, costs, currency, tc: tcRate }) {
	const [certsAnuales, setCertsAnuales] = useState(4000);
	const [certsJuridicas, setCertsJuridicas] = useState(40);
	const [firmasPorCert, setFirmasPorCert] = useState(14);
	const [modalidad, setModalidad] = useState("bundle");
	const [clientName, setClientName] = useState("");
	const [viewPeriodo, setViewPeriodo] = useState("mensual");

	// Override prices (null = use tier default)
	const [overridePrecioFisica, setOverridePrecioFisica] = useState("");
	const [overridePrecioFirmaExtra, setOverridePrecioFirmaExtra] = useState("");
	const [overrideSetupFee, setOverrideSetupFee] = useState("");

	// Historial de cotizaciones (Supabase, key compartida en app_config)
	const [quotes, setQuotes] = useState([]);
	const [quotesLoading, setQuotesLoading] = useState(true);
	const [saveFlash, setSaveFlash] = useState(false);
	const [quoteMonth, setQuoteMonth] = useState("all");

	// Meses disponibles en el historial (formato YYYY-MM, más reciente primero)
	const quoteMonths = useMemo(function () {
		const set = new Set(quotes.map(function (q) { return q.fecha.slice(0, 7); }));
		return Array.from(set).sort().reverse();
	}, [quotes]);

	const filteredQuotes = useMemo(function () {
		if (quoteMonth === "all") return quotes;
		return quotes.filter(function (q) { return q.fecha.slice(0, 7) === quoteMonth; });
	}, [quotes, quoteMonth]);

	function exportQuotesCsv() {
		const header = ["fecha", "cliente", "tier", "modalidad", "certs_fisicas_anio", "certs_juridicas_anio", "firmas_por_cert", "firmas_totales_anio", "precio_cert_usd", "precio_firma_extra_usd", "setup_fee_usd_mes", "revenue_anual_usd", "margen_pct", "moneda_cotizada", "tc"];
		const rows = filteredQuotes.map(function (q) {
			return [
				q.fecha.slice(0, 10),
				'"' + q.clientName.replace(/"/g, '""') + '"',
				q.tierLabel,
				q.modalidad,
				q.certsAnuales,
				q.certsJuridicas,
				q.firmasPorCert,
				q.certsAnuales * q.firmasPorCert,
				q.precioCertFisica,
				q.precioFirmaExtra,
				q.setupFee || 0,
				Math.round(q.revTotal * 100) / 100,
				Math.round(q.margenPct * 1000) / 10,
				q.currency,
				q.currency === "ARS" ? q.tcRate : "",
			].join(",");
		});
		const csv = header.join(",") + "\n" + rows.join("\n");
		const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = "cotizaciones-b2b" + (quoteMonth === "all" ? "" : "-" + quoteMonth) + ".csv";
		a.click();
		URL.revokeObjectURL(a.href);
	}

	useEffect(function () {
		let alive = true;
		loadConfig(QUOTES_KEY).then(function (data) {
			if (!alive) return;
			// No pisar el estado si el usuario ya guardó algo mientras cargaba
			setQuotes(function (prev) {
				return prev.length > 0 ? prev : (Array.isArray(data) ? data : []);
			});
			setQuotesLoading(false);
		});
		return function () { alive = false; };
	}, []);

	function saveQuote() {
		if (!deal) return;
		const q = {
			id: Date.now().toString(36),
			fecha: new Date().toISOString(),
			clientName: clientName || "(sin nombre)",
			tierId: tier ? tier.id : null,
			tierLabel: tier ? tier.label : "—",
			certsAnuales, certsJuridicas, firmasPorCert, modalidad,
			overridePrecioFisica, overridePrecioFirmaExtra, overrideSetupFee,
			precioCertFisica, precioFirmaExtra, setupFee,
			currency, tcRate,
			revTotal: deal.revTotal,
			margenPct: deal.margenPct,
		};
		const next = [q].concat(quotes).slice(0, 100);
		setQuotes(next);
		saveConfig(QUOTES_KEY, next);
		setSaveFlash(true);
		setTimeout(function () { setSaveFlash(false); }, 1500);
	}

	function loadQuote(q) {
		setClientName(q.clientName === "(sin nombre)" ? "" : q.clientName);
		setCertsAnuales(q.certsAnuales);
		setCertsJuridicas(q.certsJuridicas);
		setFirmasPorCert(q.firmasPorCert);
		setModalidad(q.modalidad);
		setOverridePrecioFisica(q.overridePrecioFisica || "");
		setOverridePrecioFirmaExtra(q.overridePrecioFirmaExtra || "");
		setOverrideSetupFee(q.overrideSetupFee || "");
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	function deleteQuote(id) {
		const next = quotes.filter(function (q) { return q.id !== id; });
		setQuotes(next);
		saveConfig(QUOTES_KEY, next);
	}

	const tier = useMemo(function () {
		return getTierForCerts(certsAnuales, volumeTiers);
	}, [certsAnuales, volumeTiers]);

	const isEnterprise = tier && tier.id === "enterprise";

	const precioCertFisica = overridePrecioFisica !== "" ? Number(overridePrecioFisica) : (tier ? tier.precioCertFisica : 0);
	const precioFirmaExtra = overridePrecioFirmaExtra !== "" ? Number(overridePrecioFirmaExtra) : (tier ? tier.precioFirmaExtra : 0);
	const setupFee = overrideSetupFee !== "" ? Number(overrideSetupFee) : (tier ? tier.setupFee : 0);
	const firmasIncluidas = tier ? (tier.firmasIncluidas || 0) : 0;

	const deal = useMemo(function () {
		if (!tier || isEnterprise || !precioCertFisica) return null;
		return calcVolumenDeal({
			certsAnuales,
			certsJuridicas,
			modalidad,
			firmasPorCert,
			precioCertFisica,
			precioCertJuridica: PRECIO_CERT_JURIDICA,
			firmasIncluidas,
			precioFirmaExtra,
			setupFee,
			cvCert: costs.cvCertBase,
			cvFirma: costs.cvFirmaBase,
		});
	}, [tier, isEnterprise, certsAnuales, certsJuridicas, modalidad, firmasPorCert, precioCertFisica, firmasIncluidas, precioFirmaExtra, setupFee, costs]);

	const tc = TIER_COLORS[tier ? tier.id : "starter"];
	const mPct = deal ? Math.round(deal.margenPct * 1000) / 10 : null;
	const mColor = mPct === null ? GRAY : mPct > 60 ? OK : mPct > 40 ? WN : ER;
	const pFactor = viewPeriodo === "mensual" ? 1 / 12 : 1;
	const pLabel = viewPeriodo === "mensual" ? "mes" : "año";
	const { fMoney2: fM } = makeMoney(currency, tcRate);

	return (
		<div style={{ maxWidth: 820, margin: "0 auto" }}>

			{/* Header */}
			<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" })}>
				<span>Cotizadora B2B · Volumen</span>
				<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
					<div style={{ display: "flex", border: "1px solid rgba(255,255,255,.3)", borderRadius: 6, overflow: "hidden" }}>
						{["mensual", "anual"].map(function (p) {
							const active = viewPeriodo === p;
							return (
								<button key={p} onClick={function () { setViewPeriodo(p); }}
									style={{ padding: "4px 12px", background: active ? WHITE : "transparent", color: active ? BLACK : "rgba(255,255,255,.75)", border: "none", cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: active ? 700 : 400 }}>
									{p.charAt(0).toUpperCase() + p.slice(1)}
								</button>
							);
						})}
					</div>
					{deal && (
						<button
							onClick={function () { openB2BExportWindow({ clientName, tier, certsAnuales, certsJuridicas, firmasPorCert, modalidad, firmasIncluidas, precioCertFisica, precioFirmaExtra, setupFee, deal, currency, tcRate }); }}
							style={{ padding: "4px 14px", background: BLUE, color: WHITE, border: "none", borderRadius: 6, cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700 }}
						>
							Exportar
						</button>
					)}
					{deal && (
						<button
							onClick={saveQuote}
							disabled={quotesLoading}
							style={{ padding: "4px 14px", background: saveFlash ? OK : "transparent", color: WHITE, border: "1px solid " + (saveFlash ? OK : "rgba(255,255,255,.4)"), borderRadius: 6, cursor: quotesLoading ? "wait" : "pointer", opacity: quotesLoading ? 0.5 : 1, fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700 }}
						>
							{saveFlash ? "✓ Guardada" : "Guardar"}
						</button>
					)}
				</div>
			</div>
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 20, background: WHITE, marginBottom: 20 }}>
				<div style={{ marginBottom: 16 }}>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 })}>Nombre del cliente</div>
					<input
						type="text"
						placeholder="Ej: Minder S.A."
						value={clientName}
						onChange={function (e) { setClientName(e.target.value); }}
						style={{ width: "100%", border: "1px solid " + BORD, borderRadius: 6, padding: "8px 10px", fontFamily: "'Open Sans',sans-serif", fontSize: 13, color: BLACK, background: WHITE, outline: "none", boxSizing: "border-box" }}
					/>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
					<NumField
						label={"Certs físicas / " + pLabel}
						value={viewPeriodo === "mensual" ? Math.round(certsAnuales / 12) : certsAnuales}
						onChange={function (v) { setCertsAnuales(viewPeriodo === "mensual" ? v * 12 : v); }}
						min={1}
					/>
					<NumField
						label={"Certs jurídicas / " + pLabel}
						value={viewPeriodo === "mensual" ? Math.round(certsJuridicas / 12) : certsJuridicas}
						onChange={function (v) { setCertsJuridicas(viewPeriodo === "mensual" ? v * 12 : v); }}
						min={0}
					/>
					<NumField
						label={"Firmas / cert / " + pLabel}
						value={viewPeriodo === "mensual" ? Math.round(firmasPorCert / 12) : firmasPorCert}
						onChange={function (v) { setFirmasPorCert(viewPeriodo === "mensual" ? v * 12 : v); }}
						min={0}
						step={1}
					/>
				</div>

				{/* Modalidad toggle */}
				<div style={{ marginBottom: 4 }}>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
						Modalidad de firmas
					</div>
					<div style={{ display: "flex", gap: 0, border: "1px solid " + BORD, borderRadius: 8, overflow: "hidden", width: "fit-content" }}>
						{[
							{ k: "bundle", label: "Bundle", sub: "firmas incluidas por cert" },
							{ k: "demanda", label: "À la demanda", sub: "precio por firma separado" },
						].map(function (opt) {
							const active = modalidad === opt.k;
							return (
								<button
									key={opt.k}
									onClick={function () { setModalidad(opt.k); }}
									style={{
										padding: "9px 20px",
										background: active ? BLUE : WHITE,
										color: active ? WHITE : GRAY,
										border: "none",
										borderRight: opt.k === "bundle" ? "1px solid " + BORD : "none",
										cursor: "pointer",
										fontFamily: "'Open Sans',sans-serif",
										fontSize: 12,
										fontWeight: active ? 700 : 400,
										transition: "background 0.15s",
									}}
								>
									<div>{opt.label}</div>
									<div style={{ fontSize: 10, opacity: 0.75 }}>{opt.sub}</div>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* Tier detectado */}
			{tier && (
				<div style={{ border: "2px solid " + tc.border, borderRadius: 12, padding: "14px 18px", background: tc.bg, marginBottom: 20 }}>
					<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
						<div>
							<span style={Object.assign({}, os(10, 700, tc.text), { textTransform: "uppercase", letterSpacing: "0.6px" })}>Tier detectado</span>
							<div style={Object.assign({}, mont(22), { color: tc.text, lineHeight: 1.1, marginTop: 2 })}>{tier.label}</div>
							{!isEnterprise && (
								<div style={os(11, 400, tc.text)}>
									{tier.certsMin.toLocaleString()} – {tier.certsMax ? tier.certsMax.toLocaleString() : "∞"} certs/año
								</div>
							)}
						</div>
						{!isEnterprise && (
							<div style={{ textAlign: "right" }}>
								<div style={os(11, 400, tc.text)}>Precio sugerido</div>
								<div style={Object.assign({}, mont(28), { color: tc.text })}>
									{fM(precioCertFisica)}/cert/año
								</div>
								<div style={os(11, 400, tc.text)}>
									{modalidad === "bundle" ? firmasIncluidas + " firmas incluidas" : "+ " + fM(precioFirmaExtra) + "/firma"}
								</div>
							</div>
						)}
						{isEnterprise && (
							<div style={os(13, 700, tc.text)}>Precio a negociar · completá los campos de override</div>
						)}
					</div>
				</div>
			)}

			<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

				{/* Override de precios */}
				<div>
					<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0" })}>
						Precios a aplicar
					</div>
					<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
						<div style={os(11, 400, GRAY, { marginBottom: 12 })}>Dejá vacío para usar el precio del tier. Editá para negociar.</div>

						<div style={{ marginBottom: 10 }}>
							<div style={os(11, 700, BLACK, { marginBottom: 3 })}>Precio cert física / año (USD)</div>
							<input
								type="number"
								min={0}
								step={0.5}
								placeholder={tier && !isEnterprise ? String(tier.precioCertFisica) : "Tier: negociar"}
								value={overridePrecioFisica}
								onChange={function (e) { setOverridePrecioFisica(e.target.value); }}
								style={{ width: "100%", border: "1px solid " + BORD, borderRadius: 6, padding: "7px 10px", fontFamily: "Courier New,monospace", fontSize: 13, color: BLACK, background: WHITE, outline: "none", boxSizing: "border-box" }}
							/>
						</div>

						{modalidad === "bundle" && (
							<div style={{ marginBottom: 10 }}>
								<div style={os(11, 700, BLACK, { marginBottom: 3 })}>Precio firma extra / unidad (USD)</div>
								<input
									type="number"
									min={0}
									step={0.01}
									placeholder={tier && tier.precioFirmaExtra ? String(tier.precioFirmaExtra) : "0"}
									value={overridePrecioFirmaExtra}
									onChange={function (e) { setOverridePrecioFirmaExtra(e.target.value); }}
									style={{ width: "100%", border: "1px solid " + BORD, borderRadius: 6, padding: "7px 10px", fontFamily: "Courier New,monospace", fontSize: 13, color: BLACK, background: WHITE, outline: "none", boxSizing: "border-box" }}
								/>
							</div>
						)}

						{modalidad === "demanda" && (
							<div style={{ marginBottom: 10 }}>
								<div style={os(11, 700, BLACK, { marginBottom: 3 })}>Precio por firma (USD)</div>
								<input
									type="number"
									min={0}
									step={0.01}
									placeholder={tier && tier.precioFirmaExtra ? String(tier.precioFirmaExtra) : "0"}
									value={overridePrecioFirmaExtra}
									onChange={function (e) { setOverridePrecioFirmaExtra(e.target.value); }}
									style={{ width: "100%", border: "1px solid " + BORD, borderRadius: 6, padding: "7px 10px", fontFamily: "Courier New,monospace", fontSize: 13, color: BLACK, background: WHITE, outline: "none", boxSizing: "border-box" }}
								/>
							</div>
						)}

						<div style={{ marginBottom: 10 }}>
							<div style={os(11, 700, BLACK, { marginBottom: 3 })}>Setup fee mensual (USD)</div>
							<input
								type="number"
								min={0}
								step={100}
								placeholder={tier && tier.setupFee ? String(tier.setupFee) : "0"}
								value={overrideSetupFee}
								onChange={function (e) { setOverrideSetupFee(e.target.value); }}
								style={{ width: "100%", border: "1px solid " + BORD, borderRadius: 6, padding: "7px 10px", fontFamily: "Courier New,monospace", fontSize: 13, color: BLACK, background: WHITE, outline: "none", boxSizing: "border-box" }}
							/>
						</div>

						<div style={os(11, 400, GRAY)}>Cert jurídica: <strong>$70/empresa/año</strong> (fijo)</div>
					</div>
				</div>

				{/* Resultado del deal */}
				<div>
					<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0" })}>
						Resumen del deal
					</div>
					<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
						{deal ? (
							<>
								<Row label={"Certs físicas × precio / " + pLabel} value={fM(deal.revCertsFisicas * pFactor)} mono />
								{certsJuridicas > 0 && <Row label={"Certs jurídicas × $70 / " + pLabel} value={fM(deal.revCertsJuridicas * pFactor)} mono />}
								{modalidad === "bundle" && deal.firmasExtra > 0 && (
									<Row label={"Firmas extra / " + pLabel} value={fM(deal.revFirmasExtra * pFactor)} sub={deal.firmasExtra.toLocaleString() + " × " + fM(precioFirmaExtra)} mono />
								)}
								{modalidad === "bundle" && deal.firmasExtra === 0 && (
									<Row label={"Firmas extra"} value={fM(0)} sub={"dentro de las " + firmasIncluidas + " incluidas"} mono />
								)}
								{modalidad === "demanda" && (
									<Row label={"Firmas / " + pLabel} value={fM(deal.revFirmasExtra * pFactor)} sub={deal.firmasTotales.toLocaleString() + " × " + fM(precioFirmaExtra)} mono />
								)}
								{(setupFee || 0) > 0 && (
									<Row label={"Setup fee / " + pLabel} value={fM(deal.revSetup * pFactor)} sub={fM(setupFee) + "/mes"} mono />
								)}
								<div style={{ margin: "8px 0", borderTop: "2px solid " + BLACK }} />
								<Row label={"Revenue total / " + pLabel} value={fM(deal.revTotal * pFactor)} bold mono color={BLUE} />
								<Row label={"CV total / " + pLabel} value={fM(deal.cvTotal * pFactor)} mono color={GRAY} />
								<div style={{ margin: "8px 0", borderTop: "1px solid " + BORD }} />
								<Row
									label="Margen bruto (sobre CV)"
									value={mPct + "%"}
									bold
									color={mColor}
									sub={fM(deal.margenBruto * pFactor) + " contribución / " + pLabel}
								/>
								<div style={{ margin: "8px 0", borderTop: "1px solid " + BORD }} />
								<Row label="Firmas totales / año" value={deal.firmasTotales.toLocaleString()} />
								{viewPeriodo === "mensual" && (
									<Row label="Revenue anual equiv." value={fM(deal.revTotal)} mono />
								)}
							</>
						) : (
							<div style={os(12, 400, GRAY)}>
								{isEnterprise
									? "Tier Enterprise: completá los precios de override para ver el resumen."
									: "Completá los datos para ver el resumen."}
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Tabla comparativa de tiers */}
			<div style={{ marginTop: 24 }}>
				<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0" })}>
					Referencia de tiers
				</div>
				<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "hidden" }}>
					<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
						<thead>
							<tr style={{ background: "#f8f8f8" }}>
								{["Tier", "Certs/año", "Precio/cert/año", "Firmas incl.", "Firma extra", "Setup fee", "Margen bruto CV (20f)"].map(function (h, i) {
									return <th key={h} style={Object.assign({}, os(10, 700, GRAY), { padding: "8px 12px", textAlign: i === 0 ? "left" : "right", borderBottom: "1px solid " + BORD })}>{h}</th>;
								})}
							</tr>
						</thead>
						<tbody>
							{volumeTiers.map(function (t) {
								const isActive = tier && tier.id === t.id;
								const cv20 = (costs.cvCertBase / 2) + 20 * costs.cvFirmaBase;
								const marginPct = t.precioCertFisica ? Math.round((1 - cv20 / t.precioCertFisica) * 1000) / 10 : null;
								const tc2 = TIER_COLORS[t.id] || TIER_COLORS.starter;
								return (
									<tr key={t.id} style={{ background: isActive ? tc2.bg : "transparent", outline: isActive ? "2px solid " + tc2.border : "none", position: "relative" }}>
										<td style={{ padding: "9px 12px" }}>
											<span style={Object.assign({}, os(11, 700, tc2.text), { background: tc2.bg, border: "1px solid " + tc2.border, padding: "2px 8px", borderRadius: 10 })}>
												{isActive ? "▶ " : ""}{t.label}
											</span>
										</td>
										<td style={Object.assign({}, os(12, 400, BLACK), { textAlign: "right", padding: "9px 12px", fontFamily: "Courier New,monospace" })}>
											{t.certsMin.toLocaleString()}–{t.certsMax ? t.certsMax.toLocaleString() : "∞"}
										</td>
										<td style={Object.assign({}, os(12, 700, BLACK), { textAlign: "right", padding: "9px 12px", fontFamily: "Courier New,monospace" })}>
											{t.precioCertFisica ? "$" + t.precioCertFisica : "—"}
										</td>
										<td style={Object.assign({}, os(12, 400, BLACK), { textAlign: "right", padding: "9px 12px" })}>
											{t.firmasIncluidas != null ? t.firmasIncluidas : "∞"}
										</td>
										<td style={Object.assign({}, os(12, 400, BLACK), { textAlign: "right", padding: "9px 12px", fontFamily: "Courier New,monospace" })}>
											{t.precioFirmaExtra ? "$" + t.precioFirmaExtra : "—"}
										</td>
										<td style={Object.assign({}, os(12, 400, BLACK), { textAlign: "right", padding: "9px 12px", fontFamily: "Courier New,monospace" })}>
											{t.setupFee ? "$" + t.setupFee + "/mes" : "—"}
										</td>
										<td style={Object.assign({}, os(12, 700, marginPct !== null ? (marginPct > 60 ? OK : marginPct > 40 ? WN : ER) : GRAY), { textAlign: "right", padding: "9px 12px" })}>
											{marginPct !== null ? marginPct + "%" : "Negociar"}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>

				{/* Historial de cotizaciones */}
				<div style={{ marginTop: 24 }}>
					<div style={Object.assign({}, mont(14), { color: WHITE, background: BLACK, padding: "10px 16px", borderRadius: "8px 8px 0 0" })}>
						Historial de cotizaciones
					</div>
					<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", background: WHITE, overflow: "hidden" }}>
						{quotesLoading && (
							<div style={Object.assign({}, os(12, 400, GRAY), { padding: 16 })}>Cargando…</div>
						)}
						{!quotesLoading && quotes.length === 0 && (
							<div style={Object.assign({}, os(12, 400, GRAY), { padding: 16 })}>
								Todavía no hay cotizaciones guardadas. Armá un deal y tocá <strong>Guardar</strong> en el header.
							</div>
						)}
						{!quotesLoading && quotes.length > 0 && (
							<>
								<div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: "1px solid " + BORD, flexWrap: "wrap" }}>
									<span style={os(11, 700, BLACK)}>Mes:</span>
									<select
										value={quoteMonth}
										onChange={function (e) { setQuoteMonth(e.target.value); }}
										style={{ padding: "4px 8px", border: "1px solid " + BORD, borderRadius: 6, fontFamily: "'Open Sans',sans-serif", fontSize: 12, color: BLACK, background: WHITE }}
									>
										<option value="all">Todos</option>
										{quoteMonths.map(function (m) {
											return <option key={m} value={m}>{m}</option>;
										})}
									</select>
									<button
										onClick={exportQuotesCsv}
										style={{ padding: "4px 14px", background: WHITE, color: BLUE, border: "1px solid " + BLUE, borderRadius: 6, cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700 }}
									>
										Exportar CSV
									</button>
									<span style={os(10, 400, GRAY)}>{filteredQuotes.length} {filteredQuotes.length === 1 ? "cotización" : "cotizaciones"}</span>
								</div>
								<div style={{ overflowX: "auto" }}>
								<table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 760 }}>
									<thead>
										<tr style={{ background: "#f8f8f8" }}>
											{["Fecha", "Cliente", "Tier", "Certs/año", "Firmas/año", "Setup fee", "Revenue/año", "Margen", ""].map(function (h, i) {
												return <th key={i} style={Object.assign({}, os(10, 700, GRAY), { padding: "8px 12px", textAlign: i <= 1 ? "left" : "right", borderBottom: "1px solid " + BORD })}>{h}</th>;
											})}
										</tr>
									</thead>
									<tbody>
										{filteredQuotes.map(function (q, i) {
											const qtc = TIER_COLORS[q.tierId] || TIER_COLORS.starter;
											const qm = Math.round(q.margenPct * 1000) / 10;
											return (
												<tr key={q.id} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE, borderBottom: "1px solid " + BORD }}>
													<td style={Object.assign({}, os(11, 400, GRAY), { padding: "8px 12px", whiteSpace: "nowrap" })}>
														{new Date(q.fecha).toLocaleDateString("es-AR")}
													</td>
													<td style={Object.assign({}, os(12, 700, BLACK), { padding: "8px 12px" })}>{q.clientName}</td>
													<td style={{ padding: "8px 12px", textAlign: "right" }}>
														<span style={Object.assign({}, os(10, 700, qtc.text), { background: qtc.bg, border: "1px solid " + qtc.border, padding: "1px 7px", borderRadius: 10 })}>{q.tierLabel}</span>
													</td>
													<td style={Object.assign({}, os(12, 400, BLACK), { padding: "8px 12px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
														{q.certsAnuales.toLocaleString()}
													</td>
													<td style={Object.assign({}, os(12, 400, BLACK), { padding: "8px 12px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
														{(q.certsAnuales * q.firmasPorCert).toLocaleString()}
													</td>
													<td style={Object.assign({}, os(12, 400, BLACK), { padding: "8px 12px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
														{q.setupFee ? fM(q.setupFee) + "/mes" : "—"}
													</td>
													<td style={Object.assign({}, os(12, 400, BLACK), { padding: "8px 12px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
														{fM(q.revTotal)}
													</td>
													<td style={Object.assign({}, os(12, 700, qm > 60 ? OK : qm > 40 ? WN : ER), { padding: "8px 12px", textAlign: "right" })}>
														{qm}%
													</td>
													<td style={{ padding: "8px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
														<button
															onClick={function () { loadQuote(q); }}
															title="Repone esta cotización en el formulario de arriba para ajustarla o re-exportarla"
															style={{ padding: "3px 10px", background: WHITE, color: BLUE, border: "1px solid " + BLUE, borderRadius: 6, cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 11, fontWeight: 700, marginRight: 6 }}
														>
															Reabrir
														</button>
														<button
															onClick={function () { deleteQuote(q.id); }}
															style={{ padding: "3px 8px", background: WHITE, color: GRAY, border: "1px solid " + BORD, borderRadius: 6, cursor: "pointer", fontFamily: "'Open Sans',sans-serif", fontSize: 11 }}
														>
															✕
														</button>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
								</div>
							</>
						)}
					</div>
					<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 6 })}>
						Sincronizado vía Supabase: las cotizaciones guardadas son visibles para todo el equipo. <strong>Reabrir</strong> repone la cotización en el formulario.
					</div>
				</div>

		</div>
	);
}
