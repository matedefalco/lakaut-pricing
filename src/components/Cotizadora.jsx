import { useState, useMemo } from "react";
import { BLUE, GRAY, BLACK, WHITE, BORD, BLUEL, OK, WN, WNBG, ER, os, mont } from "../theme/tokens";
import { fP, fK } from "../utils/formatters";
import { makeMoney } from "../utils/useMoney";
import { engine } from "../engine/engine";
import { useModels } from "../context/ModelsContext";

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

function getRecommendations(profile, detail, models) {
	const byId = function (id) { return models.find(function (m) { return m.id === id; }); };
	if (profile === "persona") {
		const smart = byId("smart"), prof = byId("profesional");
		const personaModels = models.filter(function (m) { return m.segment === "persona"; });
		return detail === "ocasional"
			? (smart && prof ? [smart, prof] : personaModels.slice(0, 2))
			: (prof && smart ? [prof, smart] : personaModels.slice(0, 2).reverse());
	}
	if (profile === "empresa") {
		const pyme = byId("pyme"), ent = byId("enterprise");
		const empresaModels = models.filter(function (m) { return m.segment === "empresa"; });
		return detail === "chica"
			? (pyme && ent ? [pyme, ent] : empresaModels.slice(0, 2))
			: (ent && pyme ? [ent, pyme] : empresaModels.slice(0, 2).reverse());
	}
	return [];
}

// ─── Component ─────────────────────────────────────────────────────────────────
export function Cotizadora({ costs, currency, tc }) {
	const { models } = useModels();
	const [profile, setProfile] = useState(null);
	const [detail, setDetail] = useState(null);
	const [payMethod, setPayMethod] = useState("transferencia");

	const { fMoney2 } = makeMoney(currency, tc);

	const recommendations = useMemo(function () {
		if (!profile || !detail) return [];
		return getRecommendations(profile, detail, models);
	}, [profile, detail, models]);

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
		const periodo = plan.vigencia || plan.billingPeriod || 24;
		const inp = plan.inp || { precio: plan.priceUSD, firmas: plan.firmas || 0, periodo };
		const c = engine({ arch: plan.arch || "bolsa", inp, svc, users: 1000, costs });
		const col = plan.color;

		// Compute ilimitadas risk threshold dynamically from current costs
		const ilimitadasThreshold = plan.ilimitadas
			? (function () {
				const revMes = plan.priceUSD / periodo;
				const certCostMes = costs.cvCertBase / periodo;
				const avail = revMes - certCostMes;
				return avail > 0 ? Math.floor(avail / costs.cvFirmaBase) : 0;
			})()
			: null;

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
							{"$ " + (plan.priceUSD * tc).toLocaleString("es-AR") + " ARS"}
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

				{/* Risk warning for ilimitadas plans */}
				{ilimitadasThreshold !== null && (
					<div style={{ padding: "10px 18px", background: WNBG, borderBottom: "1px solid " + BORD }}>
						<div style={Object.assign({}, os(11, 700, WN), { marginBottom: 2 })}>
							⚠ Rentable hasta {ilimitadasThreshold} firmas / mes
						</div>
						<div style={os(10, 400, WN)}>
							Por encima de ese umbral el costo variable supera el ingreso del pack.
						</div>
					</div>
				)}

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
