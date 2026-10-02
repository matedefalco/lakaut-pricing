import { useMemo, useState } from "react";
import { BookOpen, Percent, LifeBuoy, History, Wrench, LayoutGrid, Table2, ArrowRight, Scale } from "lucide-react";
import { useChannelConfig } from "../../context/ChannelConfigContext";
import { useModels } from "../../context/ModelsContext";
import { CHANNELS } from "../../data/channelMeta";
import { num, usd, pct, pts, rangeCant, rangeUSD } from "../../lib/pricingDocSections";
import { TierBadge } from "../ui/TierBadge";
import { b2b2cSegmentsPuntual } from "../../lib/tiers";
import { DocToc } from "./docs/DocToc";
import { DocSection, SubHeading, P, Rich, Callout, LiveTable, MagBar, Segmented, Disclosure } from "./docs/DocPrimitives";

// ─── Documentación del modelo comercial dentro de la app ──────────────────────
// Página armada en JSX (no un render del .md): índice lateral con scrollspy,
// comparador de canales, callouts tipados y tablas vivas. Los NÚMEROS salen en vivo
// del context (channelConfig + models + tc), así un cambio hecho en Configuración
// se ve acá al instante. Los helpers de formato (num/usd/pct/rangos) son los mismos
// que usa el generador de docs/modelo-comercial.md, para que las dos vistas digan
// lo mismo con las mismas cifras.
//
// La PROSA de esta página y la del .md (para GitHub / el equipo) son dos textos:
// si cambia una regla comercial, actualizá los dos.

const MARKUP_MIN_FALLBACK = 1.2;

function fraction(d) {
	const v = Number(d) || 0;
	return v > 1 ? v / 100 : v;
}

// ── Comparador de canales ─────────────────────────────────────────────────────
// Lo que distingue a cada canal, en una sola mirada: qué se vende, cómo se le pone
// precio, de qué depende el descuento y qué tipo de ingreso genera.
function buildChannelRows(cfg) {
	const segs = cfg.b2b2cSegments || [];
	const idcMin = segs.length ? Math.min.apply(null, segs.map(function (s) { return Number(s.precioIDC) || Infinity; })) : null;
	const distTiers = cfg.distribuidorVolTiers || [];
	const distMax = distTiers.length ? Math.max.apply(null, distTiers.map(function (t) { return fraction(t.descuento); })) : 0;
	const volSegs = cfg.volumenSegments || [];
	const volMax = volSegs.length ? Math.max.apply(null, volSegs.map(function (t) { return fraction(t.descuento); })) : 0;
	const base = cfg.volumenBase || {};
	return [
		{ id: "web", unidad: "Pack cerrado", precio: "Precio de lista, autoservicio", driver: "No aplica: es la lista", ingreso: "Único", clave: "Precio de lista", claveSub: "la referencia de todos" },
		{ id: "distribuidores", unidad: "Firma suelta (cert. bonificado)", precio: "Firma base USD " + usd((cfg.distribuidorVolBase || {}).firma != null ? cfg.distribuidorVolBase.firma : 1) + " menos el nivel", driver: "Facturación (× 12 con compromiso) o certificados activos", ingreso: "Único", clave: "hasta " + pct(distMax), claveSub: "de descuento en firma" },
		{ id: "b2b2c", unidad: "IDC (identidad + firmas)", precio: "Precio propio por segmento", driver: "Cantidad de IDC o su facturación", ingreso: "Único o recurrente", clave: idcMin != null && isFinite(idcMin) ? "USD " + usd(idcMin, 2, 2) : "—", claveSub: "desde, por IDC" },
		{ id: "volumen", unidad: "Certificado y firma sueltos", precio: "Cert USD " + usd(base.cert) + " · firma USD " + usd(base.firma) + " menos el segmento", driver: "Firmas o compromiso del contrato", ingreso: "Único", clave: "hasta " + pct(volMax), claveSub: "sobre cert y firma" },
	];
}

const SECTION_OF = { web: "web", distribuidores: "distribuidores", b2b2c: "idc", volumen: "volumen" };

