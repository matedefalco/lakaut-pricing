import { useState, useMemo } from "react";
import { BLUE, GRAY, BLACK, WHITE, BORD, BLUEL, OK, WN, ER, os, mont } from "../theme/tokens";
import { fP, fK } from "../utils/formatters";
import { makeMoney } from "../utils/useMoney";
import { engine } from "../engine/engine";

// ─── Plan definitions ──────────────────────────────────────────────────────────
const PLANS = {
	smart: {
		id: "smart",
		label: "SMART",
		segment: "persona",
		color: BLUE,
		recommended: false,
		tagline: "Ideal para personas que firman contratos o trámites de manera ocasional",
		priceUSD: 34,
		priceNote: "Pago único · vigencia 2 años",
		firmas: 10,
		ilimitadas: false,
		benefits: [
			"10 firmas digitales",
			"Vigencia 2 años",
			"Certificado digital personal bonificado",
			"Firmador de documentos",
			"Soporte vía mail (hasta 24 hs)",
			"Firmas adicionales disponibles",
		],
		cta: "Contratar SMART",
		inp: { precio: 34, firmas: 10, periodo: 24 },
	},
	profesional: {
		id: "profesional",
		label: "PROFESIONAL",
		segment: "persona",
		color: "#0891b2",
		recommended: false,
		tagline: "Pensado para profesionales que firman documentos con mayor frecuencia",
		priceUSD: 200,
		priceNote: "Pago único · vigencia 2 años",
		firmas: null,
		ilimitadas: true,
		benefits: [
			"Firmas digitales ilimitadas",
			"Vigencia 2 años",
			"Certificado digital personal bonificado",
			"Firmador e historial de documentos",
			"Soporte prioritario vía mail",
			"Firmas adicionales disponibles",
		],
		cta: "Contratar PROFESIONAL",
		inp: { precio: 200, firmas: 240, periodo: 24 },
	},
	pyme: {
		id: "pyme",
		label: "PyME",
		segment: "empresa",
		color: "#7c3aed",
		recommended: false,
		tagline: "Para empresas que comienzan a digitalizar sus procesos de firma",
		priceUSD: 300,
		priceNote: "Pago único · vigencia 2 años",
		firmas: 300,
		ilimitadas: false,
		admins: 1,
		certs: 1,
		benefits: [
			"1 Administrador empresa",
			"1 certificado digital bonificado",
			"300 firmas digitales",
			"Vigencia 2 años",
			"Panel de control y trazabilidad de documentos",
			"Soporte mail/chat (hasta 24 hs)",
			"Firmas adicionales disponibles",
		],
		cta: "Contratar PyME",
		inp: { precio: 300, firmas: 300, periodo: 24 },
	},
	enterprise: {
		id: "enterprise",
		label: "ENTERPRISE",
		segment: "empresa",
		color: "#b45309",
		recommended: true,
		tagline: "Para organizaciones con mayor volumen de documentos y múltiples áreas firmantes",
		priceUSD: 600,
		priceNote: "Pago único · vigencia 2 años",
		firmas: 2000,
		ilimitadas: false,
		admins: 1,
		certs: "3 a 5",
		benefits: [
			"1 Administrador empresa",
			"De 3 a 5 certificados digitales bonificados",
			"2.000 firmas digitales",
			"Vigencia 2 años",
			"Gestión avanzada de usuarios y roles",
			"Panel de control y trazabilidad de documentos",
			"Soporte prioritario mail/chat",
			"Firmas adicionales disponibles",
		],
		cta: "Contratar ENTERPRISE",
		inp: { precio: 600, firmas: 2000, periodo: 24 },
	},
};

