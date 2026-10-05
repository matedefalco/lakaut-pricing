import { useState } from "react";
import { Home, FileText, Clock3, ChartColumn, Settings, Search, ArrowRight, Users, ScrollText, BookOpen, BellRing, UserRound, Package, SlidersHorizontal, Gift, PanelRight, Download, Play } from "lucide-react";
import { CHANNELS } from "../../../data/channelMeta";
import { cn } from "@/lib/utils";
import { Callout } from "../docs/DocPrimitives";
import { Term } from "./Glossary";
import { IdcSimulator, DistribSimulator, VolumenSimulator, PalancasSimulator } from "./Simulators";

// ─── Módulos de la Introducción ───────────────────────────────────────────────
// Cada módulo es una pantalla corta con UNA idea central, algo para tocar y un
// cierre "para llevarte". Reciben `ctx` con las acciones de navegación de la app
// (ir a una sección, abrir un cotizador precargado).

function Lead({ children }) {
	return <p className="max-w-[64ch] text-base leading-relaxed text-muted-foreground">{children}</p>;
}

function Takeaways({ items }) {
	return (
		<div className="rounded-2xl border border-border bg-card/70 p-4">
			<div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">Para llevarte</div>
			<ul className="space-y-1.5">
				{items.map(function (t, i) {
					return <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/85"><span className="font-semibold text-primary" aria-hidden="true">→</span><span>{t}</span></li>;
				})}
			</ul>
		</div>
	);
}

// Lista de elementos con detalle: tocás uno a la izquierda y se explica a la derecha.
function Explorer({ items, initial }) {
	const [sel, setSel] = useState(initial || items[0].id);
	const cur = items.find(function (i) { return i.id === sel; }) || items[0];
	return (
		<div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr]">
			<div className="flex gap-1.5 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0" role="tablist">
				{items.map(function (it, idx) {
					const on = it.id === sel;
					const Icon = it.Icon;
					return (
						<button key={it.id} type="button" role="tab" aria-selected={on} onClick={function () { setSel(it.id); }}
							className={cn("flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition-all", on ? "border-primary/30 bg-card font-semibold text-foreground shadow-[var(--shadow-control)]" : "border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground")}>
							{it.step ? <span className={cn("flex size-6 items-center justify-center rounded-full text-xs font-bold", on ? "bg-primary text-primary-foreground" : "bg-muted")}>{idx + 1}</span> : Icon && <Icon size={16} style={it.color ? { color: it.color } : undefined} aria-hidden="true" />}
							{it.label}
						</button>
					);
				})}
			</div>
			<div key={cur.id} role="tabpanel" className="animate-in fade-in slide-in-from-right-2 self-start rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] duration-300">
				<div className="font-heading text-lg font-semibold text-foreground">{cur.title || cur.label}</div>
				<div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{cur.body}</div>
				{!cur.action && items.indexOf(cur) < items.length - 1 && (
					<button type="button" onClick={function () { setSel(items[items.indexOf(cur) + 1].id); }} className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted">
						{cur.step ? "Siguiente paso" : "Siguiente"}: {items[items.indexOf(cur) + 1].label} <ArrowRight size={14} aria-hidden="true" />
					</button>
				)}
				{cur.action && (
					<button type="button" onClick={cur.action.onClick} className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110">
						{cur.action.label} <ArrowRight size={14} aria-hidden="true" />
					</button>
				)}
			</div>
		</div>
	);
}

