import { useState } from "react";
import { Search } from "lucide-react";
import { useChannelConfig } from "../../context/ChannelConfigContext";
import { CHANNELS } from "../../data/channelMeta";
import { slaGanadoPorFacturacion } from "../../data/channels";
import { getB2B2CSegment, getDistributorVolTier, getVolumenSegment, facturacionAtBase } from "../../lib/tiers";
import { num, usd, pct, rangeCant, rangeUSD } from "../../lib/pricingDocSections";
import { PageHeader } from "../ui/PageHeader";
import { TierBadge } from "../ui/TierBadge";
import { LiveTable, Segmented } from "./docs/DocPrimitives";

// ─── Niveles y segmentos ──────────────────────────────────────────────────────
// Consulta rápida de las escalas de cada canal (en vivo desde Configuración), con un
// buscador "¿dónde cae?" que marca el tramo para una cantidad o facturación. Usa las
// mismas funciones de asignación que los cotizadores (lib/tiers), así el tramo que
// marca acá es el que va a dar la cotización.

function fraction(d) {
	const v = Number(d) || 0;
	return v > 1 ? v / 100 : v;
}

function Lookup({ fields, result, color }) {
	return (
		<div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-control)] md:flex-row md:items-end">
			<div className="flex items-center gap-2 text-sm font-semibold text-foreground md:self-center">
				<Search size={16} style={{ color: color }} aria-hidden="true" /> ¿Dónde cae?
			</div>
			<div className="flex flex-wrap gap-3">
				{fields.map(function (f) {
					return (
						<label key={f.label} className="flex flex-col gap-1">
							<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{f.label}</span>
							<input type="number" min={0} inputMode="numeric" value={f.value} placeholder={f.placeholder || "0"} onChange={function (e) { f.onChange(e.target.value); }}
								className="h-9 w-44 rounded-md border border-input bg-background px-3 text-sm tabular-nums outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50" />
						</label>
					);
				})}
			</div>
			<div className="min-h-9 flex-1 md:text-right" aria-live="polite">{result}</div>
		</div>
	);
}

function ResultChip({ tier, tiers, text }) {
	if (!tier) return <span className="text-sm text-muted-foreground">Cargá un valor para ver el tramo.</span>;
	return (
		<span className="inline-flex flex-wrap items-center gap-2 md:justify-end">
			<TierBadge tier={tier} tiers={tiers} size="md" />
			<span className="text-sm text-muted-foreground">{text}</span>
		</span>
	);
}

