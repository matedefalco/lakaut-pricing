import { useState, useMemo } from "react";
import { Plus, X } from "lucide-react";
import { makeMoney } from "@/utils/useMoney";
import { useChannelConfig } from "@/context/ChannelConfigContext";
import { useModels } from "@/context/ModelsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/PageHeader";
import { TierBadge } from "@/components/ui/TierBadge";
import { CHANNELS as CHANNEL_IDENTITY } from "@/data/channelMeta";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from "recharts";

// ── Constants ───────────────────────────────────────────────────────────────

const CHANNELS = ["b2b2c", "distribuidores", "web"];

const CHANNEL_META = {
	b2b2c:          { label: "Volumen",              emoji: CHANNEL_IDENTITY.b2b2c.emoji, color: CHANNEL_IDENTITY.b2b2c.color },
	distribuidores: { label: "Packs con descuento",  emoji: CHANNEL_IDENTITY.packs.emoji, color: CHANNEL_IDENTITY.packs.color },
	web:            { label: "Packs a lista",        emoji: CHANNEL_IDENTITY.packs.emoji, color: "#0891b2" },
};

const SCENARIO_LABELS = ["A","B","C","D","E","F"];

let _nextId = 1;
function nextId() { return _nextId++; }

// ── Helpers ─────────────────────────────────────────────────────────────────

// Volumen: un solo segmento, por el compromiso en USD a precio de lista. En la
// comparación no hay duración de contrato, así que el compromiso es la facturación
// a lista del volumen comparado. Ver [[modelo-canales-borrador-v5]].
function getB2B2CSeg(compromisoUSD, segs) {
	return segs.find(function (s) {
		return compromisoUSD >= (Number(s.compromisoMin) || 0) && (s.compromisoMax == null || compromisoUSD <= s.compromisoMax);
	}) || segs[0];
}

function getDistribTier(certs, facturacion, tiers) {
	function byCerts(c) { return tiers.find(function (t) { return c >= t.certsMin && (t.certsMax === null || c <= t.certsMax); }) || tiers[0]; }
	function byVol(u)   { return tiers.find(function (t) { return u >= t.compromisoMin && (t.compromisoMax === null || u <= t.compromisoMax); }) || tiers[0]; }
	const a = byCerts(certs || 0);
	const b = byVol(facturacion || 0);
	return tiers.indexOf(a) >= tiers.indexOf(b) ? a : b;
}

function closestPack(certs, packs) {
	return packs.reduce(function (best, p) {
		if (!best) return p;
		return Math.abs(p.certs - certs) < Math.abs(best.certs - certs) ? p : best;
	}, null);
}

function computeChannels(certs, firmasPorCert, channelConfig, packs, refPackId, costs) {
	const { b2b2cSegments, distributorTiers } = channelConfig;
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	const firmasTotal = certs * firmasPorCert;
	const cvTotal = certs * cvCert + firmasTotal * cvFirma;

	// ── B2B2C (Volumen) ──────────────────────────────────────────────────
	// El segmento sale de la facturación a lista de certificados + firmas, y su
	// descuento se aplica por igual a los dos precios base.
	const base = channelConfig.b2b2cBase || { cert: 0, firma: 0 };
	const facturacionB2Lista = certs * (Number(base.cert) || 0) + firmasTotal * (Number(base.firma) || 0);
	const seg = getB2B2CSeg(facturacionB2Lista, b2b2cSegments);
	const segDesc = Math.min(1, Math.max(0, Number(seg.descuento) || 0));
	const precioCertB2 = (Number(base.cert) || 0) * (1 - segDesc);
	const precioFirmaB2 = (Number(base.firma) || 0) * (1 - segDesc);
	const revB2 = certs * precioCertB2 + firmasTotal * precioFirmaB2;
	const margenB2 = revB2 - cvTotal;

	// ── Distribuidores / Web ──────────────────────────────────────────────
	const activePacks = packs.filter(function (p) { return p.activo !== false && p.priceUSD > 0 && (p.certs || 0) > 0; });
	const refPack = activePacks.find(function (p) { return p.id === refPackId; }) || closestPack(certs, activePacks);

	const precioCertLista = refPack ? refPack.priceUSD / refPack.certs : 0;
	const facturacionLista = certs * precioCertLista;

	const tier = getDistribTier(certs, facturacionLista, distributorTiers);
	const netoDistrib = facturacionLista * (1 - tier.descuento);
	const margenDistrib = netoDistrib - cvTotal;

	const netoWeb = facturacionLista;
	const margenWeb = netoWeb - cvTotal;

	return {
		refPack,
		firmasTotal,
		cvTotal,
		b2b2c: {
			precioPorCert:  precioCertB2,
			precioPorFirma: precioFirmaB2,
			revLista:       facturacionB2Lista,
			revenueNeto:    revB2,
			descuento:      segDesc > 0 ? segDesc : null,
			cvTotal,
			margen:         margenB2,
			margenPct:      revB2 > 0 ? margenB2 / revB2 : 0,
			segOrTier:      seg.label,
		},
		distribuidores: {
			precioPorCert:  precioCertLista,
			precioPorFirma: firmasPorCert > 0 ? precioCertLista / firmasPorCert : null,
			revLista:       facturacionLista,
			revenueNeto:    netoDistrib,
			descuento:      tier.descuento,
			cvTotal,
			margen:         margenDistrib,
			margenPct:      netoDistrib > 0 ? margenDistrib / netoDistrib : 0,
			segOrTier:      tier.label,
		},
		web: {
			precioPorCert:  precioCertLista,
			precioPorFirma: firmasPorCert > 0 ? precioCertLista / firmasPorCert : null,
			revLista:       facturacionLista,
			revenueNeto:    netoWeb,
			descuento:      0,
			cvTotal,
			margen:         margenWeb,
			margenPct:      netoWeb > 0 ? margenWeb / netoWeb : 0,
			segOrTier:      "—",
		},
	};
}

