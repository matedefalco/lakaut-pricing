import { useState, useMemo, useEffect } from "react";
import {
	ComposedChart,
	Bar,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ReferenceLine,
	ResponsiveContainer,
} from "recharts";

// ─── Brand ────────────────────────────────────────────────────────────────
const BLUE = "#3041d5",
	BLUEL = "#eaecfb",
	GRAY = "#7f828e",
	BLACK = "#36383a",
	BG = "#f4f6fd";
const WHITE = "#fff",
	BORD = "#dde0eb",
	OK = "#059669",
	OKBG = "#d1fae5",
	WN = "#c87a00",
	WNBG = "#fef3c7",
	ER = "#dc2626",
	ERBG = "#fee2e2";

function mont(sz) {
	return {
		fontFamily: "Montserrat,sans-serif",
		fontWeight: 600,
		fontSize: sz,
		color: BLACK,
	};
}
function os(sz, w, col) {
	return {
		fontFamily: "'Open Sans',sans-serif",
		fontWeight: w || 400,
		fontSize: sz,
		color: col || BLACK,
	};
}

// ─── Cost defaults (initial state values) ────────────────────────────────
const ACTIVOS_TOTAL = 150545;
const CV_FIRMA_OTP = 0.1034;

const FIXED_ITEMS = [
	{ cat: "RRHH", item: "Sueldos IT", v: 96000 },
	{ cat: "RRHH", item: "Sueldos Administración", v: 20000 },
	{ cat: "Sop", item: "Licencia HSM", v: 2000 },
	{ cat: "Inf", item: "Rack + jaula 2kva", v: 1800 },
	{ cat: "Inf", item: "Internet ISP ×2", v: 900 },
	{ cat: "Inf", item: "Google Workspace 50c", v: 350 },
	{ cat: "Sop", item: "Soporte DC", v: 220 },
	{ cat: "Inf", item: "Energía + UPS", v: 210 },
	{ cat: "SW", item: "Twilio INC", v: 100 },
	{ cat: "Ops", item: "Mensajería", v: 100 },
	{ cat: "SW", item: "ChatGPT ×2", v: 80 },
	{ cat: "SW", item: "Figma", v: 64 },
	{ cat: "SW", item: "Mailchimp", v: 50 },
	{ cat: "SW", item: "GitHub ×2", v: 48 },
	{ cat: "SW", item: "Canva", v: 20 },
];
const ASSET_ITEMS = [
	{ item: "Notebooks ×9", amort: 2587.5, vida: 36 },
	{ item: "HSM Hardware ×2", amort: 2586, vida: 60 },
	{ item: "Cintas LTO ×60", amort: 575, vida: 12 },
	{ item: "Dispositivo cinta LTO", amort: 208.33, vida: 12 },
	{ item: "Firewall SW ×3", amort: 833.33, vida: 36 },
	{ item: "Servidores contingencia", amort: 1388.89, vida: 36 },
];
const CV_CERT_ITEMS = [
	{ item: "Verificación DNI (RENAPER)", v: 0.0435 },
	{ item: "Prueba de vida (RENAPER)", v: 0.0507 },
	{ item: "Biometría Activa (Veriff)", v: 0.6 },
	{ item: "Infra PKI / emisión", v: 0.8 },
	{ item: "OTP SMS cert.", v: 0.006 },
];
const SERVICES_DEF = {
	cloudStorage: {
		label: "Almacenamiento en nube",
		costType: "firma",
		cost: 0.05,
	},
	sellTimestamp: {
		label: "Sello de tiempo RFC 3161",
		costType: "firma",
		cost: 0.1,
	},
	mailCert: { label: "Mail certificado", costType: "user_mes", cost: 2.0 },
	competenceStamp: {
		label: "Sello de competencia",
		costType: "cert",
		cost: 0.5,
	},
};

// ─── Pack definitions ──────────────────────────────────────────────────────
const PACKS = {
	A: {
		label: "Bolsa Prepaga",
		desc: "Pago único · vigencia 24 meses",
		arch: "bolsa",
		strategy:
			"El usuario paga una vez y accede a un certificado digital más una bolsa de firmas válida por 24 meses. Sin compromiso mensual ni renovación automática. Apunta a usuarios ocasionales o captura el pago completo por adelantado, mejorando el cash flow inicial de la empresa.",
		defaults: { precio: 19, firmas: 15, periodo: 24 },
	},
	B: {
		label: "Suscripción",
		desc: "Recurrente mensual · MRR predecible",
		arch: "sub",
		strategy:
			"El usuario paga una mensualidad fija y recibe un cupo de firmas incluidas; si lo supera, paga por firma adicional. Genera MRR (Monthly Recurring Revenue) predecible: la métrica más valorada en una valuación o exit. La retención del usuario es el KPI crítico.",
		defaults: { precio: 8, firmas: 10, periodo: 1, extraFirma: 1.0 },
	},
	C: {
		label: "Pay-per-Use",
		desc: "Por consumo · sin mensualidad",
		arch: "ppu",
		strategy:
			"El usuario adquiere el certificado una vez y luego paga exclusivamente por cada firma ejecutada. Maximiza la flexibilidad, pero sacrifica la predictibilidad del ingreso. Recomendado como complemento o para integradores B2B, no como producto masivo B2C.",
		defaults: {
			precioCert: 5,
			precioFirma: 1.5,
			firmasAsumidas: 5,
			periodo: 1,
		},
	},
	D: {
		label: "Anual",
		desc: "Pago anual · descuento incluido",
		arch: "anual",
		strategy:
			"El usuario paga un año completo por adelantado a cambio de un descuento del 16–20% vs la suscripción mensual equivalente. Genera cash flow anticipado y reduce el churn: quien pagó el año tiene bajo incentivo a cancelar. Recomendado como upsell desde Suscripción.",
		defaults: { precio: 80, firmas: 120, periodo: 12 },
	},
	E: {
		label: "Freemium",
		desc: "Gratis · motor de adquisición",
		arch: "free",
		strategy:
			"El usuario accede gratis al certificado y a un número limitado de firmas. No genera revenue directo: cada usuario gratuito tiene un costo que la empresa absorbe. Su único objetivo es bajar la fricción de adquisición y alimentar el funnel de conversión. Viabilidad: tasa de conversión a pago debe superar el 4–5%.",
		defaults: { precio: 0, firmas: 1, periodo: 1 },
	},
	F: {
		label: "Híbrido",
		desc: "Cert + bolsa · modular",
		arch: "hibrido",
		strategy:
			"Separa explícitamente el certificado (alta + 24 meses de vigencia) de la bolsa de firmas. El usuario elige pagar por el componente que necesita. Estrategia modular: permite ventas incrementales y es ideal para usuarios con un único trámite o para integradores que solo necesitan firmas.",
		defaults: {
			precioCert: 5,
			precio: 7,
			firmas: 10,
			periodo: 24,
			extraFirma: 1.0,
		},
	},
};

// ─── Formatters ────────────────────────────────────────────────────────────
function fD(n, d) {
	if (!isFinite(n)) return "—";
	const dec = d === undefined ? 0 : d;
	const a = Math.abs(n);
	const s =
		a >= 1000
			? a.toLocaleString("es-AR", { maximumFractionDigits: 0 })
			: a.toFixed(dec);
	return (n < 0 ? "−" : "") + "USD " + s;
}
function fD2(n) {
	return isFinite(n) ? "USD " + n.toFixed(2) : "—";
}
function fP(n) {
	return isFinite(n) ? n.toFixed(1) + "%" : "—";
}
function fK(n) {
	if (!isFinite(n)) return "∞";
	if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
	if (n >= 1000) return Math.round(n / 1000) + "k";
	return String(Math.round(n));
}

