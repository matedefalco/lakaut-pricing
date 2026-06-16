import { makeMoney } from "@/utils/useMoney";
import { WEB_PRODUCTS } from "@/data/channels";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function margClass(pct) { return pct >= 0.5 ? "text-[var(--success)]" : pct >= 0.2 ? "text-[var(--warning)]" : "text-destructive"; }

export function TabCanalWeb({ costs, currency, tc }) {
	const { fMoney, fMoney2 } = makeMoney(currency, tc);
	const cvCert = costs.cvCertBase;
	const cvFirma = costs.cvFirmaBase;

	function econ(p) {
		if (p.precioARS == null) return null;
		const precioUSD = p.precioARS / tc;
		const certCost = (p.certs || 1) * cvCert;
		const firmasCost = p.ilimitadas ? 0 : (p.firmas || 0) * cvFirma;
		const cvTotal = certCost + firmasCost;
		const margenPct = precioUSD > 0 ? (precioUSD - cvTotal) / precioUSD : 0;
		return { precioUSD, cvTotal, margenPct };
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
							</TableRow>
						</TableHeader>
						<TableBody>
							{WEB_PRODUCTS.map(function (p) {
								const e = econ(p);
								return (
									<TableRow key={p.id}>
										<TableCell>
											<div className="font-semibold">{p.label}</div>
											<div className="text-[11px] text-muted-foreground">{p.segment === "persona" ? "Persona / profesional" : "Empresa"}</div>
										</TableCell>
										<TableCell className="text-right tabular-nums">{p.precioARS == null ? <Badge variant="outline">Consultar</Badge> : "$ " + p.precioARS.toLocaleString("es-AR")}</TableCell>
										<TableCell className="text-right tabular-nums">{e == null ? "—" : fMoney(e.precioUSD)}</TableCell>
										<TableCell className="text-right tabular-nums">{p.certs == null ? "—" : p.certs}</TableCell>
										<TableCell className="text-right tabular-nums">{p.ilimitadas ? "Ilimitadas" : (p.firmas == null ? "—" : p.firmas)}</TableCell>
										<TableCell className="text-right tabular-nums">{p.firmaExtraARS == null ? (p.selloCompetencia ? "Sello comp." : "—") : "$ " + p.firmaExtraARS.toLocaleString("es-AR")}</TableCell>
										<TableCell className="text-right tabular-nums">{e == null ? "—" : fMoney2(e.cvTotal)}</TableCell>
										<TableCell className={"text-right tabular-nums font-semibold " + (e == null ? "text-muted-foreground" : margClass(e.margenPct))}>{e == null ? "—" : (e.margenPct * 100).toFixed(0) + "%"}</TableCell>
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
