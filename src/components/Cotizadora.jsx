import { useState, useMemo } from "react";
import { BLUE, GRAY, BLACK, WHITE, BORD, BLUEL, OK, WN, ER, os, mont } from "../theme/tokens";
import { fD2, fP, fK } from "../utils/formatters";
import { engine } from "../engine/engine";
import { PACKS } from "../data/packs";

export const FREQ_OPTIONS = [
	{ k: "raro",    label: "Ocasional",  desc: "Menos de 5 firmas al año",       firmasMes: 0.4   },
	{ k: "bajo",    label: "Bajo",       desc: "1–10 firmas por mes",             firmasMes: 5     },
	{ k: "medio",   label: "Regular",    desc: "11–100 firmas por mes",           firmasMes: 50    },
	{ k: "alto",    label: "Intensivo",  desc: "101–1.000 firmas por mes",        firmasMes: 500   },
	{ k: "empresa", label: "Empresa",    desc: "1.001–10.000 firmas por mes",     firmasMes: 5000  },
	{ k: "masivo",  label: "Masivo",     desc: "Más de 10.000 firmas por mes",    firmasMes: 30000 },
];
export const COMP_OPTIONS = [
	{ k: "ninguno", label: "Ninguno", desc: "No necesito servicios extra" },
	{ k: "mail", label: "Mail certificado", desc: "Domicilio legal electrónico" },
	{ k: "cloud", label: "Almacenamiento", desc: "Guarda de documentos firmados en nube" },
];
export const PAY_OPTIONS = [
	{ k: "unico", label: "Pago único", desc: "Prefiero no tener cuota mensual" },
	{ k: "mensual", label: "Mensualidad", desc: "Cuota fija, sin sorpresas" },
	{ k: "anual", label: "Anual", desc: "Pago una vez al año a menor costo" },
	{
		k: "indiferente",
		label: "Indiferente",
		desc: "Me interesa el mejor precio",
	},
];

export function Cotizadora({ costs, currency, tc }) {
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

	const fmtPrice = function (usd) {
		if (currency === "ARS") return "$ " + Math.round(usd * tc).toLocaleString("es-AR");
		return "USD " + usd.toFixed(2);
	};

	return (
		<div>
			<div style={{ marginBottom: 20 }}>
				<div style={Object.assign({}, os(11, 400, GRAY), {})}>
					Respondé las preguntas y el sistema te sugiere el plan más conveniente
					según tu perfil de uso.
				</div>
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
				3 · ¿Cómo vas a pagar?
			</div>
			<Opt
				options={[
					{ k: "transferencia", label: "Transferencia / efectivo", desc: "Sin costo de procesamiento" },
					{ k: "tarjeta", label: "Tarjeta de crédito / débito", desc: "Se suma 0.2% de Paywall" },
				]}
				selected={extra.includes("tarjeta") ? "tarjeta" : "transferencia"}
				onSelect={function (k) {
					setExtra(function (prev) {
						return k === "tarjeta"
							? prev.filter(function (x) { return x !== "transferencia"; }).concat(["tarjeta"])
							: prev.filter(function (x) { return x !== "tarjeta"; });
					});
				}}
			/>

			<div
				style={Object.assign({}, os(11, 700, BLACK), {
					textTransform: "uppercase",
					letterSpacing: "0.5px",
					marginBottom: 8,
					marginTop: 16,
				})}
			>
				4 · ¿Qué servicios adicionales te interesan? (opcional)
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
									mailCert: false,
									paywall: extra.includes("tarjeta"),
								},
								users: 20000,
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
												marginBottom: 2,
											})}
										>
											{r.precio}
										</div>
										{currency === "ARS" && r.inp.precio > 0 && (
											<div style={Object.assign({}, os(12, 700, col), { marginBottom: 4 })}>
												{fmtPrice(r.inp.precio)} {PACKS[r.pack].arch === "anual" ? "/año" : PACKS[r.pack].arch === "bolsa" ? "único" : "/mes"}
											</div>
										)}
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