// ── Metric definitions ───────────────────────────────────────────────────────

function buildMetrics(r, fMoney, fMoney2) {
	function best(key, higherIsBetter) {
		const vals = CHANNELS.map(function (ch) { return r[ch][key]; }).filter(function (v) { return v !== null && isFinite(v); });
		if (vals.length === 0) return null;
		return higherIsBetter ? Math.max(...vals) : Math.min(...vals);
	}

	function row(label, key, format, higherIsBetter, render) {
		const bestVal = best(key, higherIsBetter);
		return {
			label,
			cells: CHANNELS.map(function (ch) {
				const v = render ? render(ch, r) : r[ch][key];
				const isBest = higherIsBetter !== null && v !== null && isFinite(v) && v === bestVal;
				const formatted = v === null || !isFinite(v) ? "—" : format(v);
				return { v, formatted, isBest };
			}),
		};
	}

	return [
		{ isHeader: true, label: "Pricing por canal" },
		row("Precio / cert (lista)",  "precioPorCert",  fMoney2, false),
		row("Precio / firma incl.",   "precioPorFirma", fMoney2, false, function (ch, r) { return r[ch].precioPorFirma; }),
		row("Revenue lista",          "revLista",       fMoney,  null),
		{
			label: "Descuento canal",
			cells: CHANNELS.map(function (ch) {
				const v = r[ch].descuento;
				const formatted = v === null ? "—" : v === 0 ? "0%" : (v * 100).toFixed(0) + "%";
				return { v, formatted, isBest: false };
			}),
		},
		row("Revenue neto Lakaut",    "revenueNeto",    fMoney,  true),

		{ isHeader: true, label: "Costos y margen" },
		row("Costo variable",         "cvTotal",        fMoney,  false),
		row("Margen $",               "margen",         fMoney,  true),
		{
			label: "Margen %",
			cells: (function () {
				const vals = CHANNELS.map(function (ch) { return r[ch].margenPct; });
				const bestV = Math.max(...vals.filter(isFinite));
				return CHANNELS.map(function (ch) {
					const v = r[ch].margenPct;
					return { v, formatted: (v * 100).toFixed(1) + "%", isBest: isFinite(v) && v === bestV };
				});
			})(),
		},

		{ isHeader: true, label: "Segmento / Tier asignado" },
		{
			label: "Nivel",
			cells: CHANNELS.map(function (ch) {
				const t = r[ch].segOrTier;
				return { v: null, formatted: t && t !== "—" ? <TierBadge tier={t} size="sm" /> : "—", isBest: false };
			}),
		},
	];
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MetricsTable({ metrics }) {
	return (
		<div className="overflow-x-auto rounded-md border border-border">
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/30">
						<TableHead className="w-[200px]">Métrica</TableHead>
						{CHANNELS.map(function (ch) {
							return (
								<TableHead key={ch} className="text-right">
									<div className="flex items-center justify-end gap-1.5">
										<span className="text-xs leading-none">{CHANNEL_META[ch].emoji}</span>
										<span className="size-2 rounded-full shrink-0" style={{ background: CHANNEL_META[ch].color }} />
										<span className="text-xs font-semibold" style={{ color: CHANNEL_META[ch].color }}>{CHANNEL_META[ch].label}</span>
									</div>
								</TableHead>
							);
						})}
					</TableRow>
				</TableHeader>
				<TableBody>
					{metrics.map(function (row, i) {
						if (row.isHeader) {
							return (
								<TableRow key={"h" + i} className="bg-muted/60 hover:bg-muted/60">
									<TableCell colSpan={4} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-2">
										{row.label}
									</TableCell>
								</TableRow>
							);
						}
						return (
							<TableRow key={i}>
								<TableCell className="text-sm text-muted-foreground">{row.label}</TableCell>
								{row.cells.map(function (cell, ci) {
									return (
										<TableCell
											key={ci}
											className={"text-right tabular-nums text-sm " + (cell.isBest ? "font-semibold text-green-700 bg-green-50" : cell.v < 0 ? "text-destructive" : "")}
										>
											{cell.formatted}
										</TableCell>
									);
								})}
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}

function BarSection({ title, data, dataKey, formatter }) {
	return (
		<Card>
			<CardHeader className="pb-2 pt-4"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={200}>
					<BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 4 }}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
						<XAxis dataKey="name" tick={{ fontSize: 11 }} />
						<YAxis tick={{ fontSize: 10 }} tickFormatter={function (v) { return formatter(v, true); }} width={60} />
						<Tooltip formatter={function (v) { return [formatter(v), title]; }} />
						<Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={72}>
							{data.map(function (d, i) {
								return <Cell key={i} fill={d.color} fillOpacity={d.value < 0 ? 0.4 : 1} />;
							})}
							<LabelList dataKey={dataKey} position="top" formatter={function (v) { return formatter(v); }} style={{ fontSize: 10, fontWeight: 700 }} />
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}

// ── Main component ───────────────────────────────────────────────────────────

export function TabComparacion({ costs, currency, tc }) {
	const { channelConfig } = useChannelConfig();
	const { models } = useModels();
	const { fMoney, fMoney2 } = makeMoney(currency, tc);

	const activePacks = models.filter(function (p) { return p.activo !== false && p.priceUSD > 0 && (p.certs || 0) > 0; });

	const [scenarios, setScenarios] = useState(function () {
		return [{ id: nextId(), label: "A", certs: 5000, firmasPorCert: 4 }];
	});
	const [activeId, setActiveId] = useState(function () { return scenarios[0].id; });
	const [refPackId, setRefPackId] = useState(null);

	const scenario = scenarios.find(function (s) { return s.id === activeId; }) || scenarios[0];

	function updateScenario(field, value) {
		setScenarios(function (prev) {
			return prev.map(function (s) { return s.id === scenario.id ? Object.assign({}, s, { [field]: value }) : s; });
		});
	}

	function addScenario() {
		if (scenarios.length >= 6) return;
		const label = SCENARIO_LABELS[scenarios.length] || String(scenarios.length + 1);
		const newId = nextId();
		setScenarios(function (prev) { return [...prev, { id: newId, label, certs: scenario.certs, firmasPorCert: scenario.firmasPorCert }]; });
		setActiveId(newId);
	}

	function removeScenario(id) {
		if (scenarios.length === 1) return;
		setScenarios(function (prev) {
			const next = prev.filter(function (s) { return s.id !== id; });
			if (activeId === id) setActiveId(next[0].id);
			return next;
		});
	}

	const result = useMemo(function () {
		if (!scenario || scenario.certs <= 0) return null;
		return computeChannels(scenario.certs, scenario.firmasPorCert, channelConfig, models, refPackId, costs);
	}, [scenario, channelConfig, models, refPackId, costs]);

	const metrics = useMemo(function () {
		if (!result) return [];
		return buildMetrics(result, fMoney, fMoney2);
	}, [result, fMoney, fMoney2]);

	const barData = useMemo(function () {
		if (!result) return { rev: [], margen: [], margenPct: [] };
		return {
			rev: CHANNELS.map(function (ch) { return { name: CHANNEL_META[ch].label, value: result[ch].revenueNeto, color: CHANNEL_META[ch].color }; }),
			margen: CHANNELS.map(function (ch) { return { name: CHANNEL_META[ch].label, value: result[ch].margen, color: CHANNEL_META[ch].color }; }),
			pct: CHANNELS.map(function (ch) { return { name: CHANNEL_META[ch].label, value: Math.round(result[ch].margenPct * 1000) / 10, color: CHANNEL_META[ch].color }; }),
		};
	}, [result]);

	const packOptions = activePacks.map(function (p) {
		return { id: p.id, label: p.label + " · " + p.certs + " certs · " + fMoney(p.priceUSD) };
	});

	return (
		<div className="space-y-5">

			<PageHeader
				title="Comparación de canales"
				description="Mismo volumen de certificados y firmas, comparado en los tres modelos de precio. Guardá escenarios para contrastar hipótesis."
			/>

			{/* Scenario tabs */}
			<div className="flex items-center gap-1 flex-wrap">
				{scenarios.map(function (s) {
					const active = s.id === activeId;
					return (
						<div
							key={s.id}
							className={"group flex items-center gap-1 rounded-md text-sm transition-colors cursor-pointer " + (active ? "bg-primary text-primary-foreground px-3 py-1.5" : "bg-muted text-muted-foreground hover:text-foreground px-3 py-1.5")}
							onClick={function () { setActiveId(s.id); }}
						>
							<span className="font-medium">Escenario {s.label}</span>
							{scenarios.length > 1 && (
								<button
									onClick={function (e) { e.stopPropagation(); removeScenario(s.id); }}
									className={"ml-1 opacity-0 group-hover:opacity-100 transition-opacity " + (active ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
								>
									<X className="size-3" />
								</button>
							)}
						</div>
					);
				})}
				{scenarios.length < 6 && (
					<button
						onClick={addScenario}
						className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-dashed border-border"
					>
						<Plus className="size-3" />
						Nuevo escenario
					</button>
				)}
			</div>

			{/* Inputs */}
			<Card>
				<CardContent className="pt-4">
					<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<NumberField
							label="Certificados / mes"
							value={scenario.certs}
							onChange={function (v) { updateScenario("certs", v); }}
						/>
						<NumberField
							label="Firmas por cert"
							value={scenario.firmasPorCert}
							onChange={function (v) { updateScenario("firmasPorCert", v); }}
						/>
						<div className="flex flex-col gap-1.5 col-span-2">
							<label className="text-xs text-muted-foreground uppercase tracking-wide">Pack de referencia (packs)</label>
							<Select value={refPackId || "auto"} onValueChange={function (v) { setRefPackId(v === "auto" ? null : v); }}>
								<SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
								<SelectContent>
									<SelectItem value="auto">Automático (más cercano al volumen)</SelectItem>
									{packOptions.map(function (p) {
										return <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>;
									})}
								</SelectContent>
							</Select>
							{result?.refPack && (
								<p className="text-[10px] text-muted-foreground">
									Usando: <span className="font-medium text-foreground">{result.refPack.label}</span> · {result.refPack.certs} certs · {fMoney(result.refPack.priceUSD)} · {fMoney2(result.refPack.priceUSD / result.refPack.certs)}/cert
								</p>
							)}
							{!result?.refPack && activePacks.length === 0 && (
								<p className="text-[10px] text-destructive">No hay packs activos. Configurá modelos en la tab Modelos.</p>
							)}
						</div>
					</div>
					<div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
						<span>Total certs: <span className="font-medium text-foreground">{scenario.certs.toLocaleString("es-AR")}</span></span>
						<span>Total firmas: <span className="font-medium text-foreground">{(scenario.certs * scenario.firmasPorCert).toLocaleString("es-AR")}</span></span>
						{result && <span>CV total: <span className="font-medium text-foreground">{fMoney(result.cvTotal)}</span></span>}
					</div>
				</CardContent>
			</Card>

			{result && (
				<>
					{/* Metrics table */}
					<MetricsTable metrics={metrics} />

					{/* Charts */}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
						<BarSection
							title="Revenue neto Lakaut"
							data={barData.rev.map(function (d) { return Object.assign({}, d, { revenueNeto: d.value }); })}
							dataKey="revenueNeto"
							formatter={function (v, tick) { return tick ? (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "K" : String(v)) : fMoney(v); }}
						/>
						<BarSection
							title="Margen $"
							data={barData.margen.map(function (d) { return Object.assign({}, d, { margen: d.value }); })}
							dataKey="margen"
							formatter={function (v, tick) { return tick ? (Math.abs(v) >= 1000 ? (v / 1000).toFixed(0) + "K" : String(v)) : fMoney(v); }}
						/>
						<BarSection
							title="Margen %"
							data={barData.pct.map(function (d) { return Object.assign({}, d, { pct: d.value }); })}
							dataKey="pct"
							formatter={function (v) { return v + "%"; }}
						/>
					</div>
				</>
			)}

			{!result && scenario.certs <= 0 && (
				<div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
					Ingresá una cantidad de certificados para ver la comparación.
				</div>
			)}
		</div>
	);
}
