import { useState, useMemo } from "react";
import { BLUE, BLUEL, GRAY, BLACK, WHITE, BORD, WN, WNBG, os, mont } from "../theme/tokens";
import { makeMoney } from "../utils/useMoney";
import { PLANS } from "../data/plans";
import { NumInput } from "./ui/NumInput";

const PAYWALL_PCT = 0.002;
const CERT_RATE = 10;
const SETUP_FEE = 50;
const FIRMA_TIERS = [
	{ limit: 100, rate: 0.60 },
	{ limit: 500, rate: 0.45 },
	{ limit: 2000, rate: 0.30 },
	{ limit: Infinity, rate: 0.20 },
];

function firmasTierCost(firmas) {
	let cost = 0, remaining = firmas, prev = 0;
	for (const { limit, rate } of FIRMA_TIERS) {
		if (remaining <= 0) break;
		const qty = Math.min(remaining, limit - prev);
		cost += qty * rate;
		remaining -= qty;
		prev = limit;
	}
	return cost;
}

function computeCustomPrice(firmas, certs, vigencia) {
	const base = SETUP_FEE + certs * CERT_RATE + firmasTierCost(firmas);
	const vigenciaFactor = vigencia === 24 ? 1.0 : (vigencia / 24) * 1.15;
	return Math.round(base * vigenciaFactor * 100) / 100;
}

function findBestPlan(segment, firmas, certs, vigencia) {
	if (vigencia !== 24) return null;
	if (segment === "persona") {
		if (certs > 1) return null;
		return firmas <= 10 ? PLANS.smart : PLANS.profesional;
	}
	if (segment === "empresa") {
		if (certs <= 1 && firmas <= 300) return PLANS.pyme;
		if (certs <= 4 && firmas <= 2000) return PLANS.enterprise;
	}
	return null;
}

function ChoiceBtn({ label, desc, active, onClick }) {
	return (
		<button
			onClick={onClick}
			style={{
				padding: "10px 16px",
				borderRadius: 10,
				textAlign: "left",
				background: active ? BLUE : WHITE,
				border: "1.5px solid " + (active ? BLUE : BORD),
				cursor: "pointer",
				flex: "1 1 140px",
			}}
		>
			<div style={os(13, 700, active ? WHITE : BLACK)}>{label}</div>
			{desc && <div style={os(11, 400, active ? "#c5cbf7" : GRAY)}>{desc}</div>}
		</button>
	);
}

function FieldLabel({ text }) {
	return (
		<div style={Object.assign({}, os(10, 700, GRAY), {
			textTransform: "uppercase",
			letterSpacing: "0.6px",
			marginBottom: 8,
		})}>
			{text}
		</div>
	);
}