export function TabNiveles() {
	const { channelConfig } = useChannelConfig();
	const cfg = channelConfig || {};
	const [tab, setTab] = useState("b2b2c");

	// ── IDC ──
	const idcSegs = cfg.b2b2cSegments || [];
	const [idcQ, setIdcQ] = useState("");
	const idcN = Math.max(0, Number(idcQ) || 0);
	const idcBase = Number((idcSegs[0] || {}).precioIDC) || 0;
	const idcSeg = idcN > 0 ? getB2B2CSegment(idcN, idcN * idcBase, idcSegs) : null;
	// Precio de certificado y de firma dentro de cada IDC: mismo reparto que la propuesta
	// PDF. El precio del bundle se abre en proporción a la lista de Volumen (cert y firma
	// sueltos), así cert + cupo × firma suma exactamente el precio por IDC.
	const listaRef = cfg.volumenBase || { cert: 0, firma: 0 };
	function idcSplit(s) {
		const lc = Number(listaRef.cert) || 0;
		const lf = Number(listaRef.firma) || 0;
		const cupo = Math.max(0, Number(s.firmasIncluidas) || 0);
		const lista = lc + cupo * lf;
		const k = lista > 0 ? (Number(s.precioIDC) || 0) / lista : 0;
		return { cert: lc * k, firma: lf * k };
	}

	// ── Distribuidores ──
	const distTiers = cfg.distribuidorVolTiers || [];
	const distBase = cfg.distribuidorVolBase || { cert: 0, firma: 1 };
	const [distFact, setDistFact] = useState("");
	const [distCerts, setDistCerts] = useState("");
	const distHas = (Number(distFact) || 0) > 0 || (Number(distCerts) || 0) > 0;
	const distTier = distHas ? getDistributorVolTier(Number(distFact) || 0, Number(distCerts) || 0, true, distTiers) : null;

	// ── Volumen ──
	const volSegs = cfg.volumenSegments || [];
	const volBase = cfg.volumenBase || { cert: 0, firma: 0 };
	const [volFirmas, setVolFirmas] = useState("");
	const [volComp, setVolComp] = useState("");
	const volF = Math.max(0, Number(volFirmas) || 0);
	const volC = volComp !== "" ? Math.max(0, Number(volComp) || 0) : facturacionAtBase(0, volF, volBase);
	const volSeg = volF > 0 || volC > 0 ? getVolumenSegment(volF, volC, volSegs) : null;

	// ── SLA ──
	const slaPlans = cfg.slaPlans || [];
	const [slaFact, setSlaFact] = useState("");
	const slaPlan = (Number(slaFact) || 0) > 0 ? slaGanadoPorFacturacion(slaPlans, Number(slaFact) || 0) : null;

	const tabs = [
		{ id: "b2b2c", label: "IDC", Icon: CHANNELS.b2b2c.Icon },
		{ id: "distribuidores", label: "Distribuidores", Icon: CHANNELS.distribuidores.Icon },
		{ id: "volumen", label: "Volumen", Icon: CHANNELS.volumen.Icon },
		{ id: "sla", label: "Soporte / SLA" },
	];

	return (
		<div className="max-w-5xl space-y-6">
			<PageHeader title="Niveles y segmentos" description="Las escalas de cada canal, en vivo desde Configuración. Cargá una cantidad o una facturación y te marca en qué tramo cae." />
			<Segmented label="Canal" value={tab} onChange={setTab} options={tabs} />

			{tab === "b2b2c" && (
				<div className="space-y-4">
					<p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Escala de <strong className="text-foreground">precios</strong> por IDC. El segmento es el mayor entre la <strong className="text-foreground">cantidad total de IDC contratadas</strong> (el año completo con compromiso anual) y su facturación a precio Start Up.{idcSegs[0] ? " Cada IDC incluye " + num(idcSegs[0].firmasIncluidas) + " firmas; la firma extra se cobra USD " + usd(idcSegs[0].precioFirmaExtra) + ". Certificado y firma abren el precio de la IDC en proporción a la lista suelta (cert USD " + usd(listaRef.cert) + " · firma USD " + usd(listaRef.firma) + "), igual que en la propuesta." : ""}</p>
					<Lookup color={CHANNELS.b2b2c.color} fields={[{ label: "IDC contratadas", value: idcQ, onChange: setIdcQ }]}
						result={<ResultChip tier={idcSeg} tiers={idcSegs} text={idcSeg ? "USD " + usd(idcSeg.precioIDC) + " por IDC · total USD " + num(idcN * (Number(idcSeg.precioIDC) || 0)) : ""} />} />
					<LiveTable accent={CHANNELS.b2b2c.color} caption="Segmentos IDC" rows={idcSegs} rowKey={function (s) { return s.id || s.label; }} isActive={function (s) { return s === idcSeg; }}
						columns={[
							{ key: "seg", label: "Segmento", render: function (s) { return <TierBadge tier={s} tiers={idcSegs} size="sm" />; } },
							{ key: "rango", label: "IDC contratadas", align: "right", render: function (s) { return rangeCant(s.idcMin, s.idcMax, "IDC"); } },
							{ key: "fact", label: "Facturación", align: "right", render: function (s) { return rangeUSD(s.facturacionMin, s.facturacionMax); } },
							{ key: "precio", label: "Precio por IDC", align: "right", emphasis: true, render: function (s) { return "USD " + usd(s.precioIDC); } },
							{ key: "cert", label: "Certificado", align: "right", render: function (s) { return "USD " + usd(idcSplit(s).cert); } },
							{ key: "firma", label: "Firma (incluida)", align: "right", render: function (s) { return "USD " + usd(idcSplit(s).firma); } },
						]} />
				</div>
			)}

			{tab === "distribuidores" && (
				<div className="space-y-4">
					<p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">El certificado va bonificado y se cobra la firma (base <strong className="text-foreground">USD {usd(distBase.firma)}</strong>). El nivel es el mayor entre la <strong className="text-foreground">facturación</strong> a precio base (× 12 con compromiso anual) y los <strong className="text-foreground">certificados activos</strong> del socio (cuentan solo con compromiso).</p>
					<Lookup color={CHANNELS.distribuidores.color} fields={[{ label: "Facturación anual (USD)", value: distFact, onChange: setDistFact }, { label: "Certificados activos", value: distCerts, onChange: setDistCerts }]}
						result={<ResultChip tier={distTier} tiers={distTiers} text={distTier ? "−" + pct(distTier.descuento) + " · firma USD " + usd((Number(distBase.firma) || 0) * (1 - fraction(distTier.descuento))) : ""} />} />
					<LiveTable accent={CHANNELS.distribuidores.color} caption="Niveles de Distribuidores" rows={distTiers} rowKey={function (t) { return t.id || t.label; }} isActive={function (t) { return t === distTier; }}
						columns={[
							{ key: "nivel", label: "Nivel", render: function (t) { return <TierBadge tier={t} tiers={distTiers} size="sm" />; } },
							{ key: "fact", label: "Facturación (USD)", align: "right", render: function (t) { return rangeUSD(t.compromisoMin, t.compromisoMax); } },
							{ key: "certs", label: "Certificados activos", align: "right", render: function (t) { return rangeCant(t.certsMin, t.certsMax); } },
							{ key: "desc", label: "Descuento firma", align: "right", render: function (t) { return pct(t.descuento); } },
							{ key: "firma", label: "Firma resultante", align: "right", emphasis: true, render: function (t) { return "USD " + usd((Number(distBase.firma) || 0) * (1 - fraction(t.descuento))); } },
						]} />
				</div>
			)}

			{tab === "volumen" && (
				<div className="space-y-4">
					<p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">Certificados y firmas sueltos (cert <strong className="text-foreground">USD {usd(volBase.cert)}</strong> · firma <strong className="text-foreground">USD {usd(volBase.firma)}</strong>). El segmento es el mayor entre las <strong className="text-foreground">firmas</strong> y el <strong className="text-foreground">compromiso</strong> en USD a lista, y aplica el mismo descuento a los dos. También es la escala de la recompra de firmas en IDC.</p>
					<Lookup color={CHANNELS.volumen.color} fields={[{ label: "Firmas", value: volFirmas, onChange: setVolFirmas }, { label: "Compromiso (USD)", value: volComp, onChange: setVolComp, placeholder: volF > 0 ? num(facturacionAtBase(0, volF, volBase)) + " (auto)" : "opcional" }]}
						result={<ResultChip tier={volSeg} tiers={volSegs} text={volSeg ? "−" + pct(volSeg.descuento) + " · firma USD " + usd((Number(volBase.firma) || 0) * (1 - fraction(volSeg.descuento))) : ""} />} />
					<LiveTable accent={CHANNELS.volumen.color} caption="Segmentos de Volumen" rows={volSegs} rowKey={function (s) { return s.id || s.label; }} isActive={function (s) { return s === volSeg; }}
						columns={[
							{ key: "seg", label: "Segmento", render: function (s) { return <TierBadge tier={s} tiers={volSegs} size="sm" />; } },
							{ key: "firmas", label: "Firmas", align: "right", render: function (s) { return rangeCant(s.firmasMin, s.firmasMax, "firmas"); } },
							{ key: "comp", label: "Compromiso (USD)", align: "right", render: function (s) { return rangeUSD(s.compromisoMin, s.compromisoMax); } },
							{ key: "desc", label: "Descuento", align: "right", emphasis: true, render: function (s) { return pct(s.descuento); } },
						]} />
				</div>
			)}

			{tab === "sla" && (
				<div className="space-y-4">
					<p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">El plan de soporte se <strong className="text-foreground">gana por facturación</strong>: la de la cotización (la del año con compromiso anual) incluye sin cargo el plan cuyo umbral alcanza. Uno superior se cobra a su precio.</p>
					<Lookup color="var(--accent-analysis)" fields={[{ label: "Facturación (USD)", value: slaFact, onChange: setSlaFact }]}
						result={slaPlan ? <span className="text-sm"><strong className="text-foreground">{slaPlan.label}</strong> <span className="text-muted-foreground">incluido sin cargo</span></span> : <span className="text-sm text-muted-foreground">Cargá un valor para ver el plan.</span>} />
					<LiveTable accent="var(--accent-analysis)" caption="Planes SLA" rows={slaPlans} rowKey={function (p) { return p.id || p.label; }} isActive={function (p) { return p === slaPlan; }}
						columns={[
							{ key: "plan", label: "Plan", render: function (p) { return <span className="font-semibold text-foreground">{p.label}</span>; } },
							{ key: "desde", label: "Incluido desde", align: "right", emphasis: true, render: function (p) { return p.facturacionMin == null ? "—" : Number(p.facturacionMin) <= 0 ? "siempre" : "USD " + num(p.facturacionMin); } },
							{ key: "precio", label: "Precio si se elige aparte", align: "right", render: function (p) { return p.precioMes == null ? "a medida" : p.precioMes === 0 ? "incluido" : "USD " + num(p.precioMes) + "/mes"; } },
							{ key: "detalle", label: "Detalle", render: function (p) { return <span className="whitespace-normal text-muted-foreground">{p.desc}</span>; } },
						]} />
				</div>
			)}
		</div>
	);
}
