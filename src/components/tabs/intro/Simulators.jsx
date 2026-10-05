import { useState } from "react";
import { useChannelConfig } from "../../../context/ChannelConfigContext";
import { CHANNELS } from "../../../data/channelMeta";
import { getB2B2CSegment, getDistributorVolTier, getVolumenSegment, facturacionAtBase, segmentPricing } from "../../../lib/tiers";
import { num, usd, pct, pts } from "../../../lib/pricingDocSections";
import { TierBadge } from "../../ui/TierBadge";
import { Segmented } from "../docs/DocPrimitives";

// ─── Mini simuladores de la Introducción ──────────────────────────────────────
// Versiones chicas de los cotizadores: una o dos perillas y el resultado. Usan las
// MISMAS funciones de segmento que el cotizador (lib/tiers) y la config viva, así
// lo que se aprende acá es exactamente lo que después pasa al cotizar. No guardan
// nada ni reemplazan al cotizador: son para entender la mecánica.

// Slider logarítmico: los volúmenes van de decenas a cientos de miles, y con una
// escala lineal todo lo interesante quedaría apretado al principio.
function toValue(pos, min, max) {
	const v = min * Math.pow(max / min, pos / 100);
	const mag = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1));
	return Math.round(v / mag) * mag;
}
function toPos(value, min, max) {
	const v = Math.min(max, Math.max(min, value || min));
	return Math.round((Math.log(v / min) / Math.log(max / min)) * 100);
}

function LogSlider({ label, value, onChange, min, max, color, unit }) {
	return (
		<label className="block space-y-2">
			<span className="flex items-baseline justify-between gap-3">
				<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
				<span className="font-display text-xl tabular-nums text-foreground">{num(value)} <span className="text-xs font-semibold text-muted-foreground">{unit}</span></span>
			</span>
			<input type="range" min={0} max={100} value={toPos(value, min, max)} onChange={function (e) { onChange(toValue(Number(e.target.value), min, max)); }}
				className="w-full cursor-pointer" style={{ accentColor: color }} aria-valuetext={num(value) + " " + unit} />
			<span className="flex justify-between text-[11px] tabular-nums text-muted-foreground"><span>{num(min)}</span><span>{num(max)}</span></span>
		</label>
	);
}

function Result({ label, children, strong }) {
	return (
		<div className="flex items-center justify-between gap-3 py-1.5">
			<span className="text-sm text-muted-foreground">{label}</span>
			<span className={strong ? "font-display text-2xl tabular-nums text-foreground" : "text-sm font-semibold tabular-nums text-foreground"}>{children}</span>
		</div>
	);
}

function SimShell({ channel, title, hint, controls, results }) {
	const ch = CHANNELS[channel];
	return (
		<div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
			<div className="flex items-center gap-2 border-b border-border px-4 py-2.5" style={{ background: ch.gradient }}>
				<ch.Icon size={15} style={{ color: ch.color }} aria-hidden="true" />
				<span className="text-sm font-semibold" style={{ color: ch.colorFg }}>{title}</span>
				<span className="ml-auto rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Simulador</span>
			</div>
			<div className="grid grid-cols-1 gap-5 p-4 md:grid-cols-2">
				<div className="space-y-4">{controls}</div>
				<div className="rounded-xl bg-muted/40 px-4 py-2" aria-live="polite">{results}</div>
			</div>
			{hint && <div className="border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">{hint}</div>}
		</div>
	);
}

export function IdcSimulator() {
	const { channelConfig } = useChannelConfig();
	const segs = channelConfig.b2b2cSegments || [];
	const [idc, setIdc] = useState(1000);
	const [modalidad, setModalidad] = useState("unico");
	const base = segs[0] || {};
	// Los umbrales se miden sobre el total contratado: el año completo con compromiso anual.
	const idcTotal = modalidad === "anual" ? idc * 12 : idc;
	const facturacionRef = idcTotal * (Number(base.precioIDC) || 0);
	const seg = getB2B2CSegment(idcTotal, facturacionRef, segs) || {};
	const p = segmentPricing(seg, {});
	const total = idc * p.precioIDC;
	const next = segs[segs.indexOf(seg) + 1];
	return (
		<SimShell channel="b2b2c" title="Simulador IDC"
			hint={next ? "Probá: llevá el total a " + num(next.idcMin) + " IDC o más" + (modalidad === "anual" ? " (" + num(Math.ceil(next.idcMin / 12)) + " por mes)" : "") + " y mirá cómo cambia el segmento y baja el precio por IDC." : "Llegaste al segmento más alto: el mejor precio por IDC."}
			controls={<>
				<Segmented label="Modalidad" value={modalidad} onChange={setModalidad} options={[{ id: "unico", label: "Consumo único" }, { id: "anual", label: "Compromiso anual" }]} />
				<LogSlider label={modalidad === "anual" ? "IDC por mes" : "IDC a consumir"} value={idc} onChange={setIdc} min={100} max={1000000} color={CHANNELS.b2b2c.color} unit="IDC" />
			</>}
			results={<>
				<Result label="Segmento"><TierBadge tier={seg} tiers={segs} size="sm" /></Result>
				<Result label="Precio por IDC">USD {usd(p.precioIDC)}</Result>
				<Result label="Precio por firma">USD {usd(p.precioFirma)}</Result>
				<Result label={modalidad === "anual" ? "IDC del año (pago único, sin firmas)" : "Total IDC (sin firmas)"} strong>USD {num(modalidad === "anual" ? total * 12 : total)}</Result>
				{modalidad === "anual" && <Result label="IDC en el año">{num(idc * 12)}</Result>}
			</>} />
	);
}