function SegmentedControl({ options, value, onChange }) {
	return (
		<div style={{
			display: "inline-flex",
			border: "1.5px solid " + BORD,
			borderRadius: 8,
			overflow: "hidden",
		}}>
			{options.map((opt, i) => (
				<button
					key={opt.k}
					onClick={() => onChange(opt.k)}
					style={{
						padding: "6px 14px",
						background: value === opt.k ? BLUE : WHITE,
						color: value === opt.k ? WHITE : GRAY,
						border: "none",
						borderLeft: i > 0 ? "1px solid " + BORD : "none",
						cursor: "pointer",
						fontFamily: "'Open Sans',sans-serif",
						fontSize: 12,
						fontWeight: 700,
						whiteSpace: "nowrap",
					}}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}

export function CartQuote({ costs, currency, tc }) {
	// Configurator state
	const [segment, setSegment] = useState("persona");
	const [certs, setCerts] = useState(1);
	const [firmaMode, setFirmaMode] = useState("total");
	const [firmasTotal, setFirmasTotal] = useState(10);
	const [firmasPerCert, setFirmasPerCert] = useState(10);
	const [vigencia, setVigencia] = useState(24);
	const [qty, setQty] = useState(1);

	// Order-level state
	const [cart, setCart] = useState([]);
	const [pay, setPay] = useState("transferencia");
	const [addedFlash, setAddedFlash] = useState(false);

	const { fMoney2 } = makeMoney(currency, tc);

	const maxCerts = segment === "persona" ? 1 : 20;
	const effectiveFirmas = firmaMode === "total" ? firmasTotal : certs * firmasPerCert;

	const plan = useMemo(
		() => findBestPlan(segment, effectiveFirmas, certs, vigencia),
		[segment, effectiveFirmas, certs, vigencia]
	);

	const unitPrice = useMemo(
		() => plan ? plan.priceUSD : computeCustomPrice(effectiveFirmas, certs, vigencia),
		[plan, effectiveFirmas, certs, vigencia]
	);

	const ilimitadasThreshold = plan?.ilimitadas
		? (() => {
			const revMes = plan.priceUSD / plan.inp.periodo;
			const available = revMes - costs.cvCertBase / plan.inp.periodo;
			return available > 0 ? Math.floor(available / costs.cvFirmaBase) : 0;
		})()
		: null;

	const col = plan?.color ?? "#64748b";
	const isCustom = !plan;

	function addToCart() {
		setCart(prev => [...prev, {
			id: Date.now(),
			planLabel: plan?.label ?? "Plan a medida",
			col: plan?.color ?? "#64748b",
			isCustom,
			certs,
			effectiveFirmas,
			vigencia,
			qty,
			unitPrice,
		}]);
		setAddedFlash(true);
		setTimeout(() => setAddedFlash(false), 1400);
	}

	function removeFromCart(id) {
		setCart(prev => prev.filter(item => item.id !== id));
	}

	const cartSubtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
	const cartPaywall = pay === "tarjeta" ? cartSubtotal * PAYWALL_PCT : 0;
	const cartTotal = cartSubtotal + cartPaywall;

	const PAY_OPTS = [
		{ k: "transferencia", label: "Transferencia" },
		{ k: "tarjeta", label: "Tarjeta · +0.2%" },
	];

	return (
		<div>
			<div style={{ display: "flex", gap: 20, alignItems: "start", flexWrap: "wrap" }}>

				{/* ─── Configurator ──────────────────────────────────────────────────────── */}
				<div style={{
					background: WHITE,
					border: "1px solid " + BORD,
					borderRadius: 14,
					padding: 20,
					display: "flex",
					flexDirection: "column",
					gap: 20,
					flex: "0 0 300px",
					minWidth: 280,
				}}>
					<div style={Object.assign({}, mont(15), { color: BLACK })}>Configurá tu pack</div>

					{/* Segment */}
					<div>
						<FieldLabel text="¿Quién firma?" />
						<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
							<ChoiceBtn
								label="Persona / Profesional"
								desc="Uso individual"
								active={segment === "persona"}
								onClick={() => { setSegment("persona"); setCerts(1); }}
							/>
							<ChoiceBtn
								label="Empresa / Organización"
								desc="Múltiples firmantes"
								active={segment === "empresa"}
								onClick={() => setSegment("empresa")}
							/>
						</div>
					</div>

					{/* Certs */}
					<div>
						<FieldLabel text={"Certificados" + (maxCerts === 1 ? " (máx. 1 en planes Persona)" : "")} />
						<NumInput
							value={certs}
							onChange={v => setCerts(Math.max(1, Math.min(v, maxCerts)))}
							suffix="cert"
						/>
						{certs > 1 && segment === "persona" && (
							<div style={Object.assign({}, os(10, 400, WN), { marginTop: 4 })}>
								Los planes Persona incluyen 1 certificado. Para múltiples firmantes, elegí Empresa.
							</div>
						)}
					</div>

					{/* Firmas */}
					<div>
						<FieldLabel text="Firmas digitales" />
						<div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
							{["total", "perCert"].map(m => (
								<button
									key={m}
									onClick={() => setFirmaMode(m)}
									style={{
										padding: "4px 12px",
										borderRadius: 20,
										border: "1.5px solid " + (firmaMode === m ? BLUE : BORD),
										background: firmaMode === m ? BLUEL : WHITE,
										color: firmaMode === m ? BLUE : GRAY,
										fontFamily: "'Open Sans',sans-serif",
										fontSize: 11,
										fontWeight: 700,
										cursor: "pointer",
									}}
								>
									{m === "total" ? "Total" : "Por certificado"}
								</button>
							))}
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
							{[24, 12].map(v => (
								<button
									key={v}
									onClick={() => setVigencia(v)}
									style={{
										padding: "8px 0",
										borderRadius: 8,
										border: "1.5px solid " + (vigencia === v ? BLUE : BORD),
										background: vigencia === v ? BLUE : WHITE,
										color: vigencia === v ? WHITE : GRAY,
										fontFamily: "'Open Sans',sans-serif",
										fontSize: 13,
										fontWeight: 700,
										cursor: "pointer",
										flex: 1,
									}}
								>
									{v} meses
								</button>
							))}
						</div>
						{vigencia !== 24 && (
							<div style={Object.assign({}, os(10, 400, WN), { marginTop: 6 })}>
								Los planes estándar son a 24 meses. Se generará una cotización personalizada.
							</div>
						)}
					</div>

					{/* Qty */}
					<div>
						<FieldLabel text="Cantidad de packs" />
						<NumInput value={qty} onChange={v => setQty(Math.max(1, v))} suffix="pack(s)" />
					</div>
				</div>

				{/* ─── Result ─────────────────────────────────────────────────────────────── */}
				<div style={{
					flex: "1 1 300px",
					minWidth: 0,
					background: WHITE,
					border: "2px solid " + col,
					borderRadius: 14,
					overflow: "hidden",
				}}>
					{/* Header */}
					<div style={{ background: col, padding: "18px 20px" }}>
						{isCustom ? (
							<>
								<div style={Object.assign({}, os(10, 700, WHITE), {
									opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6,
								})}>
									Cotización personalizada
								</div>
								<div style={Object.assign({}, mont(20), { color: WHITE })}>Plan a medida</div>
								<div style={Object.assign({}, os(12, 400, WHITE), { opacity: 0.85, marginTop: 4 })}>
									Tu configuración no coincide con un plan estándar. Armamos un precio estimado para vos.
								</div>
							</>
						) : (
							<>
								<div style={Object.assign({}, os(10, 700, WHITE), {
									opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6,
								})}>
									✓ Plan recomendado
								</div>
								<div style={Object.assign({}, mont(20), { color: WHITE })}>{plan.label}</div>
								<div style={Object.assign({}, os(12, 400, WHITE), { opacity: 0.85, marginTop: 4 })}>{plan.tagline}</div>
							</>
						)}
					</div>

					{/* Unit price */}
					<div style={{ padding: "16px 20px", borderBottom: "1px solid " + BORD }}>
						<div style={os(10, 400, GRAY)}>Precio por pack</div>
						<div style={Object.assign({}, mont(32), { color: col, lineHeight: 1.1, marginTop: 4 })}>
							{fMoney2(unitPrice)}
						</div>
						{currency === "USD" && (
							<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>
								{"≈ $ " + Math.round(unitPrice * tc).toLocaleString("es-AR") + " ARS"}
							</div>
						)}
						{currency === "ARS" && (
							<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>
								{"USD " + unitPrice}
							</div>
						)}
						<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 4 })}>
							{isCustom
								? "Vigencia " + vigencia + " meses · Estimado sujeto a confirmación"
								: plan.priceNote}
						</div>
					</div>

					{/* Benefits / breakdown */}
					<div style={{ padding: "16px 20px", borderBottom: "1px solid " + BORD }}>
						<div style={Object.assign({}, os(10, 700, GRAY), {
							textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10,
						})}>
							{isCustom ? "Composición del precio" : "Qué incluye"}
						</div>

						{isCustom ? (
							<div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
								{[
									{ label: "Setup y plataforma", value: fMoney2(SETUP_FEE) },
									{
										label: certs + (certs === 1 ? " certificado digital" : " certificados digitales"),
										value: fMoney2(certs * CERT_RATE),
									},
									{
										label: effectiveFirmas.toLocaleString("es-AR") + " firmas (precio por tramo)",
										value: fMoney2(firmasTierCost(effectiveFirmas)),
									},
									...(vigencia !== 24 ? [{ label: "Ajuste vigencia (" + vigencia + " meses)", value: "" }] : []),
								].map((row, i) => (
									<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
										<span style={os(12, 400, BLACK)}>{row.label}</span>
										{row.value && <span style={os(12, 700, col)}>{row.value}</span>}
									</div>
								))}
								<div style={{ borderTop: "1px solid " + BORD, paddingTop: 8, marginTop: 2 }}>
									<div style={os(9, 400, GRAY)}>
										Precio por firma según tramo: ≤100: USD 0.60 · 101–500: USD 0.45 · 501–2000: USD 0.30 · 2001+: USD 0.20
									</div>
								</div>
							</div>
						) : (
							<div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
								{plan.benefits.map((b, i) => (
									<div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
										<span style={Object.assign({}, os(13, 700, col), { flexShrink: 0, lineHeight: "18px" })}>✓</span>
										<span style={Object.assign({}, os(12, i === 0 ? 700 : 400, i === 0 ? col : BLACK), { lineHeight: "18px" })}>
											{b}
										</span>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Ilimitadas risk warning */}
					{ilimitadasThreshold !== null && (
						<div style={{ padding: "10px 20px", background: WNBG, borderBottom: "1px solid " + BORD }}>
							<div style={Object.assign({}, os(11, 700, WN), { marginBottom: 2 })}>
								⚠ Rentable hasta {ilimitadasThreshold} firmas / mes
							</div>
							<div style={os(10, 400, WN)}>
								Por encima de ese umbral el costo variable supera el ingreso del pack.
							</div>
						</div>
					)}

					{/* Qty summary */}
					{qty > 1 && (
						<div style={{ padding: "12px 20px", background: "#fafafa", borderBottom: "1px solid " + BORD }}>
							<div style={{ display: "flex", justifyContent: "space-between" }}>
								<span style={os(12, 400, GRAY)}>{qty} pack(s) × {fMoney2(unitPrice)}</span>
								<span style={os(12, 700, BLACK)}>{fMoney2(unitPrice * qty)}</span>
							</div>
						</div>
					)}

					{/* Add to cart CTA */}
					<div style={{ padding: "16px 20px" }}>
						<button
							onClick={addToCart}
							style={{
								width: "100%",
								padding: "13px",
								background: addedFlash ? "#059669" : col,
								color: WHITE,
								border: "none",
								borderRadius: 10,
								fontFamily: "'Open Sans',sans-serif",
								fontSize: 14,
								fontWeight: 700,
								cursor: "pointer",
								letterSpacing: "0.3px",
								transition: "background 0.2s",
							}}
						>
							{addedFlash ? "✓ Agregado al carrito" : "+ Agregar al carrito"}
						</button>
						{isCustom && (
							<div style={Object.assign({}, os(10, 400, GRAY), { textAlign: "center", marginTop: 8 })}>
								Precio estimado · El equipo de Lakaut confirmará la cotización final.
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ─── Cart ───────────────────────────────────────────────────────────────── */}
			{cart.length > 0 && (
				<div style={{
					marginTop: 24,
					background: WHITE,
					border: "1px solid " + BORD,
					borderRadius: 14,
					overflow: "hidden",
				}}>
					{/* Cart header */}
					<div style={{
						padding: "14px 20px",
						borderBottom: "1px solid " + BORD,
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}>
						<div style={Object.assign({}, mont(14), { color: BLACK })}>
							Cotización · {cart.length} {cart.length === 1 ? "ítem" : "ítems"}
						</div>
						<button
							onClick={() => setCart([])}
							style={{
								background: "none",
								border: "none",
								cursor: "pointer",
								fontFamily: "'Open Sans',sans-serif",
								fontSize: 12,
								color: GRAY,
								padding: "4px 8px",
							}}
						>
							Vaciar
						</button>
					</div>

					{/* Cart items */}
					<div>
						{cart.map((item, idx) => (
							<div
								key={item.id}
								style={{
									padding: "14px 20px",
									borderBottom: "1px solid " + BORD,
									display: "flex",
									alignItems: "center",
									gap: 14,
									background: idx % 2 === 1 ? "#fafafa" : WHITE,
								}}
							>
								{/* Color tag */}
								<div style={{
									width: 4,
									alignSelf: "stretch",
									borderRadius: 4,
									background: item.col,
									flexShrink: 0,
								}} />

								{/* Plan info */}
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={os(13, 700, BLACK)}>{item.planLabel}</div>
									<div style={Object.assign({}, os(11, 400, GRAY), { marginTop: 2 })}>
										{item.certs} cert · {item.effectiveFirmas.toLocaleString("es-AR")} firmas · {item.vigencia}m
										{item.isCustom && (
											<span style={{
												marginLeft: 6,
												background: "#f1f5f9",
												color: GRAY,
												fontSize: 9,
												fontWeight: 700,
												padding: "1px 6px",
												borderRadius: 10,
												textTransform: "uppercase",
												letterSpacing: "0.5px",
											}}>
												a medida
											</span>
										)}
									</div>
								</div>

								{/* Qty × price */}
								<div style={{ textAlign: "right", flexShrink: 0 }}>
									<div style={os(13, 700, item.col)}>{fMoney2(item.unitPrice * item.qty)}</div>
									{item.qty > 1 && (
										<div style={os(10, 400, GRAY)}>{item.qty} × {fMoney2(item.unitPrice)}</div>
									)}
								</div>

								{/* Remove */}
								<button
									onClick={() => removeFromCart(item.id)}
									style={{
										background: "none",
										border: "1px solid " + BORD,
										borderRadius: 6,
										cursor: "pointer",
										color: GRAY,
										fontFamily: "'Open Sans',sans-serif",
										fontSize: 13,
										fontWeight: 700,
										padding: "3px 8px",
										flexShrink: 0,
									}}
								>
									×
								</button>
							</div>
						))}
					</div>

					{/* Cart footer */}
					<div style={{ padding: "16px 20px" }}>
						<div style={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							flexWrap: "wrap",
							gap: 12,
						}}>
							{/* Payment method */}
							<div style={{ display: "flex", alignItems: "center", gap: 10 }}>
								<span style={os(11, 700, GRAY)}>Pago:</span>
								<SegmentedControl options={PAY_OPTS} value={pay} onChange={setPay} />
							</div>

							{/* Total */}
							<div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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
									{currency === "USD" && (
										<div style={os(10, 400, GRAY)}>
											{"≈ $ " + Math.round(cartTotal * tc).toLocaleString("es-AR") + " ARS"}
										</div>
									)}
								</div>
								<button
									style={{
										padding: "12px 24px",
										background: BLUE,
										color: WHITE,
										border: "none",
										borderRadius: 10,
										fontFamily: "'Open Sans',sans-serif",
										fontSize: 13,
										fontWeight: 700,
										cursor: "pointer",
										whiteSpace: "nowrap",
									}}
								>
									Solicitar cotización
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