// ─── Questionnaire options ─────────────────────────────────────────────────────
const PROFILE_OPTS = [
	{ k: "persona", label: "Persona o profesional", desc: "Quiero firmar trámites, contratos o documentos propios" },
	{ k: "empresa", label: "Empresa u organización", desc: "Necesito gestionar firmas de múltiples usuarios" },
];
const FREQ_OPTS = [
	{ k: "ocasional", label: "Ocasional", desc: "Menos de 10 firmas durante 2 años" },
	{ k: "frecuente", label: "Frecuente / profesional", desc: "Firmo habitualmente, sin límite claro" },
];
const SIZE_OPTS = [
	{ k: "chica", label: "1 firmante", desc: "Un usuario que firma + panel de administración" },
	{ k: "mediana", label: "2 a 5 firmantes", desc: "Múltiples personas con certificados propios" },
];
const PAY_OPTS = [
	{ k: "transferencia", label: "Transferencia / efectivo", desc: "Sin costo adicional de procesamiento" },
	{ k: "tarjeta", label: "Tarjeta de crédito / débito", desc: "Se agrega 0.2% de Paywall" },
];

function getRecommendations(profile, detail) {
	if (profile === "persona") {
		return detail === "ocasional"
			? [PLANS.smart, PLANS.profesional]
			: [PLANS.profesional, PLANS.smart];
	}
	if (profile === "empresa") {
		return detail === "chica"
			? [PLANS.pyme, PLANS.enterprise]
			: [PLANS.enterprise, PLANS.pyme];
	}
	return [];
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function Cotizadora({ costs, currency, tc }) {
	const [profile, setProfile] = useState(null);
	const [detail, setDetail] = useState(null);
	const [payMethod, setPayMethod] = useState("transferencia");

	const { fMoney2 } = makeMoney(currency, tc);

	const recommendations = useMemo(function () {
		if (!profile || !detail) return [];
		return getRecommendations(profile, detail);
	}, [profile, detail]);

	function handleProfileChange(k) {
		setProfile(k);
		setDetail(null);
	}

	const Opt = function ({ options, selected, onSelect }) {
		return (
			<div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
				{options.map(function (o) {
					const act = selected === o.k;
					return (
						<button
							key={o.k}
							onClick={function () { onSelect(o.k); }}
							style={{
								padding: "10px 16px",
								borderRadius: 10,
								textAlign: "left",
								background: act ? BLUE : WHITE,
								border: "1.5px solid " + (act ? BLUE : BORD),
								cursor: "pointer",
								minWidth: 180,
							}}
						>
							<div style={os(13, 700, act ? WHITE : BLACK)}>{o.label}</div>
							<div style={os(11, 400, act ? "#c5cbf7" : GRAY)}>{o.desc}</div>
						</button>
					);
				})}
			</div>
		);
	};

	const PlanCard = function ({ plan, isFirst }) {
		const svc = { cloudStorage: false, mailCert: false, paywall: payMethod === "tarjeta" };
		const c = engine({ arch: "bolsa", inp: plan.inp, svc, users: 1000, costs });
		const col = plan.color;
		return (
			<div
				style={{
					background: WHITE,
					border: "2px solid " + col,
					borderRadius: 14,
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
					opacity: isFirst ? 1 : 0.75,
				}}
			>
				{/* Header */}
				<div style={{ background: col, padding: "14px 18px", position: "relative" }}>
					{plan.recommended && (
						<div
							style={Object.assign({}, os(10, 700, col), {
								background: "#fef3c7",
								padding: "2px 8px",
								borderRadius: 20,
								display: "inline-block",
								marginBottom: 6,
							})}
						>
							⭐ Recomendado
						</div>
					)}
					{isFirst && !plan.recommended && (
						<div
							style={Object.assign({}, os(10, 700, col), {
								background: WHITE,
								padding: "2px 8px",
								borderRadius: 20,
								display: "inline-block",
								marginBottom: 6,
							})}
						>
							✦ Mejor opción para tu perfil
						</div>
					)}
					<div style={Object.assign({}, mont(20), { color: WHITE })}>{plan.label}</div>
					<div style={Object.assign({}, os(12, 400, WHITE), { opacity: 0.85, marginTop: 3 })}>
						{plan.tagline}
					</div>
				</div>

				{/* Price */}
				<div style={{ padding: "14px 18px", borderBottom: "1px solid " + BORD }}>
					<div style={Object.assign({}, mont(28), { color: col, lineHeight: 1 })}>
						{fMoney2(plan.priceUSD)}
					</div>
					{currency === "USD" && (
						<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>
							{"$ " + plan.priceUSD * tc + " ARS"}
						</div>
					)}
					{currency === "ARS" && (
						<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>
							{"USD " + plan.priceUSD}
						</div>
					)}
					<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 4 })}>
						{plan.priceNote}
						{payMethod === "tarjeta" ? " · +0.2% Paywall" : ""}
					</div>
				</div>

				{/* Benefits */}
				<div style={{ padding: "14px 18px", flex: 1 }}>
					{plan.benefits.map(function (b, i) {
						const isSignature = i === 0;
						return (
							<div
								key={i}
								style={{
									display: "flex",
									alignItems: "flex-start",
									gap: 8,
									marginBottom: 7,
								}}
							>
								<span style={Object.assign({}, os(13, 700, col), { flexShrink: 0, lineHeight: "18px" })}>
									✓
								</span>
								<span style={Object.assign({}, os(12, isSignature ? 700 : 400, isSignature ? col : BLACK), { lineHeight: "18px" })}>
									{b}
								</span>
							</div>
						);
					})}
				</div>

				{/* Internal metrics */}
				<div
					style={{
						borderTop: "1px solid " + BORD,
						padding: "10px 18px",
						background: "#fafafa",
					}}
				>
					<div style={Object.assign({}, os(9, 700, GRAY), { textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 })}>
						Análisis interno
					</div>
					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
						{[
							{ l: "Margen", v: fP(c.margenPct), col: c.margenPct > 30 ? OK : c.margenPct > 0 ? WN : ER },
							{ l: "BE usuarios", v: isFinite(c.beUsuarios) ? fK(c.beUsuarios) + " usu." : "∞", col: isFinite(c.beUsuarios) ? OK : WN },
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

				{/* CTA */}
				<button
					style={{
						margin: "0 18px 16px",
						padding: "10px",
						background: isFirst ? col : WHITE,
						color: isFirst ? WHITE : col,
						border: "2px solid " + col,
						borderRadius: 8,
						fontFamily: "'Open Sans',sans-serif",
						fontSize: 13,
						fontWeight: 700,
						cursor: "pointer",
					}}
				>
					{plan.cta}
				</button>
			</div>
		);
	};

	const QLabel = function ({ n, text }) {
		return (
			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: 8,
				})}
			>
				{n} · {text}
			</div>
		);
	};

	return (
		<div>
			<div style={Object.assign({}, os(12, 400, GRAY), { marginBottom: 20 })}>
				Respondé las preguntas y te mostramos los planes más adecuados para tu perfil.
			</div>

			<QLabel n="1" text="¿Quién necesita la firma digital?" />
			<Opt options={PROFILE_OPTS} selected={profile} onSelect={handleProfileChange} />

			{profile === "persona" && (
				<>
					<QLabel n="2" text="¿Con qué frecuencia firmás documentos?" />
					<Opt options={FREQ_OPTS} selected={detail} onSelect={setDetail} />
				</>
			)}
			{profile === "empresa" && (
				<>
					<QLabel n="2" text="¿Cuántas personas necesitarán firmar?" />
					<Opt options={SIZE_OPTS} selected={detail} onSelect={setDetail} />
				</>
			)}

			{profile && detail && (
				<>
					<QLabel n="3" text="¿Cómo vas a pagar?" />
					<Opt options={PAY_OPTS} selected={payMethod} onSelect={setPayMethod} />
				</>
			)}

			{recommendations.length > 0 && (
				<div>
					<div
						style={Object.assign({}, os(11, 700, BLACK), {
							textTransform: "uppercase",
							letterSpacing: "0.5px",
							margin: "20px 0 12px",
						})}
					>
						Planes para tu perfil
					</div>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
							gap: 14,
							alignItems: "start",
						}}
					>
						{recommendations.map(function (plan, i) {
							return <PlanCard key={plan.id} plan={plan} isFirst={i === 0} />;
						})}
					</div>
				</div>
			)}

			{(!profile || !detail) && (
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
						Completá las preguntas para ver los planes disponibles.
					</div>
				</div>
			)}
		</div>
	);
}