// ── 1. La plataforma ──────────────────────────────────────────────────────────
export function ModPlataforma({ ctx }) {
	const items = [
		{ id: "inicio", label: "Inicio", Icon: Home, body: <p>Tu punto de partida: elegís el canal para una cotización nueva y ves las últimas que se hicieron. Siempre volvés acá con el logo o el ícono de la casa.</p>, action: { label: "Ir a Inicio", onClick: function () { ctx.nav("inicio"); } } },
		{ id: "cotizar", label: "Cotizar", Icon: FileText, body: <><p>Un cotizador por canal: Web, Distribuidores, IDC y Volumen. Cargás el volumen y el precio se arma solo, con el segmento o el nivel que corresponde.</p><p>El botón <strong className="text-foreground">+</strong> del riel abre una cotización nueva desde cualquier pantalla.</p></> },
		{ id: "seguimiento", label: "Seguimiento", Icon: Clock3, body: <><p><strong className="text-foreground">Cotizaciones</strong> es el historial de todo el equipo, con estado y vencimiento. <strong className="text-foreground">Clientes</strong> agrupa las cotizaciones por empresa.</p><p>Si algo está por vencer, el ícono del riel muestra un contador y Cotizaciones lo lista arriba de todo.</p></> },
		{ id: "analisis", label: "Análisis", Icon: ChartColumn, body: <p>Reportes del pipeline y comparación entre canales.</p> },
		{ id: "info", label: "Información", Icon: BookOpen, body: <p>Esta introducción, los <strong className="text-foreground">niveles y segmentos</strong> de cada canal (con un buscador de "¿dónde cae?"), los precios de lista y la documentación del modelo comercial.</p>, action: { label: "Ver niveles y segmentos", onClick: function () { ctx.nav("niveles"); } } },
		{ id: "ajustes", label: "Ajustes", Icon: Settings, body: <><p>Costos, catálogo de packs, precios por canal y tipo de cambio.</p><p><strong className="text-foreground">Ojo:</strong> lo que se cambia acá cambia para todo el equipo, al instante.</p></> },
		{ id: "buscar", label: "Buscador ⌘K", Icon: Search, body: <p>Apretá <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">⌘ K</kbd> (o Ctrl K) en cualquier pantalla para saltar a una sección o encontrar una cotización.</p> },
	];
	return (
		<div className="space-y-6">
			<Lead>La cotizadora arma precios para los cuatro canales comerciales de Lakaut, guarda cada propuesta para el equipo y exporta el PDF que recibe el cliente. Todo se mueve desde el riel de la izquierda. Tocá cada parte para ver qué hace.</Lead>
			<Explorer items={items} />
			<Takeaways items={["Cotizar → elegís canal y cargás volumen; el precio se calcula solo.", "Todo lo que guardás lo ve el equipo, con su historial de versiones.", "Ajustes cambia los precios de todos: tocalo solo si sabés qué estás cambiando."]} />
		</div>
	);
}

// ── 2. Los canales ────────────────────────────────────────────────────────────
const CHOOSER = [
	{ id: "web", q: "Una persona o empresa que compra sola, desde el sitio, con tarjeta", channel: "web",
		why: "Es autoservicio a precio de lista: packs cerrados de firmas y certificados. No hay negociación ni descuento." },
	{ id: "distribuidores", q: "Un socio que revende firmas o las integra en su software para sus clientes", channel: "distribuidores",
		why: <>Es un canal de reventa. El certificado va <Term k="bonificado">bonificado</Term>, se cobran las firmas, y el <Term k="nivel">nivel</Term> del socio define el descuento.</> },
	{ id: "b2b2c", q: "Una plataforma que quiere validar identidad y firmar dentro de su propio producto", channel: "b2b2c",
		why: <>Se integra vía SDK y se vende por <Term k="idc">IDC</Term>: identidad + certificado, y firmas por unidad, con precio por <Term k="segmento">segmento</Term> y <Term k="bienvenida">firmas de bienvenida</Term>.</> },
	{ id: "volumen", q: "Un cliente que sabe exactamente cuántos certificados y firmas necesita", channel: "volumen",
		why: "Se cotizan certificados y firmas como items sueltos, sin bundle, con descuento por volumen o compromiso." },
];

export function ModCanales() {
	const [pick, setPick] = useState(null);
	const cur = CHOOSER.find(function (c) { return c.id === pick; });
	const ch = cur ? CHANNELS[cur.channel] : null;
	return (
		<div className="space-y-6">
			<Lead>Lakaut vende lo mismo (identidad y firma digital) de cuatro formas distintas. El canal no lo elige el producto sino el cliente: quién paga, cómo compra y cuánto. Respondé la pregunta y mirá a qué canal va.</Lead>
			<div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
				<div className="font-heading text-base font-semibold text-foreground">¿Quién te está comprando?</div>
				<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
					{CHOOSER.map(function (c) {
						const on = pick === c.id;
						const m = CHANNELS[c.channel];
						return (
							<button key={c.id} type="button" aria-pressed={on} onClick={function () { setPick(c.id); }}
								className={cn("rounded-xl border px-3.5 py-3 text-left text-sm leading-snug transition-all", on ? "font-medium text-foreground" : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground")}
								style={on ? { borderColor: m.color, background: m.colorSoft, boxShadow: "0 0 0 3px " + m.glow } : undefined}>
								{c.q}
							</button>
						);
					})}
				</div>
				{cur && (
					<div key={cur.id} className="animate-in fade-in slide-in-from-bottom-2 mt-4 flex gap-3 rounded-xl p-4 duration-300" style={{ background: ch.gradient }}>
						<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/80" style={{ color: ch.color, boxShadow: "0 4px 14px " + ch.glow }}><ch.Icon size={20} aria-hidden="true" /></span>
						<div>
							<div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Canal</div>
							<div className="font-display text-xl" style={{ color: ch.colorFg }}>{ch.label}</div>
							<p className="mt-1 text-sm leading-relaxed text-foreground/80">{cur.why}</p>
						</div>
					</div>
				)}
			</div>
			<Takeaways items={["Web es la lista: la referencia contra la que se miden los demás canales.", "Distribuidores e IDC son B2B: el precio depende del volumen y de las condiciones.", "Ante la duda, preguntá quién paga y cómo va a usar la firma."]} />
		</div>
	);
}

// ── 3. Cómo se arma un precio ─────────────────────────────────────────────────
export function ModPrecio() {
	const [sim, setSim] = useState("b2b2c");
	return (
		<div className="space-y-6">
			<Lead>En los canales B2B el precio no se tipea: sale del volumen. Cada cotización cae en un <Term k="segmento">segmento</Term> (o <Term k="nivel">nivel</Term>) según el <strong className="text-foreground">mayor</strong> de dos ejes: la cantidad y la facturación medida a <Term k="precioBase">precio base</Term>. Mové los simuladores y mirá cómo responde.</Lead>
			<div role="tablist" className="flex flex-wrap gap-2">
				{["b2b2c", "distribuidores", "volumen"].map(function (id) {
					const m = CHANNELS[id];
					const on = sim === id;
					return (
						<button key={id} type="button" role="tab" aria-selected={on} onClick={function () { setSim(id); }}
							className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all", on ? "text-foreground" : "border-border text-muted-foreground hover:text-foreground")}
							style={on ? { borderColor: m.color, background: m.colorSoft, color: m.colorFg } : undefined}>
							<m.Icon size={14} aria-hidden="true" />{m.label}
						</button>
					);
				})}
			</div>
			<div key={sim} className="animate-in fade-in duration-300">
				{sim === "b2b2c" && <IdcSimulator />}
				{sim === "distribuidores" && <DistribSimulator />}
				{sim === "volumen" && <VolumenSimulator />}
			</div>
			<Callout type="regla" title="Tarifa única, no marginal">El precio o descuento del tramo alcanzado se aplica a <strong>todo</strong> el volumen. No es que las primeras N unidades paguen una tasa y el resto otra.</Callout>
			<Takeaways items={["IDC: cada segmento tiene su propio precio por IDC (escala de precios).", "Distribuidores y Volumen: el segmento o nivel es un descuento sobre el precio base.", "Con compromiso anual la facturación se multiplica × 12: es la forma más rápida de subir de tramo."]} />
		</div>
	);
}

// ── 4. Cotizar paso a paso ────────────────────────────────────────────────────
const CASOS = [
	{ id: "fintech", channel: "b2b2c", titulo: "Fintech que valida a sus clientes", texto: "Estima 60.000 altas por año con compromiso anual. Cada cliente firma 3 documentos al abrir su cuenta.",
		inputs: { integracion: "api", certFisicos: 5000, firmasPorCertFisico: 3, modalidadFacturacion: "anual", idcEntrada: "anual", idcCantidadIngresada: { fis: 60000, jur: 0 } } },
	{ id: "integrador", channel: "distribuidores_vol", titulo: "Software contable que revende firmas", texto: "Un integrador ofrece firma a los estudios que usan su sistema: unas 8.000 firmas por mes, con compromiso anual.",
		inputs: { integracion: "sin_api", firmasSueltas: 8000 } },
	{ id: "escribania", channel: "volumen", titulo: "Escribanía que compra de una vez", texto: "Necesita 50 certificados con 40 firmas cada uno, en una sola compra.",
		inputs: { integracion: "sin_api", certFisicos: 50, firmasPorCertFisico: 40, modalidadFacturacion: "unico" } },
];

export function ModCotizar({ ctx }) {
	const pasos = [
		{ id: "cliente", step: true, label: "Cliente", Icon: UserRound, title: "1 · Elegí el cliente", body: <p>Buscalo o crealo en el momento. Queda vinculado a la cotización y aparece en Clientes con todo su historial.</p> },
		{ id: "volumen", step: true, label: "Volumen", Icon: Package, title: "2 · Cargá el volumen", body: <p>Cantidades de IDC, certificados o firmas, según el canal. En IDC elegís si es <strong className="text-foreground">consumo único</strong> o <Term k="compromiso">compromiso anual</Term>. El segmento y el precio se calculan solos.</p> },
		{ id: "condiciones", step: true, label: "Condiciones", Icon: SlidersHorizontal, title: "3 · Definí las condiciones", body: <p>Forma de pago, <Term k="palancas">palancas comerciales</Term> que ofrecés y, si hay integración, el <Term k="fee">fee de implementación</Term> y el plan de <Term k="sla">SLA</Term>.</p> },
		{ id: "extras", step: true, label: "Extras", Icon: Gift, title: "4 · Sumá extras (opcional)", body: <p>Firmas bonificadas, abono mensual, ajuste de precio por componente o la proyección de crecimiento para el PDF. Se activan con un interruptor; lo que no usás no molesta.</p> },
		{ id: "panel", step: true, label: "Resultado", Icon: PanelRight, title: "5 · Leé el resultado", body: <><p>El panel de la derecha tiene dos vistas: <strong className="text-foreground">Cliente</strong> (lo que va a ver en la propuesta) e <strong className="text-foreground">Interno</strong> (costos, margen y <Term k="markup">markup</Term>).</p><p>Si el markup queda bajo el mínimo, no se puede guardar: es el guardarraíl de rentabilidad.</p></> },
		{ id: "exportar", step: true, label: "Guardar y exportar", Icon: Download, title: "6 · Guardá y exportá", body: <p>Guardar crea la cotización con su ID (COT-…); guardar de nuevo crea una <Term k="version">versión</Term> nueva, no pisa la anterior. Exportar genera el PDF en ARS o USD.</p> },
	];
	return (
		<div className="space-y-6">
			<Lead>Todos los cotizadores siguen el mismo recorrido, de arriba hacia abajo. Recorré los pasos y después probá con un caso real: se abre el cotizador precargado para que lo explores sin miedo (no se guarda nada hasta que toques Guardar).</Lead>
			<Explorer items={pasos} />
			<div>
				<div className="mb-3 font-heading text-base font-semibold text-foreground">Casos prácticos</div>
				<div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
					{CASOS.map(function (c) {
						const m = CHANNELS[c.channel];
						return (
							<div key={c.id} className="flex flex-col gap-2 rounded-2xl border border-border p-4 shadow-[var(--shadow-control)]" style={{ background: m.gradient }}>
								<span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/75 px-2 py-0.5 text-[11px] font-semibold" style={{ color: m.colorFg }}><m.Icon size={12} aria-hidden="true" />{m.label}</span>
								<div className="font-heading text-sm font-semibold text-foreground">{c.titulo}</div>
								<p className="text-sm leading-relaxed text-foreground/75">{c.texto}</p>
								<button type="button" onClick={function () { ctx.preset(c.channel, c.inputs); }}
									className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold shadow-[var(--shadow-control)] transition hover:-translate-y-px" style={{ color: m.colorFg }}>
									<Play size={13} aria-hidden="true" /> Cotizalo
								</button>
							</div>
						);
					})}
				</div>
			</div>
			<Takeaways items={["Cliente → Volumen → Condiciones → Extras → Resultado → Guardar.", "Mirá la vista Interno antes de mandar: el markup te dice si el deal es sano.", "Guardar de nuevo nunca pisa: crea una versión."]} />
		</div>
	);
}

// ── 5. Condiciones y descuentos ───────────────────────────────────────────────
export function ModCondiciones() {
	const [forma, setForma] = useState("A");
	return (
		<div className="space-y-6">
			<Lead>Además del segmento, hay dos herramientas comerciales: cómo se liquida el descuento de nivel y las <Term k="palancas">palancas</Term> que ofrecés en la propuesta.</Lead>
			<div className="space-y-3">
				<div className="font-heading text-base font-semibold text-foreground">Formas de liquidar el descuento (Volumen y Distribuidores)</div>
				<div className="grid grid-cols-2 gap-2 sm:max-w-md">
					{[{ k: "A", t: "Beneficio al cierre" }, { k: "B", t: "Pago anticipado" }].map(function (f) {
						const on = forma === f.k;
						return (
							<button key={f.k} type="button" aria-pressed={on} onClick={function () { setForma(f.k); }}
								className={cn("flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all", on ? "border-success/40 bg-success/10 font-semibold text-foreground" : "border-border text-muted-foreground hover:text-foreground")}>
								<span className={cn("flex size-7 items-center justify-center rounded-lg font-display", on ? "bg-success text-white" : "bg-muted")}>{f.k}</span>{f.t}
							</button>
						);
					})}
				</div>
				<div key={forma} className="animate-in fade-in rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed text-muted-foreground duration-300">
					{forma === "A"
						? <p>El cliente paga precio full durante el año y al cierre recibe el beneficio: una nota de crédito en dinero (<strong className="text-foreground">A1</strong>) o firmas bonificadas equivalentes (<strong className="text-foreground">A2</strong>). Lakaut cobra antes; el cliente gana al final.</p>
						: <p>El cliente paga el año por adelantado ya con el descuento (<strong className="text-foreground">B1</strong>), o lo garantiza con un seguro de caución que se reduce a medida que paga (<strong className="text-foreground">B2</strong>). El cliente gana desde el día uno.</p>}
					<p className="mt-2">El neto anual para Lakaut es el mismo: cambia el flujo de caja.</p>
				</div>
			</div>
			<div className="space-y-3">
				<div className="font-heading text-base font-semibold text-foreground">Palancas comerciales</div>
				<p className="text-sm text-muted-foreground">Elegí condiciones y mirá cuánto suman. Se ofrecen en la propuesta como incentivo, con un tope.</p>
				<PalancasSimulator />
			</div>
			<Callout type="porque" title="IDC no tiene descuento de nivel">Su segmento ya es un precio propio por IDC, así que no hay descuento que liquidar.</Callout>
			<Takeaways items={["Forma A: cobrás antes, el beneficio llega al cierre. Forma B: el cliente paga por adelantado y descuenta ya.", "Las palancas premian cobrar rápido, contratos largos y cierres veloces.", "El tope evita que la suma de incentivos se coma el margen."]} />
		</div>
	);
}

// ── 6. Seguimiento y configuración ───────────────────────────────────────────
export function ModSeguimiento({ ctx }) {
	const items = [
		{ id: "historial", label: "Cotizaciones", Icon: ScrollText, body: <><p>Todas las cotizaciones del equipo, con estado (pendiente, confirmada, rechazada), versión y vencimiento. Desde acá reabrís una para editarla o reexportarla.</p></>, action: { label: "Ver Cotizaciones", onClick: function () { ctx.nav("historial"); } } },
		{ id: "vencimientos", label: "Vencimientos", Icon: BellRing, body: <p>Cuando una propuesta está por vencer, el ícono de Seguimiento del riel muestra un contador y Cotizaciones las lista arriba de todo, con un filtro "Por vencer". Es la señal para hacer el seguimiento con el cliente.</p> },
		{ id: "clientes", label: "Clientes", Icon: Users, body: <p>Cada empresa con sus cotizaciones y su historial. En Distribuidores, los certificados confirmados del socio suman a su base instalada.</p>, action: { label: "Ver Clientes", onClick: function () { ctx.nav("clientes"); } } },
		{ id: "reportes", label: "Reportes", Icon: ChartColumn, body: <p>Pipeline por canal, ingresos del año 1, márgenes y precios realizados. Sirve para ver qué se está vendiendo y a qué precio.</p>, action: { label: "Ver Reportes", onClick: function () { ctx.nav("reportes"); } } },
		{ id: "config", label: "Configuración", Icon: Settings, body: <><p>Precios por canal, costos, catálogo y tipo de cambio. Los cambios se guardan en la nube y aplican a todo el equipo al instante.</p><p><strong className="text-foreground">Regla:</strong> si no sos responsable de pricing, consultá antes de tocar.</p></> },
		{ id: "docs", label: "Documentación", Icon: BookOpen, body: <p>El modelo comercial completo, con las tablas vivas de cada canal. Cuando tengas una duda puntual de precios o reglas, está ahí.</p>, action: { label: "Abrir Documentación", onClick: function () { ctx.nav("docs"); } } },
	];
	return (
		<div className="space-y-6">
			<Lead>Una cotización no termina al exportarla: queda en el historial, vence, se versiona y alimenta los reportes. Este es el circuito después del PDF.</Lead>
			<Explorer items={items} />
			<Takeaways items={["Mirá el aviso de vencimientos del riel: es tu lista de seguimiento.", "Reabrí desde Cotizaciones; guardar crea una versión nueva.", "Para dudas de reglas o precios, andá a Documentación."]} />
		</div>
	);
}