export function DistribSimulator() {
	const { channelConfig } = useChannelConfig();
	const tiers = channelConfig.distribuidorVolTiers || [];
	const base = channelConfig.distribuidorVolBase || { cert: 0, firma: 1 };
	const [firmas, setFirmas] = useState(2000);
	const [comp, setComp] = useState("si");
	const conCompromiso = comp === "si";
	const facturacion = facturacionAtBase(0, firmas, base) * (conCompromiso ? 12 : 1);
	const tier = getDistributorVolTier(facturacion, 0, conCompromiso, tiers) || {};
	const desc = Number(tier.descuento) > 1 ? Number(tier.descuento) / 100 : Number(tier.descuento) || 0;
	const precioFirma = (Number(base.firma) || 0) * (1 - desc);
	return (
		<SimShell channel="distribuidores" title="Simulador Distribuidores"
			hint="Mismo volumen, distinta condición: con compromiso anual la facturación se multiplica × 12 y el nivel sube. El certificado va siempre bonificado."
			controls={<>
				<Segmented label="Forma de pago" value={comp} onChange={setComp} options={[{ id: "si", label: "Con compromiso anual" }, { id: "no", label: "Sin compromiso" }]} />
				<LogSlider label="Firmas por mes" value={firmas} onChange={setFirmas} min={100} max={500000} color={CHANNELS.distribuidores.color} unit="firmas" />
			</>}
			results={<>
				<Result label="Facturación que asigna el nivel">USD {num(facturacion)}</Result>
				<Result label="Nivel"><TierBadge tier={tier} tiers={tiers} size="sm" /></Result>
				<Result label="Descuento sobre la firma">{pct(desc)}</Result>
				<Result label="Precio por firma">USD {usd(precioFirma)}</Result>
				<Result label="Total por mes" strong>USD {num(firmas * precioFirma)}</Result>
			</>} />
	);
}

export function VolumenSimulator() {
	const { channelConfig } = useChannelConfig();
	const segs = channelConfig.volumenSegments || [];
	const base = channelConfig.volumenBase || { cert: 0, firma: 0 };
	const [certs, setCerts] = useState(50);
	const [firmasC, setFirmasC] = useState(40);
	const firmas = certs * firmasC;
	const facturacion = facturacionAtBase(certs, firmas, base);
	const seg = getVolumenSegment(firmas, facturacion, segs) || {};
	const desc = Number(seg.descuento) > 1 ? Number(seg.descuento) / 100 : Number(seg.descuento) || 0;
	const total = facturacion * (1 - desc);
	return (
		<SimShell channel="volumen" title="Simulador Volumen"
			hint="Cada elemento tiene su precio. El descuento del segmento se aplica igual sobre certificados y firmas, y a todo el volumen (tarifa única)."
			controls={<>
				<LogSlider label="Certificados" value={certs} onChange={setCerts} min={1} max={10000} color={CHANNELS.volumen.color} unit="certs" />
				<LogSlider label="Firmas por certificado" value={firmasC} onChange={setFirmasC} min={1} max={1000} color={CHANNELS.volumen.color} unit="firmas" />
			</>}
			results={<>
				<Result label="Firmas totales">{num(firmas)}</Result>
				<Result label="A precio de lista">USD {num(facturacion)}</Result>
				<Result label="Segmento"><TierBadge tier={seg} tiers={segs} size="sm" /></Result>
				<Result label="Descuento">{pct(desc)}</Result>
				<Result label="Total" strong>USD {num(total)}</Result>
			</>} />
	);
}

// Palancas: elegís condiciones y ves cómo se suman, con el tope.
export function PalancasSimulator() {
	const { channelConfig } = useChannelConfig();
	const lv = channelConfig.commercialLevers || { cap: 0, timeToCash: [], duracion: [], velocidad: [] };
	const groups = [
		{ key: "timeToCash", label: "Días de pago", fmt: function (v) { return v === 0 ? "contado" : v + " d"; } },
		{ key: "duracion", label: "Duración", fmt: function (v) { return v + " m"; } },
		{ key: "velocidad", label: "Cierre en", fmt: function (v) { return v + " d"; } },
	];
	const [sel, setSel] = useState({ timeToCash: 0, duracion: 0, velocidad: 0 });
	// Descuentos y tope en puntos porcentuales (1 = 1%), igual que commercialLevers.
	const raw = groups.reduce(function (acc, g) { const o = (lv[g.key] || [])[sel[g.key]]; return acc + (o ? Number(o.discount) || 0 : 0); }, 0);
	const cap = Number(lv.cap) || 0;
	const eff = cap > 0 ? Math.min(raw, cap) : raw;
	return (
		<div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
			{groups.map(function (g) {
				const list = lv[g.key] || [];
				return (
					<div key={g.key} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
						<span className="text-sm font-medium text-foreground">{g.label}</span>
						<Segmented label={g.label} value={sel[g.key]} onChange={function (i) { setSel(Object.assign({}, sel, { [g.key]: i })); }}
							options={list.map(function (o, i) { return { id: i, label: g.fmt(o.value) + " · " + pts(o.discount) }; })} />
					</div>
				);
			})}
			<div className="flex items-center justify-between border-t border-border pt-3" aria-live="polite">
				<span className="text-sm text-muted-foreground">Descuento por condiciones {raw > cap && cap > 0 ? "(llegaste al tope)" : ""}</span>
				<span className="font-display text-2xl tabular-nums text-success">{pts(eff)}</span>
			</div>
		</div>
	);
}