// ─── Engine ────────────────────────────────────────────────────────────────
function engine({ arch, inp, svc, users, firmasComp, costs }) {
	const { activosTotal, cfSegmento, cvCertBase, cvFirmaOtp } = costs;
	const infraPorFirma = firmasComp > 0 ? activosTotal / firmasComp : 0;
	let svcFirma = 0,
		svcCert = 0,
		svcUserMes = 0;
	Object.keys(svc).forEach(function (k) {
		if (!svc[k]) return;
		const d = SERVICES_DEF[k];
		if (d.costType === "firma") svcFirma += d.cost;
		if (d.costType === "cert") svcCert += d.cost;
		if (d.costType === "user_mes") svcUserMes += d.cost;
	});
	const cvFirmaUnit = cvFirmaOtp + infraPorFirma + svcFirma;
	const cvCertUnit = cvCertBase + svcCert;

	let revMes = 0,
		firmasMesUsr = 0,
		certsMesUsr = 0;
	// displayPrice: what the customer actually sees/pays (not amortized)
	let displayPrice = "",
		displayPriceSuffix = "";

	if (arch === "ppu") {
		const fa = inp.firmasAsumidas || 5;
		revMes = (inp.precioCert || 0) / 24 + fa * (inp.precioFirma || 0);
		firmasMesUsr = fa;
		certsMesUsr = 1 / 24;
		displayPrice =
			"Cert " +
			fD2(inp.precioCert || 0) +
			" + " +
			fD2(inp.precioFirma || 0) +
			"/firma";
		displayPriceSuffix = "(" + fa + " firmas/mes asumidas)";
	} else if (arch === "sub") {
		revMes = inp.precio || 0;
		firmasMesUsr = inp.firmas || 0;
		certsMesUsr = 1 / 24;
		displayPrice = fD2(inp.precio || 0);
		displayPriceSuffix = "/mes";
	} else if (arch === "anual") {
		revMes = (inp.precio || 0) / 12;
		firmasMesUsr = (inp.firmas || 0) / 12;
		certsMesUsr = 1 / 12;
		displayPrice = fD2(inp.precio || 0);
		displayPriceSuffix = "/año (" + fD2((inp.precio || 0) / 12) + "/mes)";
	} else if (arch === "free") {
		revMes = 0;
		firmasMesUsr = inp.firmas || 1;
		certsMesUsr = 1 / 24;
		displayPrice = "USD 0";
		displayPriceSuffix = "(gratuito)";
	} else if (arch === "hibrido") {
		const p = inp.periodo || 24;
		revMes = ((inp.precioCert || 0) + (inp.precio || 0)) / p;
		firmasMesUsr = (inp.firmas || 0) / p;
		certsMesUsr = 1 / p;
		displayPrice =
			"Cert " + fD2(inp.precioCert || 0) + " + Bolsa " + fD2(inp.precio || 0);
		displayPriceSuffix = "/ pack (" + p + "m)";
	} else {
		// bolsa
		const p = inp.periodo || 24;
		revMes = (inp.precio || 0) / p;
		firmasMesUsr = (inp.firmas || 0) / p;
		certsMesUsr = 1 / p;
		displayPrice = fD2(inp.precio || 0);
		displayPriceSuffix = "/ pack (" + p + " meses)";
	}

	const cvMes =
		certsMesUsr * cvCertUnit + firmasMesUsr * cvFirmaUnit + svcUserMes;
	const margenUnit = revMes - cvMes;
	const margenPct = revMes > 0 ? (margenUnit / revMes) * 100 : -100;
	const beUsuarios =
		margenUnit > 0 ? Math.ceil(cfSegmento / margenUnit) : Infinity;
	const revTotal = revMes * users,
		cvTotal = cvMes * users;
	const ebitda = revTotal - cvTotal - cfSegmento;
	const ebitdaPct =
		revTotal > 0 ? (ebitda / revTotal) * 100 : ebitda > 0 ? 100 : -100;
	const priceSug = cvMes + cfSegmento / Math.max(users, 1);

	let acum = 0;
	const proj = Array.from({ length: 24 }, function (_, i) {
		const ramp = Math.min(1, 0.25 + i * 0.1);
		const uM = Math.round(users * ramp);
		const rM = revMes * uM,
			cM = cvMes * uM + cfSegmento,
			eM = rM - cM;
		acum += eM;
		return {
			mes: "M" + (i + 1),
			Revenue: Math.round(rM),
			Costo: Math.round(cM),
			EBITDA: Math.round(eM),
			Acumulado: Math.round(acum),
		};
	});
	const beIdx = proj.findIndex(function (p) {
		return p.Acumulado >= 0;
	});
	const beMes = beIdx >= 0 ? beIdx + 1 : null;

	return {
		infraPorFirma,
		cvFirmaUnit,
		cvCertUnit,
		cvMes,
		revMes,
		margenUnit,
		margenPct,
		beUsuarios,
		revTotal,
		cvTotal,
		ebitda,
		ebitdaPct,
		priceSug,
		proj,
		beMes,
		svcUserMes,
		displayPrice,
		displayPriceSuffix,
	};
}

// ─── Break-even chart data: sweep users 0..3x, show EBITDA ────────────────
function beCurveData(arch, inp, svc, firmasComp, currentUsers, costs) {
	const maxU = Math.max(currentUsers * 3, 150000);
	const step = Math.max(Math.round(maxU / 40), 500);
	const points = [];
	for (let u = 0; u <= maxU; u += step) {
		const c = engine({ arch, inp, svc, users: u, firmasComp, costs });
		points.push({
			users: u,
			EBITDA: Math.round(c.ebitda),
			Revenue: Math.round(c.revTotal),
			Costo: Math.round(c.cvTotal + costs.cfSegmento),
		});
	}
	return points;
}

// ─── Price sensitivity: sweep price, show BE users ────────────────────────
function priceSensData(arch, inp, svc, firmasComp, costs) {
	const c0 = engine({ arch, inp, svc, users: 1, firmasComp, costs });
	const minPrice = c0.cvMes * 0.5;
	const maxPrice = c0.cvMes * 5 || 10;
	const step = (maxPrice - minPrice) / 40;
	const points = [];
	for (let price = minPrice; price <= maxPrice; price += step) {
		const margin = price - c0.cvMes;
		const be = margin > 0 ? Math.ceil(costs.cfSegmento / margin) : null;
		points.push({
			precio: parseFloat(price.toFixed(3)),
			BE_usuarios: be ? Math.min(be, 500000) : null,
		});
	}
	return points;
}

// ─── UI atoms ─────────────────────────────────────────────────────────────
function NumInput({ label, value, onChange, prefix, suffix, note }) {
	return (
		<div style={{ marginBottom: 10 }}>
			{label && (
				<div style={Object.assign({}, os(12, 400, GRAY), { marginBottom: 4 })}>
					{label}
				</div>
			)}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					border: "1.5px solid " + BORD,
					borderRadius: 8,
					overflow: "hidden",
					background: WHITE,
				}}
			>
				{prefix && (
					<span
						style={Object.assign({}, os(12, 400, GRAY), {
							padding: "5px 8px",
							background: "#f4f6fd",
							borderRight: "1px solid " + BORD,
							whiteSpace: "nowrap",
						})}
					>
						{prefix}
					</span>
				)}
				<input
					type="number"
					value={value}
					onChange={function (e) {
						onChange(Number(e.target.value));
					}}
					style={{
						flex: 1,
						border: "none",
						outline: "none",
						padding: "6px 8px",
						fontFamily: "'Open Sans',sans-serif",
						fontSize: 13,
						color: BLACK,
					}}
				/>
				{suffix && (
					<span
						style={Object.assign({}, os(11, 400, GRAY), {
							padding: "5px 8px",
							background: "#f4f6fd",
							borderLeft: "1px solid " + BORD,
						})}
					>
						{suffix}
					</span>
				)}
			</div>
			{note && (
				<div style={Object.assign({}, os(10, 400, GRAY), { marginTop: 3 })}>
					{note}
				</div>
			)}
		</div>
	);
}

function KpiCard({ label, value, sub, accent }) {
	return (
		<div
			style={{
				background: WHITE,
				border: "1px solid " + BORD,
				borderRadius: 12,
				padding: "16px 18px",
				borderTop: "4px solid " + accent,
				flex: "1 1 160px",
				minWidth: 0,
			}}
		>
			<div
				style={Object.assign({}, os(10, 700, GRAY), {
					textTransform: "uppercase",
					letterSpacing: "0.6px",
					marginBottom: 8,
				})}
			>
				{label}
			</div>
			<div
				style={Object.assign({}, mont(24), { color: accent, lineHeight: 1 })}
			>
				{value}
			</div>
			{sub && (
				<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 6 })}>
					{sub}
				</div>
			)}
		</div>
	);
}

function Toggle({ label, cost, costType, checked, onChange }) {
	const unit =
		costType === "firma"
			? "/firma"
			: costType === "cert"
				? "/cert"
				: "/usuario/mes";
	return (
		<div
			style={{
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				padding: "8px 0",
				borderBottom: "1px solid " + BORD,
			}}
		>
			<div>
				<div style={os(12, 400, BLACK)}>{label}</div>
				<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 1 })}>
					{cost > 0
						? "+ USD " + cost.toFixed(2) + " " + unit
						: "Sin costo adicional"}
				</div>
			</div>
			<div
				onClick={function () {
					onChange(!checked);
				}}
				style={{
					width: 38,
					height: 22,
					borderRadius: 11,
					background: checked ? BLUE : BORD,
					cursor: "pointer",
					position: "relative",
					transition: "background 0.2s",
					flexShrink: 0,
				}}
			>
				<div
					style={{
						position: "absolute",
						width: 16,
						height: 16,
						borderRadius: 8,
						background: WHITE,
						top: 3,
						left: checked ? 18 : 3,
						transition: "left 0.2s",
					}}
				/>
			</div>
		</div>
	);
}

function Sec({ title }) {
	return (
		<div
			style={Object.assign({}, os(10, 700, BLUE), {
				textTransform: "uppercase",
				letterSpacing: "1px",
				margin: "14px 0 8px",
				paddingBottom: 4,
				borderBottom: "2px solid " + BLUEL,
			})}
		>
			{title}
		</div>
	);
}

// ─── Pack input fields per arch ────────────────────────────────────────────
function PackFields({ arch, inp, update }) {
	if (arch === "ppu")
		return (
			<div>
				<NumInput
					label="Precio certificado (one-time)"
					value={inp.precioCert || 5}
					onChange={function (v) {
						update("precioCert", v);
					}}
					prefix="USD"
				/>
				<NumInput
					label="Precio por firma"
					value={inp.precioFirma || 1.5}
					onChange={function (v) {
						update("precioFirma", v);
					}}
					prefix="USD"
				/>
				<NumInput
					label="Firmas asumidas / mes (para análisis)"
					value={inp.firmasAsumidas || 5}
					onChange={function (v) {
						update("firmasAsumidas", v);
					}}
					suffix="f"
					note="No limita al usuario. Define el consumo promedio asumido para proyectar revenue."
				/>
			</div>
		);
	if (arch === "free")
		return (
			<NumInput
				label="Firmas gratuitas / mes"
				value={inp.firmas || 1}
				onChange={function (v) {
					update("firmas", v);
				}}
				suffix="f"
			/>
		);
	if (arch === "hibrido")
		return (
			<div>
				<NumInput
					label="Precio certificado"
					value={inp.precioCert || 5}
					onChange={function (v) {
						update("precioCert", v);
					}}
					prefix="USD"
				/>
				<NumInput
					label="Precio bolsa de firmas"
					value={inp.precio || 0}
					onChange={function (v) {
						update("precio", v);
					}}
					prefix="USD"
				/>
				<NumInput
					label="Firmas incluidas en bolsa"
					value={inp.firmas || 0}
					onChange={function (v) {
						update("firmas", v);
					}}
					suffix="f"
				/>
				{(inp.firmas || 0) > 0 && (
					<NumInput
						label="Firma extra (USD/firma)"
						value={inp.extraFirma || 1}
						onChange={function (v) {
							update("extraFirma", v);
						}}
						prefix="USD"
					/>
				)}
			</div>
		);
	const isAnual = arch === "anual",
		isPack = arch === "bolsa";
	return (
		<div>
			<NumInput
				label={
					isAnual
						? "Precio anual"
						: isPack
							? "Precio del pack (one-time)"
							: "Precio mensual"
				}
				value={inp.precio || 0}
				onChange={function (v) {
					update("precio", v);
				}}
				prefix="USD"
				suffix={isAnual ? "/año" : isPack ? "/ pack" : "/mes"}
			/>
			<NumInput
				label={
					isAnual
						? "Firmas / año"
						: isPack
							? "Firmas incluidas (toda la vigencia)"
							: "Firmas incluidas / mes"
				}
				value={inp.firmas || 0}
				onChange={function (v) {
					update("firmas", v);
				}}
				suffix="f"
			/>
			{arch === "sub" && (
				<NumInput
					label="Firma extra (USD/firma)"
					value={inp.extraFirma || 1}
					onChange={function (v) {
						update("extraFirma", v);
					}}
					prefix="USD"
				/>
			)}
		</div>
	);
}

