import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { channelShort, isPacks } from "@/data/channelMeta";

// Selector de cliente: buscar y elegir, NADA de crear. El master de clientes es
// el Sheet "DB Empresas" (Sales Pipeline): las empresas entran por ahí y se bajan
// con "Importar del Sheet" en la pestaña Clientes. Si una empresa no está en la
// lista, se agrega en el Sheet, no acá. Ver docs/sync-pipeline-sheet.md.
export function ClientSelector({ clients, value, onChange }) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const ref = useRef(null);

	// Close on outside click
	useEffect(function () {
		function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
		document.addEventListener("mousedown", handler);
		return function () { document.removeEventListener("mousedown", handler); };
	}, []);

	const filtered = clients
		.filter(function (c) { return !query || c.name.toLowerCase().includes(query.toLowerCase()); });

	function select(client) {
		onChange(client);
		setOpen(false);
		setQuery("");
	}

	function clear(e) {
		e.stopPropagation();
		onChange(null);
		setQuery("");
	}

	return (
		<div ref={ref} className="relative">
			<div
				className="flex items-center gap-2 border border-border rounded-md px-3 py-2 bg-background cursor-pointer hover:border-primary/60 transition-colors min-h-[38px]"
				onClick={function () { setOpen(!open); }}
			>
				{value ? (
					<>
						<span className="flex-1 text-sm font-medium">{value.name}</span>
						{value.tipo && <Badge variant="outline" className="text-[10px] shrink-0 font-semibold">{value.tipo}</Badge>}
						<Badge variant="secondary" className="text-[10px] shrink-0">{channelShort(value.channel)}</Badge>
						<button onClick={clear} className="text-muted-foreground hover:text-foreground ml-1 shrink-0"><X className="size-3.5" /></button>
					</>
				) : (
					<>
						<span className="flex-1 text-sm text-muted-foreground">Buscar cliente...</span>
						<ChevronDown className="size-4 text-muted-foreground shrink-0" />
					</>
				)}
			</div>

			{open && (
				<div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-md overflow-hidden">
					<div className="p-2 border-b border-border">
						<Input
							autoFocus
							placeholder="Buscar cliente..."
							value={query}
							onChange={function (e) { setQuery(e.target.value); }}
							className="h-8 text-sm"
						/>
					</div>

					<div className="max-h-52 overflow-y-auto">
						{filtered.length > 0 && filtered.map(function (c) {
							return (
								<button
									key={c.id}
									onClick={function () { select(c); }}
									className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent text-left"
								>
									<span className={value?.id === c.id ? "font-semibold" : ""}>{c.name}</span>
									<span className="flex items-center gap-2">
										{c.tipo && <Badge variant="outline" className="text-[10px] font-semibold">{c.tipo}</Badge>}
										{isPacks(c.channel) && c.certs_activos > 0 && (
											<span className="text-xs text-muted-foreground">{c.certs_activos.toLocaleString("es-AR")} certs</span>
										)}
									</span>
								</button>
							);
						})}

						{/* Sin resultados: el alta es en el Sheet, no acá. */}
						{filtered.length === 0 && (
							<div className="px-3 py-3 text-xs text-muted-foreground">
								{query ? <>"{query}" no está en la lista.</> : "No hay clientes cargados."}
								<span className="mt-1 block text-muted-foreground/80">
									Agregá la empresa en el Sheet y tocá <span className="font-medium text-foreground">Importar del Sheet</span> en la pestaña Clientes.
								</span>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
