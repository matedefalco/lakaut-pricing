import { makeMoney } from "@/utils/useMoney";
import { useModels } from "@/context/ModelsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

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
								<TableHead className="text-right">Precio ARS<InfoTooltip text="Precio de lista en pesos. Si el pack tiene precio ARS definido en configuración, se usa ese valor. Si no, se deriva: Precio USD × TC." /></TableHead>
								<TableHead className="text-right">Precio USD<InfoTooltip text="Precio de lista en dólares, definido directamente en la configuración del pack." /></TableHead>
								<TableHead className="text-right">Certs<InfoTooltip text="Cantidad de certificados de firma incluidos en el pack. Cada certificado tiene un costo variable de CV cert." /></TableHead>
								<TableHead className="text-right">Firmas incl.<InfoTooltip text="Firmas digitales incluidas en el plan. Si es 'Ilimitadas', no se cobra costo variable por firmas adicionales." /></TableHead>
								<TableHead className="text-right">Firma extra<InfoTooltip text="Precio por firma adicional fuera del límite incluido. Si el plan es de sellos de competencia, se indica 'Sello comp.' en lugar de precio." /></TableHead>
								<TableHead className="text-right">CV total<InfoTooltip text={"Costo Variable total = (certs × CV cert) + (firmas incluidas × CV firma).\nCV cert: " + fMoney2(cvCert) + " · CV firma: " + fMoney2(cvFirma) + ".\nPara planes con firmas ilimitadas, el CV de firmas es 0."} /></TableHead>
								<TableHead className="text-right">Cont. marginal<InfoTooltip text="Contribución marginal = Precio USD − CV total. Es la ganancia antes de cubrir costos fijos. Se muestra como % sobre el precio." /></TableHead>
								<TableHead className="text-right">BE anual<InfoTooltip text={"Break-even anual = CF anual ÷ Contribución marginal por pack.\nCuántos packs de este tipo necesitás vender por año para cubrir todos los costos fijos del canal (" + fMoney2(costs.cfDirecto * 12) + "/año)."} /></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{models.filter(function (m) { return m.activo !== false; }).map(function (m) {
								const e = econ(m);
								const selloComp = m.ilimitadas && !m.extraFirmaPrice;
								const cm = e ? e.precioUSD - e.cvTotal : null;
								const beAnual = cm && cm > 0 ? Math.ceil(costs.cfDirecto * 12 / cm) : null;
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
												? (currency === "ARS"
												? "$ " + (m.firmaExtraARS || Math.round(m.extraFirmaPrice * tc)).toLocaleString("es-AR")
												: fUSD(m.extraFirmaPrice))
												: (selloComp ? "Sello comp." : "—")}
										</TableCell>
										<TableCell className="text-right tabular-nums">{e == null ? "—" : fMoney2(e.cvTotal)}</TableCell>
										<TableCell className={"text-right tabular-nums font-semibold " + (e == null ? "text-muted-foreground" : margClass(e.margenPct))}>
											{e == null ? "—" : (e.margenPct * 100).toFixed(0) + "%"}
										</TableCell>
										<TableCell className="text-right tabular-nums text-muted-foreground">{beAnual == null ? "—" : beAnual.toLocaleString("es-AR") + " u."}</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
			<p className="text-[11px] text-muted-foreground">Contribución marginal = precio USD − CV certificados − CV firmas incluidas, sobre la vigencia de 2 años. BE anual = packs/año necesarios para cubrir CF anual. CV cert {fMoney2(cvCert)} · CV firma {fMoney2(cvFirma)}.</p>
		</div>
	);
}