// ─── Tooltip ──────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }) {
	if (!active || !payload || !payload.length) return null;
	return (
		<div
			style={{
				background: WHITE,
				border: "1px solid " + BORD,
				borderRadius: 8,
				padding: "8px 12px",
			}}
		>
			<div style={Object.assign({}, os(12, 700, BLACK), { marginBottom: 4 })}>
				{label}
			</div>
			{payload.map(function (p) {
				return (
					<div
						key={p.name}
						style={{
							display: "flex",
							justifyContent: "space-between",
							gap: 12,
							color: p.color || p.stroke,
						}}
					>
						<span style={os(11, 400)}>{p.name}</span>
						<span style={os(11, 700)}>
							{typeof p.value === "number" ? fD(p.value) : p.value}
						</span>
					</div>
				);
			})}
		</div>
	);
}

// ─── TAB: Costos ──────────────────────────────────────────────────────────
const CAT_COLOR = { RRHH: BLUE, Sop: WN, Inf: GRAY, SW: "#8b5cf6", Ops: OK };
function TabCostos({ calcs, firmasComp, costConfig, costs }) {
	const subtotalOps = costConfig.fixedItems.reduce(function (s, r) { return s + r.v; }, 0);
	const subtotalAmort = costConfig.assetItems.reduce(function (s, r) { return s + r.amort; }, 0);
	return (
		<div>
			{/* CF fixed info banner */}
			<div
				style={{
					background: BLUEL,
					border: "1px solid " + BORD,
					borderRadius: 10,
					padding: "10px 14px",
					marginBottom: 16,
					display: "flex",
					flexWrap: "wrap",
					gap: 20,
				}}
			>
				<div>
					<div style={Object.assign({}, os(10, 700, BLUE), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>
						CF total empresa / mes
					</div>
					<div style={Object.assign({}, mont(18), { color: BLUE })}>{fD(costs.cfTotal)}</div>
				</div>
				<div style={{ borderLeft: "1px solid " + BORD, paddingLeft: 20 }}>
					<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>
						CF asignado segmento Individuos
					</div>
					<div style={Object.assign({}, mont(18), { color: GRAY })}>{fD(costs.cfSegmento)}</div>
				</div>
				<div style={{ borderLeft: "1px solid " + BORD, paddingLeft: 20 }}>
					<div style={Object.assign({}, os(10, 700, WN), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>
						CV por certificado
					</div>
					<div style={Object.assign({}, mont(18), { color: WN })}>{fD2(calcs.cvCertUnit)}</div>
				</div>
				<div style={{ borderLeft: "1px solid " + BORD, paddingLeft: 20 }}>
					<div style={Object.assign({}, os(10, 700, OK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>
						CV por firma
					</div>
					<div style={Object.assign({}, mont(18), { color: OK })}>{fD2(calcs.cvFirmaUnit)}</div>
				</div>
			</div>

			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
				<div>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
						Costos fijos operativos
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<tbody>
							{costConfig.fixedItems.map(function (r, i) {
								return (
									<tr key={r.item} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={{ padding: "3px 6px" }}>
											<span style={Object.assign({}, os(9, 700, CAT_COLOR[r.cat] || GRAY), { marginRight: 4, textTransform: "uppercase" })}>
												{r.cat}
											</span>
											<span style={os(11, 400, BLACK)}>{r.item}</span>
										</td>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{fD(r.v)}
										</td>
									</tr>
								);
							})}
							<tr style={{ background: BLUEL }}>
								<td style={Object.assign({}, os(11, 700, BLUE), { padding: "5px 6px" })}>Subtotal operativos</td>
								<td style={Object.assign({}, os(11, 700, BLUE), { padding: "5px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{fD(subtotalOps)}
								</td>
							</tr>
						</tbody>
					</table>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", margin: "14px 0 8px" })}>
						Activos físicos (amortización mensual)
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<tbody>
							{costConfig.assetItems.map(function (r, i) {
								return (
									<tr key={r.item} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={{ padding: "3px 6px" }}>
											<span style={os(11, 400, BLACK)}>{r.item}</span>
											<span style={Object.assign({}, os(10, 400, GRAY), { marginLeft: 4 })}>({r.vida}m)</span>
										</td>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{fD(r.amort)}
										</td>
									</tr>
								);
							})}
							<tr style={{ background: BLUEL }}>
								<td style={Object.assign({}, os(11, 700, BLUE), { padding: "5px 6px" })}>Total amortización</td>
								<td style={Object.assign({}, os(11, 700, BLUE), { padding: "5px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{fD(subtotalAmort)}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
				<div>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
						CV por certificado emitido
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<tbody>
							{costConfig.cvCertItems.map(function (r, i) {
								return (
									<tr key={r.item} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px" })}>{r.item}</td>
										<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
											{r.v.toFixed(4)}
										</td>
									</tr>
								);
							})}
							<tr style={{ background: WNBG }}>
								<td style={Object.assign({}, os(11, 700, WN), { padding: "5px 6px" })}>Total CV cert</td>
								<td style={Object.assign({}, os(11, 700, WN), { padding: "5px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{calcs.cvCertUnit.toFixed(4)}
								</td>
							</tr>
						</tbody>
					</table>
					<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", margin: "14px 0 8px" })}>
						CV por firma ejecutada
					</div>
					<table style={{ width: "100%", borderCollapse: "collapse" }}>
						<tbody>
							<tr style={{ background: "#fafafa" }}>
								<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px" })}>OTP SMS (Twilio)</td>
								<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{costConfig.cvFirmaOtp.toFixed(4)}
								</td>
							</tr>
							<tr>
								<td style={{ padding: "3px 6px" }}>
									<span style={os(11, 400, BLACK)}>Infra activada</span>
									<span style={Object.assign({}, os(10, 400, GRAY), { display: "block" })}>
										{fK(costs.activosTotal)} ÷ {fK(firmasComp)} firmas comprometidas
									</span>
								</td>
								<td style={Object.assign({}, os(11, 400, BLUE), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{calcs.infraPorFirma.toFixed(4)}
								</td>
							</tr>
							{calcs.svcUserMes > 0 && (
								<tr style={{ background: "#fafafa" }}>
									<td style={Object.assign({}, os(11, 400, BLACK), { padding: "3px 6px" })}>Servicios opcionales activos</td>
									<td style={Object.assign({}, os(11, 400, BLUE), { padding: "3px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
										{fD2(calcs.svcUserMes)}/usr/mes
									</td>
								</tr>
							)}
							<tr style={{ background: OKBG }}>
								<td style={Object.assign({}, os(11, 700, OK), { padding: "5px 6px" })}>Total CV firma</td>
								<td style={Object.assign({}, os(11, 700, OK), { padding: "5px 6px", textAlign: "right", fontFamily: "Courier New,monospace" })}>
									{calcs.cvFirmaUnit.toFixed(4)}
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}

// ─── TAB: Precios ─────────────────────────────────────────────────────────
function TabPrecios({ calcs, users, costs }) {
	const VOLS = [5000, 10000, 20000, 50000, 100000, 200000];
	return (
		<div>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
					gap: 12,
					marginBottom: 20,
				}}
			>
				{/* Actual price card - shows real price, not amortized */}
				<div
					style={{
						background: BLUEL,
						border: "2px solid " + BLUE,
						borderRadius: 12,
						padding: "18px 20px",
					}}
				>
					<div
						style={Object.assign({}, os(10, 700, BLUE), {
							textTransform: "uppercase",
							letterSpacing: "0.6px",
							marginBottom: 6,
						})}
					>
						Precio al cliente
					</div>
					<div
						style={Object.assign({}, mont(28), {
							color: BLUE,
							lineHeight: 1.1,
						})}
					>
						{calcs.displayPrice}
					</div>
					<div style={Object.assign({}, os(12, 400, GRAY), { marginTop: 6 })}>
						{calcs.displayPriceSuffix}
					</div>
					<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 8 })}>
						Equivalente mensual: {fD2(calcs.revMes)} · CV: {fD2(calcs.cvMes)} ·
						Margen: {fD2(calcs.margenUnit)}
					</div>
				</div>
				<div
					style={{
						background: calcs.priceSug > calcs.revMes ? WNBG : OKBG,
						border: "2px solid " + (calcs.priceSug > calcs.revMes ? WN : OK),
						borderRadius: 12,
						padding: "18px 20px",
					}}
				>
					<div
						style={Object.assign(
							{},
							os(10, 700, calcs.priceSug > calcs.revMes ? WN : OK),
							{
								textTransform: "uppercase",
								letterSpacing: "0.6px",
								marginBottom: 6,
							},
						)}
					>
						Precio mínimo sugerido · usuario / mes
					</div>
					<div
						style={Object.assign({}, mont(36), {
							color: calcs.priceSug > calcs.revMes ? WN : OK,
							lineHeight: 1,
						})}
					>
						{fD2(calcs.priceSug)}
					</div>
					<div style={Object.assign({}, os(12, 400, GRAY), { marginTop: 8 })}>
						{calcs.priceSug > calcs.revMes
							? "↑ Precio actual por debajo del mínimo"
							: "✓ Precio actual cubre el costo mínimo"}
					</div>
				</div>
			</div>

			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: 10,
				})}
			>
				Sensibilidad EBITDA por volumen · CF asignado: {fD(costs.cfSegmento)}/mes
			</div>
			<table
				style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
			>
				<thead>
					<tr style={{ background: BLACK }}>
						{[
							"Usuarios",
							"Revenue / mes",
							"CV total",
							"EBITDA / mes",
							"Margen %",
							"vs BE",
						].map(function (h) {
							return (
								<th
									key={h}
									style={Object.assign({}, os(10, 700, WHITE), {
										padding: "8px 10px",
										textAlign: h === "Usuarios" ? "left" : "right",
									})}
								>
									{h}
								</th>
							);
						})}
					</tr>
				</thead>
				<tbody>
					{VOLS.map(function (u, i) {
						const r = calcs.revMes * u,
							cv = calcs.cvMes * u,
							e = r - cv - costs.cfSegmento;
						const m = r > 0 ? (e / r) * 100 : -100;
						const ec = e > 0 ? OK : e > -20000 ? WN : ER;
						const act = u === users;
						return (
							<tr
								key={u}
								style={{
									background: act ? BLUEL : i % 2 === 0 ? "#fafafa" : WHITE,
									outline: act ? "2px solid " + BLUE : "none",
								}}
							>
								<td
									style={Object.assign(
										{},
										os(13, act ? 700 : 400, act ? BLUE : BLACK),
										{ padding: "9px 10px" },
									)}
								>
									{act ? "▶ " : ""}
									{u.toLocaleString()}
								</td>
								<td
									style={Object.assign({}, os(13, 400, BLACK), {
										fontFamily: "Courier New,monospace",
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{fD(r)}
								</td>
								<td
									style={Object.assign({}, os(13, 400, GRAY), {
										fontFamily: "Courier New,monospace",
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{fD(cv)}
								</td>
								<td
									style={Object.assign({}, os(13, 700, ec), {
										fontFamily: "Courier New,monospace",
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{fD(e)}
								</td>
								<td
									style={Object.assign({}, os(13, 400, ec), {
										textAlign: "right",
										padding: "9px 10px",
									})}
								>
									{fP(m)}
								</td>
								<td
									style={Object.assign(
										{},
										os(11, 400, u >= calcs.beUsuarios ? OK : GRAY),
										{ textAlign: "right", padding: "9px 10px" },
									)}
								>
									{u >= calcs.beUsuarios
										? "✓ BE"
										: "−" + fK(calcs.beUsuarios - u)}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

// ─── TAB: Proyección ──────────────────────────────────────────────────────
function TabProyeccion({ proj, beMes }) {
	return (
		<div>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					marginBottom: 8,
				}}
			>
				<div
					style={Object.assign({}, os(11, 700, BLACK), {
						textTransform: "uppercase",
						letterSpacing: "0.5px",
					})}
				>
					Revenue · Costo · EBITDA mensual (ramp 24M)
				</div>
				{beMes ? (
					<span
						style={Object.assign({}, os(11, 700, WN), {
							background: WNBG,
							padding: "3px 10px",
							borderRadius: 20,
						})}
					>
						Break-even mes {beMes}
					</span>
				) : (
					<span
						style={Object.assign({}, os(11, 700, ER), {
							background: ERBG,
							padding: "3px 10px",
							borderRadius: 20,
						})}
					>
						Sin break-even en 24M
					</span>
				)}
			</div>
			<div style={{ height: 200, marginBottom: 20 }}>
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart
						data={proj}
						margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#eee" />
						<XAxis
							dataKey="mes"
							tick={{ fontSize: 10, fill: GRAY }}
							interval={3}
						/>
						<YAxis
							tick={{ fontSize: 10, fill: GRAY }}
							tickFormatter={function (v) {
								return v >= 1000 ? Math.round(v / 1000) + "k" : v;
							}}
						/>
						<Tooltip content={ChartTip} />
						<Bar
							dataKey="Revenue"
							fill={BLUE}
							opacity={0.85}
							radius={[2, 2, 0, 0]}
						/>
						<Bar
							dataKey="Costo"
							fill={GRAY}
							opacity={0.6}
							radius={[2, 2, 0, 0]}
						/>
						<Line
							type="monotone"
							dataKey="EBITDA"
							stroke={OK}
							strokeWidth={2.5}
							dot={false}
						/>
						{beMes && (
							<ReferenceLine
								x={"M" + beMes}
								stroke={WN}
								strokeDasharray="5 3"
								label={{ value: "M" + beMes, fill: WN, fontSize: 10 }}
							/>
						)}
					</ComposedChart>
				</ResponsiveContainer>
			</div>
			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: 8,
				})}
			>
				Balance acumulado
			</div>
			<div style={{ height: 160 }}>
				<ResponsiveContainer width="100%" height="100%">
					<ComposedChart
						data={proj}
						margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
					>
						<CartesianGrid strokeDasharray="3 3" stroke="#eee" />
						<XAxis
							dataKey="mes"
							tick={{ fontSize: 10, fill: GRAY }}
							interval={3}
						/>
						<YAxis
							tick={{ fontSize: 10, fill: GRAY }}
							tickFormatter={function (v) {
								return v >= 1000 ? Math.round(v / 1000) + "k" : v;
							}}
						/>
						<Tooltip content={ChartTip} />
						<ReferenceLine y={0} stroke={ER} strokeDasharray="4 2" />
						<Line
							type="monotone"
							dataKey="Acumulado"
							stroke={BLUE}
							strokeWidth={3}
							dot={false}
						/>
						{beMes && (
							<ReferenceLine
								x={"M" + beMes}
								stroke={WN}
								strokeDasharray="5 3"
							/>
						)}
					</ComposedChart>
				</ResponsiveContainer>
			</div>
		</div>
	);
}

// ─── TAB: Break-even charts ────────────────────────────────────────────────
function TabBreakEven({ arch, inp, svc, firmasComp, currentUsers, costs }) {
	const curveData = useMemo(
		function () {
			return beCurveData(arch, inp, svc, firmasComp, currentUsers, costs);
		},
		[arch, inp, svc, firmasComp, currentUsers, costs],
	);
	const sensData = useMemo(
		function () {
			return priceSensData(arch, inp, svc, firmasComp, costs);
		},
		[arch, inp, svc, firmasComp, costs],
	);

	const bePoint = curveData.find(function (d) {
		return d.EBITDA >= 0;
	});

	const TipU = function ({ active, payload, label }) {
		if (!active || !payload || !payload.length) return null;
		return (
			<div
				style={{
					background: WHITE,
					border: "1px solid " + BORD,
					borderRadius: 8,
					padding: "8px 12px",
				}}
			>
				<div style={Object.assign({}, os(12, 700, BLACK), { marginBottom: 4 })}>
					{Number(label).toLocaleString()} usuarios
				</div>
				{payload.map(function (p) {
					return (
						<div
							key={p.name}
							style={{
								display: "flex",
								justifyContent: "space-between",
								gap: 12,
								color: p.color || p.stroke,
							}}
						>
							<span style={os(11, 400)}>{p.name}</span>
							<span style={os(11, 700)}>{fD(p.value)}</span>
						</div>
					);
				})}
			</div>
		);
	};
	const TipP = function ({ active, payload, label }) {
		if (!active || !payload || !payload.length) return null;
		return (
			<div
				style={{
					background: WHITE,
					border: "1px solid " + BORD,
					borderRadius: 8,
					padding: "8px 12px",
				}}
			>
				<div style={Object.assign({}, os(12, 700, BLACK), { marginBottom: 4 })}>
					Precio equiv. {fD2(Number(label))}/mes
				</div>
				{payload.map(function (p) {
					return (
						<div key={p.name} style={{ color: p.color || BLUE }}>
							<span style={os(11, 400)}>{p.name}: </span>
							<span style={os(11, 700)}>
								{p.value ? Number(p.value).toLocaleString() + " usuarios" : "—"}
							</span>
						</div>
					);
				})}
			</div>
		);
	};

	return (
		<div>
			{/* Chart 1: EBITDA vs users */}
			<div style={{ marginBottom: 28 }}>
				<div
					style={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						marginBottom: 8,
					}}
				>
					<div
						style={Object.assign({}, os(11, 700, BLACK), {
							textTransform: "uppercase",
							letterSpacing: "0.5px",
						})}
					>
						EBITDA del segmento vs. volumen de usuarios
					</div>
					{bePoint ? (
						<span
							style={Object.assign({}, os(11, 700, OK), {
								background: OKBG,
								padding: "3px 10px",
								borderRadius: 20,
							})}
						>
							BE a ~{fK(bePoint.users)} usuarios
						</span>
					) : (
						<span
							style={Object.assign({}, os(11, 700, ER), {
								background: ERBG,
								padding: "3px 10px",
								borderRadius: 20,
							})}
						>
							Sin BE en el rango analizado
						</span>
					)}
				</div>
				<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 8 })}>
					La línea verde muestra el EBITDA conforme crece la base de usuarios.
					Cruza 0 en el punto de equilibrio.
				</div>
				<div style={{ height: 240 }}>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart
							data={curveData}
							margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#eee" />
							<XAxis
								dataKey="users"
								tick={{ fontSize: 10, fill: GRAY }}
								tickFormatter={function (v) {
									return fK(v);
								}}
								label={{
									value: "Usuarios activos",
									position: "insideBottom",
									offset: -2,
									style: { fontSize: 10, fill: GRAY },
								}}
							/>
							<YAxis
								tick={{ fontSize: 10, fill: GRAY }}
								tickFormatter={function (v) {
									return v >= 1000 ? Math.round(v / 1000) + "k" : v;
								}}
							/>
							<Tooltip content={TipU} />
							<ReferenceLine
								y={0}
								stroke={ER}
								strokeDasharray="4 2"
								label={{
									value: "Break-even",
									fill: ER,
									fontSize: 10,
									position: "insideTopRight",
								}}
							/>
							<ReferenceLine
								x={currentUsers}
								stroke={BLUE}
								strokeDasharray="4 2"
								label={{ value: "Actual", fill: BLUE, fontSize: 10 }}
							/>
							<Bar
								dataKey="Revenue"
								fill={BLUE}
								opacity={0.3}
								radius={[1, 1, 0, 0]}
							/>
							<Line
								type="monotone"
								dataKey="EBITDA"
								stroke={OK}
								strokeWidth={2.5}
								dot={false}
								name="EBITDA"
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			</div>

			{/* Chart 2: BE users vs price */}
			<div>
				<div
					style={Object.assign({}, os(11, 700, BLACK), {
						textTransform: "uppercase",
						letterSpacing: "0.5px",
						marginBottom: 8,
					})}
				>
					Sensibilidad de precio: usuarios necesarios para break-even según
					precio equivalente mensual
				</div>
				<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 8 })}>
					Cuántos usuarios necesitás según el precio que elijas. A mayor precio
					→ menos usuarios necesarios para cubrir costos fijos.
				</div>
				<div style={{ height: 220 }}>
					<ResponsiveContainer width="100%" height="100%">
						<ComposedChart
							data={sensData}
							margin={{ top: 4, right: 12, bottom: 16, left: 8 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#eee" />
							<XAxis
								dataKey="precio"
								tick={{ fontSize: 10, fill: GRAY }}
								tickFormatter={function (v) {
									return "USD " + v.toFixed(2);
								}}
								label={{
									value: "Precio equivalente / mes",
									position: "insideBottom",
									offset: -8,
									style: { fontSize: 10, fill: GRAY },
								}}
							/>
							<YAxis
								tick={{ fontSize: 10, fill: GRAY }}
								tickFormatter={function (v) {
									return fK(v);
								}}
								label={{
									value: "Usuarios para BE",
									angle: -90,
									position: "insideLeft",
									style: { fontSize: 10, fill: GRAY },
								}}
							/>
							<Tooltip content={TipP} />
							<ReferenceLine
								x={
									arch === "sub"
										? inp.precio || 8
										: arch === "anual"
											? (inp.precio || 80) / 12
											: arch === "bolsa"
												? (inp.precio || 19) / 24
												: inp.precioFirma || 1.5
								}
								stroke={BLUE}
								strokeDasharray="4 2"
								label={{ value: "Actual", fill: BLUE, fontSize: 10 }}
							/>
							<Line
								type="monotone"
								dataKey="BE_usuarios"
								stroke={WN}
								strokeWidth={2.5}
								dot={false}
								name="BE usuarios"
								connectNulls={false}
							/>
						</ComposedChart>
					</ResponsiveContainer>
				</div>
			</div>
		</div>
	);
}

// ─── TAB: Configuración ───────────────────────────────────────────────────
function InlineNum({ value, onChange, decimals }) {
	return (
		<input
			type="number"
			value={value}
			step={decimals > 0 ? Math.pow(10, -decimals) : 1}
			onChange={function (e) { onChange(Number(e.target.value)); }}
			style={{
				width: "100%",
				border: "1px solid " + BORD,
				borderRadius: 4,
				padding: "2px 6px",
				fontFamily: "Courier New,monospace",
				fontSize: 12,
				textAlign: "right",
				color: BLACK,
				background: WHITE,
				outline: "none",
				boxSizing: "border-box",
			}}
		/>
	);
}

function SectionHeader({ title }) {
	return (
		<div
			style={Object.assign({}, mont(14), {
				color: WHITE,
				background: BLACK,
				padding: "10px 16px",
				borderRadius: "8px 8px 0 0",
				marginTop: 20,
			})}
		>
			{title}
		</div>
	);
}

function TabConfig({ costConfig, setCostConfig }) {
	function updRow(key, i, field, val) {
		setCostConfig(function (prev) {
			return Object.assign({}, prev, {
				[key]: prev[key].map(function (r, j) {
					return j === i ? Object.assign({}, r, { [field]: val }) : r;
				}),
			});
		});
	}
	function removeRow(key, i) {
		setCostConfig(function (prev) {
			return Object.assign({}, prev, {
				[key]: prev[key].filter(function (_, j) { return j !== i; }),
			});
		});
	}
	function addRow(key, blank) {
		setCostConfig(function (prev) {
			return Object.assign({}, prev, { [key]: prev[key].concat([blank]) });
		});
	}

	const salaryRows = costConfig.fixedItems.map(function (r, i) { return Object.assign({}, r, { _i: i }); }).filter(function (r) { return r.cat === "RRHH"; });
	const opsRows = costConfig.fixedItems.map(function (r, i) { return Object.assign({}, r, { _i: i }); }).filter(function (r) { return r.cat !== "RRHH"; });
	const cfSalary = salaryRows.reduce(function (s, r) { return s + r.v; }, 0);
	const cfOps = opsRows.reduce(function (s, r) { return s + r.v; }, 0);
	const cfAmort = costConfig.assetItems.reduce(function (s, r) { return s + r.amort; }, 0);
	const cfTotal = cfSalary + cfOps + cfAmort;
	const cvCertTotal = costConfig.cvCertItems.reduce(function (s, r) { return s + r.v; }, 0);

	const thStyle = Object.assign({}, os(10, 700, WHITE), { padding: "6px 10px", textAlign: "left", background: GRAY });
	const thR = Object.assign({}, thStyle, { textAlign: "right" });

	const inputText = {
		width: "100%",
		border: "1px solid " + BORD,
		borderRadius: 4,
		padding: "2px 6px",
		fontFamily: "'Open Sans',sans-serif",
		fontSize: 12,
		color: BLACK,
		background: WHITE,
		outline: "none",
		boxSizing: "border-box",
	};

	const addBtn = {
		marginTop: 8,
		padding: "5px 14px",
		background: WHITE,
		border: "1.5px dashed " + BLUE,
		borderRadius: 6,
		color: BLUE,
		fontFamily: "'Open Sans',sans-serif",
		fontSize: 12,
		fontWeight: 700,
		cursor: "pointer",
	};

	const delBtn = {
		background: "none",
		border: "none",
		color: GRAY,
		cursor: "pointer",
		fontSize: 14,
		lineHeight: 1,
		padding: "0 4px",
	};

	return (
		<div style={{ maxWidth: 900 }}>
			{/* ── COSTOS FIJOS ─────────────────────────────────────── */}
			<SectionHeader title="1 · Costos Fijos" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE, marginBottom: 4 }}>

				{/* Activos adquiridos */}
				<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
					Activos adquiridos
				</div>
				<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
					<thead>
						<tr>
							<th style={thStyle}>Ítem</th>
							<th style={Object.assign({}, thR, { width: 130 })}>Amort. / mes (USD)</th>
							<th style={Object.assign({}, thR, { width: 90 })}>Vida útil (m)</th>
							<th style={Object.assign({}, thStyle, { width: 28 })} />
						</tr>
					</thead>
					<tbody>
						{costConfig.assetItems.map(function (r, i) {
							return (
								<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
									<td style={{ padding: "4px 6px" }}>
										<input style={inputText} value={r.item} onChange={function (e) { updRow("assetItems", i, "item", e.target.value); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 130 }}>
										<InlineNum value={r.amort} decimals={2} onChange={function (v) { updRow("assetItems", i, "amort", v); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 90 }}>
										<InlineNum value={r.vida} decimals={0} onChange={function (v) { updRow("assetItems", i, "vida", v); }} />
									</td>
									<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
										<button style={delBtn} onClick={function () { removeRow("assetItems", i); }} title="Eliminar">×</button>
									</td>
								</tr>
							);
						})}
						<tr style={{ background: BLUEL }}>
							<td style={Object.assign({}, os(11, 700, BLUE), { padding: "6px 10px" })}>Subtotal activos</td>
							<td style={Object.assign({}, os(12, 700, BLUE), { padding: "6px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>{fD(cfAmort)}</td>
							<td colSpan={2} />
						</tr>
					</tbody>
				</table>
				<button style={addBtn} onClick={function () { addRow("assetItems", { item: "", amort: 0, vida: 36 }); }}>+ Agregar activo</button>

				{/* Sueldos */}
				<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", margin: "20px 0 8px" })}>
					Sueldos
				</div>
				<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
					<thead>
						<tr>
							<th style={thStyle}>Ítem</th>
							<th style={Object.assign({}, thR, { width: 150 })}>Monto / mes (USD)</th>
							<th style={Object.assign({}, thStyle, { width: 28 })} />
						</tr>
					</thead>
					<tbody>
						{salaryRows.map(function (r) {
							var i = r._i;
							return (
								<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
									<td style={{ padding: "4px 6px" }}>
										<input style={inputText} value={r.item} onChange={function (e) { updRow("fixedItems", i, "item", e.target.value); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 150 }}>
										<InlineNum value={r.v} decimals={0} onChange={function (v) { updRow("fixedItems", i, "v", v); }} />
									</td>
									<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
										<button style={delBtn} onClick={function () { removeRow("fixedItems", i); }} title="Eliminar">×</button>
									</td>
								</tr>
							);
						})}
						<tr style={{ background: BLUEL }}>
							<td style={Object.assign({}, os(11, 700, BLUE), { padding: "6px 10px" })}>Subtotal sueldos</td>
							<td style={Object.assign({}, os(12, 700, BLUE), { padding: "6px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>{fD(cfSalary)}</td>
							<td />
						</tr>
					</tbody>
				</table>
				<button style={addBtn} onClick={function () { addRow("fixedItems", { cat: "RRHH", item: "", v: 0 }); }}>+ Agregar sueldo</button>

				{/* Costos fijos operativos */}
				<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", margin: "20px 0 8px" })}>
					Costos fijos operativos
				</div>
				<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
					<thead>
						<tr>
							<th style={Object.assign({}, thStyle, { width: 70 })}>Cat.</th>
							<th style={thStyle}>Ítem</th>
							<th style={Object.assign({}, thR, { width: 150 })}>Monto / mes (USD)</th>
							<th style={Object.assign({}, thStyle, { width: 28 })} />
						</tr>
					</thead>
					<tbody>
						{opsRows.map(function (r) {
							var i = r._i;
							return (
								<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
									<td style={{ padding: "4px 6px", width: 70 }}>
										<input
											style={Object.assign({}, inputText, { textTransform: "uppercase", fontWeight: 700, fontSize: 10, color: CAT_COLOR[r.cat] || GRAY })}
											value={r.cat}
											onChange={function (e) { updRow("fixedItems", i, "cat", e.target.value.toUpperCase()); }}
										/>
									</td>
									<td style={{ padding: "4px 6px" }}>
										<input style={inputText} value={r.item} onChange={function (e) { updRow("fixedItems", i, "item", e.target.value); }} />
									</td>
									<td style={{ padding: "4px 6px", width: 150 }}>
										<InlineNum value={r.v} decimals={0} onChange={function (v) { updRow("fixedItems", i, "v", v); }} />
									</td>
									<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
										<button style={delBtn} onClick={function () { removeRow("fixedItems", i); }} title="Eliminar">×</button>
									</td>
								</tr>
							);
						})}
						<tr style={{ background: BLUEL }}>
							<td />
							<td style={Object.assign({}, os(11, 700, BLUE), { padding: "6px 10px" })}>Subtotal operativos</td>
							<td style={Object.assign({}, os(12, 700, BLUE), { padding: "6px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>{fD(cfOps)}</td>
							<td />
						</tr>
					</tbody>
				</table>
				<button style={addBtn} onClick={function () { addRow("fixedItems", { cat: "Ops", item: "", v: 0 }); }}>+ Agregar costo operativo</button>

				{/* CF summary */}
				<div style={{ background: BLUEL, border: "1px solid " + BORD, borderRadius: 10, padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", marginTop: 20 }}>
					<div>
						<div style={Object.assign({}, os(10, 700, BLUE), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>CF Total empresa / mes</div>
						<div style={Object.assign({}, mont(20), { color: BLUE })}>{fD(cfTotal)}</div>
					</div>
					<div style={{ borderLeft: "1px solid " + BORD, paddingLeft: 24, minWidth: 200 }}>
						<div style={Object.assign({}, os(10, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 })}>CF asignado al segmento Individuos</div>
						<InlineNum
							value={costConfig.cfSegmento}
							decimals={0}
							onChange={function (v) { setCostConfig(function (prev) { return Object.assign({}, prev, { cfSegmento: v }); }); }}
						/>
					</div>
				</div>
			</div>

			{/* ── COSTOS VARIABLES ─────────────────────────────────── */}
			<SectionHeader title="2 · Costos Variables" />
			<div style={{ border: "1px solid " + BORD, borderTop: "none", borderRadius: "0 0 8px 8px", padding: 16, background: WHITE }}>
				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>

					{/* CV × Certificado */}
					<div>
						<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
							CV × Certificado emitido
						</div>
						<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 4 }}>
							<thead>
								<tr>
									<th style={thStyle}>Componente</th>
									<th style={Object.assign({}, thR, { width: 130 })}>Costo (USD)</th>
									<th style={Object.assign({}, thStyle, { width: 28 })} />
								</tr>
							</thead>
							<tbody>
								{costConfig.cvCertItems.map(function (r, i) {
									return (
										<tr key={i} style={{ background: i % 2 === 0 ? "#fafafa" : WHITE }}>
											<td style={{ padding: "4px 6px" }}>
												<input style={inputText} value={r.item} onChange={function (e) { updRow("cvCertItems", i, "item", e.target.value); }} />
											</td>
											<td style={{ padding: "4px 6px", width: 130 }}>
												<InlineNum value={r.v} decimals={4} onChange={function (v) { updRow("cvCertItems", i, "v", v); }} />
											</td>
											<td style={{ padding: "4px 4px", width: 28, textAlign: "center" }}>
												<button style={delBtn} onClick={function () { removeRow("cvCertItems", i); }} title="Eliminar">×</button>
											</td>
										</tr>
									);
								})}
								<tr style={{ background: WNBG }}>
									<td style={Object.assign({}, os(11, 700, WN), { padding: "6px 10px" })}>Total CV cert</td>
									<td style={Object.assign({}, os(12, 700, WN), { padding: "6px 10px", textAlign: "right", fontFamily: "Courier New,monospace" })}>{cvCertTotal.toFixed(4)}</td>
									<td />
								</tr>
							</tbody>
						</table>
						<button style={addBtn} onClick={function () { addRow("cvCertItems", { item: "", v: 0 }); }}>+ Agregar componente</button>
					</div>

					{/* CV × Firma */}
					<div>
						<div style={Object.assign({}, os(11, 700, BLACK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 })}>
							CV × Firma ejecutada
						</div>
						<table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
							<thead>
								<tr>
									<th style={thStyle}>Componente</th>
									<th style={Object.assign({}, thR, { width: 130 })}>Costo (USD)</th>
								</tr>
							</thead>
							<tbody>
								<tr style={{ background: "#fafafa" }}>
									<td style={Object.assign({}, os(12, 400, BLACK), { padding: "5px 10px" })}>OTP SMS (Twilio)</td>
									<td style={{ padding: "4px 10px", width: 130 }}>
										<InlineNum value={costConfig.cvFirmaOtp} decimals={4} onChange={function (v) { setCostConfig(function (prev) { return Object.assign({}, prev, { cvFirmaOtp: v }); }); }} />
									</td>
								</tr>
								<tr>
									<td style={{ padding: "5px 10px" }}>
										<div style={os(12, 400, BLACK)}>Infra activada total (activos)</div>
										<div style={os(10, 400, GRAY)}>Se divide por firmas comprometidas en cartera</div>
									</td>
									<td style={{ padding: "4px 10px", width: 130 }}>
										<InlineNum value={costConfig.activosTotal} decimals={0} onChange={function (v) { setCostConfig(function (prev) { return Object.assign({}, prev, { activosTotal: v }); }); }} />
									</td>
								</tr>
							</tbody>
						</table>
						<div style={{ background: OKBG, border: "1px solid " + OK + "44", borderRadius: 8, padding: "10px 14px" }}>
							<div style={Object.assign({}, os(10, 700, OK), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 })}>CV firma base (sin infra variable)</div>
							<div style={Object.assign({}, mont(18), { color: OK })}>{costConfig.cvFirmaOtp.toFixed(4)} USD</div>
							<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>La infra por firma se calcula al momento del análisis según las firmas comprometidas.</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

// ─── TAB: Cotizadora ──────────────────────────────────────────────────────
const FREQ_OPTIONS = [
	{
		k: "raro",
		label: "Ocasional",
		desc: "Menos de 5 firmas al año",
		firmasMes: 0.4,
	},
	{ k: "bajo", label: "Bajo", desc: "1–5 firmas por mes", firmasMes: 3 },
	{ k: "medio", label: "Regular", desc: "6–20 firmas por mes", firmasMes: 13 },
	{
		k: "alto",
		label: "Intensivo",
		desc: "Más de 20 firmas por mes",
		firmasMes: 30,
	},
];
const COMP_OPTIONS = [
	{ k: "ninguno", label: "Ninguno", desc: "No necesito servicios extra" },
	{
		k: "ts",
		label: "Sello de tiempo",
		desc: "Fecha y hora certificada (RFC 3161)",
	},
	{ k: "mail", label: "Mail certificado", desc: "Domicilio legal electrónico" },
	{
		k: "cloud",
		label: "Almacenamiento",
		desc: "Guarda de documentos firmados en nube",
	},
];
const PAY_OPTIONS = [
	{ k: "unico", label: "Pago único", desc: "Prefiero no tener cuota mensual" },
	{ k: "mensual", label: "Mensualidad", desc: "Cuota fija, sin sorpresas" },
	{ k: "anual", label: "Anual", desc: "Pago una vez al año a menor costo" },
	{
		k: "indiferente",
		label: "Indiferente",
		desc: "Me interesa el mejor precio",
	},
];

function Cotizadora({ costs }) {
	const [freq, setFreq] = useState(null);
	const [pay, setPay] = useState(null);
	const [extra, setExtra] = useState([]);

	function toggleExtra(k) {
		setExtra(function (prev) {
			return prev.includes(k)
				? prev.filter(function (x) {
						return x !== k;
					})
				: [...prev, k];
		});
	}

	const recomendaciones = useMemo(
		function () {
			if (!freq || !pay) return [];
			const fa = FREQ_OPTIONS.find(function (o) {
				return o.k === freq;
			});
			const firmasMes = fa ? fa.firmasMes : 5;

			// Build recommendations based on profile
			const recs = [];

			// Always consider Sub B if monthly
			if (pay === "mensual" || pay === "indiferente") {
				const firmas = firmasMes <= 2 ? 2 : firmasMes <= 10 ? 10 : 30;
				const precio = firmas <= 2 ? 3 : firmas <= 10 ? 8 : 15;
				const label = firmas <= 2 ? "Mini" : "Estándar";
				recs.push({
					pack: "B",
					label: "B · Suscripción " + label,
					precio: fD2(precio) + "/mes",
					firmas: firmas + " firmas/mes incluidas",
					forWho: "Ideal si firmás regularmente y querés cuota fija.",
					inp: {
						precio,
						firmas,
						periodo: 1,
						extraFirma: firmas <= 10 ? 1.0 : 0.8,
					},
				});
			}
			if (pay === "anual" || pay === "indiferente") {
				const firmasAnio = Math.round(firmasMes * 12);
				const precio = firmasAnio <= 120 ? 80 : 144;
				recs.push({
					pack: "D",
					label: "D · Anual",
					precio: fD2(precio) + "/año (" + fD2(precio / 12) + "/mes)",
					firmas: Math.min(firmasAnio, 360) + " firmas/año incluidas",
					forWho:
						"Ahorrás hasta un 20% vs suscripción mensual. Sin preocupaciones todo el año.",
					inp: { precio, firmas: Math.min(firmasAnio, 360), periodo: 12 },
				});
			}
			if ((pay === "unico" || pay === "indiferente") && freq !== "alto") {
				const firmasPack = firmasMes <= 0.5 ? 5 : firmasMes <= 3 ? 15 : 50;
				const precio = firmasPack <= 5 ? 9 : firmasPack <= 15 ? 19 : 39;
				recs.push({
					pack: "A",
					label: "A · Bolsa Prepaga",
					precio: fD2(precio) + " único (24 meses)",
					firmas: firmasPack + " firmas incluidas en la vigencia",
					forWho: "Pagás una vez y usás cuando querés. Sin cuota mensual.",
					inp: { precio, firmas: firmasPack, periodo: 24 },
				});
			}
			if (freq === "raro") {
				recs.push({
					pack: "C",
					label: "C · Pay-per-Use",
					precio: "Cert USD 5 + USD 1.50/firma",
					firmas: "Pagás solo lo que usás",
					forWho: "Firmás menos de 5 veces al año. El costo total es mínimo.",
					inp: {
						precioCert: 5,
						precioFirma: 1.5,
						firmasAsumidas: firmasMes || 0.4,
						periodo: 1,
					},
				});
			}
			if (freq === "raro" || freq === "bajo") {
				recs.push({
					pack: "E",
					label: "E · Freemium",
					precio: "Gratis · 1 firma/mes incluida",
					firmas: "1 firma mensual sin costo",
					forWho:
						"Probar el producto antes de comprometerte. Upgrade cuando lo necesites.",
					inp: { precio: 0, firmas: 1, periodo: 1 },
				});
			}

			return recs.slice(0, 3);
		},
		[freq, pay],
	);

	const Opt = function ({ options, selected, onSelect, multi }) {
		return (
			<div
				style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}
			>
				{options.map(function (o) {
					const act = multi ? selected.includes(o.k) : selected === o.k;
					return (
						<button
							key={o.k}
							onClick={function () {
								onSelect(o.k);
							}}
							style={{
								padding: "8px 14px",
								borderRadius: 10,
								textAlign: "left",
								background: act ? BLUE : WHITE,
								border: "1.5px solid " + (act ? BLUE : BORD),
								cursor: "pointer",
								minWidth: 0,
							}}
						>
							<div style={os(12, 700, act ? WHITE : BLACK)}>{o.label}</div>
							<div style={os(11, 400, act ? "#c5cbf7" : GRAY)}>{o.desc}</div>
						</button>
					);
				})}
			</div>
		);
	};

	const PackColorMap = {
		A: BLUE,
		B: OK,
		C: "#8b5cf6",
		D: WN,
		E: ER,
		F: "#0891b2",
	};

	return (
		<div>
			<div style={Object.assign({}, os(11, 400, GRAY), { marginBottom: 20 })}>
				Respondé las preguntas y el sistema te sugiere el plan más conveniente
				según tu perfil de uso.
			</div>

			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: 8,
				})}
			>
				1 · ¿Con qué frecuencia firmás documentos?
			</div>
			<Opt options={FREQ_OPTIONS} selected={freq} onSelect={setFreq} />

			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: 8,
				})}
			>
				2 · ¿Cómo preferís pagar?
			</div>
			<Opt options={PAY_OPTIONS} selected={pay} onSelect={setPay} />

			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: 8,
				})}
			>
				3 · ¿Qué servicios adicionales te interesan? (opcional)
			</div>
			<Opt
				options={COMP_OPTIONS}
				selected={extra}
				onSelect={toggleExtra}
				multi
			/>

			{recomendaciones.length > 0 && (
				<div>
					<div
						style={Object.assign({}, os(11, 700, BLACK), {
							textTransform: "uppercase",
							letterSpacing: "0.5px",
							margin: "20px 0 12px",
						})}
					>
						Planes recomendados para tu perfil
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
							gap: 12,
						}}
					>
						{recomendaciones.map(function (r, i) {
							const col = PackColorMap[r.pack] || BLUE;
							const c = engine({
								arch: PACKS[r.pack].arch,
								inp: r.inp,
								svc: {
									cloudStorage: false,
									sellTimestamp: false,
									mailCert: false,
									competenceStamp: false,
								},
								users: 20000,
								firmasComp: 200000,
								costs,
							});
							return (
								<div
									key={r.pack}
									style={{
										background: WHITE,
										border: "2px solid " + col,
										borderRadius: 14,
										overflow: "hidden",
									}}
								>
									<div style={{ background: col, padding: "12px 16px" }}>
										<div style={Object.assign({}, mont(16), { color: WHITE })}>
											{i === 0
												? "✦ Recomendado principal"
												: i === 1
													? "Alternativa"
													: "Opción adicional"}
										</div>
										<div
											style={Object.assign({}, os(13, 700, WHITE), {
												marginTop: 2,
											})}
										>
											{r.label}
										</div>
									</div>
									<div style={{ padding: "14px 16px" }}>
										<div
											style={Object.assign({}, mont(22), {
												color: col,
												marginBottom: 4,
											})}
										>
											{r.precio}
										</div>
										<div
											style={Object.assign({}, os(12, 400, GRAY), {
												marginBottom: 8,
											})}
										>
											{r.firmas}
										</div>
										<div
											style={Object.assign({}, os(12, 400, BLACK), {
												fontStyle: "italic",
												marginBottom: 12,
											})}
										>
											{r.forWho}
										</div>
										<div
											style={{
												borderTop: "1px solid " + BORD,
												paddingTop: 10,
												display: "grid",
												gridTemplateColumns: "1fr 1fr",
												gap: 6,
											}}
										>
											{[
												{
													l: "Margen unitario",
													v: fP(c.margenPct),
													col:
														c.margenPct > 30 ? OK : c.margenPct > 0 ? WN : ER,
												},
												{
													l: "BE usuarios",
													v: fK(c.beUsuarios) + " usu.",
													col: GRAY,
												},
											].map(function (m) {
												return (
													<div key={m.l}>
														<div style={os(10, 700, GRAY)}>{m.l}</div>
														<div
															style={Object.assign({}, mont(14), {
																color: m.col,
															})}
														>
															{m.v}
														</div>
													</div>
												);
											})}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{(!freq || !pay) && (
				<div
					style={{
						background: BLUEL,
						border: "1px solid " + BORD,
						borderRadius: 10,
						padding: "14px 18px",
						marginTop: 8,
					}}
				>
					<div style={os(12, 400, BLUE)}>
						Completá al menos las preguntas 1 y 2 para ver las recomendaciones.
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function LakautCalc() {
	useEffect(function () {
		var urls = [
			"https://unpkg.com/@fontsource/montserrat/600.css",
			"https://unpkg.com/@fontsource/open-sans/400.css",
			"https://unpkg.com/@fontsource/open-sans/700.css",
		];
		urls.forEach(function (href) {
			if (!document.querySelector('link[href="' + href + '"]')) {
				var l = document.createElement("link");
				l.rel = "stylesheet";
				l.href = href;
				document.head.appendChild(l);
			}
		});
	}, []);

	const [section, setSection] = useState("modelos");
	const [family, setFamily] = useState("B");
	const [users, setUsers] = useState(20000);
	const [firmasComp, setFirmasComp] = useState(200000);
	const [tab, setTab] = useState("costos");
	const [svc, setSvc] = useState({
		cloudStorage: false,
		sellTimestamp: false,
		mailCert: false,
		competenceStamp: false,
	});
	const [inp, setInp] = useState(PACKS.B.defaults);
	const [costConfig, setCostConfig] = useState({
		fixedItems: FIXED_ITEMS,
		assetItems: ASSET_ITEMS,
		cvCertItems: CV_CERT_ITEMS,
		cvFirmaOtp: CV_FIRMA_OTP,
		activosTotal: ACTIVOS_TOTAL,
		cfSegmento: 26024,
	});

	const costs = useMemo(function () {
		const cfOps = costConfig.fixedItems.reduce(function (s, r) { return s + r.v; }, 0);
		const cfAmort = costConfig.assetItems.reduce(function (s, r) { return s + r.amort; }, 0);
		const cfTotal = cfOps + cfAmort;
		const cfSegmento = costConfig.cfSegmento;
		const cvCertBase = costConfig.cvCertItems.reduce(function (s, r) { return s + r.v; }, 0);
		return {
			cfTotal,
			cfSegmento,
			cvCertBase,
			cvFirmaOtp: costConfig.cvFirmaOtp,
			activosTotal: costConfig.activosTotal,
		};
	}, [costConfig]);

	const cfg = PACKS[family];

	function changeFam(f) {
		setFamily(f);
		setInp(PACKS[f].defaults);
	}
	function updInp(k, v) {
		setInp(function (prev) {
			return Object.assign({}, prev, { [k]: v });
		});
	}
	function updSvc(k, v) {
		setSvc(function (prev) {
			return Object.assign({}, prev, { [k]: v });
		});
	}

	const calcs = useMemo(
		function () {
			return engine({ arch: cfg.arch, inp, svc, users, firmasComp, costs });
		},
		[cfg.arch, inp, svc, users, firmasComp, costs],
	);

	const ec = calcs.ebitda > 0 ? OK : calcs.ebitda > -10000 ? WN : ER;
	const mc = calcs.margenPct > 30 ? OK : calcs.margenPct > 0 ? WN : ER;
	const bc = calcs.beUsuarios <= users ? OK : WN;

	const TABS = ["costos", "precios", "proyección", "break-even"];
	const SECTIONS = [
		{ k: "modelos", label: "Modelos" },
		{ k: "cotizadora", label: "Cotizadora" },
		{ k: "configuración", label: "Configuración" },
	];

	return (
		<div
			style={{
				background: BG,
				minHeight: "100vh",
				fontFamily: "'Open Sans',sans-serif",
				boxSizing: "border-box",
			}}
		>
			{/* Header */}
			<div
				style={{
					background: BLUE,
					padding: "14px 24px",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<div>
					<div style={Object.assign({}, mont(22), { color: WHITE })}>
						LAKAUT · NEWCO
					</div>
					<div
						style={Object.assign({}, os(13, 400, WHITE), {
							opacity: 0.75,
							marginTop: 2,
						})}
					>
						Calculadora de Pricing · Segmento Individuos
					</div>
				</div>
				<div style={Object.assign({}, os(12, 400, WHITE), { opacity: 0.6 })}>
					Documento confidencial ·{" "}
					{new Date().toLocaleDateString("es-AR", {
						month: "long",
						year: "numeric",
					})}
				</div>
			</div>

			{/* Top-level nav */}
			<div
				style={{
					background: WHITE,
					borderBottom: "2px solid " + BORD,
					padding: "0 24px",
					display: "flex",
					gap: 0,
				}}
			>
				{SECTIONS.map(function (s) {
					const act = section === s.k;
					return (
						<button
							key={s.k}
							onClick={function () { setSection(s.k); }}
							style={{
								padding: "14px 24px",
								fontFamily: "'Open Sans',sans-serif",
								fontSize: 14,
								fontWeight: act ? 700 : 400,
								color: act ? BLUE : GRAY,
								background: "transparent",
								border: "none",
								cursor: "pointer",
								borderBottom: "3px solid " + (act ? BLUE : "transparent"),
								marginBottom: -2,
							}}
						>
							{s.label}
						</button>
					);
				})}
			</div>

			{section === "modelos" && (
				<div>
					{/* Pack selector */}
					<div
						style={{
							background: WHITE,
							borderBottom: "1px solid " + BORD,
							padding: "10px 24px",
							display: "flex",
							gap: 8,
							flexWrap: "wrap",
							alignItems: "center",
						}}
					>
						<span
							style={Object.assign({}, os(10, 700, GRAY), {
								textTransform: "uppercase",
								letterSpacing: "0.5px",
								marginRight: 4,
							})}
						>
							Modelo:
						</span>
						{Object.entries(PACKS).map(function (entry) {
							var k = entry[0],
								p = entry[1];
							return (
								<button
									key={k}
									onClick={function () { changeFam(k); }}
									style={{
										padding: "6px 14px",
										borderRadius: 20,
										fontFamily: "'Open Sans',sans-serif",
										fontSize: 12,
										fontWeight: family === k ? 700 : 400,
										color: family === k ? WHITE : GRAY,
										background: family === k ? BLUE : WHITE,
										border: "1.5px solid " + (family === k ? BLUE : BORD),
										cursor: "pointer",
									}}
								>
									{k} · {p.label}
								</button>
							);
						})}
					</div>

					{/* Strategy banner */}
					<div
						style={{
							background: BLUEL,
							borderBottom: "1px solid " + BORD,
							padding: "10px 24px",
							display: "flex",
							gap: 12,
							alignItems: "flex-start",
						}}
					>
						<div
							style={Object.assign({}, mont(13), {
								color: BLUE,
								flexShrink: 0,
								marginTop: 1,
							})}
						>
							Estrategia
						</div>
						<div style={os(12, 400, BLACK)}>{cfg.strategy}</div>
					</div>

					{/* KPI strip */}
					<div style={{ padding: "16px 24px 0" }}>
						<div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
							<KpiCard
								label="Revenue / mes"
								value={fD(calcs.revTotal)}
								sub={users.toLocaleString() + " usuarios activos"}
								accent={BLUE}
							/>
							<KpiCard
								label="EBITDA / mes"
								value={fD(calcs.ebitda)}
								sub={"Margen " + fP(calcs.ebitdaPct)}
								accent={ec}
							/>
							<KpiCard
								label="Margen unitario"
								value={fP(calcs.margenPct)}
								sub={fD2(calcs.margenUnit) + " / usuario / mes"}
								accent={mc}
							/>
							<KpiCard
								label="Break-even"
								value={fK(calcs.beUsuarios) + " usu."}
								sub={
									calcs.beMes
										? "Alcanzado en mes " + calcs.beMes
										: "No alcanza en 24M"
								}
								accent={bc}
							/>
							{cfg.arch === "free" && (
								<KpiCard
									label="Costo asumido/mes"
									value={fD(calcs.cvTotal)}
									sub="Sin revenue · costo directo"
									accent={ER}
								/>
							)}
						</div>
					</div>

					{/* Body */}
					<div style={{ display: "flex", gap: 16, padding: "16px 24px", flexWrap: "wrap" }}>
						{/* Left panel */}
						<div
							style={{
								width: "clamp(220px, 22vw, 268px)",
								flexShrink: 0,
								display: "flex",
								flexDirection: "column",
								gap: 12,
							}}
						>
							{/* Pack config */}
							<div
								style={{
									background: WHITE,
									border: "1px solid " + BORD,
									borderRadius: 12,
									padding: 16,
								}}
							>
								<Sec title="Configuración del pack" />
								<PackFields arch={cfg.arch} inp={inp} update={updInp} />
								{cfg.arch === "free" && (
									<div
										style={{
											background: ERBG,
											border: "1px solid " + ER + "44",
											borderRadius: 10,
											padding: "10px 12px",
											marginTop: 8,
										}}
									>
										<div
											style={Object.assign({}, os(10, 700, ER), {
												textTransform: "uppercase",
												letterSpacing: "0.5px",
												marginBottom: 4,
											})}
										>
											Costo asumido / usuario / mes
										</div>
										<div style={Object.assign({}, mont(20), { color: ER })}>
											{fD2(calcs.cvMes)}
										</div>
										<div
											style={Object.assign({}, os(11, 400, ER), {
												marginTop: 3,
												opacity: 0.85,
											})}
										>
											{users.toLocaleString()} usuarios → {fD(calcs.cvTotal)} / mes sin revenue
										</div>
									</div>
								)}
							</div>

							{/* Company vars */}
							<div
								style={{
									background: WHITE,
									border: "1px solid " + BORD,
									borderRadius: 12,
									padding: 16,
								}}
							>
								<Sec title="Variables de la empresa" />
								<NumInput
									label="Usuarios activos / mes"
									value={users}
									onChange={setUsers}
									suffix="usu"
									note="Sin límite · cualquier escala"
								/>
								<NumInput
									label="Firmas comprometidas en cartera"
									value={firmasComp}
									onChange={setFirmasComp}
									suffix="f"
									note="Define el costo de infra activada/firma"
								/>
								<div
									style={{
										background: BLUEL,
										borderRadius: 10,
										padding: "10px 14px",
										marginTop: 4,
									}}
								>
									<div
										style={Object.assign({}, os(10, 700, BLUE), {
											textTransform: "uppercase",
											letterSpacing: "0.5px",
											marginBottom: 6,
										})}
									>
										Costos fijos (lectura)
									</div>
									<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
										<span style={os(11, 400, GRAY)}>CF total empresa</span>
										<span style={Object.assign({}, os(11, 700, BLACK), { fontFamily: "Courier New,monospace" })}>
											{fD(costs.cfTotal)}
										</span>
									</div>
									<div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
										<span style={os(11, 400, GRAY)}>CF segmento (20%)</span>
										<span style={Object.assign({}, os(11, 700, BLUE), { fontFamily: "Courier New,monospace" })}>
											{fD(costs.cfSegmento)}
										</span>
									</div>
									<div style={{ borderTop: "1px solid " + BORD, paddingTop: 6, marginTop: 2 }}>
										<div
											style={Object.assign({}, os(10, 700, BLUE), {
												textTransform: "uppercase",
												letterSpacing: "0.4px",
												marginBottom: 2,
											})}
										>
											Infra activada / firma
										</div>
										<div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
											<div style={Object.assign({}, mont(18), { color: BLUE })}>
												USD {calcs.infraPorFirma.toFixed(2)}
											</div>
											<div style={os(10, 400, BLUE)}>
												{fK(ACTIVOS_TOTAL)} ÷ {fK(firmasComp)}
											</div>
										</div>
										<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>
											CV firma total:{" "}
											<strong style={{ color: BLACK }}>
												USD {calcs.cvFirmaUnit.toFixed(4)}
											</strong>
										</div>
									</div>
								</div>
							</div>

							{/* Optional services */}
							<div
								style={{
									background: WHITE,
									border: "1px solid " + BORD,
									borderRadius: 12,
									padding: 16,
								}}
							>
								<Sec title="Servicios opcionales" />
								{Object.entries(SERVICES_DEF).map(function (entry) {
									var k = entry[0],
										s = entry[1];
									return (
										<Toggle
											key={k}
											label={s.label}
											cost={s.cost}
											costType={s.costType}
											checked={svc[k]}
											onChange={function (v) { updSvc(k, v); }}
										/>
									);
								})}
							</div>
						</div>

						{/* Right panel */}
						<div style={{ flex: "1 1 320px", minWidth: 0 }}>
							<div
								style={{
									background: WHITE,
									border: "1px solid " + BORD,
									borderRadius: "12px 12px 0 0",
									display: "flex",
									overflowX: "auto",
								}}
							>
								{TABS.map(function (t) {
									return (
										<button
											key={t}
											onClick={function () { setTab(t); }}
											style={{
												padding: "12px 18px",
												fontFamily: "'Open Sans',sans-serif",
												fontSize: 13,
												fontWeight: tab === t ? 700 : 400,
												color: tab === t ? BLUE : GRAY,
												background: "transparent",
												border: "none",
												cursor: "pointer",
												whiteSpace: "nowrap",
												borderBottom: "3px solid " + (tab === t ? BLUE : "transparent"),
												textTransform: "capitalize",
											}}
										>
											{t}
										</button>
									);
								})}
							</div>
							<div
								style={{
									background: WHITE,
									border: "1px solid " + BORD,
									borderTop: "none",
									borderRadius: "0 0 12px 12px",
									padding: 20,
								}}
							>
								{tab === "costos" && (
									<TabCostos
										calcs={calcs}
										firmasComp={firmasComp}
										costConfig={costConfig}
										costs={costs}
									/>
								)}
								{tab === "precios" && <TabPrecios calcs={calcs} users={users} costs={costs} />}
								{tab === "proyección" && <TabProyeccion proj={calcs.proj} beMes={calcs.beMes} />}
								{tab === "break-even" && (
									<TabBreakEven
										arch={cfg.arch}
										inp={inp}
										svc={svc}
										firmasComp={firmasComp}
										currentUsers={users}
										costs={costs}
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			{section === "cotizadora" && (
				<div style={{ padding: "24px" }}>
					<Cotizadora costs={costs} />
				</div>
			)}

			{section === "configuración" && (
				<div style={{ padding: "24px" }}>
					<TabConfig costConfig={costConfig} setCostConfig={setCostConfig} />
				</div>
			)}
		</div>
	);
}