function jump(id) {
	const el = document.getElementById(id);
	if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function ChannelCards({ rows }) {
	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
			{rows.map(function (r) {
				const ch = CHANNELS[r.id];
				const Icon = ch.Icon;
				return (
					<button key={r.id} type="button" onClick={function () { jump(SECTION_OF[r.id]); }}
						className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border p-4 text-left shadow-[var(--shadow-control)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						style={{ background: ch.gradient }}>
						<div className="flex items-center justify-between">
							<span className="flex size-9 items-center justify-center rounded-xl bg-white/80" style={{ color: ch.color, boxShadow: "0 4px 14px " + ch.glow }}>
								<Icon size={18} aria-hidden="true" />
							</span>
							<ArrowRight size={16} className="text-muted-foreground opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden="true" />
						</div>
						<div>
							<div className="font-heading text-base font-semibold" style={{ color: ch.colorFg }}>{ch.label}</div>
							<div className="text-xs text-muted-foreground">{r.unidad}</div>
						</div>
						<div className="mt-auto">
							<div className="font-display text-xl leading-tight tabular-nums" style={{ color: ch.colorFg }}>{r.clave}</div>
							<div className="text-xs text-muted-foreground">{r.claveSub}</div>
						</div>
						<div className="flex flex-wrap gap-1">
							<span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-foreground/75">Ingreso {r.ingreso.toLowerCase()}</span>
						</div>
					</button>
				);
			})}
		</div>
	);
}

function ChannelCompareTable({ rows }) {
	const attrs = [
		{ key: "unidad", label: "Qué se vende" },
		{ key: "precio", label: "Cómo se le pone precio" },
		{ key: "driver", label: "De qué depende el nivel" },
		{ key: "ingreso", label: "Ingreso" },
	];
	return (
		<div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[var(--shadow-control)]">
			<table className="w-full border-collapse text-sm">
				<caption className="sr-only">Comparación de los cuatro canales</caption>
				<thead>
					<tr className="bg-muted/60">
						<th scope="col" className="w-40 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground" />
						{rows.map(function (r) {
							const ch = CHANNELS[r.id];
							return (
								<th key={r.id} scope="col" className="px-4 py-2.5 text-left">
									<span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: ch.colorFg }}>
										<span className="size-2 rounded-full" style={{ background: ch.color }} aria-hidden="true" />{ch.label}
									</span>
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{attrs.map(function (a) {
						return (
							<tr key={a.key} className="border-t border-border transition-colors hover:bg-accent/40">
								<th scope="row" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{a.label}</th>
								{rows.map(function (r) { return <td key={r.id} className="min-w-44 px-4 py-3 align-top text-foreground/85">{r[a.key]}</td>; })}
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

function Stat({ label, value, sub }) {
	return (
		<div className="rounded-xl border border-border bg-card/80 px-4 py-3 shadow-[var(--shadow-control)]">
			<div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
			<div className="mt-0.5 font-display text-xl tabular-nums text-foreground">{value}</div>
			{sub && <div className="text-xs text-muted-foreground">{sub}</div>}
		</div>
	);
}

// ── Página ────────────────────────────────────────────────────────────────────
export function TabDocumentacion({ tc }) {
	const { channelConfig } = useChannelConfig();
	const { models } = useModels();
	const cfg = channelConfig || {};
	const [compareView, setCompareView] = useState("cards");
	const [webSeg, setWebSeg] = useState("todos");
	const [webCur, setWebCur] = useState("USD");

	const channelRows = useMemo(function () { return buildChannelRows(channelConfig || {}); }, [channelConfig]);
	const idcSegs = cfg.b2b2cSegments || [];
	const distTiers = cfg.distribuidorVolTiers || [];
	const distBase = cfg.distribuidorVolBase || { cert: 0, firma: 1 };
	const volSegs = cfg.volumenSegments || [];
	const volBase = cfg.volumenBase || { cert: 0, firma: 0 };
	const proy = cfg.volumenProyeccion || [];
	const fees = cfg.b2b2cApiTiers || [];
	const slaPlans = cfg.slaPlans || [];
	const levers = cfg.commercialLevers || { cap: 0, timeToCash: [], duracion: [], velocidad: [] };
	const markupMin = cfg.b2b2cMarkupMin != null ? cfg.b2b2cMarkupMin : MARKUP_MIN_FALLBACK;
	const fecha = new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

	const C = {
		web: CHANNELS.web, dist: CHANNELS.distribuidores, idc: CHANNELS.b2b2c, vol: CHANNELS.volumen,
	};

	const toc = [
		{ id: "canales", label: "Los cuatro canales", color: "var(--primary)" },
		{ id: "web", label: "Web", color: C.web.color },
		{ id: "distribuidores", label: "Distribuidores", color: C.dist.color },
		{ id: "idc", label: "IDC", color: C.idc.color, children: [{ id: "idc-segmentos", label: "Segmentos y precios" }, { id: "idc-modalidad", label: "Modalidad" }, { id: "idc-fees", label: "Fee de implementación" }] },
		{ id: "volumen", label: "Volumen", color: C.vol.color, children: [{ id: "volumen-segmentos", label: "Segmentos" }, { id: "volumen-escalonado", label: "Escalonado de referencia" }] },
		{ id: "descuentos", label: "Cómo aplican los descuentos", color: "var(--success)", children: [{ id: "desc-tarifa", label: "Tarifa única por nivel" }, { id: "desc-formas", label: "Formas de liquidación" }, { id: "desc-palancas", label: "Palancas comerciales" }] },
		{ id: "sla", label: "Servicios y SLA", color: "var(--accent-analysis)" },
		{ id: "decisiones", label: "Contexto de decisiones", color: "var(--accent-config)" },
		{ id: "mantenimiento", label: "Cómo se mantiene", color: "var(--accent-config)" },
	];

	// ── Web: catálogo con filtro de segmento y moneda ──
	const webRows = (models || []).filter(function (m) { return webSeg === "todos" || (webSeg === "empresa" ? m.segment === "empresa" : m.segment !== "empresa"); });
	const webPrice = function (m) {
		const tiene = m.priceUSD != null && Number(m.priceUSD) > 0;
		if (!tiene) return /gratis/i.test(m.priceNote || "") ? "gratis" : <span className="text-muted-foreground">a consultar</span>;
		if (webCur === "ARS") return tc ? "$" + num(m.priceUSD * tc) : "—";
		return "USD " + usd(m.priceUSD, 0, 2);
	};
	const idcPrecioMax = Math.max.apply(null, [0].concat(idcSegs.map(function (s) { return Number(s.precioIDC) || 0; })));
	const distDescMax = Math.max.apply(null, [0].concat(distTiers.map(function (t) { return fraction(t.descuento); })));
	const volDescMax = Math.max.apply(null, [0].concat(volSegs.map(function (t) { return fraction(t.descuento); })));
	const proyDescMax = Math.max.apply(null, [0].concat(proy.map(function (t) { return fraction(t.descuento); })));

	return (
		<div className="flex gap-10">
			<DocToc items={toc} />

			<article className="min-w-0 flex-1 space-y-14 pb-24">
				{/* ── Portada ── */}
				<header className="animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden rounded-3xl border border-border px-6 py-8 shadow-[var(--shadow-card)] duration-500 sm:px-8"
					style={{ background: "radial-gradient(120% 140% at 0% 0%, #eef0fb 0%, transparent 55%), radial-gradient(90% 120% at 100% 0%, #f3efff 0%, transparent 50%), radial-gradient(80% 120% at 100% 100%, #ecfaff 0%, transparent 55%), var(--card)" }}>
					<div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-success">
							<span className="relative flex size-2" aria-hidden="true">
								<span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50" />
								<span className="relative inline-flex size-2 rounded-full bg-success" />
							</span>
							En vivo
						</span>
						<span>Datos de Configuración · {fecha}</span>
					</div>
					<h1 className="mt-4 flex items-center gap-3 font-display text-3xl text-foreground text-balance sm:text-4xl">
						<BookOpen size={30} className="hidden shrink-0 text-primary sm:block" aria-hidden="true" />
						Modelo comercial y de precios
					</h1>
					<p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
						Cómo cotiza Lakaut en cada canal, de dónde sale cada precio y por qué. Los números de esta página son los que usa el cotizador ahora mismo: si cambiás un precio en Configuración, se actualiza acá al instante.
					</p>
					<div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
						<Stat label="Canales" value="4" sub="Web · Distrib. · IDC · Volumen" />
						<Stat label="IDC desde" value={idcSegs.length ? "USD " + usd(Math.min.apply(null, idcSegs.map(function (s) { return Number(s.precioIDC) || Infinity; })), 2, 2) : "—"} sub="por identidad, segmento más alto" />
						<Stat label="Descuento máx." value={pct(Math.max(distDescMax, volDescMax))} sub="por nivel o segmento" />
						<Stat label="Markup mínimo" value={usd(markupMin, 2, 2) + "x"} sub="guardarraíl en IDC" />
					</div>
				</header>

				{/* ── Canales ── */}
				<DocSection id="canales" eyebrow="Mapa" Icon={Scale} title="Los cuatro canales"
					lead="La estructura se separa según **quién paga, cómo se cotiza y qué tipo de ingreso genera**. Tocá un canal para ir a su detalle.">
					<Segmented label="Vista del comparador" value={compareView} onChange={setCompareView} options={[{ id: "cards", label: "Tarjetas", Icon: LayoutGrid }, { id: "tabla", label: "Comparar", Icon: Table2 }]} />
					{compareView === "cards" ? <ChannelCards rows={channelRows} /> : <ChannelCompareTable rows={channelRows} />}
				</DocSection>

				{/* ── Web ── */}
				<DocSection id="web" eyebrow="Canal 1 · venta directa" Icon={C.web.Icon} color={C.web.color} title="Web"
					lead="Autoservicio desde el sitio, sin intermediación. Es el **precio de lista**: la referencia contra la que se miden los demás canales. Para personas, profesionales y empresas que compran un pack cerrado.">
					<div className="flex flex-wrap items-center gap-2">
						<Segmented label="Segmento" value={webSeg} onChange={setWebSeg} options={[{ id: "todos", label: "Todos" }, { id: "persona", label: "Persona" }, { id: "empresa", label: "Empresa" }]} />
						<Segmented label="Moneda" value={webCur} onChange={setWebCur} options={[{ id: "USD", label: "USD" }, { id: "ARS", label: "ARS" }]} />
					</div>
					<LiveTable accent={C.web.color} caption="Catálogo de packs Web" rows={webRows} rowKey={function (m) { return m.id || m.label; }}
						columns={[
							{ key: "label", label: "Pack", render: function (m) { return <span className="font-semibold text-foreground">{m.label}</span>; } },
							{ key: "seg", label: "Segmento", render: function (m) { return <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{m.segment === "empresa" ? "Empresa" : "Persona"}</span>; } },
							{ key: "firmas", label: "Firmas", align: "right", render: function (m) { return m.ilimitadas ? "ilimitadas" : num(m.firmas); } },
							{ key: "certs", label: "Certificados", align: "right", render: function (m) { return m.certs != null ? num(m.certs) : "—"; } },
							{ key: "precio", label: "Precio (" + webCur + ")", align: "right", emphasis: true, render: webPrice },
						]} />
					{webCur === "ARS" && <P className="text-xs">{tc ? "ARS aproximado con TC de referencia **$" + num(tc) + "** por USD." : "Sin TC cargado: los precios en ARS no se pueden derivar."}</P>}
				</DocSection>

				{/* ── Distribuidores ── */}
				<DocSection id="distribuidores" eyebrow="Canal 2 · socios" Icon={C.dist.Icon} color={C.dist.color} title="Distribuidores e integradores"
					lead={"Socios que revenden el acceso a la infraestructura o la integran en su plataforma. Cotizan por **elementos sueltos**: el certificado va siempre bonificado y solo se cobran las firmas, a un precio base de **USD " + usd(distBase.firma) + "**."}>
					<Callout type="regla" title="Cómo se alcanza el nivel">
						<p><Rich>{"El nivel (Azul → Platinum) es el **mayor** entre dos ejes: la **facturación** a precio base (× 12 con forma de pago \"Con compromiso anual\", × 1 sin compromiso) y los **certificados activos** del socio, que cuentan solo con compromiso anual."}</Rich></p>
					</Callout>
					<LiveTable accent={C.dist.color} caption="Niveles de Distribuidores" rows={distTiers} rowKey={function (t) { return t.id || t.label; }}
						columns={[
							{ key: "nivel", label: "Nivel", render: function (t) { return <TierBadge tier={t} tiers={distTiers} size="sm" />; } },
							{ key: "fact", label: "Facturación (USD)", align: "right", render: function (t) { return rangeUSD(t.compromisoMin, t.compromisoMax); } },
							{ key: "certs", label: "Certificados activos", align: "right", render: function (t) { return rangeCant(t.certsMin, t.certsMax); } },
							{ key: "desc", label: "Descuento firma", align: "right", render: function (t) { return <span className="inline-flex items-center gap-2"><MagBar value={fraction(t.descuento)} max={distDescMax} color={C.dist.color} />{pct(t.descuento)}</span>; } },
							{ key: "firma", label: "Firma resultante", align: "right", emphasis: true, render: function (t) { return "USD " + usd((Number(distBase.firma) || 0) * (1 - fraction(t.descuento))); } },
						]} />
					<Callout type="ejemplo">
						{"El descuento del nivel se aplica en las dos condiciones: **diferido** con compromiso anual (rebate, pago anticipado, caución o firmas) o **directo en cada factura** sin compromiso. La modalidad packs (descuento sobre la lista web) se descontinuó."}
					</Callout>
				</DocSection>

				{/* ── IDC ── */}
				<DocSection id="idc" eyebrow="Canal 3 · integración SDK" Icon={C.idc.Icon} color={C.idc.color} title="IDC · Identidades Digitales Certificadas"
					lead="Empresas y plataformas que integran identidad y firma dentro de su propio producto vía SDK. La unidad de venta es la **IDC**: un bundle con biometría, emisión, custodia y firmas de activación. No distingue persona física o jurídica: cuestan y cotizan igual.">
					<SubHeading id="idc-segmentos">Segmentos y precios</SubHeading>
					<P>{"Es una **escala de precios**, no de descuentos: cada segmento tiene su propio precio por IDC. El segmento es el **mayor** entre la **cantidad de IDC** y su **facturación** medida a precio de referencia Start Up (así se evita la circularidad precio ↔ segmento)."}</P>
					<LiveTable accent={C.idc.color} caption="Segmentos IDC" rows={idcSegs} rowKey={function (s) { return s.id || s.label; }}
						columns={[
							{ key: "seg", label: "Segmento", render: function (s) { return <TierBadge tier={s} tiers={idcSegs} size="sm" />; } },
							{ key: "rango", label: "IDC contratadas", align: "right", render: function (s) { return rangeCant(s.idcMin, s.idcMax, "IDC"); } },
							{ key: "fact", label: "Facturación anual", align: "right", render: function (s) { return rangeUSD(s.facturacionMin, s.facturacionMax); } },
							{ key: "factp", label: "Facturación puntual", align: "right", render: function (s, i) { const p = b2b2cSegmentsPuntual(idcSegs, cfg.b2b2cFactorPuntual)[i] || s; return rangeUSD(p.facturacionMin, p.facturacionMax); } },
							{ key: "precio", label: "Precio por IDC", align: "right", emphasis: true, render: function (s) { return <span className="inline-flex items-center gap-2"><MagBar value={Number(s.precioIDC) || 0} max={idcPrecioMax} color={C.idc.color} />USD {usd(s.precioIDC)}</span>; } },
							{ key: "cupo", label: "Firmas incl.", align: "right", render: function (s) { return num(s.firmasIncluidas); } },
							{ key: "extra", label: "Firma excedente", align: "right", render: function (s) { return "USD " + usd(s.precioFirmaExtra); } },
						]} />
					<Callout type="regla" title="Guardarraíl de rentabilidad">
						{"Markup mínimo **" + usd(markupMin, 2, 2) + "x** sobre el costo variable del bundle. Bajo ese piso, el cotizador bloquea guardar y exportar."}
					</Callout>

					<SubHeading id="idc-modalidad">Modalidad: consumo único o compromiso anual</SubHeading>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						<div className="rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-control)]">
							<div className="font-heading text-sm font-semibold text-foreground">Consumo único</div>
							<P className="mt-1 text-sm">{"Se cotiza la cantidad que se consume **en ese momento**. El segmento sale de esa cantidad y de su facturación (× 1). El ingreso del año es el total cotizado."}</P>
						</div>
						<div className="rounded-xl border p-4 shadow-[var(--shadow-control)]" style={{ borderColor: C.idc.color + "40", background: C.idc.colorSoft }}>
							<div className="font-heading text-sm font-semibold" style={{ color: C.idc.colorFg }}>Compromiso anual</div>
							<P className="mt-1 text-sm">{"El consumo se carga **por mes** o **por año** (se divide por 12). Se cotiza el **total del año** (× 12), a pagar de una vez; el segmento se mide por las IDC del año y su facturación."}</P>
						</div>
					</div>
					<Callout type="ejemplo">{"24.000 IDC por año con compromiso anual caen en Growth (10.001 – 50.000 IDC contratadas): se cotizan las 24.000 al precio Growth, en un solo pago. Si el cliente ya tiene identidades activas, la recompra cotiza solo firmas, sin volver a cobrar el certificado."}</Callout>

					<SubHeading id="idc-fees">Fee de implementación (SDK)</SubHeading>
					<P>Pago único, bonificable a discreción comercial.</P>
					<LiveTable accent={C.idc.color} caption="Tiers de fee de implementación" rows={fees} rowKey={function (t) { return t.id || t.label; }}
						columns={[
							{ key: "tier", label: "Tier", render: function (t) { return <span className="font-semibold text-foreground">{t.label}</span>; } },
							{ key: "rango", label: "Rango de fee", align: "right", render: function (t) { return "USD " + num(t.feeMin) + " – " + num(t.feeMax); } },
							{ key: "def", label: "Default", align: "right", emphasis: true, render: function (t) { return "USD " + num(t.feeDefault); } },
						]} />
				</DocSection>

				{/* ── Volumen ── */}
				<DocSection id="volumen" eyebrow="Canal 4 · cantidades sueltas" Icon={C.vol.Icon} color={C.vol.color} title="Volumen"
					lead={"Certificados y firmas como items independientes, sin bundle ni cupo. Para clientes que saben exactamente cuántos necesitan. Precio base: **cert USD " + usd(volBase.cert) + " / firma USD " + usd(volBase.firma) + "**."}>
					<SubHeading id="volumen-segmentos">Segmentos</SubHeading>
					<P>{"El segmento es el **mayor** entre el **volumen real de firmas** y el **compromiso** del contrato en USD a precio de lista (Consumo único × 1 o Anual × meses de vinculación). Aplica el mismo descuento sobre cert y firma."}</P>
					<LiveTable accent={C.vol.color} caption="Segmentos de Volumen" rows={volSegs} rowKey={function (s) { return s.id || s.label; }}
						columns={[
							{ key: "seg", label: "Segmento", render: function (s) { return <TierBadge tier={s} tiers={volSegs} size="sm" />; } },
							{ key: "firmas", label: "Rango de firmas", align: "right", render: function (s) { return rangeCant(s.firmasMin, s.firmasMax, "firmas"); } },
							{ key: "comp", label: "Compromiso (USD)", align: "right", render: function (s) { return rangeUSD(s.compromisoMin, s.compromisoMax); } },
							{ key: "desc", label: "Descuento", align: "right", emphasis: true, render: function (s) { return <span className="inline-flex items-center gap-2"><MagBar value={fraction(s.descuento)} max={volDescMax} color={C.vol.color} />{pct(s.descuento)}</span>; } },
						]} />
					<SubHeading id="volumen-escalonado">Escalonado de referencia</SubHeading>
					<P>Escala estándar por volumen de firmas que se adjunta a las propuestas de Volumen. Es la misma para todas las cotizaciones, para ser justos entre clientes.</P>
					<LiveTable accent={C.vol.color} caption="Escalonado de referencia" rows={proy}
						columns={[
							{ key: "tramo", label: "Tramo", render: function (s) { return <span className="font-semibold text-foreground">{num(s.firmas)}+ firmas</span>; } },
							{ key: "desc", label: "Descuento sobre firma", align: "right", render: function (s) { return <span className="inline-flex items-center gap-2"><MagBar value={fraction(s.descuento)} max={proyDescMax} color={C.vol.color} />{pct(s.descuento)}</span>; } },
							{ key: "precio", label: "Firma resultante", align: "right", emphasis: true, render: function (s) { return "USD " + usd((Number(volBase.firma) || 0) * (1 - fraction(s.descuento))); } },
						]} />
				</DocSection>

				{/* ── Descuentos ── */}
				<DocSection id="descuentos" eyebrow="Reglas transversales" Icon={Percent} color="var(--success)" title="Cómo aplican los descuentos">
					<SubHeading id="desc-tarifa">Tarifa única por nivel (no marginal)</SubHeading>
					<Callout type="regla">{"El descuento lo define el **tramo más alto que alcanza el volumen total** y se aplica a **todo** ese volumen. No es que las primeras N firmas paguen una tasa y las siguientes otra: los rangos de las tablas solo muestran dónde empieza y termina cada tramo."}</Callout>

					<SubHeading id="desc-formas">Formas de liquidar el descuento de nivel</SubHeading>
					<P>{"Aplica a Volumen y Distribuidores. El neto anual para Lakaut es el mismo; lo que cambia es el **cash flow**."}</P>
					<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
						{[
							{ k: "A", t: "Precio full, beneficio al cierre", d: "Se factura sin descuento durante el año y al final se devuelve: nota de crédito en dinero (A1) o firmas equivalentes bonificadas (A2)." },
							{ k: "B", t: "Pago anticipado, descuento aplicado", d: "Se paga el año por adelantado al valor neto (B1), o con un seguro de caución ejecutable que se reduce a medida que se paga (B2)." },
						].map(function (f) {
							return (
								<div key={f.k} className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-control)]">
									<span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/10 font-display text-lg text-success">{f.k}</span>
									<div>
										<div className="font-heading text-sm font-semibold text-foreground">{f.t}</div>
										<p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.d}</p>
									</div>
								</div>
							);
						})}
					</div>
					<Callout type="porque" title="IDC queda fuera">{"Su segmento es una escala de precios, no de descuentos: no hay un descuento de nivel que liquidar."}</Callout>

					<SubHeading id="desc-palancas">Palancas comerciales</SubHeading>
					<P>{"Descuentos adicionales y aditivos sobre el subtotal de servicio, en Volumen y Distribuidores. La suma de las tres tiene un tope de **" + pts(levers.cap) + "**."}</P>
					<div className="space-y-2">
						{[
							{ label: "Time-to-cash", unit: "días de pago", list: levers.timeToCash || [] },
							{ label: "Duración del contrato", unit: "meses", list: levers.duracion || [] },
							{ label: "Velocidad de cierre", unit: "días", list: levers.velocidad || [] },
						].map(function (l) {
							return (
								<div key={l.label} className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<div className="text-sm font-semibold text-foreground">{l.label}</div>
										<div className="text-xs text-muted-foreground">{l.unit}</div>
									</div>
									<div className="flex flex-wrap gap-1.5">
										{l.list.map(function (o, i) {
											return (
												<span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs tabular-nums">
													<span className="text-muted-foreground">{o.value === 0 ? "contado" : o.value}</span>
													<ArrowRight size={11} className="text-muted-foreground/60" aria-hidden="true" />
													<span className="font-semibold text-success">{pts(o.discount)}</span>
												</span>
											);
										})}
									</div>
								</div>
							);
						})}
					</div>
					<Callout type="porque" title="Abono mensual">{"La reposición de la bolsa de firmas lleva **" + pts(cfg.abonoDescuentoPct) + "** de descuento. Se mantiene bajo a propósito: el beneficio principal lo da el volumen, no la recurrencia."}</Callout>
				</DocSection>

				{/* ── SLA ── */}
				<DocSection id="sla" eyebrow="Servicios premium" Icon={LifeBuoy} color="var(--accent-analysis)" title="Servicios y SLA"
					lead="Planes de soporte para las cotizaciones con integración SDK. El plan se **gana por facturación**: la de la cotización (la del año con compromiso anual) incluye sin cargo el plan cuyo umbral alcanza. Uno superior se cobra a su precio.">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
						{slaPlans.map(function (p, i) {
							const precio = p.precioMes == null ? "personalizado" : (p.precioMes === 0 ? "incluido" : "USD " + num(p.precioMes));
							return (
								<div key={p.id || i} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-control)]">
									<div className="font-heading text-base font-semibold text-foreground">{p.label}</div>
									<div className="font-display text-2xl tabular-nums text-foreground">{precio}{p.precioMes > 0 && <span className="text-sm font-semibold text-muted-foreground">/mes</span>}</div>
									<div className="flex flex-wrap gap-1.5 text-xs">
										{p.sla ? <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-accent-foreground">SLA {usd(p.sla * 100, 1, 1)}%</span> : null}
										{p.txMes ? <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{num(p.txMes)} tx/mes</span> : null}
										{p.facturacionMin != null ? <span className="rounded-full bg-success/10 px-2 py-0.5 font-medium text-success">{Number(p.facturacionMin) <= 0 ? "Siempre incluido" : "Incluido desde USD " + num(p.facturacionMin)}</span> : null}
									</div>
									{p.desc && <p className="text-sm leading-relaxed text-muted-foreground">{p.desc}</p>}
								</div>
							);
						})}
					</div>
				</DocSection>

				{/* ── Decisiones ── */}
				<DocSection id="decisiones" eyebrow="Historia" Icon={History} color="var(--accent-config)" title="Contexto de decisiones"
					lead="Por qué algunos números difieren del documento estratégico original (Borrador v5), para quien compare ambos.">
					<div className="space-y-2">
						<Disclosure title="Precios IDC">
							<p>El Borrador v5 fijaba 0,65 → 0,45 por IDC, pero esa columna calculaba el margen contra el costo del certificado solo, ignorando que la IDC incluye 3 firmas. Con el costo real del bundle (~USD 0,77), varios segmentos vendían por debajo del costo. La escala se reconstruyó fijando el piso en 1,20x el costo y subiendo el resto en la misma proporción del documento.</p>
						</Disclosure>
						<Disclosure title="IDC sin distinción de tipo y con modalidad">
							<p>La IDC se cotiza sin separar persona física o jurídica (mismo precio y costo). Como en Distribuidores, se elige consumo único (la facturación de esa cantidad) o compromiso anual (consumo mensual × 12), cargado por mes o por año.</p>
						</Disclosure>
						<Disclosure title="Distribuidores por elementos sueltos">
							<p>El certificado va siempre bonificado: el socio solo paga las firmas, con base USD 1,00. El nivel lo asigna la facturación calculada del volumen cotizado, con los rangos y descuentos de la matriz comercial (Azul 10% → Platinum 50%). El costo variable del certificado se paga igual y entra al markup del deal. La modalidad packs se descontinuó.</p>
						</Disclosure>
						<Disclosure title="Canal Volumen y formas de liquidación A/B">
							<p>No están en el Borrador v5: son construcciones posteriores del cotizador.</p>
						</Disclosure>
					</div>
				</DocSection>

				{/* ── Mantenimiento ── */}
				<DocSection id="mantenimiento" eyebrow="Para el equipo" Icon={Wrench} color="var(--accent-config)" title="Cómo se mantiene esta doc">
					<div className="space-y-2">
						<Callout type="regla" title="Fuente de los números">{"La config viva en Supabase (`app_config`), que es lo que edita Configuración. Esta página la lee en vivo; no hay que regenerar nada para verla actualizada."}</Callout>
						<Callout type="ojo" title="Dos textos, una regla">{"Esta página es JSX y `docs/modelo-comercial.md` es su versión para GitHub y el equipo. Las tablas del `.md` se regeneran con `npm run docs:pricing`; la prosa se edita a mano en los dos lugares cuando cambia una regla comercial."}</Callout>
					</div>
				</DocSection>
			</article>
		</div>
	);
}
