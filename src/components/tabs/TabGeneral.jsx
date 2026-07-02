import { useState, useEffect } from "react";
import { Check, RefreshCw } from "lucide-react";
import { DOLAR_SOURCES } from "../../lib/useDolarTC";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export function TabGeneral({ tc, setTc, tcSource, setTcSource, tcLoading, tcError, tcLastUpdated, tcRefresh }) {
	const [draft, setDraft] = useState(tc);
	const [saved, setSaved] = useState(false);

	useEffect(function () { setDraft(tc); }, [tc]);

	function applyManual() {
		const val = Number(draft) || 1;
		setTc(val);
		setDraft(val);
		setSaved(true);
		setTimeout(function () { setSaved(false); }, 2500);
	}

	const isManual = tcSource === "manual";

	return (
		<div className="space-y-6 max-w-2xl">
			<PageHeader
				title="General · tipo de cambio"
				description="El toggle USD/ARS de la barra superior usa este tipo de cambio para convertir todos los precios de la app."
			/>

			<SectionCard
				title="Tipo de cambio USD → ARS"
				description={isManual
					? "Modo manual: ingresá el valor directamente. No se consulta ninguna API."
					: "Fuente: dolarapi.com. El valor se carga automáticamente al entrar y se puede forzar con Actualizar."}
			>
				<div className="space-y-5">
					{/* Variante del dólar */}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground uppercase tracking-wide">Variante del dólar</Label>
						<div className="flex gap-1 flex-wrap">
							{DOLAR_SOURCES.map(function (s) {
								const active = tcSource === s.k;
								return (
									<button
										key={s.k}
										onClick={function () { setTcSource(s.k); }}
										className={"px-3 py-1.5 rounded-md text-xs font-medium transition-colors " + (active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
									>
										{s.label}
									</button>
								);
							})}
						</div>
					</div>

					{/* Valor + acción */}
					<div className="flex flex-wrap items-end gap-3">
						<div className="flex flex-col gap-1.5">
							<Label className="text-xs text-muted-foreground uppercase tracking-wide">{isManual ? "Ingresá el valor" : "Valor actual (venta)"}</Label>
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">1 USD =</span>
								<Input
									type="number"
									className="w-28 tabular-nums font-semibold"
									value={isManual ? draft : tc}
									onChange={function (e) {
										if (isManual) setDraft(e.target.value);
										else setTc(Number(e.target.value) || 1);
									}}
									onKeyDown={function (e) { if (isManual && e.key === "Enter") applyManual(); }}
								/>
								<span className="text-sm text-muted-foreground">ARS</span>
							</div>
						</div>
						{isManual ? (
							<Button onClick={applyManual} className={saved ? "bg-[var(--success)] hover:bg-[var(--success)]" : ""}>
								{saved ? <><Check className="size-4 mr-1.5" /> Guardado</> : "Aplicar"}
							</Button>
						) : (
							<Button variant="outline" onClick={tcRefresh} disabled={tcLoading}>
								<RefreshCw className={"size-4 mr-1.5 " + (tcLoading ? "animate-spin" : "")} />
								{tcLoading ? "Actualizando..." : "Actualizar"}
							</Button>
						)}
					</div>

					{/* Estado */}
					{tcError && (
						<p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">{tcError}</p>
					)}
					{!tcError && (tcLastUpdated || saved) && (
						<p className="text-xs text-muted-foreground">
							{saved && <Badge variant="secondary" className="mr-2 text-[10px] text-[var(--success)] border-[var(--success)]">TC activo: {Number(tc).toLocaleString("es-AR")}</Badge>}
							{tcLastUpdated && <>Última actualización: {new Date(tcLastUpdated).toLocaleString("es-AR")}</>}
						</p>
					)}
				</div>
			</SectionCard>
		</div>
	);
}
