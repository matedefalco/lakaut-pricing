import { makeMoney } from "@/utils/useMoney";
import { useModels } from "@/context/ModelsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }

export function TabCanalWeb({ costs, currency, tc }) {
	const { models } = useModels();
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const { fMoney: fUSD } = makeMoney("USD", tc);
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	function isConsultar(m) { return !m.priceUSD || m.priceUSD <= 0; }

	function econ(m) {
		if (isConsultar(m)) return null;
		const precioUSD = m.priceUSD;
		// Use stored ARS price if available, otherwise derive from TC
		const precioARS = m.precioARS || Math.round(precioUSD * tc);
		const certCost = (m.certs || 1) * cvCert;
		const firmasCost = m.ilimitadas ? 0 : (m.firmas || 0) * cvFirma;
		const cvTotal = certCost + firmasCost;
		const margenPct = precioUSD > 0 ? (precioUSD - cvTotal) / precioUSD : 0;
		return { precioUSD, precioARS, cvTotal, margenPct };
	}

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-heading text-lg font-semibold text-foreground">Canal Web Lakaut · venta directa</h2>
				<p className="text-sm text-muted-foreground">Personas, profesionales y PyMEs que contratan sin intermediación, abonando con tarjeta. Precios de lista en ARS, USD derivado por TC.</p>
			</div>

			<Card>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Producto</TableHead>
								<TableHead className="text-right">Precio ARS</TableHead>
								<TableHead className="text-right">Precio USD</TableHead>
								<TableHead className="text-right">Certs</TableHead>
								<TableHead className="text-right">Firmas incl.</TableHead>
								<TableHead className="text-right">Firma extra</TableHead>
								<TableHead className="text-right">CV total</TableHead>
								<TableHead className="text-right">Margen</TableHead>
								<TableHead className="text-right">EBITDA</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{models.map(function (m) {
								const e = econ(m);
								const selloComp = m.ilimitadas && !m.extraFirmaPrice;
								const ebitda = e ? e.precioUSD - e.cvTotal - costs.cfDirecto : null;
								return (
									<TableRow key={m.id}>
										<TableCell>
											<div className="font-semibold">{m.label}</div>
											<div className="text-[11px] text-muted-foreground">{m.segment === "persona" ? "Persona / profesional" : "Empresa"}</div>
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{e == null ? <Badge variant="outline">Consultar</Badge> : "$ " + e.precioARS.toLocaleString("es-AR")}
										</TableCell>
										<TableCell className="text-right tabular-nums">{e == null ? "—" : fUSD(e.precioUSD)}</TableCell>
										<TableCell className="text-right tabular-nums">{m.certs == null || m.certs === 0 ? "—" : m.certs}</TableCell>
										<TableCell className="text-right tabular-nums">{m.ilimitadas ? "Ilimitadas" : (m.firmas == null ? "—" : m.firmas)}</TableCell>
										<TableCell className="text-right tabular-nums">
											{m.extraFirmaPrice
												? "$ " + (m.firmaExtraARS || Math.round(m.extraFirmaPrice * tc)).toLocaleString("es-AR")
												: (selloComp ? "Sello comp." : "—")}
										</TableCell>
										<TableCell className="text-right tabular-nums">{e == null ? "—" : fMoney2(e.cvTotal)}</TableCell>
										<TableCell className={"text-right tabular-nums font-semibold " + (e == null ? "text-muted-foreground" : margClass(e.margenPct))}>
											{e == null ? "—" : (e.margenPct * 100).toFixed(0) + "%"}
										</TableCell>
										<TableCell className={"text-right tabular-nums font-semibold " + (ebitda == null ? "text-muted-foreground" : ebitda >= 0 ? "text-[var(--success)]" : "text-destructive")}>{ebitda == null ? "—" : fMoney2(ebitda)}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<p className="text-[11px] text-muted-foreground">Margen = (precio USD − CV certificados − CV firmas incluidas) / precio USD, sobre la vigencia de 2 años. CV cert {fMoney2(cvCert)} · CV firma {fMoney2(cvFirma)}.</p>
		</div>
	);
}
